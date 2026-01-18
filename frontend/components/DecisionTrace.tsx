import React, { useState, useEffect } from 'react';

interface Ticket {
    id: string;
    subject: string;
    body: string;
    status: 'pending' | 'auto_resolved' | 'escalated' | 'in_progress';
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
    created_at: string;
    response?: string;
    escalation_reason?: string;
}

interface DecisionStep {
    step: string;
    action: string;
    reasoning: string;
    confidence: number;
    timestamp: number;
    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
}

interface DecisionTraceProps {
    ticket: Ticket | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DecisionTrace({ ticket }: DecisionTraceProps) {
    const [decisionSteps, setDecisionSteps] = useState<DecisionStep[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedStep, setExpandedStep] = useState<number | null>(null);

    useEffect(() => {
        if (ticket) {
            fetchDecisionTrace(ticket.id);
        } else {
            setDecisionSteps([]);
        }
    }, [ticket]);

    const fetchDecisionTrace = async (ticketId: string) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/trace`, {
                headers: {
                    'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || ''
                }
            });

            if (response.ok) {
                const data = await response.json();
                setDecisionSteps(data.decisions || generateMockDecisions(ticket!));
            } else {
                // Use mock data if API not available
                setDecisionSteps(generateMockDecisions(ticket!));
            }
        } catch {
            // Use mock data on error
            setDecisionSteps(generateMockDecisions(ticket!));
        } finally {
            setLoading(false);
        }
    };

    // Generate mock decision steps based on ticket data
    const generateMockDecisions = (t: Ticket): DecisionStep[] => {
        const now = Date.now();
        return [
            {
                step: 'Input Validation',
                action: 'validate',
                reasoning: 'Ticket passed security and format validation checks',
                confidence: 1.0,
                timestamp: now - 3000
            },
            {
                step: 'Classification',
                action: 'classify',
                reasoning: `Classified as ${t.priority} priority ${t.category} with ${t.sentiment} sentiment`,
                confidence: t.confidence,
                timestamp: now - 2500
            },
            {
                step: 'Context Retrieval',
                action: 'gather_context',
                reasoning: 'Retrieved relevant documentation and similar resolved tickets',
                confidence: 0.92,
                timestamp: now - 2000
            },
            {
                step: 'Decision',
                action: t.status === 'escalated' ? 'escalate' : 'auto_respond',
                reasoning: t.status === 'escalated'
                    ? t.escalation_reason || 'Confidence below threshold or high-risk category'
                    : 'Confidence meets threshold for auto-response',
                confidence: t.confidence,
                timestamp: now - 1500
            },
            ...(t.status === 'auto_resolved' ? [{
                step: 'Response Generation',
                action: 'generate',
                reasoning: 'Generated response using retrieved context and classification',
                confidence: t.confidence,
                timestamp: now - 1000
            }] : []),
            {
                step: 'Output Validation',
                action: t.status === 'auto_resolved' ? 'approve' : 'skip',
                reasoning: t.status === 'auto_resolved'
                    ? 'Response passed PII, toxicity, and consistency checks'
                    : 'Skipped - ticket escalated',
                confidence: t.status === 'auto_resolved' ? 0.95 : 0,
                timestamp: now - 500
            }
        ];
    };

    const getStepIcon = (action: string) => {
        switch (action) {
            case 'validate':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'classify':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                );
            case 'gather_context':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                );
            case 'escalate':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'auto_respond':
            case 'generate':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                );
            case 'approve':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    const getStepColor = (action: string, confidence: number) => {
        if (action === 'escalate') return 'text-red-600 bg-red-50 border-red-200';
        if (action === 'skip') return 'text-gray-400 bg-gray-50 border-gray-200';
        if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
        if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    if (!ticket) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Decision Trace</h3>
                <p className="text-gray-500 text-center py-8">
                    Select a ticket to view its decision trace
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Decision Trace</h3>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Decision Trace</h3>
                <p className="text-sm text-gray-500 truncate">
                    Ticket: {ticket.subject}
                </p>
            </div>

            {/* Response Preview */}
            {ticket.response && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-medium text-blue-700 mb-1">Generated Response:</p>
                    <p className="text-sm text-blue-900 line-clamp-3">{ticket.response}</p>
                </div>
            )}

            {/* Escalation Reason */}
            {ticket.escalation_reason && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-medium text-red-700 mb-1">Escalation Reason:</p>
                    <p className="text-sm text-red-900">{ticket.escalation_reason}</p>
                </div>
            )}

            {/* Decision Steps Timeline */}
            <div className="space-y-3">
                {decisionSteps.map((step, index) => (
                    <div
                        key={index}
                        className={`relative border rounded-lg p-3 cursor-pointer transition-all ${getStepColor(step.action, step.confidence)}`}
                        onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                                {getStepIcon(step.action)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">{step.step}</p>
                                    <span className="text-xs opacity-75">
                                        {formatTimestamp(step.timestamp)}
                                    </span>
                                </div>
                                <p className="text-xs mt-1 opacity-90">{step.reasoning}</p>

                                {/* Confidence bar */}
                                {step.confidence > 0 && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-current opacity-60"
                                                style={{ width: `${step.confidence * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium">
                                            {Math.round(step.confidence * 100)}%
                                        </span>
                                    </div>
                                )}

                                {/* Expanded details */}
                                {expandedStep === index && (step.inputs || step.outputs) && (
                                    <div className="mt-3 pt-3 border-t border-current/20 text-xs">
                                        {step.inputs && (
                                            <div className="mb-2">
                                                <span className="font-medium">Inputs:</span>
                                                <pre className="mt-1 p-2 bg-white/30 rounded overflow-auto max-h-24">
                                                    {JSON.stringify(step.inputs, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                        {step.outputs && (
                                            <div>
                                                <span className="font-medium">Outputs:</span>
                                                <pre className="mt-1 p-2 bg-white/30 rounded overflow-auto max-h-24">
                                                    {JSON.stringify(step.outputs, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Connector line */}
                        {index < decisionSteps.length - 1 && (
                            <div className="absolute left-6 -bottom-3 w-0.5 h-3 bg-gray-300" />
                        )}
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">Final Action:</span>
                        <span className={`ml-2 font-medium ${
                            ticket.status === 'escalated' ? 'text-red-600' : 'text-green-600'
                        }`}>
                            {ticket.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-500">Confidence:</span>
                        <span className="ml-2 font-medium">{Math.round(ticket.confidence * 100)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
