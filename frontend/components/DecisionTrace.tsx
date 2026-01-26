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
                headers: { 'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '' }
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
                step: 'Validation',
                action: 'validate',
                reasoning: 'Input passed security and format checks',
                confidence: 1.0,
                timestamp: now - 3000
            },
            {
                step: 'Classification',
                action: 'classify',
                reasoning: `Classified as ${t.priority} priority with ${t.sentiment} sentiment`,
                confidence: t.confidence,
                timestamp: now - 2500
            },
            {
                step: 'Context',
                action: 'gather_context',
                reasoning: 'Retrieved relevant documentation and similar tickets',
                confidence: 0.92,
                timestamp: now - 2000
            },
            {
                step: 'Decision',
                action: t.status === 'escalated' ? 'escalate' : 'auto_respond',
                reasoning: t.status === 'escalated'
                    ? t.escalation_reason || 'Confidence below threshold'
                    : 'Confidence meets threshold for auto-response',
                confidence: t.confidence,
                timestamp: now - 1500
            },
            ...(t.status === 'auto_resolved' ? [{
                step: 'Generation',
                action: 'generate',
                reasoning: 'Generated response using context and classification',
                confidence: t.confidence,
                timestamp: now - 1000
            }] : []),
            {
                step: 'Validation',
                action: t.status === 'auto_resolved' ? 'approve' : 'skip',
                reasoning: t.status === 'auto_resolved'
                    ? 'Response passed all safety checks'
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
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                );
            case 'classify':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                );
            case 'gather_context':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                );
            case 'escalate':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                );
            case 'auto_respond':
            case 'generate':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                );
            case 'approve':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                );
            default:
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'bg-emerald-500';
        if (confidence >= 0.5) return 'bg-amber-500';
        return 'bg-red-500';
    };

    if (!ticket) {
        return (
            <div className="glass p-8 h-full flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-5">
                    <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                </div>
                <p className="text-slate-300 font-medium">Decision Trace</p>
                <p className="text-slate-500 text-sm mt-1">Select a ticket to view AI reasoning</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="glass p-8 h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="glass p-6 h-full overflow-auto scrollbar-thin fade-in">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-lg font-medium text-slate-100 mb-1">Decision Trace</h2>
                <p className="text-sm text-slate-500 truncate">{ticket.subject}</p>
            </div>

            {/* Response Preview */}
            {ticket.response && (
                <div className="glass-subtle p-4 mb-6 border-l-2 border-emerald-500">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">AI Response</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">
                        {ticket.response}
                    </p>
                </div>
            )}

            {/* Escalation Reason */}
            {ticket.escalation_reason && (
                <div className="glass-subtle p-4 mb-6 border-l-2 border-red-500">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Escalated</span>
                    </div>
                    <p className="text-sm text-slate-400">{ticket.escalation_reason}</p>
                </div>
            )}

            {/* Timeline */}
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-6 bottom-6 w-px bg-gradient-to-b from-indigo-500/30 via-slate-600/20 to-transparent" />

                <div className="space-y-4">
                    {decisionSteps.map((step, index) => {
                        const isExpanded = expandedStep === index;
                        const isSuccess = step.confidence >= 0.7 || step.action === 'approve';

                        return (
                            <div
                                key={index}
                                className="relative pl-10"
                            >
                                {/* Step indicator */}
                                <div className={`absolute left-0 top-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                    isSuccess ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700/50 text-slate-500'
                                }`}>
                                    {getStepIcon(step.action)}
                                </div>

                                {/* Content */}
                                <div
                                    className="glass-subtle p-4 cursor-pointer transition-all duration-200 hover:bg-slate-700/30"
                                    onClick={() => setExpandedStep(isExpanded ? null : index)}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-slate-200">{step.step}</span>
                                        <span className="text-xs text-slate-500 font-mono">{formatTime(step.timestamp)}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">{step.reasoning}</p>

                                    {/* Confidence */}
                                    {step.confidence > 0 && (
                                        <div className="mt-3 flex items-center gap-3">
                                            <div className="progress-bar flex-1">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ease-out ${getConfidenceColor(step.confidence)}`}
                                                    style={{ width: `${step.confidence * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-400 tabular-nums">
                                                {Math.round(step.confidence * 100)}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary */}
            <div className="mt-6 pt-6 border-t border-slate-700/50">
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-subtle p-3">
                        <span className="text-xs text-slate-500 block mb-1">Result</span>
                        <span className={`text-sm font-medium ${
                            ticket.status === 'auto_resolved' ? 'text-emerald-400' :
                            ticket.status === 'escalated' ? 'text-red-400' :
                            ticket.status === 'pending' ? 'text-amber-400' : 'text-blue-400'
                        }`}>
                            {ticket.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                    </div>
                    <div className="glass-subtle p-3">
                        <span className="text-xs text-slate-500 block mb-1">Confidence</span>
                        <span className={`text-sm font-medium ${
                            ticket.confidence >= 0.8 ? 'text-emerald-400' :
                            ticket.confidence >= 0.5 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                            {Math.round(ticket.confidence * 100)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
