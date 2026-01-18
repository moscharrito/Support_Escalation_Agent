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
            pending: 'bg-yellow-100 text-yellow-800',
            auto_resolved: 'bg-green-100 text-green-800',
            escalated: 'bg-red-100 text-red-800',
            in_progress: 'bg-blue-100 text-blue-800'
        };

        const labels = {
            pending: 'Pending',
            auto_resolved: 'Auto-Resolved',
            escalated: 'Escalated',
            in_progress: 'In Progress'
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
                {labels[status]}
            </span>
        );
    };

    const getPriorityBadge = (priority: Ticket['priority']) => {
        const styles = {
            low: 'bg-gray-100 text-gray-800',
            medium: 'bg-blue-100 text-blue-800',
            high: 'bg-orange-100 text-orange-800',
            critical: 'bg-red-100 text-red-800'
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[priority]}`}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </span>
        );
    };

    const getSentimentIcon = (sentiment: Ticket['sentiment']) => {
        switch (sentiment) {
            case 'positive':
                return <span className="text-green-500">:)</span>;
            case 'negative':
                return <span className="text-red-500">:(</span>;
            default:
                return <span className="text-gray-500">:|</span>;
        }
    };

    const getConfidenceBar = (confidence: number) => {
        const percentage = Math.round(confidence * 100);
        const color = confidence >= 0.8 ? 'bg-green-500' :
                     confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500';

        return (
            <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${color} transition-all`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <span className="text-xs text-gray-600">{percentage}%</span>
            </div>
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No tickets found</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ticket
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Priority
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Confidence
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sentiment
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tickets.map((ticket) => (
                                <tr
                                    key={ticket.id}
                                    onClick={() => onSelect(ticket)}
                                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                                        selectedId === ticket.id ? 'bg-blue-50' : ''
                                    }`}
                                >
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                                {ticket.subject}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                ID: {ticket.id.slice(0, 8)}...
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        {getStatusBadge(ticket.status)}
                                    </td>
                                    <td className="px-4 py-4">
                                        {getPriorityBadge(ticket.priority)}
                                    </td>
                                    <td className="px-4 py-4">
                                        {getConfidenceBar(ticket.confidence)}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        {getSentimentIcon(ticket.sentiment)}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-500">
                                        {formatDate(ticket.created_at)}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        {ticket.status === 'auto_resolved' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOverrideClick(ticket);
                                                }}
                                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                Override
                                            </button>
                                        )}
                                        {ticket.status === 'escalated' && (
                                            <span className="text-sm text-red-600">
                                                Needs Review
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Override Auto-Response
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Current Response:
                            </label>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                {overrideModal.currentResponse || 'No response generated'}
                            </p>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                New Response:
                            </label>
                            <textarea
                                value={newResponse}
                                onChange={(e) => setNewResponse(e.target.value)}
                                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter the corrected response..."
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setOverrideModal({ isOpen: false, ticketId: '', currentResponse: '' })}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleOverrideSubmit}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
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
