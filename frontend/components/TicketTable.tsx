'use client';

import React, { useState } from 'react';

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

interface TicketTableProps {
    tickets: Ticket[];
    onOverride: (ticketId: string, newResponse: string) => void;
    onSelect: (ticket: Ticket) => void;
    selectedId?: string;
}

export default function TicketTable({
    tickets,
    onOverride,
    onSelect,
    selectedId
}: TicketTableProps) {
    const [overrideModal, setOverrideModal] = useState<{
        isOpen: boolean;
        ticketId: string;
        currentResponse: string;
    }>({
        isOpen: false,
        ticketId: '',
        currentResponse: ''
    });
    const [newResponse, setNewResponse] = useState('');

    const getStatusBadge = (status: Ticket['status']) => {
        const styles = {
            pending: 'badge-pending',
            auto_resolved: 'badge-resolved',
            escalated: 'badge-escalated',
            in_progress: 'badge-in-progress'
        };

        const labels = {
            pending: 'Pending',
            auto_resolved: 'Resolved',
            escalated: 'Escalated',
            in_progress: 'In Progress'
        };

        const dotStyles = {
            pending: 'pending',
            auto_resolved: 'resolved',
            escalated: 'escalated',
            in_progress: 'in-progress'
        };

        return (
            <span className={`badge ${styles[status]} flex items-center gap-2`}>
                <span className={`status-dot ${dotStyles[status]}`} />
                {labels[status]}
            </span>
        );
    };

    const getPriorityBadge = (priority: Ticket['priority']) => {
        const styles = {
            low: 'badge-low',
            medium: 'badge-medium',
            high: 'badge-high',
            critical: 'badge-critical'
        };

        const icons = {
            low: (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            ),
            medium: (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
            ),
            high: (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
            ),
            critical: (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            )
        };

        return (
            <span className={`badge ${styles[priority]} flex items-center gap-1.5`}>
                {icons[priority]}
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </span>
        );
    };

    const getSentimentIcon = (sentiment: Ticket['sentiment']) => {
        switch (sentiment) {
            case 'positive':
                return (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                );
            case 'negative':
                return (
                    <div className="flex items-center gap-1.5 text-rose-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-1.536 4.464a1 1 0 00-1.414-1.414 3 3 0 00-4.242 0 1 1 0 01-1.414-1.414 5 5 0 017.072 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-1.5 text-white/40">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7 4a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                    </div>
                );
        }
    };

    const getConfidenceBar = (confidence: number) => {
        const percentage = Math.round(confidence * 100);
        const getColor = () => {
            if (confidence >= 0.8) return 'from-emerald-500 to-teal-400';
            if (confidence >= 0.6) return 'from-amber-500 to-yellow-400';
            return 'from-rose-500 to-pink-400';
        };

        return (
            <div className="flex items-center gap-3">
                <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${getColor()} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <span className="text-xs font-medium text-white/60 tabular-nums w-8">
                    {percentage}%
                </span>
            </div>
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const handleOverrideClick = (ticket: Ticket) => {
        setOverrideModal({
            isOpen: true,
            ticketId: ticket.id,
            currentResponse: ticket.response || ''
        });
        setNewResponse(ticket.response || '');
    };

    const handleOverrideSubmit = () => {
        onOverride(overrideModal.ticketId, newResponse);
        setOverrideModal({ isOpen: false, ticketId: '', currentResponse: '' });
        setNewResponse('');
    };

    if (tickets.length === 0) {
        return (
            <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                </div>
                <p className="text-white/50 text-lg font-medium">No tickets found</p>
                <p className="text-white/30 text-sm mt-1">Tickets will appear here when created</p>
            </div>
        );
    }

    return (
        <>
            <div className="glass-card overflow-hidden">
                {/* Table Header */}
                <div className="px-6 py-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Recent Tickets</h3>
                        <span className="text-sm text-white/40">{tickets.length} total</span>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Ticket</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Confidence</th>
                                <th>Sentiment</th>
                                <th>Created</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.map((ticket, index) => (
                                <tr
                                    key={ticket.id}
                                    onClick={() => onSelect(ticket)}
                                    className={`cursor-pointer transition-all duration-200 ${
                                        selectedId === ticket.id
                                            ? 'bg-violet-500/10 border-l-2 border-l-violet-500'
                                            : 'hover:bg-white/5'
                                    }`}
                                    style={{
                                        animationDelay: `${index * 50}ms`
                                    }}
                                >
                                    <td>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium text-white truncate max-w-xs">
                                                {ticket.subject}
                                            </span>
                                            <span className="text-xs text-white/30 font-mono">
                                                #{ticket.id.slice(0, 8)}
                                            </span>
                                        </div>
                                    </td>
                                    <td>{getStatusBadge(ticket.status)}</td>
                                    <td>{getPriorityBadge(ticket.priority)}</td>
                                    <td>{getConfidenceBar(ticket.confidence)}</td>
                                    <td>{getSentimentIcon(ticket.sentiment)}</td>
                                    <td>
                                        <span className="text-sm text-white/50">
                                            {formatDate(ticket.created_at)}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        {ticket.status === 'auto_resolved' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOverrideClick(ticket);
                                                }}
                                                className="px-3 py-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-all duration-200"
                                            >
                                                Override
                                            </button>
                                        )}
                                        {ticket.status === 'escalated' && (
                                            <span className="px-3 py-1.5 text-xs font-medium text-rose-400 bg-rose-500/10 rounded-lg flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                                                Review
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Override Modal */}
            {overrideModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-2xl w-full p-6">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-white">Override Response</h3>
                            </div>
                            <button
                                onClick={() => setOverrideModal({ isOpen: false, ticketId: '', currentResponse: '' })}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Current Response */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-white/50 mb-2">
                                Current AI Response
                            </label>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-sm text-white/70 leading-relaxed">
                                    {overrideModal.currentResponse || 'No response generated'}
                                </p>
                            </div>
                        </div>

                        {/* New Response */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-white/50 mb-2">
                                Your Response
                            </label>
                            <textarea
                                value={newResponse}
                                onChange={(e) => setNewResponse(e.target.value)}
                                className="w-full h-40 p-4 rounded-xl bg-white/5 border border-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 text-white placeholder-white/30 resize-none transition-all duration-200"
                                placeholder="Enter the corrected response..."
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setOverrideModal({ isOpen: false, ticketId: '', currentResponse: '' })}
                                className="pill-button"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleOverrideSubmit}
                                className="glow-button text-sm"
                            >
                                Submit Override
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
