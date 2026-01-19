# app/api/routes.py
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Query
from fastapi.responses import StreamingResponse
from ..agents.orchestrator import SupportAgentOrchestrator
from ..models.ticket import (
    TicketCreate, TicketResponse, Ticket, TicketList, TicketUpdate
)
from ..models.response import ResponseOverride, ResponseTrace, ResponseMetrics
from ..services.auth import verify_api_key
from typing import AsyncIterator, Dict, Optional, List
import json
import uuid
from datetime import datetime

router = APIRouter(prefix="/api")


# Lazy initialization of repositories
def get_ticket_repo():
    from ..database import TicketRepository
    return TicketRepository()


def get_response_repo():
    from ..database import ResponseRepository
    return ResponseRepository()


def get_feedback_repo():
    from ..database import FeedbackRepository
    return FeedbackRepository()


@router.post("/tickets", response_model=TicketResponse)
async def create_ticket(
    ticket: TicketCreate,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    """Process new support ticket"""

    orchestrator = SupportAgentOrchestrator()

    # Create ticket dict with ID
    ticket_data = ticket.model_dump()
    ticket_data["id"] = str(uuid.uuid4())
    ticket_data["created_at"] = datetime.utcnow().isoformat()

    result = await orchestrator.process_ticket(ticket_data)

    # Store ticket in database
    background_tasks.add_task(get_ticket_repo().create, {**ticket_data, **result})

    # Send notifications in background
    background_tasks.add_task(send_notifications, result)

    return TicketResponse(**result)


@router.get("/tickets", response_model=TicketList)
async def list_tickets(
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    api_key: str = Depends(verify_api_key)
):
    """List tickets with optional filtering"""
    try:
        from ..database import get_db
        db = get_db()

        query = {}
        if status and status != "all":
            query["status"] = status

        # Get total count
        total = await db.tickets.count_documents(query)

        # Get paginated tickets
        skip = (page - 1) * page_size
        cursor = db.tickets.find(query).sort(
            "created_at", -1
        ).skip(skip).limit(page_size)

        tickets = await cursor.to_list(length=page_size)

        return TicketList(
            tickets=[Ticket(**t) for t in tickets],
            total=total,
            page=page,
            page_size=page_size,
            has_next=(skip + page_size) < total
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tickets/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get a specific ticket by ID"""
    ticket = await get_ticket_repo().get_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/tickets/{ticket_id}")
async def update_ticket(
    ticket_id: str,
    update: TicketUpdate,
    api_key: str = Depends(verify_api_key)
):
    """Update a ticket"""
    update_data = update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    success = await get_ticket_repo().update(ticket_id, update_data)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return {"status": "updated", "ticket_id": ticket_id}


@router.post("/tickets/{ticket_id}/override")
async def override_ticket_response(
    ticket_id: str,
    override: ResponseOverride,
    api_key: str = Depends(verify_api_key)
):
    """Override an auto-generated response with human response"""
    ticket = await get_ticket_repo().get_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Update ticket with override
    update_data = {
        "response": override.override_text,
        "status": "human_resolved",
        "override_reason": override.override_reason,
        "overridden_by": override.overridden_by,
        "updated_at": datetime.utcnow()
    }

    await get_ticket_repo().update(ticket_id, update_data)

    # Record feedback for model improvement
    await get_feedback_repo().create({
        "ticket_id": ticket_id,
        "response_id": override.response_id,
        "feedback_type": "correction",
        "original_response": override.original_text,
        "corrected_response": override.override_text,
        "created_at": datetime.utcnow()
    })

    return {"status": "overridden", "ticket_id": ticket_id}


@router.get("/tickets/{ticket_id}/trace")
async def get_ticket_trace(
    ticket_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get decision trace for a ticket"""
    try:
        from ..database import get_db
        db = get_db()

        trace = await db.traces.find_one({"ticket_id": ticket_id})
        if not trace:
            # Return empty trace structure
            return {
                "ticket_id": ticket_id,
                "decisions": [],
                "message": "No trace data available"
            }

        return ResponseTrace(**trace)
    except Exception:
        return {
            "ticket_id": ticket_id,
            "decisions": [],
            "message": "Trace lookup failed"
        }


@router.post("/tickets/stream")
async def process_ticket_stream(
    ticket: TicketCreate,
    api_key: str = Depends(verify_api_key)
):
    """Stream ticket processing steps in real-time"""

    async def event_generator() -> AsyncIterator[str]:
        orchestrator = SupportAgentOrchestrator()

        # Create ticket data
        ticket_data = ticket.model_dump()
        ticket_data["id"] = str(uuid.uuid4())

        yield f"data: {json.dumps({'step': 'classification', 'status': 'started'})}\n\n"

        # Classification
        classification = await orchestrator.classifier.classify(ticket_data)
        yield f"data: {json.dumps({'step': 'classification', 'result': classification})}\n\n"

        # Context gathering
        yield f"data: {json.dumps({'step': 'context', 'status': 'started'})}\n\n"
        context = await orchestrator.context_gatherer.gather(ticket_data)
        yield f"data: {json.dumps({'step': 'context', 'count': len(context)})}\n\n"

        # Response generation
        if classification['confidence'] > 0.75:
            yield f"data: {json.dumps({'step': 'response', 'status': 'generating'})}\n\n"
            response = await orchestrator.responder.generate_response(
                ticket_data, context, classification
            )
            yield f"data: {json.dumps({'step': 'complete', 'response': response})}\n\n"
        else:
            yield f"data: {json.dumps({'step': 'escalate', 'reason': 'low confidence'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/metrics")
async def get_metrics(
    api_key: str = Depends(verify_api_key)
):
    """Return aggregated metrics"""
    try:
        from ..database import get_db
        db = get_db()

        # Calculate metrics
        total = await db.tickets.count_documents({})
        auto_resolved = await db.tickets.count_documents({"status": "auto_resolved"})
        escalated = await db.tickets.count_documents({"status": "escalated"})
        pending = await db.tickets.count_documents({"status": "pending"})

        # Get average confidence
        pipeline = [
            {"$match": {"confidence": {"$exists": True}}},
            {"$group": {"_id": None, "avg_confidence": {"$avg": "$confidence"}}}
        ]
        confidence_result = await db.tickets.aggregate(pipeline).to_list(1)
        avg_confidence = confidence_result[0]["avg_confidence"] if confidence_result else 0

        # Get average latency
        latency_pipeline = [
            {"$match": {"latency_ms": {"$exists": True}}},
            {"$group": {"_id": None, "avg_latency": {"$avg": "$latency_ms"}}}
        ]
        latency_result = await db.tickets.aggregate(latency_pipeline).to_list(1)
        avg_latency = latency_result[0]["avg_latency"] if latency_result else 0

        return ResponseMetrics(
            total_responses=total,
            auto_resolved_count=auto_resolved,
            escalated_count=escalated,
            average_confidence=avg_confidence,
            average_latency_ms=avg_latency,
            positive_feedback_rate=0.0,  # TODO: Calculate from feedback
            override_rate=0.0,  # TODO: Calculate from overrides
            time_period="all_time"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback")
async def submit_feedback(
    feedback: dict,
    api_key: str = Depends(verify_api_key)
):
    """Submit feedback on a response"""
    feedback["created_at"] = datetime.utcnow()
    feedback_id = await get_feedback_repo().create(feedback)
    return {"status": "received", "feedback_id": feedback_id}


async def send_notifications(result: Dict):
    """Send notifications based on action"""
    if result.get('action') == 'escalate':
        # TODO: Integrate with Slack, email, PagerDuty, etc.
        # Example:
        # await slack_client.post_message(
        #     channel="#support-escalations",
        #     text=f"Ticket {result['ticket_id']} escalated: {result.get('escalation_reason')}"
        # )
        pass