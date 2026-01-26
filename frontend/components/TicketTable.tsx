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
    }>({ isOpen: false, ticketId: '', currentResponse: '' });
    const [newResponse, setNewResponse] = useState('');

    const getStatusBadge = (status: Ticket['status']) => {
        const config = {
            pending: { label: 'Pending', class: 'status-pending', dotClass: 'bg-amber-400' },
            auto_resolved: { label: 'Resolved', class: 'status-resolved', dotClass: 'bg-emerald-400' },
            escalated: { label: 'Escalated', class: 'status-escalated', dotClass: 'bg-red-400' },
            in_progress: { label: 'In Progress', class: 'status-in-progress', dotClass: 'bg-blue-400' }
        };
        const { label, class: className, dotClass } = config[status];

        return (
            <span className={`status-badge ${className}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                {label}
            </span>
        );
    };

    const getPriorityText = (priority: Ticket['priority']) => {
        const config = {
            low: { class: 'text-slate-400', label: 'Low' },
            medium: { class: 'text-amber-400', label: 'Medium' },
            high: { class: 'text-orange-400', label: 'High' },
            critical: { class: 'text-red-400 font-semibold', label: 'Critical' }
        };

        return (
            <span className={`text-xs uppercase tracking-wider ${config[priority].class}`}>
                {config[priority].label}
            </span>
        );
    };

    const getConfidenceBar = (confidence: number) => {
        const percentage = Math.round(confidence * 100);
        const barColor = percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500';

        return (
            <div className="flex items-center gap-3">
                <div className="progress-bar w-16">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <span className="text-xs text-slate-400 tabular-nums w-8">
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

        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
            <div className="glass p-16 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-700/50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                </div>
                <p className="text-slate-400 text-lg font-light">No tickets found</p>
                <p className="text-slate-600 text-sm mt-2">Tickets will appear here when created</p>
            </div>
        );
    }

    return (
        <>
            <div className="glass overflow-hidden fade-in">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-700/50">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-medium text-slate-100">Tickets</h2>
                        <span className="text-sm text-slate-500">{tickets.length} total</span>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto scrollbar-thin">
                    <table className="table-modern">
                        <thead>
                            <tr>
                                <th>Ticket</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Confidence</th>
                                <th>Time</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.map((ticket, index) => (
                                <tr
                                    key={ticket.id}
                                    onClick={() => onSelect(ticket)}
                                    className={`cursor-pointer ${selectedId === ticket.id ? 'selected' : ''}`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <td>
                                        <div className="max-w-xs">
                                            <p className="text-sm font-medium text-slate-200 truncate">
                                                {ticket.subject}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5 font-mono">
                                                {ticket.id.slice(0, 8)}
                                            </p>
                                        </div>
                                    </td>
                                    <td>{getStatusBadge(ticket.status)}</td>
                                    <td>{getPriorityText(ticket.priority)}</td>
                                    <td>{getConfidenceBar(ticket.confidence)}</td>
                                    <td>
                                        <span className="text-sm text-slate-500">
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
                                                className="btn-ghost text-xs text-indigo-400 hover:text-indigo-300"
                                            >
                                                Override
                                            </button>
                                        )}
                                        {ticket.status === 'escalated' && (
                                            <span className="inline-flex items-center gap-1.5 text-xs text-red-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
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
                <div className="modal-backdrop" onClick={() => setOverrideModal({ isOpen: false, ticketId: '', currentResponse: '' })}>
                    <div className="glass max-w-xl w-full p-6 slide-up" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-medium text-slate-100">Override Response</h3>
                            <button
                                onClick={() => setOverrideModal({ isOpen: false, ticketId: '', currentResponse: '' })}
                                className="btn-ghost p-2 text-slate-400 hover:text-slate-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Current Response */}
                        <div className="mb-5">
                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                                Current Model Response
                            </label>
                            <div className="glass-subtle p-4">
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    {overrideModal.currentResponse || 'No response generated'}
                                </p>
                            </div>
                        </div>

                        {/* New Response */}
                        <div className="mb-6">
                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                                Your Response
                            </label>
                            <textarea
                                value={newResponse}
                                onChange={(e) => setNewResponse(e.target.value)}
                                className="input-glass h-32 resize-none"
                                placeholder="Enter the corrected response..."
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setOverrideModal({ isOpen: false, ticketId: '', currentResponse: '' })}
                                className="btn-secondary text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleOverrideSubmit}
                                className="btn-primary text-sm"
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
