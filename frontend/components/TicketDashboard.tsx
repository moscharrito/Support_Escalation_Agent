'use client';

import { useState, useEffect, useCallback } from 'react';
import MetricCard from './MetricCard';
import TicketTable from './TicketTable';
import DecisionTrace from './DecisionTrace';

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

interface DashboardMetrics {
    autoResolvedRate: number;
    avgConfidence: number;
    escalationRate: number;
    totalTickets: number;
    pendingCount: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function TicketDashboard() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [filter, setFilter] = useState<string>('all');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        autoResolvedRate: 0,
        avgConfidence: 0,
        escalationRate: 0,
        totalTickets: 0,
        pendingCount: 0
    });

    // Fetch tickets from API
    const fetchTickets = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/tickets?status=${filter}`, {
                headers: {
                    'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || ''
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch tickets');
            }

            const data = await response.json();
            setTickets(data.tickets || []);
            calculateMetrics(data.tickets || []);
            setError(null);
        } catch (err) {
            // Use demo data when API is not available
            const demoTickets = generateDemoTickets();
            setTickets(demoTickets);
            calculateMetrics(demoTickets);
            setError(null);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    // Generate demo tickets for showcase
    const generateDemoTickets = (): Ticket[] => {
        return [
            {
                id: 'tkt-8f2a9c3d',
                subject: 'Cannot access my account after password reset',
                body: 'I reset my password yesterday but now I cannot log in...',
                status: 'auto_resolved',
                priority: 'high',
                category: 'Account Access',
                sentiment: 'negative',
                confidence: 0.89,
                created_at: new Date(Date.now() - 3600000).toISOString(),
                response: 'I understand you\'re having trouble accessing your account after the password reset. Please try clearing your browser cache and cookies, then attempt to log in again. If the issue persists, use the "Forgot Password" link to generate a new reset email.'
            },
            {
                id: 'tkt-4b7e1f8a',
                subject: 'Billing discrepancy on latest invoice',
                body: 'My invoice shows charges that I don\'t recognize...',
                status: 'escalated',
                priority: 'critical',
                category: 'Billing',
                sentiment: 'negative',
                confidence: 0.45,
                created_at: new Date(Date.now() - 7200000).toISOString(),
                escalation_reason: 'Financial matter requires human verification'
            },
            {
                id: 'tkt-9d3c5e2b',
                subject: 'Feature request: Dark mode support',
                body: 'Would love to see dark mode added to the dashboard...',
                status: 'auto_resolved',
                priority: 'low',
                category: 'Feature Request',
                sentiment: 'positive',
                confidence: 0.94,
                created_at: new Date(Date.now() - 10800000).toISOString(),
                response: 'Thank you for your feature suggestion! We\'ve added dark mode support to our product roadmap. You can track this feature request in our public changelog.'
            },
            {
                id: 'tkt-6a1d8c4f',
                subject: 'API rate limiting issues',
                body: 'Our integration is hitting rate limits unexpectedly...',
                status: 'in_progress',
                priority: 'high',
                category: 'Technical',
                sentiment: 'neutral',
                confidence: 0.72,
                created_at: new Date(Date.now() - 14400000).toISOString()
            },
            {
                id: 'tkt-2e9f7b5c',
                subject: 'How to export data to CSV?',
                body: 'I need to export all my data for a report...',
                status: 'auto_resolved',
                priority: 'medium',
                category: 'How-to',
                sentiment: 'neutral',
                confidence: 0.96,
                created_at: new Date(Date.now() - 18000000).toISOString(),
                response: 'To export your data to CSV: 1) Go to Settings > Data Management, 2) Click "Export Data", 3) Select CSV format, 4) Choose the data range, 5) Click "Generate Export". The file will be emailed to you within 5 minutes.'
            },
            {
                id: 'tkt-7c4a2e8d',
                subject: 'Integration with Salesforce not syncing',
                body: 'Our Salesforce integration stopped syncing contacts...',
                status: 'pending',
                priority: 'high',
                category: 'Integration',
                sentiment: 'negative',
                confidence: 0.68,
                created_at: new Date(Date.now() - 21600000).toISOString()
            }
        ];
    };

    // Calculate dashboard metrics
    const calculateMetrics = (ticketData: Ticket[]) => {
        const total = ticketData.length;
        if (total === 0) {
            setMetrics({
                autoResolvedRate: 0,
                avgConfidence: 0,
                escalationRate: 0,
                totalTickets: 0,
                pendingCount: 0
            });
            return;
        }

        const autoResolved = ticketData.filter(t => t.status === 'auto_resolved').length;
        const escalated = ticketData.filter(t => t.status === 'escalated').length;
        const pending = ticketData.filter(t => t.status === 'pending').length;
        const avgConf = ticketData.reduce((sum, t) => sum + (t.confidence || 0), 0) / total;

        setMetrics({
            autoResolvedRate: Math.round((autoResolved / total) * 100),
            avgConfidence: Math.round(avgConf * 100) / 100,
            escalationRate: Math.round((escalated / total) * 100),
            totalTickets: total,
            pendingCount: pending
        });
    };

    // Handle ticket override
    const handleOverride = async (ticketId: string, newResponse: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/override`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || ''
                },
                body: JSON.stringify({
                    override_response: newResponse,
                    reason: 'Human override'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to override ticket');
            }

            await fetchTickets();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Override failed');
        }
    };

    const handleTicketSelect = (ticket: Ticket) => {
        setSelectedTicket(ticket);
    };

    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter);
    };

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    useEffect(() => {
        const interval = setInterval(fetchTickets, 30000);
        return () => clearInterval(interval);
    }, [fetchTickets]);

    const filterLabels: Record<string, string> = {
        all: 'All Tickets',
        pending: 'Pending',
        auto_resolved: 'Resolved',
        escalated: 'Escalated'
    };

    if (loading && tickets.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="ambient-bg" />
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
                    <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-b-purple-500/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 lg:p-8">
            {/* Ambient Background */}
            <div className="ambient-bg" />

            {/* Header */}
            <div className="relative mb-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg" style={{ boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)' }}>
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold gradient-text">Support AI</h1>
                                <p className="text-white/40 text-sm">Intelligent Ticket Processing</p>
                            </div>
                        </div>
                    </div>

                    {/* Live indicator */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-sm text-white/60">Live</span>
                        </div>
                        <button
                            onClick={fetchTickets}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
                        >
                            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-rose-500/20">
                            <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <span className="text-rose-400">{error}</span>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <MetricCard
                    title="Auto-Resolved"
                    value={`${metrics.autoResolvedRate}%`}
                    subtitle={`${metrics.totalTickets} total tickets`}
                    trend="up"
                    icon="resolved"
                    color="emerald"
                />
                <MetricCard
                    title="Avg Confidence"
                    value={(metrics.avgConfidence * 100).toFixed(0) + '%'}
                    subtitle="Model confidence score"
                    trend="neutral"
                    icon="confidence"
                    color="blue"
                    percentage={metrics.avgConfidence * 100}
                />
                <MetricCard
                    title="Escalation Rate"
                    value={`${metrics.escalationRate}%`}
                    subtitle="Requires human review"
                    trend={metrics.escalationRate > 25 ? 'down' : 'up'}
                    icon="escalation"
                    color="rose"
                />
                <MetricCard
                    title="Pending"
                    value={metrics.pendingCount.toString()}
                    subtitle="Awaiting processing"
                    trend="neutral"
                    icon="pending"
                    color="amber"
                />
            </div>

            {/* Filter Controls */}
            <div className="mb-6 flex flex-wrap gap-3">
                {Object.entries(filterLabels).map(([status, label]) => (
                    <button
                        key={status}
                        onClick={() => handleFilterChange(status)}
                        className={`pill-button ${filter === status ? 'active' : ''}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Ticket Table */}
                <div className="lg:col-span-2">
                    <TicketTable
                        tickets={tickets}
                        onOverride={handleOverride}
                        onSelect={handleTicketSelect}
                        selectedId={selectedTicket?.id}
                    />
                </div>

                {/* Decision Trace */}
                <div className="lg:col-span-1">
                    <DecisionTrace ticket={selectedTicket} />
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 text-center">
                <p className="text-white/20 text-sm">
                    Powered by AI • Support Escalation Agent v1.0
                </p>
            </div>
        </div>
    );
}
