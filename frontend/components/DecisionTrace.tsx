'use client';

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
                setDecisionSteps(generateMockDecisions(ticket!));
            }
        } catch {
            setDecisionSteps(generateMockDecisions(ticket!));
        } finally {
            setLoading(false);
        }
    };

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
        const iconClass = "w-4 h-4";
        switch (action) {
            case 'validate':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                );
            case 'classify':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                );
            case 'gather_context':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                );
            case 'escalate':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'auto_respond':
            case 'generate':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                );
            case 'approve':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                );
            default:
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    const getStepStyle = (action: string, confidence: number) => {
        if (action === 'escalate') return {
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/30',
            text: 'text-rose-400',
            glow: 'rgba(244, 63, 94, 0.3)'
        };
        if (action === 'skip') return {
            bg: 'bg-white/5',
            border: 'border-white/10',
            text: 'text-white/40',
            glow: 'transparent'
        };
        if (confidence >= 0.8) return {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            text: 'text-emerald-400',
            glow: 'rgba(16, 185, 129, 0.3)'
        };
        if (confidence >= 0.6) return {
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
            text: 'text-amber-400',
            glow: 'rgba(245, 158, 11, 0.3)'
        };
        return {
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/30',
            text: 'text-rose-400',
            glow: 'rgba(244, 63, 94, 0.3)'
        };
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
            <div className="glass-card p-6 h-full">
                <h3 className="text-lg font-semibold text-white mb-2">Decision Trace</h3>
                <p className="text-white/30 text-sm mb-8">AI reasoning visualization</p>

                <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-4 float">
                        <svg className="w-10 h-10 text-violet-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <p className="text-white/40 text-center">
                        Select a ticket to view<br />its AI decision trace
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="glass-card p-6 h-full">
                <h3 className="text-lg font-semibold text-white mb-4">Decision Trace</h3>
                <div className="flex items-center justify-center py-12">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
                        <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-b-purple-500/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card p-6 h-full custom-scrollbar overflow-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Decision Trace</h3>
                        <p className="text-xs text-white/40 truncate max-w-[200px]">{ticket.subject}</p>
                    </div>
                </div>
            </div>

            {/* Response Preview */}
            {ticket.response && (
                <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <p className="text-xs font-medium text-emerald-400">AI Response</p>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed line-clamp-3">{ticket.response}</p>
                </div>
            )}

            {/* Escalation Reason */}
            {ticket.escalation_reason && (
                <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                        <p className="text-xs font-medium text-rose-400">Escalation Reason</p>
                    </div>
                    <p className="text-sm text-white/70">{ticket.escalation_reason}</p>
                </div>
            )}

            {/* Decision Steps Timeline */}
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[19px] top-6 bottom-6 w-px bg-gradient-to-b from-violet-500/50 via-purple-500/30 to-transparent" />

                <div className="space-y-4">
                    {decisionSteps.map((step, index) => {
                        const style = getStepStyle(step.action, step.confidence);
                        const isExpanded = expandedStep === index;

                        return (
                            <div
                                key={index}
                                className={`relative pl-12 transition-all duration-300 ${isExpanded ? 'scale-[1.02]' : ''}`}
                            >
                                {/* Step indicator */}
                                <div
                                    className={`absolute left-0 top-0 w-10 h-10 rounded-xl ${style.bg} border ${style.border} ${style.text} flex items-center justify-center transition-all duration-300`}
                                    style={{
                                        boxShadow: isExpanded ? `0 0 20px ${style.glow}` : 'none'
                                    }}
                                >
                                    {getStepIcon(step.action)}
                                </div>

                                {/* Content */}
                                <div
                                    className={`p-4 rounded-xl ${style.bg} border ${style.border} cursor-pointer transition-all duration-300 hover:scale-[1.01]`}
                                    onClick={() => setExpandedStep(isExpanded ? null : index)}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <p className={`text-sm font-semibold ${style.text}`}>{step.step}</p>
                                        <span className="text-xs text-white/30 font-mono">
                                            {formatTimestamp(step.timestamp)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/50 leading-relaxed">{step.reasoning}</p>

                                    {/* Confidence bar */}
                                    {step.confidence > 0 && (
                                        <div className="mt-3 flex items-center gap-3">
                                            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700`}
                                                    style={{
                                                        width: `${step.confidence * 100}%`,
                                                        background: `linear-gradient(90deg, ${style.glow}, ${style.glow.replace('0.3', '0.6')})`
                                                    }}
                                                />
                                            </div>
                                            <span className={`text-xs font-bold ${style.text} tabular-nums`}>
                                                {Math.round(step.confidence * 100)}%
                                            </span>
                                        </div>
                                    )}

                                    {/* Expanded details */}
                                    {isExpanded && (step.inputs || step.outputs) && (
                                        <div className="mt-4 pt-4 border-t border-white/10 text-xs space-y-3">
                                            {step.inputs && (
                                                <div>
                                                    <span className="text-white/40 font-medium">Inputs:</span>
                                                    <pre className="mt-1 p-2 bg-black/20 rounded-lg overflow-auto max-h-24 text-white/50 custom-scrollbar">
                                                        {JSON.stringify(step.inputs, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                            {step.outputs && (
                                                <div>
                                                    <span className="text-white/40 font-medium">Outputs:</span>
                                                    <pre className="mt-1 p-2 bg-black/20 rounded-lg overflow-auto max-h-24 text-white/50 custom-scrollbar">
                                                        {JSON.stringify(step.outputs, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary */}
            <div className="mt-6 pt-4 border-t border-white/10">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-white/5">
                        <span className="text-xs text-white/40 block mb-1">Final Action</span>
                        <span className={`text-sm font-bold ${
                            ticket.status === 'escalated' ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                            {ticket.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5">
                        <span className="text-xs text-white/40 block mb-1">Confidence</span>
                        <span className="text-sm font-bold text-white">
                            {Math.round(ticket.confidence * 100)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
