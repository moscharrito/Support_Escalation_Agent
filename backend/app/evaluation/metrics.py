# Classification metrics for evaluation

from dataclasses import dataclass

@dataclass
class EvalMetrics:
    accuracy: float   # Classification accuracy
    precision: float # Auto-resolve precision
    recall: float  # Critical Ticket catch rate
    avg_confidence: float
    false_escalation_rate: float
    response_time_p95: float # 95th percentile response time in seconds

class EvaluationSuite:
    def __innit__(self, test_set: list):
        self.test_set = test_set

    async def run_evaluation(self) -> EvalMetrics:
        """Run agent on test set, and compare the metrics with ground truth labels"""

        results = []
        for ticket in self.test_set:
            prediction = await self.agent.process(ticket)
            ground_truth = ticket['expected']

            results.append({
                'correct': prediction['action'] == ground_truth['action'],
                'confidence': prediction['confidence'],
                'latency': prediction['latency_ms']
            })

        return self._calculate_metrics(results)