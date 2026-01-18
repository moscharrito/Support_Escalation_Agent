# Response Models - Data models for agent responses
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ResponseStatus(str, Enum):
    """Response generation status"""
    SUCCESS = "success"
    FAILED = "failed"
    ESCALATED = "escalated"
    PENDING_REVIEW = "pending_review"


class ResponseType(str, Enum):
    """Type of response generated"""
    AUTO_RESPONSE = "auto_response"
    TEMPLATE = "template"
    HUMAN_WRITTEN = "human_written"
    HYBRID = "hybrid"


class Response(BaseModel):
    """Generated response model"""
    id: str
    ticket_id: str
    text: str = Field(..., min_length=1)
    status: ResponseStatus = ResponseStatus.SUCCESS
    response_type: ResponseType = ResponseType.AUTO_RESPONSE
    confidence: float = Field(..., ge=0, le=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    model_used: Optional[str] = None
    tokens_used: Optional[int] = None
    latency_ms: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class ResponseCreate(BaseModel):
    """Schema for creating a new response"""
    ticket_id: str
    text: str
    confidence: float = Field(..., ge=0, le=1)
    response_type: ResponseType = ResponseType.AUTO_RESPONSE
    model_used: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ResponseDecision(BaseModel):
    """Decision trace for explainability"""
    step: str
    action: str
    reasoning: str
    confidence: float
    timestamp: float
    inputs: Optional[Dict[str, Any]] = None
    outputs: Optional[Dict[str, Any]] = None


class ResponseTrace(BaseModel):
    """Full response trace for debugging and explainability"""
    ticket_id: str
    response_id: str
    decisions: List[ResponseDecision]
    total_latency_ms: float
    context_sources: List[str]
    guardrails_passed: List[str]
    guardrails_failed: Optional[List[str]] = None
    final_action: str


class ResponseFeedback(BaseModel):
    """Human feedback on a response"""
    response_id: str
    ticket_id: str
    feedback_type: str = Field(..., description="positive, negative, or correction")
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None
    corrected_response: Optional[str] = None
    reviewer_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ResponseOverride(BaseModel):
    """Human override of an auto-generated response"""
    response_id: str
    original_text: str
    override_text: str
    override_reason: str
    overridden_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ResponseMetrics(BaseModel):
    """Aggregated response metrics"""
    total_responses: int
    auto_resolved_count: int
    escalated_count: int
    average_confidence: float
    average_latency_ms: float
    positive_feedback_rate: float
    override_rate: float
    time_period: str


class StreamingChunk(BaseModel):
    """Chunk for streaming responses"""
    ticket_id: str
    chunk: str
    chunk_index: int
    is_final: bool = False
    metadata: Optional[Dict[str, Any]] = None
