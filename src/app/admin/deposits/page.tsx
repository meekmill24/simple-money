'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    Search, 
    CheckCircle, 
    XCircle, 
    Clock, 
    ArrowDownToLine, 
    Filter, 
    RefreshCcw,
    Users,
    DollarSign,
    Calendar,
    ChevronRight,
    SearchX
} from 'lucide-react';

interface DepositRequest {
    id: number;
    user_id: string;
    amount: number;
    description: string;
    status: string;
    network: string | null;
    wallet_address: string | null;
    proof_url: string | null;
    created_at: string;
    profile?: { username: string; email?: string };
}

export default function AdminDepositsPage() {
    // ... existing state ...
    const [deposits, setDeposits] = useState<DepositRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const fetchDeposits = useCallback(async () => {
        setLoading(true);
        const query = supabase
            .from('transactions')
            .select('*, profile:profiles(username, email)')
            .eq('type', 'deposit')
            .order('created_at', { ascending: false })
            .limit(500);

        if (filter !== 'all') query.eq('status', filter);

        const { data } = await query;
        if (data) setDeposits(data as DepositRequest[]);
        setLoading(false);
    }, [filter]);

    useEffect(() => {
        fetchDeposits();

        const channel = supabase
            .channel('admin-deposits')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'transactions',
                filter: 'type=eq.deposit'
            }, () => {
                fetchDeposits();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchDeposits]);

    // Summary Calculations
    const stats = useMemo(() => {
        const pending = deposits.filter(d => d.status === 'pending');
        const today = new Date().toISOString().split('T')[0];
        const approvedToday = deposits.filter(d => d.status === 'approved' && d.created_at.startsWith(today));
        
        return {
            pendingCount: pending.length,
            pendingVolume: pending.reduce((sum, d) => sum + d.amount, 0),
            todayApprovedCount: approvedToday.length,
            todayApprovedVolume: approvedToday.reduce((sum, d) => sum + d.amount, 0),
            totalVolume: deposits.filter(d => d.status === 'approved').reduce((sum, d) => sum + d.amount, 0)
        };
    }, [deposits]);

    const handleApprove = async (deposit: DepositRequest) => {
        if (!confirm(`Approve $${deposit.amount.toFixed(2)} deposit for ${deposit.profile?.username}?`)) return;
        setActionLoading(deposit.id);
        
        try {
            // 1. Update transaction status
            const { error: txError } = await supabase
                .from('transactions')
                .update({ status: 'approved' })
                .eq('id', deposit.id);
            
            if (txError) throw new Error(`Transaction Update Failed: ${txError.message}`);

            // 2. Fetch profile data
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, wallet_balance, level_id')
                .eq('id', deposit.user_id)
                .single();

            if (profileError) throw new Error(`Profile Fetch Failed: ${profileError.message}`);
            if (!profileData) throw new Error("Profile not found");

            // 3. Check for first deposit status
            const { count: previousDepositsCount, error: countError } = await supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', deposit.user_id)
                .eq('type', 'deposit')
                .eq('status', 'approved')
                .neq('id', deposit.id);

            if (countError) throw new Error(`Count Failed: ${countError.message}`);

            const isFirstDeposit = previousDepositsCount === 0;
            let bonusToGive = 0;
            let bonusDesc = '';
            
            if (isFirstDeposit) {
                if (deposit.amount >= 3000) { bonusToGive = 1000; bonusDesc = 'First Deposit Reward Tier 5 ($3,000+)'; }
                else if (deposit.amount >= 2000) { bonusToGive = 500; bonusDesc = 'First Deposit Reward Tier 4 ($2,000+)'; }
                else if (deposit.amount >= 1000) { bonusToGive = 200; bonusDesc = 'First Deposit Reward Tier 3 ($1,000+)'; }
                else if (deposit.amount >= 500) { bonusToGive = 60; bonusDesc = 'First Deposit Reward Tier 2 ($500+)'; }
                else if (deposit.amount >= 100) { bonusToGive = 30; bonusDesc = 'First Deposit Reward Tier 1 ($100+)'; }
            }
            
            // 4. Give bonus if applicable
            if (bonusToGive > 0) {
                const { error: bonusError } = await supabase.from('transactions').insert({
                    user_id: deposit.user_id,
                    type: 'commission',
                    amount: bonusToGive,
                    status: 'approved',
                    description: bonusDesc
                });
                if (bonusError) throw new Error(`Bonus Credit Failed: ${bonusError.message}`);
            }
            
            // 5. Update Balance and calculate Lifetime total for Level Up
            const newBalance = (profileData.wallet_balance || 0) + deposit.amount + bonusToGive;
            
            const { data: allDeposits, error: allDepError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', deposit.user_id)
                .eq('type', 'deposit')
                .eq('status', 'approved');
            
            if (allDepError) throw new Error(`Lifetime Calculation Failed: ${allDepError.message}`);
                
            const lifetimeTotal = (allDeposits || []).reduce((acc, row) => acc + row.amount, 0);
            
            let targetLevelId = profileData.level_id || 1;
            if (lifetimeTotal >= 3000) targetLevelId = 5;
            else if (lifetimeTotal >= 1000) targetLevelId = 4;
            else if (lifetimeTotal >= 500) targetLevelId = 3;
            else if (lifetimeTotal >= 100) targetLevelId = 2;
            
            const { error: updateProfileError } = await supabase.from('profiles').update({ 
                wallet_balance: newBalance,
                level_id: Math.max(targetLevelId, profileData.level_id || 1)
            }).eq('id', deposit.user_id);

            if (updateProfileError) throw new Error(`Balance Update Failed: ${updateProfileError.message}`);
            
            // 6. Send Notification
            const { error: notifError } = await supabase.from('notifications').insert({
                user_id: deposit.user_id,
                title: 'Deposit Approved ✅',
                message: `Your deposit of $${deposit.amount.toFixed(2)} has been approved and credited to your wallet.`,
                type: 'success',
            });

            if (notifError) console.error('Notification failed but balance updated:', notifError);

            alert('Deposit successfully approved!');
            fetchDeposits();
        } catch (err: any) {
            console.error(err);
            alert(`Error processing approval: ${err.message || 'Unknown error'}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (deposit: DepositRequest) => {
        if (!confirm(`Reject deposit for ${deposit.profile?.username}?`)) return;
        setActionLoading(deposit.id);
        try {
            const { error: txError } = await supabase
                .from('transactions')
                .update({ status: 'rejected' })
                .eq('id', deposit.id);

            if (txError) throw new Error(`Transaction Update Failed: ${txError.message}`);

            const { error: notifError } = await supabase.from('notifications').insert({
                user_id: deposit.user_id,
                title: 'Deposit Rejected ❌',
                message: `Your deposit of $${deposit.amount.toFixed(2)} has been rejected. Please contact support.`,
                type: 'danger',
            });

            if (notifError) console.error('Notification failed but transaction rejected:', notifError);

            alert('Deposit rejected successfully.');
            fetchDeposits();
        } catch (err: any) {
            console.error(err);
            alert(`Error processing rejection: ${err.message || 'Unknown error'}`);
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = deposits.filter(d =>
        !search ||
        d.profile?.username?.toLowerCase().includes(search.toLowerCase()) ||
        d.description?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">Deposit Management</h1>
                    <p className="text-text-secondary mt-1 font-medium flex items-center gap-2">
                        <ArrowDownToLine size={14} className="text-success" />
                        Approve or reject platform funding requests
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => fetchDeposits()}
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
                            <option value="pending" className="bg-[#121212]">⏳ PENDING REQUESTS</option>
                            <option value="approved" className="bg-[#121212]">✅ APPROVED ONLY</option>
                            <option value="rejected" className="bg-[#121212]">❌ REJECTED ONLY</option>
                            <option value="all" className="bg-[#121212]">👀 ALL TRANSACTIONS</option>
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
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60">Awaiting Action</span>
                    </div>
                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-1">Pending Deposits</h3>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-white leading-none">${stats.pendingVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs font-bold text-amber-500">{stats.pendingCount} reqs</p>
                    </div>
                </div>

                <div className="glass-card p-6 bg-gradient-to-br from-success/10 to-transparent border-success/20 group hover:border-success/40 transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-success/20 text-success text-shadow shadow-success">
                            <Calendar size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-success/60">Today's Performance</span>
                    </div>
                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-1">Approved Today</h3>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-white leading-none">${stats.todayApprovedVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs font-bold text-success">{stats.todayApprovedCount} done</p>
                    </div>
                </div>

                <div className="glass-card p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 group hover:border-primary/40 transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-primary/20 text-primary-light">
                            <DollarSign size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">All Time Volume</span>
                    </div>
                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-1">Total Sales</h3>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-white leading-none">${stats.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
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
                            placeholder="Find user, amount or hash..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-text-secondary/50" 
                        />
                    </div>
                    <div className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                        Showing {filtered.length} Results
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-white/2">
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-[0.1em] text-[10px]">User Details</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-[0.1em] text-[10px]">Financial Data</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-[0.1em] text-[10px]">Reference / Proof</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-[0.1em] text-[10px]">Status</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-[0.1em] text-[10px]">Timestamp</th>
                                <th className="text-right p-4 text-text-secondary font-black uppercase tracking-[0.1em] text-[10px]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                            <p className="text-text-secondary font-black uppercase tracking-widest text-xs animate-pulse">Syncing Ledger...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-50">
                                            <SearchX size={40} className="text-text-secondary" />
                                            <p className="text-text-secondary font-bold">No matching deposits found in {filter} queue</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map(dep => (
                                <tr key={dep.id} className="hover:bg-white/5 transition-all group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary-light font-black">
                                                {dep.profile?.username?.[0].toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="font-black text-white leading-tight uppercase tracking-tight">{dep.profile?.username || 'Unknown'}</p>
                                                <p className="text-[10px] text-text-secondary font-medium tracking-tight mt-0.5">{dep.profile?.email || 'No email system trace'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <p className="text-lg font-black text-success tracking-tight">+${dep.amount.toFixed(2)}</p>
                                            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mt-0.5">USDT CREDITS</p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-2">
                                            <p className="text-xs text-text-secondary font-mono truncate bg-white/5 px-2 py-1 rounded inline-block w-fit">
                                                {dep.description || 'N/A Note'}
                                            </p>
                                            {dep.proof_url ? (
                                                <a 
                                                    href={dep.proof_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-[10px] font-black text-primary-light uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/20 transition-all w-fit"
                                                >
                                                    <Search size={12} /> View Proof Image
                                                </a>
                                            ) : (
                                                <span className="text-[9px] text-text-secondary/50 italic">No proof uploaded</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {dep.status === 'pending' && (
                                            <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-full w-fit animate-pulse border border-amber-500/20">
                                                <Clock size={12} /> Pending
                                            </div>
                                        )}
                                        {dep.status === 'approved' && (
                                            <div className="flex items-center gap-2 text-success font-black text-[10px] uppercase tracking-widest bg-success/10 px-3 py-1.5 rounded-full w-fit border border-success/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                                                <CheckCircle size={12} /> Approved
                                            </div>
                                        )}
                                        {dep.status === 'rejected' && (
                                            <div className="flex items-center gap-2 text-danger font-black text-[10px] uppercase tracking-widest bg-danger/10 px-3 py-1.5 rounded-full w-fit border border-danger/20">
                                                <XCircle size={12} /> Rejected
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <p className="text-xs text-white font-bold">{new Date(dep.created_at).toLocaleDateString()}</p>
                                        <p className="text-[10px] text-text-secondary mt-0.5">{new Date(dep.created_at).toLocaleTimeString()}</p>
                                    </td>
                                    <td className="p-4 text-right">
                                        {dep.status === 'pending' ? (
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleApprove(dep)}
                                                    disabled={actionLoading === dep.id}
                                                    className="p-2.5 rounded-xl bg-success text-white shadow-lg shadow-success/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                                    title="Approve Funding"
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleReject(dep)}
                                                    disabled={actionLoading === dep.id}
                                                    className="p-2.5 rounded-xl bg-danger text-white shadow-lg shadow-danger/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                                    title="Reject Funding"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black text-text-secondary uppercase tracking-widest">
                                                Verified
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
