# Orchestrator agent for managing and coordinating tasks among multiple agents.

from typing import Dict, Any, Optional
from .classifier import TicketClassifier
from .context_gatherer import ContextGatherer
from .responder import ResponseAgent
from ..guardrails.pipeline import GuardrailPipeline
from ..services.monitoring import MetricsCollector
import asyncio
import time

class SupportAgentOrchestrator:
    def __init__(self):
        self.classifier = TicketClassifier()
        self.context_gatherer = ContextGatherer()
        self.responder = ResponseAgent()
        self.guardrail_pipeline = GuardrailPipeline()
        self.metrics = MetricsCollector()

    async def process_ticket(self, ticket: Dict[str, Any]) -> Dict[str, Any]:
        """Full ticket processing pipeline with monitoring and guardrails"""

        start_time = time.time()
        ticket_id = ticket['id']

        try:
            # Step 1: Input Validation
            validation = await self.guardrails.pipeline.validate_input(ticket)
            if not validation['safe']:
                return self._create_escalation(
                    ticket,
                    reason=f"Input validation failed: {validation['reason']}"
                )
            
            # Step 2: Classification
            classification = await self.classifier.classify_ticket(ticket)
            context_task = self.context_gatherer.gather(ticket)

            classification, context = await asyncio.gather(
                classification,
                context_task
            )

            # Step 3: Decision action based on classification
            action = self.decide_action(classification)

            # Step 4: Generate Response if applicable
            response_data = None
            if action == "auto_respond":
                response_data = await self.responder.generate_response(
                    ticket,
                    context,
                    classification
                )

                # Step 5: Output Validation
                output_check = await self.guardrail_pipeline.validate_output(
                    response_data['text'],
                    response_data['confidence']
                )

                if not output_check['safe']:
                    action = 'escalate'
                    response_data['escalation_reason'] = output_check['reason']

            # Step 6: Track Metrics
            latency = (time.time() - start_time) * 1000 # in milliseconds
            await self.metrics.record_processing(
                ticket_id=ticket_id,
                action=action,
                classification=classification,
                latency_ms=latency,
                confidence=classification.get('confidence', 0)
            )

            return {
                "ticket_id": ticket_id,
                "action": action,
                "classification": classification,
                "response": response_data,
                "context_retrieved": context,
                "latency_ms": latency,
                "timestamp": time.time()
            }
        
        except Exception as e:
            await self.metrics.record_error(ticket_id, str(e))
            return self._create_escalation(ticket, reason=f"Processing error: ")
        
    def decide_action(self, classification: Dict) -> str:
        """Decide logic for routing"""

        priority = classification['priority']
        category = classification['category']
        confidence = classification['confidence']

        # Escalation rules
        if priority == "critical":
            return "escalate"
        
        if confidence < 0.75:
            return "escalate"
        
        if category in ["billing", "account_security"]:
            return "escalate"
        
        # Auto-respond for low priority, high confidence tickets
        if category in ["product_question", "how_to"] and confidence >= 0.85:
            return "auto_respond"
        
        # Default: gather more context
        return "gather_info"
    
    def _create_escalation(self, ticket: Dict, reason: str) -> Dict:
        """Create escalation response"""
        return {
            "ticket_id": ticket['id'],
            "action": "escalate",
            "escalation_reason": reason,
            "requires_human": True,
            "timestamp": time.time()
        }