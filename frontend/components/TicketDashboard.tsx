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

interface DecisionStep {
    step: string;
    action: string;
    reasoning: string;
    confidence: number;
    timestamp: number;
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
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [filter]);

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

    // Handle ticket override (human takes over from auto-response)
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

            // Refresh tickets after override
            await fetchTickets();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Override failed');
        }
    };

    // Handle ticket selection for decision trace view
    const handleTicketSelect = (ticket: Ticket) => {
        setSelectedTicket(ticket);
    };

    // Filter change handler
    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter);
    };

    // Fetch tickets on mount and when filter changes
    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchTickets, 30000);
        return () => clearInterval(interval);
    }, [fetchTickets]);

    if (loading && tickets.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Support Ticket Dashboard</h1>
                <p className="text-gray-600">AI-powered ticket processing and escalation</p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-4 text-red-900 font-bold"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard
                    title="Auto-Resolved"
                    value={`${metrics.autoResolvedRate}%`}
                    subtitle={`${metrics.totalTickets} total tickets`}
                    trend="up"
                />
                <MetricCard
                    title="Avg Confidence"
                    value={metrics.avgConfidence.toFixed(2)}
                    subtitle="Model confidence score"
                    trend="neutral"
                />
                <MetricCard
                    title="Escalation Rate"
                    value={`${metrics.escalationRate}%`}
                    subtitle="Requires human review"
                    trend={metrics.escalationRate > 25 ? 'down' : 'up'}
                />
                <MetricCard
                    title="Pending"
                    value={metrics.pendingCount.toString()}
                    subtitle="Awaiting processing"
                    trend="neutral"
                />
            </div>

            {/* Filter Controls */}
            <div className="mb-4 flex gap-2">
                {['all', 'pending', 'auto_resolved', 'escalated'].map((status) => (
                    <button
                        key={status}
                        onClick={() => handleFilterChange(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border'
                        }`}
                    >
                        {status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </button>
                ))}
                <button
                    onClick={fetchTickets}
                    className="ml-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                >
                    Refresh
                </button>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Ticket Table - Takes 2 columns */}
                <div className="lg:col-span-2">
                    <TicketTable
                        tickets={tickets}
                        onOverride={handleOverride}
                        onSelect={handleTicketSelect}
                        selectedId={selectedTicket?.id}
                    />
                </div>

                {/* Decision Trace - Takes 1 column */}
                <div className="lg:col-span-1">
                    <DecisionTrace ticket={selectedTicket} />
                </div>
            </div>
        </div>
    );
}