# app/services/monitoring.py
from time import time
from prometheus_client import Counter, Histogram, Gauge
from dataclasses import dataclass
from typing import Dict
import asyncio

# Prometheus metrics
ticket_processing_total = Counter(
    'ticket_processing_total', 
    'Total tickets processed',
    ['action', 'priority', 'category']
)

ticket_latency = Histogram(
    'ticket_processing_latency_seconds',
    'Ticket processing latency',
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0]
)

confidence_score = Histogram(
    'agent_confidence_score',
    'Agent confidence distribution',
    buckets=[0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
)

active_tickets = Gauge('active_tickets', 'Currently processing tickets')

@dataclass
class MetricsCollector:
    """Centralized metrics collection"""
    
    async def record_processing(
        self,
        ticket_id: str,
        action: str,
        classification: Dict,
        latency_ms: float,
        confidence: float
    ):
        """Record successful processing metrics"""
        
        ticket_processing_total.labels(
            action=action,
            priority=classification.get('priority', 'unknown'),
            category=classification.get('category', 'unknown')
        ).inc()
        
        ticket_latency.observe(latency_ms / 1000)
        confidence_score.observe(confidence)
        
        # Store in time-series DB for dashboarding
        await self._store_timeseries({
            "ticket_id": ticket_id,
            "action": action,
            "latency_ms": latency_ms,
            "confidence": confidence,
            "timestamp": time.time()
        })
    
    async def record_error(self, ticket_id: str, error: str):
        """Record processing errors"""
        # Log to error tracking system (Sentry, CloudWatch)
        pass
    
    async def _store_timeseries(self, data: Dict):
        """Store metrics in time-series database"""
        # Implement with InfluxDB, TimescaleDB, or CloudWatch
        pass