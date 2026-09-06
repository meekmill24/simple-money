'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Transaction } from '@/lib/types';
import { Search, ArrowUpRight, ArrowDownLeft, Snowflake, DollarSign } from 'lucide-react';

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<(Transaction & { profile?: { username: string } })[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const fetchTransactions = async () => {
        const { data } = await supabase
            .from('transactions')
            .select('*, profile:profiles(username)')
            .order('created_at', { ascending: false })
            .limit(100);
        if (data) setTransactions(data as (Transaction & { profile?: { username: string } })[]);
        setLoading(false);
    };

    useEffect(() => { fetchTransactions(); }, []);

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this transaction?')) return;
        await supabase.from('transactions').delete().eq('id', id);
        fetchTransactions();
    };

    const typeIcon = (type: string) => {
        switch (type) {
            case 'deposit': return <ArrowDownLeft size={14} className="text-success" />;
            case 'withdrawal': return <ArrowUpRight size={14} className="text-danger" />;
            case 'commission': return <DollarSign size={14} className="text-primary-light" />;
            case 'freeze': case 'unfreeze': return <Snowflake size={14} className="text-accent-light" />;
            default: return null;
        }
    };

    const typeColor = (type: string) => {
        switch (type) {
            case 'deposit': return 'bg-success/20 text-success';
            case 'withdrawal': return 'bg-danger/20 text-danger';
            case 'commission': return 'bg-primary/20 text-primary-light';
            case 'freeze': case 'unfreeze': return 'bg-accent/20 text-accent-light';
            default: return 'bg-white/5 text-text-secondary';
        }
    };

    const filtered = transactions.filter(t => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        if (search && !t.description.toLowerCase().includes(search.toLowerCase()) && !t.profile?.username.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input type="text" placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-11" />
                </div>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field w-auto">
                    <option value="all">All Types</option>
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="commission">Commission</option>
                    <option value="freeze">Freeze</option>
                    <option value="unfreeze">Unfreeze</option>
                </select>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left p-4 text-text-secondary font-medium">ID</th>
                                <th className="text-left p-4 text-text-secondary font-medium">User</th>
                                <th className="text-left p-4 text-text-secondary font-medium">Type</th>
                                <th className="text-left p-4 text-text-secondary font-medium">Amount</th>
                                <th className="text-left p-4 text-text-secondary font-medium">Description</th>
                                <th className="text-left p-4 text-text-secondary font-medium">Date</th>
                                <th className="text-right p-4 text-text-secondary font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-text-secondary">Loading...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-text-secondary">No transactions found</td></tr>
                            ) : (
                                filtered.map((tx) => (
                                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/3">
                                        <td className="p-4 text-text-secondary font-mono text-xs">#{tx.id}</td>
                                        <td className="p-4 text-white">{tx.profile?.username || 'Unknown'}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeColor(tx.type)}`}>
                                                {typeIcon(tx.type)}
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className={`p-4 font-semibold ${tx.type === 'withdrawal' ? 'text-danger' : 'text-success'}`}>
                                            {tx.type === 'withdrawal' ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-text-secondary text-xs max-w-[200px] truncate">{tx.description}</td>
                                        <td className="p-4 text-text-secondary text-xs">{new Date(tx.created_at).toLocaleString()}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDelete(tx.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-danger/20 text-danger hover:bg-danger/30">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
