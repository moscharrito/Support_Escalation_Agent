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
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        autoResolvedRate: 0,
        avgConfidence: 0,
        escalationRate: 0,
        totalTickets: 0,
        pendingCount: 0
    });

    const fetchTickets = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/tickets?status=${filter}`, {
                headers: { 'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '' }
            });

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            setTickets(data.tickets || []);
            calculateMetrics(data.tickets || []);
        } catch {
            const demoTickets = generateDemoTickets();
            setTickets(demoTickets);
            calculateMetrics(demoTickets);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    const generateDemoTickets = (): Ticket[] => [
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
            response: 'I understand you\'re having trouble accessing your account. Please try clearing your browser cache and cookies, then attempt to log in again.'
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
            response: 'Thank you for your feature suggestion! We\'ve added dark mode support to our product roadmap.'
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
            response: 'To export your data to CSV, go to Settings > Data Management and click "Export Data".'
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

    const calculateMetrics = (ticketData: Ticket[]) => {
        const total = ticketData.length;
        if (total === 0) {
            setMetrics({ autoResolvedRate: 0, avgConfidence: 0, escalationRate: 0, totalTickets: 0, pendingCount: 0 });
            return;
        }

        const autoResolved = ticketData.filter(t => t.status === 'auto_resolved').length;
        const escalated = ticketData.filter(t => t.status === 'escalated').length;
        const pending = ticketData.filter(t => t.status === 'pending').length;
        const avgConf = ticketData.reduce((sum, t) => sum + (t.confidence || 0), 0) / total;

        setMetrics({
            autoResolvedRate: Math.round((autoResolved / total) * 100),
            avgConfidence: avgConf,
            escalationRate: Math.round((escalated / total) * 100),
            totalTickets: total,
            pendingCount: pending
        });
    };

    const handleOverride = async (ticketId: string, newResponse: string) => {
        try {
            await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/override`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || ''
                },
                body: JSON.stringify({ override_response: newResponse, reason: 'Human override' })
            });
            await fetchTickets();
        } catch (err) {
            console.error('Override failed:', err);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    useEffect(() => {
        const interval = setInterval(fetchTickets, 30000);
        return () => clearInterval(interval);
    }, [fetchTickets]);

    const filters = [
        { key: 'all', label: 'All Tickets' },
        { key: 'pending', label: 'Pending' },
        { key: 'auto_resolved', label: 'Resolved' },
        { key: 'escalated', label: 'Escalated' }
    ];

    if (loading && tickets.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-sm text-slate-400">Loading tickets...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-mesh noise-overlay">
            <div className="max-w-7xl mx-auto px-6 py-10">
                {/* Header */}
                <header className="mb-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
                                Support Dashboard
                            </h1>
                            <p className="text-sm text-slate-400 mt-1">
                                GenAI-powered ticket management
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Live indicator */}
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-xs font-medium text-emerald-400">Live</span>
                            </div>

                            {/* Refresh button */}
                            <button
                                onClick={fetchTickets}
                                className="btn-secondary p-2.5 rounded-xl"
                                aria-label="Refresh"
                            >
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Metrics */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                    <MetricCard
                        title="Resolved"
                        value={`${metrics.autoResolvedRate}%`}
                        subtitle={`${metrics.totalTickets} total tickets`}
                        icon="resolved"
                        variant="success"
                        trend="up"
                        trendValue="+5%"
                    />
                    <MetricCard
                        title="Confidence"
                        value={`${Math.round(metrics.avgConfidence * 100)}%`}
                        subtitle="Average AI score"
                        icon="confidence"
                        variant="info"
                        showRing
                        ringValue={metrics.avgConfidence * 100}
                    />
                    <MetricCard
                        title="Escalated"
                        value={`${metrics.escalationRate}%`}
                        subtitle="Needs human review"
                        icon="escalation"
                        variant="error"
                        trend={metrics.escalationRate > 20 ? 'down' : 'neutral'}
                    />
                    <MetricCard
                        title="Pending"
                        value={metrics.pendingCount}
                        subtitle="Awaiting processing"
                        icon="pending"
                        variant="warning"
                    />
                </section>

                {/* Filters */}
                <div className="flex items-center gap-2 mb-6 p-1 bg-slate-800/50 rounded-full w-fit">
                    {filters.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`pill-tab ${filter === key ? 'active' : ''}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <TicketTable
                            tickets={tickets}
                            onOverride={handleOverride}
                            onSelect={setSelectedTicket}
                            selectedId={selectedTicket?.id}
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <DecisionTrace ticket={selectedTicket} />
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-16 pt-8 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            Support Escalation Agent
                        </p>
                        <p className="text-xs text-slate-600">
                            Auto-refreshes every 30s
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}
