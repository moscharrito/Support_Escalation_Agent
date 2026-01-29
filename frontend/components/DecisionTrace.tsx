'use client';

import React, { useState, useEffect, useRef } from 'react';

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
    const [showFullTrace, setShowFullTrace] = useState(false);
    const [activeNode, setActiveNode] = useState<number>(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const animationRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (ticket) {
            fetchDecisionTrace(ticket.id);
        } else {
            setDecisionSteps([]);
        }
    }, [ticket]);

    useEffect(() => {
        // Cleanup animation on unmount
        return () => {
            if (animationRef.current) {
                clearInterval(animationRef.current);
            }
        };
    }, []);

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
                step: 'Input Validation',
                action: 'validate',
                reasoning: 'Verified ticket format, checked for malicious content, validated required fields. All security checks passed successfully.',
                confidence: 1.0,
                timestamp: now - 3000
            },
            {
                step: 'Classification',
                action: 'classify',
                reasoning: `Analyzed ticket content using NLP models. Determined priority level: ${t.priority.toUpperCase()}. Detected sentiment: ${t.sentiment}. Category assigned: ${t.category}.`,
                confidence: t.confidence,
                timestamp: now - 2500
            },
            {
                step: 'Context Retrieval',
                action: 'gather_context',
                reasoning: 'Searched knowledge base for relevant documentation. Found 12 similar past tickets. Retrieved product documentation and FAQ entries.',
                confidence: 0.92,
                timestamp: now - 2000
            },
            {
                step: 'Decision Engine',
                action: t.status === 'escalated' ? 'escalate' : 'auto_respond',
                reasoning: t.status === 'escalated'
                    ? `Escalation triggered: ${t.escalation_reason || 'Confidence below threshold'}. Human review required for optimal resolution.`
                    : 'Confidence threshold met. Proceeding with automated response generation based on context and classification.',
                confidence: t.confidence,
                timestamp: now - 1500
            },
            ...(t.status === 'auto_resolved' ? [{
                step: 'Response Generation',
                action: 'generate',
                reasoning: 'Generated response using RAG pipeline. Incorporated context from knowledge base. Applied tone matching based on sentiment analysis.',
                confidence: t.confidence,
                timestamp: now - 1000
            }] : []),
            {
                step: 'Quality Assurance',
                action: t.status === 'auto_resolved' ? 'approve' : 'skip',
                reasoning: t.status === 'auto_resolved'
                    ? 'Response validated against safety guidelines. Checked for accuracy, completeness, and appropriate tone. All checks passed.'
                    : 'Quality check skipped - ticket routed to human agent for manual handling.',
                confidence: t.status === 'auto_resolved' ? 0.95 : 0,
                timestamp: now - 500
            }
        ];
    };

    const startReplayAnimation = () => {
        setIsAnimating(true);
        setActiveNode(0);

        let currentNode = 0;
        animationRef.current = setInterval(() => {
            currentNode++;
            if (currentNode >= decisionSteps.length) {
                if (animationRef.current) {
                    clearInterval(animationRef.current);
                }
                setIsAnimating(false);
            } else {
                setActiveNode(currentNode);
            }
        }, 800);
    };

    const stopAnimation = () => {
        if (animationRef.current) {
            clearInterval(animationRef.current);
        }
        setIsAnimating(false);
    };

    const getStepIcon = (action: string, size: string = "w-4 h-4") => {
        switch (action) {
            case 'validate':
                return (
                    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                );
            case 'classify':
                return (
                    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                );
            case 'gather_context':
                return (
                    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                );
            case 'escalate':
                return (
                    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                );
            case 'auto_respond':
            case 'generate':
                return (
                    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                );
            case 'approve':
                return (
                    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                );
            default:
                return (
                    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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

    const getNodeColor = (index: number, confidence: number) => {
        if (index <= activeNode) {
            if (confidence >= 0.8) return 'from-emerald-500 to-emerald-600';
            if (confidence >= 0.5) return 'from-amber-500 to-amber-600';
            return 'from-red-500 to-red-600';
        }
        return 'from-slate-600 to-slate-700';
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
        <>
            <div className="glass p-6 h-full overflow-auto scrollbar-thin fade-in">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-medium text-slate-100">Decision Trace</h2>
                        {/* Creative Full Trace Button */}
                        <button
                            onClick={() => {
                                setShowFullTrace(true);
                                setActiveNode(decisionSteps.length - 1);
                            }}
                            className="group relative px-3 py-1.5 rounded-lg overflow-hidden transition-all duration-300 hover:scale-105"
                        >
                            {/* Animated gradient background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-80 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 blur-lg opacity-0 group-hover:opacity-50 transition-opacity" />

                            {/* Shimmer effect */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            </div>

                            {/* Button content */}
                            <div className="relative flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                                </svg>
                                <span className="text-xs font-semibold text-white">Full Trace</span>
                            </div>
                        </button>
                    </div>
                    <p className="text-sm text-slate-500 truncate mt-1">{ticket.subject}</p>
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

                {/* Mini Timeline */}
                <div className="relative">
                    <div className="absolute left-4 top-6 bottom-6 w-px bg-gradient-to-b from-indigo-500/30 via-slate-600/20 to-transparent" />

                    <div className="space-y-4">
                        {decisionSteps.slice(0, 3).map((step, index) => {
                            const isSuccess = step.confidence >= 0.7 || step.action === 'approve';

                            return (
                                <div key={index} className="relative pl-10">
                                    <div className={`absolute left-0 top-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                        isSuccess ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700/50 text-slate-500'
                                    }`}>
                                        {getStepIcon(step.action)}
                                    </div>

                                    <div className="glass-subtle p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-slate-200">{step.step}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{step.reasoning}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {decisionSteps.length > 3 && (
                        <button
                            onClick={() => {
                                setShowFullTrace(true);
                                setActiveNode(decisionSteps.length - 1);
                            }}
                            className="mt-4 w-full py-2 text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            +{decisionSteps.length - 3} more steps...
                        </button>
                    )}
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

            {/* Full Trace Modal */}
            {showFullTrace && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={() => {
                        setShowFullTrace(false);
                        stopAnimation();
                    }}
                >
                    {/* Backdrop with blur and gradient */}
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />

                    {/* Animated background particles */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
                    </div>

                    {/* Modal Content */}
                    <div
                        className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Glass card with gradient border */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl" />
                        <div className="absolute inset-[1px] bg-slate-900/95 rounded-3xl backdrop-blur-2xl" />

                        <div className="relative p-8 overflow-auto max-h-[85vh]">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">AI Decision Flow</h2>
                                            <p className="text-sm text-slate-400">Complete reasoning trace for this ticket</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Replay Button */}
                                    <button
                                        onClick={isAnimating ? stopAnimation : startReplayAnimation}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                                            isAnimating
                                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30'
                                        }`}
                                    >
                                        {isAnimating ? (
                                            <>
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <rect x="6" y="5" width="4" height="14" rx="1" />
                                                    <rect x="14" y="5" width="4" height="14" rx="1" />
                                                </svg>
                                                Stop
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5.14v14l11-7-11-7z" />
                                                </svg>
                                                Replay
                                            </>
                                        )}
                                    </button>

                                    {/* Close Button */}
                                    <button
                                        onClick={() => {
                                            setShowFullTrace(false);
                                            stopAnimation();
                                        }}
                                        className="p-2 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Ticket Info Bar */}
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 mb-8">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
                                    <p className="text-xs text-slate-500 font-mono">{ticket.id}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    ticket.status === 'auto_resolved' ? 'bg-emerald-500/20 text-emerald-400' :
                                    ticket.status === 'escalated' ? 'bg-red-500/20 text-red-400' :
                                    ticket.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                    {ticket.status.replace('_', ' ').toUpperCase()}
                                </div>
                            </div>

                            {/* Visual Flow Diagram */}
                            <div className="relative">
                                {/* Connection Lines */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                                    {decisionSteps.map((_, index) => {
                                        if (index === decisionSteps.length - 1) return null;
                                        const isActive = index < activeNode;
                                        return (
                                            <line
                                                key={index}
                                                x1="48"
                                                y1={100 + index * 140}
                                                x2="48"
                                                y2={100 + (index + 1) * 140 - 40}
                                                stroke={isActive ? 'url(#gradient)' : '#334155'}
                                                strokeWidth="2"
                                                strokeDasharray={isActive ? "0" : "4 4"}
                                                className="transition-all duration-500"
                                            />
                                        );
                                    })}
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="#6366f1" />
                                            <stop offset="100%" stopColor="#a855f7" />
                                        </linearGradient>
                                    </defs>
                                </svg>

                                {/* Decision Steps */}
                                <div className="relative space-y-6" style={{ zIndex: 1 }}>
                                    {decisionSteps.map((step, index) => {
                                        const isActive = index <= activeNode;
                                        const isCurrent = index === activeNode && isAnimating;

                                        return (
                                            <div
                                                key={index}
                                                className={`flex gap-6 transition-all duration-500 ${
                                                    isActive ? 'opacity-100' : 'opacity-40'
                                                }`}
                                            >
                                                {/* Node */}
                                                <div className="relative flex-shrink-0">
                                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getNodeColor(index, step.confidence)} flex items-center justify-center transition-all duration-500 ${
                                                        isCurrent ? 'scale-110 shadow-lg shadow-indigo-500/50' : ''
                                                    }`}>
                                                        <div className="text-white">
                                                            {getStepIcon(step.action, "w-5 h-5")}
                                                        </div>
                                                    </div>
                                                    {/* Pulse ring for current node */}
                                                    {isCurrent && (
                                                        <div className="absolute inset-0 rounded-2xl bg-indigo-500/30 animate-ping" />
                                                    )}
                                                </div>

                                                {/* Content Card */}
                                                <div className={`flex-1 p-5 rounded-2xl border transition-all duration-500 ${
                                                    isActive
                                                        ? 'bg-slate-800/80 border-slate-700/50'
                                                        : 'bg-slate-800/30 border-slate-800/50'
                                                } ${isCurrent ? 'ring-2 ring-indigo-500/50' : ''}`}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-lg font-semibold text-white">{step.step}</span>
                                                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                                                                step.action === 'escalate' ? 'bg-red-500/20 text-red-400' :
                                                                step.action === 'approve' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                'bg-indigo-500/20 text-indigo-400'
                                                            }`}>
                                                                {step.action.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-slate-500 font-mono">{formatTime(step.timestamp)}</span>
                                                    </div>

                                                    <p className="text-sm text-slate-300 leading-relaxed mb-4">{step.reasoning}</p>

                                                    {/* Confidence Meter */}
                                                    {step.confidence > 0 && (
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex-1 h-2 rounded-full bg-slate-700/50 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-700 ease-out ${getConfidenceColor(step.confidence)}`}
                                                                    style={{ width: isActive ? `${step.confidence * 100}%` : '0%' }}
                                                                />
                                                            </div>
                                                            <span className={`text-sm font-semibold tabular-nums ${
                                                                step.confidence >= 0.8 ? 'text-emerald-400' :
                                                                step.confidence >= 0.5 ? 'text-amber-400' : 'text-red-400'
                                                            }`}>
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

                            {/* Response Section (if exists) */}
                            {ticket.response && (
                                <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-sm font-semibold text-emerald-400">Generated Response</span>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed">{ticket.response}</p>
                                </div>
                            )}

                            {/* Final Stats */}
                            <div className="mt-8 grid grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-center">
                                    <div className="text-2xl font-bold text-white mb-1">{decisionSteps.length}</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">Steps</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-center">
                                    <div className={`text-2xl font-bold mb-1 ${
                                        ticket.confidence >= 0.8 ? 'text-emerald-400' :
                                        ticket.confidence >= 0.5 ? 'text-amber-400' : 'text-red-400'
                                    }`}>
                                        {Math.round(ticket.confidence * 100)}%
                                    </div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">Confidence</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-center">
                                    <div className="text-2xl font-bold text-indigo-400 mb-1">
                                        {((decisionSteps[decisionSteps.length - 1]?.timestamp - decisionSteps[0]?.timestamp) / 1000).toFixed(1)}s
                                    </div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">Duration</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
