'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    Search, 
    CheckCircle, 
    XCircle, 
    Clock, 
    ArrowUpFromLine, 
    Filter, 
    RefreshCcw,
    DollarSign,
    Calendar,
    ChevronRight,
    SearchX,
    Undo2
} from 'lucide-react';

interface WithdrawalRequest {
    id: number;
    user_id: string;
    amount: number;
    description: string;
    status: string;
    network: string | null;
    wallet_address: string | null;
    created_at: string;
    profile?: { username: string; email?: string; wallet_balance?: number };
}

export default function AdminWithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const fetchWithdrawals = useCallback(async () => {
        setLoading(true);
        const query = supabase
            .from('transactions')
            .select('*, profile:profiles(username, email, wallet_balance)')
            .eq('type', 'withdrawal')
            .order('created_at', { ascending: false })
            .limit(500);

        if (filter !== 'all') query.eq('status', filter);

        const { data } = await query;
        if (data) setWithdrawals(data as WithdrawalRequest[]);
        setLoading(false);
    }, [filter]);

    useEffect(() => {
        fetchWithdrawals();

        const channel = supabase
            .channel('admin-withdrawals')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'transactions',
                filter: 'type=eq.withdrawal'
            }, () => {
                fetchWithdrawals();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchWithdrawals]);

    // Summary Calculations
    const stats = useMemo(() => {
        const pending = withdrawals.filter(w => w.status === 'pending');
        const today = new Date().toISOString().split('T')[0];
        const approvedToday = withdrawals.filter(w => w.status === 'approved' && w.created_at.startsWith(today));
        const rejected = withdrawals.filter(w => w.status === 'rejected');
        
        return {
            pendingCount: pending.length,
            pendingVolume: pending.reduce((sum, w) => sum + w.amount, 0),
            todayWithdrawnCount: approvedToday.length,
            todayWithdrawnVolume: approvedToday.reduce((sum, w) => sum + w.amount, 0),
            totalRefunded: rejected.reduce((sum, w) => sum + w.amount, 0)
        };
    }, [withdrawals]);

    const handleApprove = async (withdrawal: WithdrawalRequest) => {
        if (!confirm(`Approve withdrawal of $${withdrawal.amount.toFixed(2)} for ${withdrawal.profile?.username}?`)) return;
        setActionLoading(withdrawal.id);
        try {
            // 1. Update transaction status
            const { error: txError } = await supabase
                .from('transactions')
                .update({ status: 'approved' })
                .eq('id', withdrawal.id);
            
            if (txError) throw new Error(`Transaction Update Failed: ${txError.message}`);

            // 2. Fetch profile to adjust frozen amount
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('frozen_amount')
                .eq('id', withdrawal.user_id)
                .single();

            if (profileError) throw new Error(`Profile Fetch Failed: ${profileError.message}`);

            // 3. Clear from frozen amount (since it's now officially paid)
            const currentFrozen = profileData?.frozen_amount || 0;
            const newFrozen = Math.max(0, currentFrozen - withdrawal.amount);

            const { error: updateProfileError } = await supabase
                .from('profiles')
                .update({ frozen_amount: newFrozen })
                .eq('id', withdrawal.user_id);

            if (updateProfileError) throw new Error(`Frozen Amount Update Failed: ${updateProfileError.message}`);

            // 4. Send Notification
            const { error: notifError } = await supabase.from('notifications').insert({
                user_id: withdrawal.user_id,
                title: 'Withdrawal Approved ✅',
                message: `Your withdrawal of $${withdrawal.amount.toFixed(2)} has been approved and is being processed to your wallet.`,
                type: 'success',
            });

            if (notifError) console.error('Notification failed but withdrawal approved:', notifError);

            alert('Withdrawal successfully approved!');
            fetchWithdrawals();
        } catch (err: any) {
            console.error(err);
            alert(`Error processing approval: ${err.message || 'Unknown error'}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (withdrawal: WithdrawalRequest) => {
        if (!confirm(`Reject AND REFUND $${withdrawal.amount.toFixed(2)} to ${withdrawal.profile?.username}?`)) return;
        setActionLoading(withdrawal.id);
        try {
            // 1. Update transaction status
            const { error: txError } = await supabase
                .from('transactions')
                .update({ status: 'rejected' })
                .eq('id', withdrawal.id);

            if (txError) throw new Error(`Transaction Update Failed: ${txError.message}`);
            
            // 2. Fetch profile data
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('wallet_balance, frozen_amount')
                .eq('id', withdrawal.user_id)
                .single();
                
            if (profileError) throw new Error(`Profile Fetch Failed: ${profileError.message}`);
            if (!profileData) throw new Error("Profile not found");

            // 3. Refund to balance and clear from frozen
            const newBalance = (profileData.wallet_balance || 0) + withdrawal.amount;
            const currentFrozen = profileData.frozen_amount || 0;
            const newFrozen = Math.max(0, currentFrozen - withdrawal.amount);

            const { error: updateProfileError } = await supabase
                .from('profiles')
                .update({ 
                    wallet_balance: newBalance,
                    frozen_amount: newFrozen
                })
                .eq('id', withdrawal.user_id);

            if (updateProfileError) throw new Error(`Refund Update Failed: ${updateProfileError.message}`);
            
            // 4. Send Notification
            const { error: notifError } = await supabase.from('notifications').insert({
                user_id: withdrawal.user_id,
                title: 'Withdrawal Rejected ❌',
                message: `Your withdrawal of $${withdrawal.amount.toFixed(2)} has been rejected and the amount has been refunded to your wallet.`,
                type: 'danger',
            });

            if (notifError) console.error('Notification failed but withdrawal rejected:', notifError);

            alert('Withdrawal rejected and funds refunded.');
            fetchWithdrawals();
        } catch (err: any) {
            console.error(err);
            alert(`Error processing rejection: ${err.message || 'Unknown error'}`);
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = withdrawals.filter(w =>
        !search ||
        w.profile?.username?.toLowerCase().includes(search.toLowerCase()) ||
        w.description?.toLowerCase().includes(search.toLowerCase()) ||
        w.wallet_address?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">Withdrawal Management</h1>
                    <p className="text-text-secondary mt-1 font-medium flex items-center gap-2">
                        <ArrowUpFromLine size={14} className="text-danger" />
                        Process payouts and handle refund logic
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => fetchWithdrawals()}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-white hover:bg-white/10 transition-all"
                        title="Refresh"
                    >
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="relative group">
                        <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-hover:text-primary transition-colors" />
                        <select 
                            value={filter} 
                            onChange={e => setFilter(e.target.value as any)}
                            className="bg-white/5 border border-white/10 text-white text-sm font-bold pl-11 pr-8 py-3 rounded-xl appearance-none focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                        >
                            <option value="pending" className="bg-[#121212]">⏳ PENDING PAYOUTS</option>
                            <option value="approved" className="bg-[#121212]">✅ PAID / APPROVED</option>
                            <option value="rejected" className="bg-[#121212]">❌ REJECTED & REFUNDED</option>
                            <option value="all" className="bg-[#121212]">👀 ALL REQUESTS</option>
                        </select>
                        <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary rotate-90 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20 group hover:border-amber-500/40 transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-500">
                            <Clock size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60">Outstanding</span>
                    </div>
                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-1">Queue for Payout</h3>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-white leading-none">${stats.pendingVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs font-bold text-amber-500">{stats.pendingCount} reqs</p>
                    </div>
                </div>

                <div className="glass-card p-6 bg-gradient-to-br from-danger/10 to-transparent border-danger/20 group hover:border-danger/40 transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-danger/20 text-danger text-shadow shadow-danger">
                            <Calendar size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-danger/60">Payout Velocity</span>
                    </div>
                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-1">Withdrawn Today</h3>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-white leading-none">${stats.todayWithdrawnVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs font-bold text-danger">{stats.todayWithdrawnCount} paid</p>
                    </div>
                </div>

                <div className="glass-card p-6 bg-gradient-to-br from-success/10 to-transparent border-success/20 group hover:border-success/40 transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-success/20 text-success">
                            <Undo2 size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-success/60">Security Reversals</span>
                    </div>
                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-1">Total Refunded</h3>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-white leading-none">${stats.totalRefunded.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Main Table Content */}
            <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full max-w-md group">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Find user, wallet or amount..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-text-secondary/50" 
                        />
                    </div>
                    <div className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                        Total {filtered.length} Requests
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-white/2">
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-[0.1em] text-[10px]">Recipient Details</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-[0.1em] text-[10px]">Withdrawal Amount</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-[0.1em] text-[10px]">Wallet & Network</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-[0.1em] text-[10px]">Status</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-[0.1em] text-[10px]">Request Date</th>
                                <th className="text-right p-4 text-text-secondary font-black uppercase tracking-[0.1em] text-[10px]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                            <p className="text-text-secondary font-black uppercase tracking-widest text-xs animate-pulse">Scanning Requests...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-50">
                                            <SearchX size={40} className="text-text-secondary" />
                                            <p className="text-text-secondary font-bold">No withdrawal requests found in this view</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map(w => (
                                <tr key={w.id} className="hover:bg-white/5 transition-all group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center border border-danger/20 text-danger font-black">
                                                {w.profile?.username?.[0].toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="font-black text-white leading-tight uppercase tracking-tight">{w.profile?.username || 'Unknown'}</p>
                                                <p className="text-[10px] text-text-secondary font-medium tracking-tight mt-0.5">{w.profile?.email || 'System Account'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <p className="text-lg font-black text-danger tracking-tight">-${w.amount.toFixed(2)}</p>
                                            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mt-0.5">PAYOUT VALUE</p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="max-w-[200px]">
                                            <p className="text-xs text-white font-mono break-all bg-white/5 px-2 py-1 rounded-md border border-white/5">
                                                {w.wallet_address || w.description || 'N/A ADDRESS'}
                                            </p>
                                            {w.network && (
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    <p className="text-[10px] text-primary-light font-black uppercase tracking-wider">{w.network} NETWORK</p>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {w.status === 'pending' && (
                                            <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-full w-fit border border-amber-500/20 animate-pulse">
                                                <Clock size={12} /> Pending Approval
                                            </div>
                                        )}
                                        {w.status === 'approved' && (
                                            <div className="flex items-center gap-2 text-success font-black text-[10px] uppercase tracking-widest bg-success/10 px-3 py-1.5 rounded-full w-fit border border-success/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                                                <CheckCircle size={12} /> Paid / Finished
                                            </div>
                                        )}
                                        {w.status === 'rejected' && (
                                            <div className="flex items-center gap-2 text-danger font-black text-[10px] uppercase tracking-widest bg-danger/10 px-3 py-1.5 rounded-full w-fit border border-danger/20">
                                                <XCircle size={12} /> Rejected & Refunded
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <p className="text-xs text-white font-bold">{new Date(w.created_at).toLocaleDateString()}</p>
                                        <p className="text-[10px] text-text-secondary mt-0.5">{new Date(w.created_at).toLocaleTimeString()}</p>
                                    </td>
                                    <td className="p-4 text-right">
                                        {w.status === 'pending' ? (
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleApprove(w)}
                                                    disabled={actionLoading === w.id}
                                                    className="p-2.5 rounded-xl bg-success text-white shadow-lg shadow-success/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                                    title="Approve & Mark as Paid"
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleReject(w)}
                                                    disabled={actionLoading === w.id}
                                                    className="p-2.5 rounded-xl bg-danger text-white shadow-lg shadow-danger/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                                    title="Reject & Refund User"
                                                >
                                                    <Undo2 size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black text-text-secondary uppercase tracking-widest">
                                                Processed
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
