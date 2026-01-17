# app/services/feedback.py
from time import time
from ..database import get_db

class FeedbackLoop:
    """Collect human feedback to improve agent over time"""
    
    async def record_override(self, ticket_id: str, human_action: str, agent_action: str):
        """Track when humans override agent decisions"""
        
        db = get_db()
        await db.feedback.insert_one({
            "ticket_id": ticket_id,
            "agent_action": agent_action,
            "human_action": human_action,
            "timestamp": time.time()
        })
        
        # Trigger retraining if disagreement rate exceeds threshold
        disagreement_rate = await self._calculate_disagreement_rate()
        if disagreement_rate > 0.15:  # 15% threshold
            await self._trigger_model_update()
    
    async def _calculate_disagreement_rate(self) -> float:
        """Calculate recent human override rate"""
        db = get_db()
        recent_feedback = await db.feedback.find({
            "timestamp": {"$gt": time.time() - 86400}  # Last 24 hours
        }).to_list(1000)
        
        disagreements = sum(
            1 for f in recent_feedback 
            if f['agent_action'] != f['human_action']
        )
        
        return disagreements / len(recent_feedback) if recent_feedback else 0
    
    async def _trigger_model_update(self):
        """Queue model retraining job"""
        # Add to training queue with recent feedback
        pass