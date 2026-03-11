'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ReferralCode, Profile } from '@/lib/types';
import { Search, Copy, CheckCircle, XCircle, Users, TrendingUp } from 'lucide-react';

interface ReferralWithOwner extends Omit<ReferralCode, 'owner'> {
    owner: { username: string; phone: string } | null;
    referred_users: { username: string; wallet_balance: number; profit: number; created_at: string }[];
    total_commission: number;
}

export default function AdminReferralsPage() {
    const [referrals, setReferrals] = useState<ReferralWithOwner[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [copied, setCopied] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [allUsers, setAllUsers] = useState<Profile[]>([]);

    const fetchReferrals = async () => {
        const [refRes, usersRes, transRes] = await Promise.all([
            supabase.from('referral_codes').select('*, owner:profiles(username, phone)').order('created_at', { ascending: false }),
            supabase.from('profiles').select('id, username, wallet_balance, profit, referred_by, created_at'),
            supabase.from('transactions').select('*').eq('type', 'commission').ilike('description', '%Referral%')
        ]);

        const users = (usersRes.data || []) as Profile[];
        setAllUsers(users);

        const transactions = (transRes.data || []);

        const enriched: ReferralWithOwner[] = (refRes.data || []).map((ref) => {
            const referred = users.filter(u => u.referred_by === ref.owner_id);
            const ownerCommissions = transactions
                .filter(t => t.user_id === ref.owner_id)
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            return {
                ...ref,
                owner: ref.owner as { username: string; phone: string } | null,
                referred_users: referred.map(u => ({
                    username: u.username,
                    wallet_balance: u.wallet_balance,
                    profit: u.profit,
                    created_at: u.created_at,
                })),
                total_commission: ownerCommissions,
            };
        });

        setReferrals(enriched);
        setLoading(false);
    };

    useEffect(() => { fetchReferrals(); }, []);

    const toggleActive = async (id: number, current: boolean) => {
        await supabase.from('referral_codes').update({ is_active: !current }).eq('id', id);
        fetchReferrals();
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
    };

    const filtered = referrals.filter(r =>
        r.code.toLowerCase().includes(search.toLowerCase()) ||
        (r.owner as { username: string } | null)?.username?.toLowerCase().includes(search.toLowerCase())
    );

    // Summary stats
    const totalReferrals = allUsers.filter(u => u.referred_by).length;
    const totalCommissions = referrals.reduce((sum, r) => sum + r.total_commission, 0);
    const totalCodes = referrals.length;
    const activeCodes = referrals.filter(r => r.is_active).length;

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Total Referral Codes', value: totalCodes, icon: <Copy size={18} /> },
                    { label: 'Active Codes', value: activeCodes, icon: <CheckCircle size={18} /> },
                    { label: 'Users Referred', value: totalReferrals, icon: <Users size={18} /> },
                    { label: 'Total Paid Bonuses', value: `$${totalCommissions.toFixed(2)}`, icon: <TrendingUp size={18} /> },
                ].map(s => (
                    <div key={s.label} className="glass-card p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary-light shrink-0">{s.icon}</div>
                        <div>
                            <p className="text-xs text-text-secondary">{s.label}</p>
                            <p className="text-xl font-black text-white">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input type="text" placeholder="Search by code or owner username..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-11" />
            </div>

            {/* Table with hierarchy expansion */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left p-4 text-text-secondary font-medium">Code</th>
                                <th className="text-left p-4 text-text-secondary font-medium">Owner</th>
                                <th className="text-left p-4 text-text-secondary font-medium">Uses</th>
                                <th className="text-left p-4 text-text-secondary font-medium">Referred Users</th>
                                <th className="text-left p-4 text-text-secondary font-medium">Earned Bonus</th>
                                <th className="text-left p-4 text-text-secondary font-medium">Status</th>
                                <th className="text-left p-4 text-text-secondary font-medium">Created</th>
                                <th className="text-right p-4 text-text-secondary font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-text-secondary">Loading...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-text-secondary">No referral codes found</td></tr>
                            ) : (
                                filtered.map((ref) => (
                                    <React.Fragment key={ref.id}>
                                        <tr className="border-b border-text-primary/10 hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-white">{ref.code}</span>
                                                    <button onClick={() => copyCode(ref.code)} className="p-1 rounded hover:bg-white/10">
                                                        {copied === ref.code ? <CheckCircle size={14} className="text-success" /> : <Copy size={14} className="text-text-secondary" />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-4 text-text-secondary">{(ref.owner as { username: string } | null)?.username || 'Unknown'}</td>
                                            <td className="p-4 text-white font-semibold">{ref.uses_count}</td>
                                            <td className="p-4">
                                                {ref.referred_users.length > 0 ? (
                                                    <button
                                                        onClick={() => setExpanded(expanded === ref.code ? null : ref.code)}
                                                        className="flex items-center gap-1 text-primary-light text-xs hover:underline font-semibold"
                                                    >
                                                        <Users size={13} /> {ref.referred_users.length} user{ref.referred_users.length > 1 ? 's' : ''}
                                                        <TrendingUp size={12} className="ml-0.5" />
                                                    </button>
                                                ) : (
                                                    <span className="text-text-secondary text-xs">No referrals yet</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm font-black text-success">
                                                    ${ref.total_commission.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${ref.is_active ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                                    {ref.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                                    {ref.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-text-secondary text-xs">{new Date(ref.created_at).toLocaleDateString()}</td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => toggleActive(ref.id, ref.is_active)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${ref.is_active ? 'bg-danger/20 text-danger hover:bg-danger/30' : 'bg-success/20 text-success hover:bg-success/30'}`}>
                                                    {ref.is_active ? 'Deactivate' : 'Activate'}
                                                </button>
                                            </td>
                                        </tr>
                                        {/* Hierarchy Sub-rows */}
                                        {expanded === ref.code && ref.referred_users.map((u, i) => (
                                            <tr key={`${ref.code}-${i}`} className="bg-white/3 border-b border-white/3">
                                                <td className="pl-10 p-3 text-xs text-text-secondary">↳</td>
                                                <td className="p-3 text-xs text-white font-medium" colSpan={2}>{u.username}</td>
                                                <td className="p-3 text-xs text-success">Profit: ${u.profit?.toFixed(2)}</td>
                                                <td className="p-3 text-xs text-text-secondary">Balance: ${u.wallet_balance?.toFixed(2)}</td>
                                                <td className="p-3 text-xs text-text-secondary" colSpan={2}>Joined: {new Date(u.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
