# app/api/routes.py
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from ..agents.orchestrator import SupportAgentOrchestrator
from ..models.ticket import TicketCreate, TicketResponse
from ..services.auth import verify_api_key
from typing import AsyncIterator
import json

router = APIRouter(prefix="/api/v1")

@router.post("/tickets", response_model=TicketResponse)
async def create_ticket(
    ticket: TicketCreate,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    """Process new support ticket"""
    
    orchestrator = SupportAgentOrchestrator()
    
    result = await orchestrator.process_ticket(ticket.dict())
    
    # Send notifications in background
    background_tasks.add_task(send_notifications, result)
    
    return TicketResponse(**result)

@router.post("/tickets/stream")
async def process_ticket_stream(
    ticket: TicketCreate,
    api_key: str = Depends(verify_api_key)
):
    """Stream ticket processing steps in real-time"""
    
    async def event_generator() -> AsyncIterator[str]:
        orchestrator = SupportAgentOrchestrator()
        
        yield f"data: {json.dumps({'step': 'classification', 'status': 'started'})}\n\n"
        
        # Classification
        classification = await orchestrator.classifier.classify(ticket.dict())
        yield f"data: {json.dumps({'step': 'classification', 'result': classification})}\n\n"
        
        # Context gathering
        yield f"data: {json.dumps({'step': 'context', 'status': 'started'})}\n\n"
        context = await orchestrator.context_gatherer.gather(ticket.dict())
        yield f"data: {json.dumps({'step': 'context', 'count': len(context)})}\n\n"
        
        # Response generation
        if classification['confidence'] > 0.75:
            yield f"data: {json.dumps({'step': 'response', 'status': 'generating'})}\n\n"
            response = await orchestrator.responder.generate_response(
                ticket.dict(), context, classification
            )
            yield f"data: {json.dumps({'step': 'complete', 'response': response})}\n\n"
        else:
            yield f"data: {json.dumps({'step': 'escalate', 'reason': 'low confidence'})}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/metrics")
async def get_metrics():
    """Return aggregated metrics"""
    # Return Prometheus metrics or custom dashboard data
    pass

async def send_notifications(result: Dict):
    """Send notifications based on action"""
    if result['action'] == 'escalate':
        # Send to Slack, email, etc.
        pass