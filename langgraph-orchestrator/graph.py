import os
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
import requests

# ─── Configuration ───
BHUNESH_BACKEND_URL = os.environ.get("BHUNESH_BACKEND_URL", "http://localhost:3000")
N8N_PAYOUT_WEBHOOK = os.environ.get(
    "N8N_PAYOUT_WEBHOOK", 
    "https://n8n-production-dca8.up.railway.app/webhook/payout"
)

# ─── State Definition ───
class GraphState(TypedDict):
    zone_id: str
    trigger_id: str
    severity: str
    disruption_start: str
    claims_generated: List[Dict[str, Any]]
    payouts_processed: bool
    error: str

# ─── Nodes ───

def receive_event(state: GraphState):
    """Entry node: Validates the incoming disruption event."""
    # In a real app, you could do LLM-based parsing of the news/weather string here.
    # For now, we just pass the structured n8n payload forward.
    print(f"[{state['trigger_id']}] Received severity {state['severity']} event for {state['zone_id']}")
    return {"claims_generated": [], "payouts_processed": False, "error": ""}

def generate_claims(state: GraphState):
    """Calls the Node.js backend to create claims for all affected 'ACTIVE' policies."""
    print(f"Generating claims for {state['zone_id']}...")
    try:
        response = requests.post(
            f"{BHUNESH_BACKEND_URL}/claim/initiate",
            json={
                "zone_id": state["zone_id"],
                "trigger_id": state["trigger_id"],
                "severity": state["severity"]
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
    """Iterates over approved claims and calls the n8n payout webhook."""
    claims = state.get("claims_generated", [])
    if not claims:
        print("No claims to process payouts for.")
        return {"payouts_processed": True}

    print(f"Processing payouts for {len(claims)} claims via n8n...")
    success_count = 0
    for claim in claims:
        # Only process if fraud score is OK and payout amount > 0
        payout_amount = claim.get("payout_amount", 0)
        if claim.get("fraud_score", 0) <= 0.3 and payout_amount > 0:
            try:
                # Call n8n payout webhook (payout.json)
                requests.post(
                    N8N_PAYOUT_WEBHOOK,
                    json={
                        "claim_id": claim.get("id", claim.get("claim_id")),
                        "worker_id": claim.get("worker_id"),
                        "payout_amount": payout_amount
                    },
                    timeout=10
                )
                success_count += 1
                print(f"  -> n8n webhook triggered for worker {claim.get('worker_id')}")
            except Exception as e:
                print(f"  -> Error calling n8n for claim {claim.get('id')}: {e}")
        else:
            print(f"  -> Claim {claim.get('id')} rejected (Fraud: {claim.get('fraud_score')}) or zero payout.")
    
    print(f"Successfully sent {success_count} payouts to n8n.")
    return {"payouts_processed": True}

# ─── Edges ───

def route_after_claims(state: GraphState):
    if state.get("error"):
        return END
    if not state.get("claims_generated"):
        return END
    return "process_payouts"

# ─── Graph Compilation ───

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
