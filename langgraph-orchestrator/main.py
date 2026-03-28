import warnings
warnings.filterwarnings("ignore", message="Core Pydantic V1")

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from graph import orchestrator_app

load_dotenv()

app = FastAPI(title="Vritti LangGraph Orchestrator API")

class DisruptionEvent(BaseModel):
    zone_id: str
    trigger_id: str
    severity: str
    disruption_start: str

@app.post("/webhook/orchestrate")
async def handle_orchestration(event: DisruptionEvent):
    """
    Acts as the entry point replacing the n8n orchestrator.
    n8n 'Sensor' workflows (Weather, News) will POST to this endpoint.
    """
    initial_state = {
        "zone_id": event.zone_id,
        "trigger_id": event.trigger_id,
        "severity": event.severity,
        "disruption_start": event.disruption_start,
        "claims_generated": [],
        "payouts_processed": False,
        "error": ""
    }
    
    print(f"\n🚀 [Orchestrator] Starting workflow for Event: {event.trigger_id} in {event.zone_id}")
    
    try:
        # Run the LangGraph state machine synchronously
        final_state = orchestrator_app.invoke(initial_state)
        
        return {
            "status": "success",
            "message": "Orchestration complete.",
            "metrics": {
                "claims_created": len(final_state.get("claims_generated", [])),
                "payouts_processed": final_state.get("payouts_processed")
            }
        }
    except Exception as e:
        print(f"❌ [Orchestrator] Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
