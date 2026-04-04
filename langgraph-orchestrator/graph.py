import os
from typing import TypedDict, List, Dict, Any

import requests
from langgraph.graph import StateGraph, END

BHUNESH_BACKEND_URL = os.environ.get("BHUNESH_BACKEND_URL", "http://localhost:8000").rstrip("/")
PAYOUT_PROCESS_URL = f"{BHUNESH_BACKEND_URL}/payout/process"
N8N_PAYOUT_WEBHOOK = os.environ.get("N8N_PAYOUT_WEBHOOK", "").strip()


class GraphState(TypedDict):
    zone_id: str
    trigger_id: str
    severity: str
    disruption_start: str
    claims_generated: List[Dict[str, Any]]
    payouts_processed: bool
    error: str


def receive_event(state: GraphState):
    print(f"[{state['trigger_id']}] Received severity {state['severity']} event for {state['zone_id']}")
    return {"claims_generated": [], "payouts_processed": False, "error": ""}


def generate_claims(state: GraphState):
    print(f"Generating claims for {state['zone_id']}...")
    try:
        response = requests.post(
            f"{BHUNESH_BACKEND_URL}/claim/initiate",
            json={
                "zone_id": state["zone_id"],
                "trigger_id": state["trigger_id"],
                "severity": state["severity"],
                "disruption_start": state["disruption_start"]
            },
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        claims = data.get("claims", [])
        print(f"Generated {len(claims)} claims (auto_approved: {data.get('auto_approved', 0)}, held: {data.get('held', 0)}).")
        return {"claims_generated": claims}
    except Exception as e:
        print(f"Error generating claims: {e}")
        return {"error": str(e), "claims_generated": []}


def process_payouts(state: GraphState):
    claims = state.get("claims_generated", [])
    if not claims:
        print("No claims to process payouts for.")
        return {"payouts_processed": True}

    print(f"Processing payouts for {len(claims)} claims...")
    success_count = 0

    for claim in claims:
        payout_amount = claim.get("payout_amount", 0)
        is_approved = claim.get("fraud_score", 0) <= 0.3 and payout_amount > 0
        if not is_approved:
            print(f"  -> Claim {claim.get('id')} rejected (Fraud: {claim.get('fraud_score')}) or zero payout.")
            continue

        try:
            payload = {
                "claim_id": claim.get("id") or claim.get("claim_id"),
                "worker_id": claim.get("worker_id"),
                "amount": payout_amount,
                "status": "PAID"
            }

            backend_response = requests.post(PAYOUT_PROCESS_URL, json=payload, timeout=10)
            backend_response.raise_for_status()

            if N8N_PAYOUT_WEBHOOK:
                # Optional side effect for existing n8n payout flow integrations.
                requests.post(N8N_PAYOUT_WEBHOOK, json=payload, timeout=10)

            success_count += 1
            print(f"  -> Payout persisted for worker {claim.get('worker_id')}")
        except Exception as e:
            print(f"  -> Error processing payout for claim {claim.get('id')}: {e}")

    print(f"Successfully processed {success_count} payouts.")
    return {"payouts_processed": True}


def route_after_claims(state: GraphState):
    if state.get("error"):
        return END
    if not state.get("claims_generated"):
        return END
    return "process_payouts"


workflow = StateGraph(GraphState)
workflow.add_node("receive_event", receive_event)
workflow.add_node("generate_claims", generate_claims)
workflow.add_node("process_payouts", process_payouts)

workflow.set_entry_point("receive_event")
workflow.add_edge("receive_event", "generate_claims")
workflow.add_conditional_edges(
    "generate_claims",
    route_after_claims,
    {
        "process_payouts": "process_payouts",
        END: END
    }
)
workflow.add_edge("process_payouts", END)

orchestrator_app = workflow.compile()
