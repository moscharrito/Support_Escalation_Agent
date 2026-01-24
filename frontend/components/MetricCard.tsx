'use client';

import React, { useEffect, useState } from 'react';

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    icon?: 'tickets' | 'confidence' | 'escalation' | 'pending' | 'resolved' | 'time';
    showRing?: boolean;
    ringValue?: number;
}

export default function MetricCard({
    title,
    value,
    subtitle,
    trend,
    trendValue,
    icon = 'tickets',
    showRing = false,
    ringValue = 0
}: MetricCardProps) {
    const [animatedValue, setAnimatedValue] = useState(0);
    const numericValue = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^0-9.]/g, '')) || 0;

    useEffect(() => {
        const duration = 800;
        const steps = 40;
        const increment = numericValue / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= numericValue) {
                setAnimatedValue(numericValue);
                clearInterval(timer);
            } else {
                setAnimatedValue(current);
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [numericValue]);

    const formatValue = () => {
        const strValue = value.toString();
        if (strValue.includes('%')) return `${Math.round(animatedValue)}%`;
        if (strValue.includes('.')) return animatedValue.toFixed(1);
        return Math.round(animatedValue).toLocaleString();
    };

    const getIcon = () => {
        const iconClass = "w-5 h-5";
        switch (icon) {
            case 'tickets':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                );
            case 'confidence':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                );
            case 'escalation':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                    </svg>
                );
            case 'pending':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'resolved':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'time':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const getTrendIndicator = () => {
        if (!trend || trend === 'neutral') return null;

        return (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-white/60' : 'text-white/40'}`}>
                {trend === 'up' ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                )}
                {trendValue && <span>{trendValue}</span>}
            </div>
        );
    };

    // Progress ring
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (ringValue / 100) * circumference;

    return (
        <div className="glass-hover p-6 fade-in">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4 text-white/70">
                        {getIcon()}
                    </div>

                    {/* Title */}
                    <p className="text-sm font-medium text-white/40 uppercase tracking-wider mb-2">
                        {title}
                    </p>

                    {/* Value */}
                    <div className="flex items-baseline gap-3">
                        <p className="text-4xl font-light text-white tracking-tight">
                            {formatValue()}
                        </p>
                        {getTrendIndicator()}
                    </div>

                    {/* Subtitle */}
                    {subtitle && (
                        <p className="text-sm text-white/30 mt-2">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Progress Ring */}
                {showRing && (
                    <div className="relative w-16 h-16 flex-shrink-0">
                        <svg className="progress-ring w-16 h-16" viewBox="0 0 64 64">
                            <circle
                                className="progress-ring-bg"
                                cx="32"
                                cy="32"
                                r={radius}
                                fill="none"
                                strokeWidth="3"
                            />
                            <circle
                                className="progress-ring-fill"
                                cx="32"
                                cy="32"
                                r={radius}
                                fill="none"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-medium text-white/70">
                                {Math.round(ringValue)}%
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
