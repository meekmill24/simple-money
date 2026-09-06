'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Users, Layers, Grid3X3, DollarSign, TrendingUp, Share2,
    ArrowDownToLine, ArrowUpFromLine, Clock, Package, Bell, Activity
} from 'lucide-react';
import Link from 'next/link';

interface DashStats {
    totalUsers: number;
    totalLevels: number;
    totalTasks: number;
    totalReferrals: number;
    totalDepositsAmount: number;
    totalWithdrawalsAmount: number;
    totalCommissions: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
    totalBundles: number;
}

interface RecentTransaction {
    id: number;
    type: string;
    amount: number;
    status: string;
    created_at: string;
    profile?: { username: string };
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashStats>({
        totalUsers: 0, totalLevels: 0, totalTasks: 0, totalReferrals: 0,
        totalDepositsAmount: 0, totalWithdrawalsAmount: 0, totalCommissions: 0,
        pendingDeposits: 0, pendingWithdrawals: 0, totalBundles: 0,
    });
    const [recentTx, setRecentTx] = useState<RecentTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            const [
                users, levels, tasks, referrals, bundles,
                deposits, withdrawals, commissions, pendingDeps, pendingWiths, recent
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('levels').select('*', { count: 'exact', head: true }),
                supabase.from('task_items').select('*', { count: 'exact', head: true }),
                supabase.from('referral_codes').select('*', { count: 'exact', head: true }),
                supabase.from('bundle_packages').select('*', { count: 'exact', head: true }),
                supabase.from('transactions').select('amount').eq('type', 'deposit').eq('status', 'approved'),
                supabase.from('transactions').select('amount').eq('type', 'withdrawal').eq('status', 'approved'),
                supabase.from('transactions').select('amount').eq('type', 'commission'),
                supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'deposit').eq('status', 'pending'),
                supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'withdrawal').eq('status', 'pending'),
                supabase.from('transactions').select('id, type, amount, status, created_at, profile:profiles(username)').order('created_at', { ascending: false }).limit(8),
            ]);

            const sumAmounts = (data: { amount: number }[] | null) =>
                (data || []).reduce((sum, t) => sum + (t.amount || 0), 0);

            setStats({
                totalUsers: users.count || 0,
                totalLevels: levels.count || 0,
                totalTasks: tasks.count || 0,
                totalReferrals: referrals.count || 0,
                totalBundles: bundles.count || 0,
                totalDepositsAmount: sumAmounts(deposits.data),
                totalWithdrawalsAmount: sumAmounts(withdrawals.data),
                totalCommissions: sumAmounts(commissions.data),
                pendingDeposits: pendingDeps.count || 0,
                pendingWithdrawals: pendingWiths.count || 0,
            });

            if (recent.data) setRecentTx(recent.data as any);
            setLoading(false);
        };
        fetchAll();
    }, []);

    const typeColor = (type: string) => {
        switch (type) {
            case 'deposit': return 'text-success bg-success/15';
            case 'withdrawal': return 'text-danger bg-danger/15';
            case 'commission': return 'text-primary-light bg-primary/15';
            default: return 'text-text-secondary bg-white/5';
        }
    };

    const statusDot = (status: string) => {
        if (status === 'pending') return 'bg-amber-400';
        if (status === 'approved') return 'bg-success';
        return 'bg-danger';
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                    <TrendingUp size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Control Center</h1>
                    <p className="text-sm text-text-secondary mt-0.5">Live platform overview — {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* Pending Alerts */}
            {(stats.pendingDeposits > 0 || stats.pendingWithdrawals > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up">
                    {stats.pendingDeposits > 0 && (
                        <Link href="/admin/deposits" className="glass-card p-4 flex items-center gap-4 bg-gradient-to-r from-amber-500/15 to-transparent border border-amber-500/30 hover:border-amber-500/60 transition-colors group">
                            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-500 group-hover:scale-110 transition-transform"><ArrowDownToLine size={24} /></div>
                            <div>
                                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Pending Deposits</p>
                                <p className="text-xl font-black text-white">{stats.pendingDeposits}</p>
                            </div>
                        </Link>
                    )}
                    {stats.pendingWithdrawals > 0 && (
                        <Link href="/admin/withdrawals" className="glass-card p-4 flex items-center gap-4 bg-gradient-to-r from-danger/15 to-transparent border border-danger/30 hover:border-danger/60 transition-colors group">
                            <div className="w-12 h-12 rounded-xl bg-danger/20 flex items-center justify-center">
                                <ArrowUpFromLine size={22} className="text-danger" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-white">{stats.pendingWithdrawals}</p>
                                <p className="text-xs text-danger font-semibold uppercase tracking-wider">Pending Withdrawals</p>
                            </div>
                            <span className="ml-auto text-xs text-danger opacity-0 group-hover:opacity-100 transition-opacity font-semibold">Review →</span>
                        </Link>
                    )}
                </div>
            )}

            {/* Financial Stats */}
            <div>
                <p className="text-xs font-black text-text-secondary/60 uppercase tracking-[0.2em] mb-3">Financial Overview</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Total Deposited', value: `$${stats.totalDepositsAmount.toFixed(2)}`, icon: ArrowDownToLine, color: 'text-success', bg: 'from-success/20 to-transparent', border: 'border-success/20' },
                        { label: 'Total Withdrawn', value: `$${stats.totalWithdrawalsAmount.toFixed(2)}`, icon: ArrowUpFromLine, color: 'text-danger', bg: 'from-danger/20 to-transparent', border: 'border-danger/20' },
                        { label: 'Commissions Paid', value: `$${stats.totalCommissions.toFixed(2)}`, icon: DollarSign, color: 'text-primary-light', bg: 'from-primary/20 to-transparent', border: 'border-primary/20' },
                    ].map(({ label, value, icon: Icon, color, bg, border }) => (
                        <div key={label} className={`glass-card p-5 bg-gradient-to-br ${bg} border ${border} animate-slide-up`}>
                            <div className={`flex items-center gap-2 text-xs font-bold ${color} uppercase tracking-wider mb-3`}>
                                <Icon size={14} /> {label}
                            </div>
                            <p className={`text-3xl font-black ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Platform Stats */}
            <div>
                <p className="text-xs font-black text-text-secondary/60 uppercase tracking-[0.2em] mb-3">Platform Stats</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[
                        { label: 'Users', value: stats.totalUsers, icon: Users, color: 'from-blue-500/30', iconBg: 'bg-blue-500/20', iconColor: 'text-blue-400', href: '/admin/users' },
                        { label: 'Levels', value: stats.totalLevels, icon: Layers, color: 'from-purple-500/30', iconBg: 'bg-purple-500/20', iconColor: 'text-purple-400', href: '/admin/levels' },
                        { label: 'Task Items', value: stats.totalTasks, icon: Grid3X3, color: 'from-cyan-500/30', iconBg: 'bg-cyan-500/20', iconColor: 'text-cyan-400', href: '/admin/tasks' },
                        { label: 'Referrals', value: stats.totalReferrals, icon: Share2, color: 'from-amber-500/30', iconBg: 'bg-amber-500/20', iconColor: 'text-amber-400', href: '/admin/referrals' },
                        { label: 'Bundles', value: stats.totalBundles, icon: Package, color: 'from-fuchsia-500/30', iconBg: 'bg-fuchsia-500/20', iconColor: 'text-fuchsia-400', href: '/admin/bundles' },
                    ].map(({ label, value, icon: Icon, color, iconBg, iconColor, href }) => (
                        <Link key={label} href={href}
                            className={`glass-card p-5 bg-gradient-to-br ${color} to-transparent animate-slide-up hover:scale-105 transition-transform duration-300 border border-white/10 group`}>
                            <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                <Icon size={22} className={iconColor} />
                            </div>
                            <p className="text-3xl font-black text-white tracking-tight">{value}</p>
                            <p className="text-xs font-semibold text-text-secondary mt-1.5 uppercase tracking-wider">{label}</p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                        <Activity size={16} className="text-primary-light" /> Recent Activity
                    </h3>
                    {recentTx.length === 0 ? (
                        <p className="text-text-secondary text-sm text-center py-6">No recent activity</p>
                    ) : (
                        <div className="space-y-3">
                            {recentTx.map(tx => (
                                <div key={tx.id} className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot(tx.status)}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{tx.profile?.username || 'Unknown'}</p>
                                        <p className="text-xs text-text-secondary">{new Date(tx.created_at).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${typeColor(tx.type)}`}>{tx.type}</span>
                                        <p className={`text-sm font-bold mt-0.5 ${tx.type === 'withdrawal' ? 'text-danger' : 'text-success'}`}>
                                            {tx.type === 'withdrawal' ? '-' : '+'}${tx.amount.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="glass-card p-6">
                    <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                        <Clock size={16} className="text-primary-light" /> Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Review Deposits', href: '/admin/deposits', icon: ArrowDownToLine, color: 'text-success', bg: 'bg-success/10 hover:bg-success/20 border-success/20' },
                            { label: 'Review Withdrawals', href: '/admin/withdrawals', icon: ArrowUpFromLine, color: 'text-danger', bg: 'bg-danger/10 hover:bg-danger/20 border-danger/20' },
                            { label: 'Manage Bundles', href: '/admin/bundles', icon: Package, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border-fuchsia-500/20' },
                            { label: 'Send Notification', href: '/admin/notify', icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20' },
                            { label: 'Manage Users', href: '/admin/users', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20' },
                            { label: 'Transactions', href: '/admin/transactions', icon: DollarSign, color: 'text-primary-light', bg: 'bg-primary/10 hover:bg-primary/20 border-primary/20' },
                        ].map(({ label, href, icon: Icon, color, bg }) => (
                            <Link key={label} href={href} className={`flex items-center gap-2.5 p-3.5 rounded-xl border transition-colors ${bg}`}>
                                <Icon size={16} className={color} />
                                <span className={`text-xs font-bold ${color}`}>{label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
