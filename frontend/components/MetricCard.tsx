'use client';

import React, { useEffect, useState } from 'react';

interface MetricCardProps {
    title: string;
    value: string;
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon?: 'tickets' | 'confidence' | 'escalation' | 'pending' | 'resolved';
    color?: 'purple' | 'blue' | 'rose' | 'amber' | 'emerald';
    percentage?: number;
}

export default function MetricCard({
    title,
    value,
    subtitle,
    trend = 'neutral',
    icon = 'tickets',
    color = 'purple',
    percentage
}: MetricCardProps) {
    const [animatedValue, setAnimatedValue] = useState(0);
    const numericValue = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;

    useEffect(() => {
        const duration = 1000;
        const steps = 60;
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

    const colorClasses = {
        purple: {
            gradient: 'from-violet-500 to-purple-600',
            glow: 'rgba(139, 92, 246, 0.5)',
            ring: '#8b5cf6',
            bg: 'rgba(139, 92, 246, 0.1)'
        },
        blue: {
            gradient: 'from-blue-500 to-cyan-500',
            glow: 'rgba(59, 130, 246, 0.5)',
            ring: '#3b82f6',
            bg: 'rgba(59, 130, 246, 0.1)'
        },
        rose: {
            gradient: 'from-rose-500 to-pink-500',
            glow: 'rgba(244, 63, 94, 0.5)',
            ring: '#f43f5e',
            bg: 'rgba(244, 63, 94, 0.1)'
        },
        amber: {
            gradient: 'from-amber-500 to-orange-500',
            glow: 'rgba(245, 158, 11, 0.5)',
            ring: '#f59e0b',
            bg: 'rgba(245, 158, 11, 0.1)'
        },
        emerald: {
            gradient: 'from-emerald-500 to-teal-500',
            glow: 'rgba(16, 185, 129, 0.5)',
            ring: '#10b981',
            bg: 'rgba(16, 185, 129, 0.1)'
        }
    };

    const colors = colorClasses[color];

    const getIcon = () => {
        const iconProps = "w-6 h-6";
        switch (icon) {
            case 'tickets':
                return (
                    <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                );
            case 'confidence':
                return (
                    <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                );
            case 'escalation':
                return (
                    <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                );
            case 'pending':
                return (
                    <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'resolved':
                return (
                    <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            default:
                return (
                    <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                );
        }
    };

    const getTrendIcon = () => {
        if (trend === 'up') {
            return (
                <div className="flex items-center gap-1 text-emerald-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    <span className="text-xs font-medium">+12%</span>
                </div>
            );
        }
        if (trend === 'down') {
            return (
                <div className="flex items-center gap-1 text-rose-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <span className="text-xs font-medium">-8%</span>
                </div>
            );
        }
        return null;
    };

    // Progress ring calculations
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const ringPercentage = percentage ?? (value.includes('%') ? numericValue : 0);
    const offset = circumference - (ringPercentage / 100) * circumference;

    return (
        <div className="glass-card-hover p-6 relative overflow-hidden group">
            {/* Gradient Accent */}
            <div
                className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colors.gradient} opacity-10 blur-2xl rounded-full transform translate-x-8 -translate-y-8 group-hover:opacity-20 transition-opacity duration-500`}
            />

            <div className="relative flex items-start justify-between">
                {/* Content */}
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        {/* Icon Container */}
                        <div
                            className={`p-2.5 rounded-xl bg-gradient-to-br ${colors.gradient}`}
                            style={{ boxShadow: `0 4px 15px ${colors.glow}` }}
                        >
                            <div className="text-white">
                                {getIcon()}
                            </div>
                        </div>
                        {getTrendIcon()}
                    </div>

                    <p className="text-sm font-medium text-white/50 uppercase tracking-wider mb-1">
                        {title}
                    </p>

                    <p className="text-4xl font-bold text-white mb-1 tabular-nums">
                        {value.includes('%')
                            ? `${Math.round(animatedValue)}%`
                            : value.includes('.')
                                ? animatedValue.toFixed(2)
                                : Math.round(animatedValue).toString()
                        }
                    </p>

                    {subtitle && (
                        <p className="text-sm text-white/40">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Progress Ring */}
                {ringPercentage > 0 && (
                    <div className="relative w-20 h-20 flex-shrink-0">
                        <svg className="progress-ring w-20 h-20" viewBox="0 0 80 80">
                            {/* Background ring */}
                            <circle
                                cx="40"
                                cy="40"
                                r={radius}
                                fill="none"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="6"
                            />
                            {/* Progress ring */}
                            <circle
                                className="progress-ring__circle"
                                cx="40"
                                cy="40"
                                r={radius}
                                fill="none"
                                stroke={colors.ring}
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                style={{
                                    filter: `drop-shadow(0 0 6px ${colors.glow})`
                                }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-white/80">
                                {Math.round(ringPercentage)}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Sparkline (decorative) */}
            <div className="mt-4 h-8 flex items-end gap-1 opacity-30">
                {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((height, i) => (
                    <div
                        key={i}
                        className={`flex-1 rounded-t bg-gradient-to-t ${colors.gradient}`}
                        style={{
                            height: `${height}%`,
                            animationDelay: `${i * 100}ms`
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
