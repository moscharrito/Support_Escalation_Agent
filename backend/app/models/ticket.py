# Ticket Models - Data models for support tickets
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class TicketStatus(str, Enum):
    """Ticket processing status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    AUTO_RESOLVED = "auto_resolved"
    ESCALATED = "escalated"
    CLOSED = "closed"


class TicketPriority(str, Enum):
    """Ticket priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TicketCategory(str, Enum):
    """Ticket categories for routing"""
    PRODUCT_QUESTION = "product_question"
    HOW_TO = "how_to"
    BUG_REPORT = "bug_report"
    FEATURE_REQUEST = "feature_request"
    BILLING = "billing"
    ACCOUNT_SECURITY = "account_security"
    TECHNICAL_SUPPORT = "technical_support"
    GENERAL = "general"


class TicketBase(BaseModel):
    """Base ticket fields"""
    subject: str = Field(..., min_length=1, max_length=500)
    body: str = Field(..., min_length=10, max_length=10000)
    user_id: str = Field(..., min_length=1)
    email: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class TicketCreate(TicketBase):
    """Schema for creating a new ticket"""
    pass


class Ticket(TicketBase):
    """Full ticket model with all fields"""
    id: str
    status: TicketStatus = TicketStatus.PENDING
    priority: Optional[TicketPriority] = None
    category: Optional[TicketCategory] = None
    sentiment: Optional[str] = None
    confidence: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolution: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class TicketClassification(BaseModel):
    """Result of ticket classification"""
    priority: TicketPriority
    category: TicketCategory
    sentiment: str = Field(..., description="positive, negative, or neutral")
    confidence: float = Field(..., ge=0, le=1)
    reasoning: Optional[str] = None


class TicketContext(BaseModel):
    """Retrieved context for ticket processing"""
    content: str
    source: str
    score: float = Field(..., ge=0, le=1)
    metadata: Optional[Dict[str, Any]] = None


class TicketResponse(BaseModel):
    """Response schema for ticket API endpoints"""
    ticket_id: str
    action: str
    classification: Optional[TicketClassification] = None
    response: Optional[str] = None
    context_retrieved: Optional[List[TicketContext]] = None
    latency_ms: Optional[float] = None
    timestamp: float
    escalation_reason: Optional[str] = None
    requires_human: bool = False


class TicketUpdate(BaseModel):
    """Schema for updating a ticket"""
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    category: Optional[TicketCategory] = None
    assigned_to: Optional[str] = None
    resolution: Optional[str] = None
    tags: Optional[List[str]] = None


class TicketList(BaseModel):
    """Paginated list of tickets"""
    tickets: List[Ticket]
    total: int
    page: int
    page_size: int
    has_next: bool
