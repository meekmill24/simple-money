'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Pencil, Trash2, Save, X, Package, Users, Zap, AlertTriangle, CheckCircle, Loader2, Image as ImageIcon, ChevronDown, RefreshCcw, TrendingUp, Star } from 'lucide-react';

interface BundlePackage {
    id: number;
    name: string;
    description: string;
    required_top_up: number;
    bonus_amount: number;
    is_active: boolean;
    created_at: string;
}

interface UserProfile {
    id: string;
    username: string;
    wallet_balance: number;
    profit: number;
    level_id: number | null;
    pending_bundle: Record<string, unknown> | null;
}

interface TaskItem {
    id: number;
    title: string;
    image_url: string;
    category: string;
    level_id: number;
}

const emptyBundle = { name: '', description: '', required_top_up: 100, bonus_amount: 20, is_active: true };

const BONUS_PRESETS = [
    { label: '30%', value: 'pct_30' },
    { label: '50%', value: 'pct_50' },
    { label: '100%', value: 'pct_100' },
    { label: '150%', value: 'pct_150' },
    { label: '200%', value: 'pct_200' },
    { label: '$50 FIX', value: 'fix_50' },
    { label: '$100 FIX', value: 'fix_100' },
    { label: '$500 FIX', value: 'fix_500' },
    { label: 'CUSTOM', value: 'custom' },
];

export default function AdminBundlesPage() {
    const [bundles, setBundles] = useState<BundlePackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | 'new' | null>(null);
    const [formData, setFormData] = useState(emptyBundle);
    const [saving, setSaving] = useState(false);

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [assignForm, setAssignForm] = useState<{ name: string; description: string; productAmount: string | number; targetIndex: string | number }>({
        name: 'Special Bundle Package',
        description: 'A special bundled order assigned by management.',
        productAmount: '',
        targetIndex: 35, // Default to a late task in the set
    });
    const [assigning, setAssigning] = useState(false);
    const [assignMsg, setAssignMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    const [taskItems, setTaskItems] = useState<TaskItem[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
    const [bonusPreset, setBonusPreset] = useState('pct_30');
    const [customBonus, setCustomBonus] = useState<string | number>('');

    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [productLevelFilter, setProductLevelFilter] = useState<number | 'all'>('all');
    const [userLevelFilter, setUserLevelFilter] = useState<number | 'all'>('all');

    const toggleTaskSelect = (id: number) => {
        setSelectedTaskIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= 2) return prev;
            return [...prev, id];
        });
    };

    const filteredUsers = useMemo(() => users.filter(u =>
        (userLevelFilter === 'all' || u.level_id === userLevelFilter) &&
        u.username.toLowerCase().includes(userSearchQuery.toLowerCase())
    ), [users, userLevelFilter, userSearchQuery]);

    const filteredTaskItems = useMemo(() => taskItems.filter(t =>
        (productLevelFilter === 'all' || t.level_id === productLevelFilter) &&
        (t.title.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
            t.category.toLowerCase().includes(productSearchQuery.toLowerCase()))
    ), [taskItems, productLevelFilter, productSearchQuery]);

    const fetchBundles = useCallback(async () => {
        const { data } = await supabase.from('bundle_packages').select('*').order('required_top_up', { ascending: true });
        if (data) setBundles(data);
        setLoading(false);
    }, []);

    const fetchUsers = useCallback(async () => {
        const { data } = await supabase.from('profiles').select('id, username, wallet_balance, profit, level_id, pending_bundle').eq('role', 'user').order('username');
        if (data) setUsers(data as UserProfile[]);
    }, []);

    const fetchTaskItems = useCallback(async () => {
        const { data } = await supabase.from('task_items').select('id, title, image_url, category, level_id').eq('is_active', true).order('level_id', { ascending: true }).order('title', { ascending: true });
        if (data) setTaskItems(data as TaskItem[]);
    }, []);

    useEffect(() => { fetchBundles(); fetchUsers(); fetchTaskItems(); }, [fetchBundles, fetchUsers, fetchTaskItems]);

    // Derived Stats
    const stats = useMemo(() => ({
        activeQueued: users.filter(u => u.pending_bundle).length,
        catalogTotal: bundles.length,
        maxBonus: bundles.reduce((max, b) => Math.max(max, b.bonus_amount), 0)
    }), [users, bundles]);

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editingId === 'new') await supabase.from('bundle_packages').insert(formData);
            else if (editingId !== null) await supabase.from('bundle_packages').update(formData).eq('id', editingId);
            setEditingId(null);
            fetchBundles();
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Permanently remove this bundle from catalog?')) return;
        await supabase.from('bundle_packages').delete().eq('id', id);
        fetchBundles();
    };

    const handleUserSelect = (userId: string) => {
        setSelectedUserId(userId);
        const user = users.find(u => u.id === userId);
        if (user) {
            const defaultProductAmount = parseFloat((user.wallet_balance * 1.2).toFixed(2));
            setAssignForm(f => ({ ...f, productAmount: defaultProductAmount, targetIndex: 35 }));
            setProductLevelFilter(user.level_id || 1);
        }
    };

    const selectedUser = users.find(u => u.id === selectedUserId);
    const selectedTasks = taskItems.filter(t => selectedTaskIds.includes(t.id));

    const computeBonus = (productAmount: number): number => {
        const bonusPresetValue = bonusPreset;
        if (bonusPresetValue === 'pct_30') return parseFloat((productAmount * 0.30).toFixed(2));
        if (bonusPresetValue === 'pct_50') return parseFloat((productAmount * 0.50).toFixed(2));
        if (bonusPresetValue === 'pct_100') return parseFloat((productAmount * 1.00).toFixed(2));
        if (bonusPresetValue === 'pct_150') return parseFloat((productAmount * 1.50).toFixed(2));
        if (bonusPresetValue === 'pct_200') return parseFloat((productAmount * 2.00).toFixed(2));
        if (bonusPresetValue === 'fix_50') return 50;
        if (bonusPresetValue === 'fix_100') return 100;
        if (bonusPresetValue === 'fix_500') return 500;
        return typeof customBonus === 'number' ? customBonus : parseFloat(customBonus as string) || 0;
    };

    const handleAssignBundle = async () => {
        const amount = typeof assignForm.productAmount === 'number' ? assignForm.productAmount : parseFloat(assignForm.productAmount) || 0;
        if (!selectedUserId || !amount || selectedTaskIds.length === 0) {
            setAssignMsg({ type: 'error', text: 'Select a user, amount, and at least one product.' });
            return;
        }
        setAssigning(true);
        setAssignMsg(null);
        try {
            const productAmount = amount;
            const walletBalance = selectedUser?.wallet_balance || 0;
            const shortageAmount = parseFloat(Math.max(0, productAmount - walletBalance).toFixed(2));
            const bonusAmount = computeBonus(productAmount);
            const primaryTask = selectedTasks[0];

            const bundlePayload = {
                id: `admin-${Date.now()}`,
                name: assignForm.name,
                description: assignForm.description,
                shortageAmount,
                totalAmount: productAmount,
                bonusAmount,
                expiresIn: 86400,
                assignedBy: 'admin',
                assignedAt: new Date().toISOString(),
                taskItemIds: selectedTaskIds,
                targetIndex: typeof assignForm.targetIndex === 'number' ? assignForm.targetIndex : parseInt(assignForm.targetIndex as string) || 35,
                taskItem: primaryTask ? { title: primaryTask.title, image_url: primaryTask.image_url, category: primaryTask.category } : null,
            };

            const res = await fetch('/api/admin/assign-bundle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUserId, bundle: bundlePayload }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                setAssignMsg({ type: 'error', text: `Server error (${res.status}): ${errorText.substring(0, 50)}` });
                return;
            }

            const result = await res.json();
            if (result.error) setAssignMsg({ type: 'error', text: result.error });
            else {
                setAssignMsg({ type: 'success', text: `Bundle success for ${selectedUser?.username}!` });
                fetchUsers();
            }
        } catch (err) {
            console.error("Bundle Assign Error:", err);
            setAssignMsg({ type: 'error', text: `Fetch failed: ${err instanceof Error ? err.message : 'Is your server running?'}` });
        } finally { setAssigning(false); }
    };

    const handleClearBundle = async (userId: string) => {
        try {
            const res = await fetch('/api/admin/assign-bundle', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (res.ok) fetchUsers();
            else {
                const txt = await res.text();
                console.error("Clear bundle error:", txt);
            }
        } catch (err) {
            console.error("Clear bundle fetch fail:", err);
        }
    };

    const bonusPercent = (topUp: number, bonus: number) =>
        topUp > 0 ? ((bonus / topUp) * 100).toFixed(0) : '0';

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">Bundles & Packaging</h1>
                    <p className="text-text-secondary mt-1 font-medium flex items-center gap-2">
                        <Zap size={14} className="text-amber-500" />
                        Queue high-profit bundle orders for specific users
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { fetchBundles(); fetchUsers(); fetchTaskItems(); }} className="p-3 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-white transition-all">
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => { setEditingId('new'); setFormData(emptyBundle); }} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
                        <Plus size={16} /> New Catalog Item
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-500"><TrendingUp size={24} /></div>
                        <span className="text-[10px] font-black uppercase text-amber-500/60 tracking-widest">Live Flow</span>
                    </div>
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Active Queued</p>
                    <p className="text-3xl font-black text-white uppercase">{stats.activeQueued} <span className="text-xs text-amber-500 font-bold ml-1">BUNDLES</span></p>
                </div>
                <div className="glass-card p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-primary/20 text-primary-light"><Package size={24} /></div>
                        <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Global Catalog</span>
                    </div>
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Packages</p>
                    <p className="text-3xl font-black text-white uppercase">{stats.catalogTotal} <span className="text-xs text-primary-light font-bold ml-1">CONFIGS</span></p>
                </div>
                <div className="glass-card p-6 border-success/20 bg-gradient-to-br from-success/5 to-transparent">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-success/20 text-success text-shadow"><Star size={24} /></div>
                        <span className="text-[10px] font-black uppercase text-success/60 tracking-widest">Max Payout</span>
                    </div>
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Highest Bonus</p>
                    <p className="text-3xl font-black text-white uppercase">${stats.maxBonus.toLocaleString()} <span className="text-xs text-success font-bold ml-1">USDT</span></p>
                </div>
            </div>

            {/* Active Allocations Section */}
            <div className="glass-card overflow-hidden border-primary/20">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-primary/5">
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                        <Users size={14} className="text-primary-light" /> Active User Allocations
                    </h3>
                    <div className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 uppercase tracking-widest">
                        {users.filter(u => u.pending_bundle).length} Pending Hits
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-black/20 text-[9px] font-black text-text-secondary uppercase tracking-widest">
                                <th className="p-4 text-left">User</th>
                                <th className="p-4 text-left">Target Task</th>
                                <th className="p-4 text-left">Bundle Price</th>
                                <th className="p-4 text-left">Commission</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.filter(u => u.pending_bundle).map(u => {
                                const b = u.pending_bundle as any;
                                return (
                                    <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary-light font-black text-xs uppercase shrink-0">
                                                    {u.username[0]}
                                                </div>
                                                <span className="font-bold text-white truncate">{u.username}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-amber-500 font-black text-xs uppercase tracking-tighter">TASK #{b.targetIndex}</span>
                                                <span className="text-[9px] text-text-secondary font-bold uppercase tracking-widest opacity-60">Wait until hit</span>
                                            </div>
                                        </td>
                                        <td className="p-4"><p className="text-white font-bold tracking-tight">${Number(b.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></td>
                                        <td className="p-4"><p className="text-success font-black tracking-tight">+${Number(b.bonusAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></td>
                                        <td className="p-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUserId(u.id);
                                                        setAssignForm({
                                                            name: b.name || 'Special Bundle Package',
                                                            description: b.description || '',
                                                            productAmount: b.totalAmount,
                                                            targetIndex: b.targetIndex
                                                        });
                                                        if (b.taskItemIds) setSelectedTaskIds(b.taskItemIds);
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                    className="p-2 rounded-lg bg-white/5 text-text-secondary hover:text-white border border-white/10 hover:border-white/20 transition-all"
                                                    title="Edit Figures"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleClearBundle(u.id)}
                                                    className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20 transition-all"
                                                    title="Cancel Allocation"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {users.filter(u => u.pending_bundle).length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center opacity-30 italic text-text-secondary uppercase font-black text-[10px] tracking-widest">
                                        No active bundles in queue
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Assignment Form */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="glass-card p-6 border-amber-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                        <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                            <Zap size={18} className="text-amber-500" /> User Allocation
                        </h3>

                        <div className="space-y-4 relative z-10">
                            {/* User Select */}
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 block">Target User</label>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                                        className={`w-full input-field text-left flex justify-between items-center group transition-all ${showUserDropdown ? 'ring-2 ring-primary/30 border-primary/50 bg-black/20' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-lg transition-colors ${selectedUser ? 'bg-primary/20 text-primary-light' : 'bg-white/5 text-text-secondary'}`}>
                                                <Users size={14} />
                                            </div>
                                            <span className={selectedUser ? 'text-white font-bold' : 'text-text-secondary/50'}>
                                                {selectedUser ? selectedUser.username : 'Find target user...'}
                                            </span>
                                        </div>
                                        <div className={`p-1 rounded-md bg-white/5 transition-transform ${showUserDropdown ? 'rotate-180 bg-primary/20' : ''}`}>
                                            <ChevronDown size={14} className={showUserDropdown ? 'text-primary-light' : 'text-text-secondary'} />
                                        </div>
                                    </button>
                                    {showUserDropdown && (
                                        <div className="absolute z-[100] top-full mt-2 w-full glass-card border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden max-h-64 flex flex-col animate-in slide-in-from-top-2 fade-in duration-200 ring-1 ring-white/10">
                                            <div className="p-3 border-b border-white/10 bg-[#0a0a0a] sticky top-0 z-10">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Filter by username..."
                                                        className="w-full bg-white/5 border border-white/20 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-all font-medium placeholder:text-text-secondary/30"
                                                        value={userSearchQuery}
                                                        onChange={e => setUserSearchQuery(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <Users size={12} className="absolute left-2.5 top-2.5 text-text-secondary" />
                                                </div>
                                            </div>
                                            <div className="overflow-y-auto px-1 py-1 custom-scrollbar flex-1 bg-[#121212]">
                                                {filteredUsers.map((u: UserProfile) => (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => { handleUserSelect(u.id); setShowUserDropdown(false); }}
                                                        className={`p-3 rounded-xl cursor-pointer hover:bg-white/10 transition-all flex justify-between items-center mb-1 group border ${selectedUserId === u.id ? 'bg-primary border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]' : 'border-transparent'}`}
                                                    >
                                                        <div className="min-w-0 pr-2">
                                                            <p className={`font-bold truncate ${selectedUserId === u.id ? 'text-white' : 'text-white group-hover:text-primary-light'}`}>{u.username}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-[9px] font-black uppercase tracking-tighter ${selectedUserId === u.id ? 'text-white/70' : 'text-text-secondary'}`}>VIP {u.level_id || 1}</span>
                                                                <span className={`text-[9px] font-bold ${selectedUserId === u.id ? 'text-white' : 'text-success'}`}>${u.wallet_balance.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {u.pending_bundle && (
                                                                <div className={`p-1 rounded-md border ${selectedUserId === u.id ? 'bg-white/20 border-white/20 text-white' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                                    <AlertTriangle size={10} />
                                                                </div>
                                                            )}
                                                            {selectedUserId === u.id ? <CheckCircle size={14} className="text-white animate-in zoom-in" /> : <div className="w-[14px]" />}
                                                        </div>
                                                    </div>
                                                ))}
                                                {filteredUsers.length === 0 && (
                                                    <div className="py-8 text-center opacity-30 italic text-[10px] text-text-secondary uppercase tracking-widest font-black">
                                                        User not found
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedUser && (
                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3 animate-in fade-in slide-in-from-left-2 transition-all">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 text-primary-light font-black text-sm shadow-inner shadow-primary/20 overflow-hidden relative">
                                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
                                                <span className="relative z-10">{selectedUser.username[0].toUpperCase()}</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white leading-none mb-1 uppercase tracking-tight">{selectedUser.username}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-black text-primary-light uppercase bg-primary/10 px-1.5 py-0.5 rounded border border-primary/10">VIP {selectedUser.level_id || 1}</span>
                                                    <p className="text-[9px] text-text-secondary uppercase font-bold tracking-tighter">${selectedUser.wallet_balance.toFixed(2)} wallet</p>
                                                </div>
                                            </div>
                                        </div>
                                        {selectedUser.pending_bundle && (
                                            <button onClick={() => handleClearBundle(selectedUser.id)} className="text-[9px] font-black text-danger uppercase tracking-[0.1em] bg-danger/10 px-3 py-1.5 rounded-lg border border-danger/10 hover:bg-danger/20 hover:scale-105 active:scale-95 transition-all">Clear Active</button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Product Select (Inline) */}
                            <div>
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 block flex justify-between items-center">
                                    <span>Force Spin Landing (Max 2)</span>
                                    {selectedTaskIds.length > 0 && (
                                        <span className="text-primary-light font-black text-[9px] bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                                            {selectedTaskIds.length}/2 Selected
                                        </span>
                                    )}
                                </label>

                                <div className="glass-card border-white/5 bg-black/20 overflow-hidden flex flex-col min-h-[180px] max-h-[220px]">
                                    <div className="p-2 border-b border-white/5 bg-white/2 space-y-2">
                                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                                            {['all', 1, 2, 3, 4, 5].map(lvl => (
                                                <button
                                                    key={lvl}
                                                    onClick={() => setProductLevelFilter(lvl as any)}
                                                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border transition-all shrink-0 ${productLevelFilter === lvl ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10'}`}
                                                >
                                                    {lvl === 'all' ? 'All' : `VIP ${lvl}`}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search catalog products..."
                                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                                                value={productSearchQuery}
                                                onChange={e => setProductSearchQuery(e.target.value)}
                                            />
                                            <ImageIcon size={12} className="absolute left-2.5 top-2 text-text-secondary/50" />
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto px-1 py-1 custom-scrollbar flex-1">
                                        {filteredTaskItems.map((t: TaskItem) => {
                                            const isSelected = selectedTaskIds.includes(t.id);
                                            return (
                                                <div
                                                    key={t.id}
                                                    onClick={() => toggleTaskSelect(t.id)}
                                                    className={`p-2 rounded-xl cursor-pointer hover:bg-white/5 transition-all flex items-center gap-3 mb-1 group border ${isSelected ? 'bg-primary/20 border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]' : 'border-transparent'}`}
                                                >
                                                    <div className="relative shrink-0">
                                                        <img src={t.image_url} className="w-9 h-9 rounded-lg object-cover border border-white/5 group-hover:scale-105 transition-transform" onError={e => e.currentTarget.src = 'https://loremflickr.com/100/100/machinery'} />
                                                        {isSelected && (
                                                            <div className="absolute -top-1.5 -right-1.5 bg-primary text-white rounded-full p-0.5 shadow-lg animate-in zoom-in">
                                                                <CheckCircle size={10} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className={`text-[11px] font-bold truncate ${isSelected ? 'text-primary-light' : 'text-white group-hover:text-primary-light'}`}>{t.title}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[8px] font-black text-text-secondary uppercase bg-white/5 px-1.5 py-0.5 rounded-md">LV{t.level_id}</span>
                                                            <span className="text-[8px] text-text-secondary/60 truncate italic">{t.category}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {filteredTaskItems.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-8 opacity-20">
                                                <Package size={24} className="mb-2" />
                                                <p className="text-[10px] font-bold italic uppercase">No matches found</p>
                                            </div>
                                        )}
                                    </div>
                                    {selectedTaskIds.length > 0 && (
                                        <div className="p-2 border-t border-white/5 bg-primary/5 flex gap-1.5 overflow-x-auto no-scrollbar">
                                            {selectedTasks.map(t => (
                                                <div key={t.id} className="flex items-center gap-1.5 bg-black/40 border border-primary/20 rounded-lg pl-1.5 pr-1 py-1 shrink-0 animate-in slide-in-from-bottom-1">
                                                    <img src={t.image_url} className="w-4 h-4 rounded object-cover" />
                                                    <span className="text-[9px] font-bold text-white max-w-[60px] truncate">{t.title}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); toggleTaskSelect(t.id); }} className="text-text-secondary hover:text-danger p-0.5 transition-colors">
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Amount & Bonus */}
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 block flex justify-between items-center">
                                        <span>Bundle Price ($)</span>
                                        {assignForm.productAmount !== '' && (
                                            <button onClick={() => setAssignForm({ ...assignForm, productAmount: '' })} className="text-[8px] font-black text-text-secondary hover:text-danger uppercase tracking-widest transition-colors flex items-center gap-1">
                                                <X size={8} /> Clear
                                            </button>
                                        )}
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className="input-field text-white font-bold placeholder:text-white/10"
                                        value={assignForm.productAmount}
                                        onChange={e => setAssignForm({ ...assignForm, productAmount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 block">Commission Layer</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {BONUS_PRESETS.map(p => (
                                            <button key={p.value} onClick={() => setBonusPreset(p.value)} className={`py-2 px-1 rounded-xl text-[9px] font-black tracking-tighter transition-all border ${bonusPreset === p.value ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white/5 border-white/5 text-text-secondary hover:bg-white/10'}`}>
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {bonusPreset === 'custom' && (
                                    <div className="animate-in slide-in-from-top-1 duration-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Fixed Profit ($)</label>
                                            {customBonus !== '' && <button onClick={() => setCustomBonus('')} className="text-[8px] font-black text-text-secondary hover:text-danger uppercase tracking-widest transition-colors"><X size={8} /></button>}
                                        </div>
                                        <input
                                            type="number"
                                            placeholder="Enter fixed profit…"
                                            className="input-field text-sm font-bold placeholder:text-white/10"
                                            value={customBonus}
                                            onChange={e => setCustomBonus(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Target Index */}
                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                                <label className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] block">Target Task Index (1-40)</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        className="flex-1 accent-amber-500"
                                        value={assignForm.targetIndex}
                                        onChange={e => setAssignForm({ ...assignForm, targetIndex: parseInt(e.target.value) })}
                                    />
                                    <input
                                        type="number"
                                        className="w-16 bg-white/5 border border-amber-500/30 rounded-lg py-1 text-center font-black text-amber-500 text-xs"
                                        value={assignForm.targetIndex}
                                        onChange={e => setAssignForm({ ...assignForm, targetIndex: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                                <p className="text-[9px] text-amber-500/60 font-bold uppercase tracking-widest leading-relaxed">The bundle will trigger only when the user reaches this specific task in their current set.</p>
                            </div>

                            {/* Summary & Go */}
                            {(() => {
                                const numAmount = typeof assignForm.productAmount === 'number' ? assignForm.productAmount : parseFloat(assignForm.productAmount) || 0;
                                if (!selectedUser || numAmount <= 0) return null;
                                return (
                                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-xs space-y-2 animate-in fade-in duration-300">
                                        <div className="flex justify-between"><span className="text-text-secondary font-bold uppercase tracking-widest text-[9px]">Deposit Req.</span><span className="text-danger font-black">${Math.max(0, numAmount - selectedUser.wallet_balance).toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span className="text-text-secondary font-bold uppercase tracking-widest text-[9px]">Guaranteed Profit</span><span className="text-success font-black">+${computeBonus(numAmount).toFixed(2)}</span></div>
                                    </div>
                                );
                            })()}

                            {assignMsg && (
                                <div className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-center ${assignMsg.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                    {assignMsg.text}
                                </div>
                            )}

                            <button
                                onClick={handleAssignBundle}
                                disabled={!selectedUserId || assigning || (typeof assignForm.productAmount === 'string' ? assignForm.productAmount === '' : assignForm.productAmount <= 0)}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black uppercase tracking-[0.15em] text-xs flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
                            >
                                {assigning ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                {assigning ? 'Allocating...' : 'Deploy Bundle to Task'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Catalog List */}
                <div className="xl:col-span-8">
                    <div className="glass-card overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/2">
                            <h3 className="text-xs font-black text-text-secondary uppercase tracking-[0.2em] flex items-center gap-2">
                                <Package size={14} /> Catalog Database
                            </h3>
                            <div className="text-[10px] font-black text-primary-light bg-primary/10 px-3 py-1 rounded-full border border-primary/20 uppercase tracking-widest">
                                {bundles.length} Configured Bundles
                            </div>
                        </div>

                        {editingId !== null && (
                            <div className="p-6 bg-primary/5 border-b border-white/5 animate-slide-up">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="text-[9px] font-black text-text-secondary uppercase mb-2 block">Name</label>
                                        <input className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-text-secondary uppercase mb-2 block">Top-Up ($)</label>
                                        <input type="number" className="input-field" value={formData.required_top_up} onChange={e => setFormData({ ...formData, required_top_up: parseFloat(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-text-secondary uppercase mb-2 block">Bonus ($)</label>
                                        <input type="number" className="input-field" value={formData.bonus_amount} onChange={e => setFormData({ ...formData, bonus_amount: parseFloat(e.target.value) })} />
                                    </div>
                                </div>
                                <div className="flex gap-4 mt-4 items-center">
                                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-success rounded-xl text-white font-black text-[10px] uppercase tracking-widest hover:bg-success/80">Save Entry</button>
                                    <button onClick={() => setEditingId(null)} className="px-6 py-2 bg-white/5 rounded-xl text-text-secondary font-black text-[10px] uppercase tracking-widest hover:bg-white/10">Discard</button>
                                    <div className="ml-auto flex items-center gap-2">
                                        <span className="text-[9px] font-black text-text-secondary uppercase">Active</span>
                                        <button onClick={() => setFormData({ ...formData, is_active: !formData.is_active })} className={`w-10 h-5 rounded-full transition-all relative ${formData.is_active ? 'bg-success' : 'bg-white/10'}`}>
                                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-black/20">
                                        <th className="p-4 text-left text-[9px] font-black text-text-secondary uppercase tracking-widest">Bundle Metadata</th>
                                        <th className="p-4 text-left text-[9px] font-black text-text-secondary uppercase tracking-widest">Entry Price</th>
                                        <th className="p-4 text-left text-[9px] font-black text-text-secondary uppercase tracking-widest">Cash Reward</th>
                                        <th className="p-4 text-left text-[9px] font-black text-text-secondary uppercase tracking-widest">Yield</th>
                                        <th className="p-4 text-left text-[9px] font-black text-text-secondary uppercase tracking-widest">Status</th>
                                        <th className="p-4 text-right text-[9px] font-black text-text-secondary uppercase tracking-widest">Modify</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {bundles.map(b => (
                                        <tr key={b.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4">
                                                <p className="font-bold text-white uppercase tracking-tight">{b.name}</p>
                                                <p className="text-[10px] text-text-secondary mt-0.5">{b.description || 'Global Platform Package'}</p>
                                            </td>
                                            <td className="p-4"><p className="text-white font-black">${b.required_top_up.toFixed(2)}</p></td>
                                            <td className="p-4"><p className="text-success font-black">+${b.bonus_amount.toFixed(2)}</p></td>
                                            <td className="p-4">
                                                <p className="text-primary-light font-black text-xs">
                                                    {b.required_top_up > 0 ? (b.bonus_amount / b.required_top_up * 100).toFixed(0) : 0}%
                                                </p>
                                            </td>
                                            <td className="p-4">
                                                <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest w-fit border ${b.is_active ? 'bg-success/10 text-success border-success/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-white/5 text-text-secondary border-white/10 opacity-50'}`}>
                                                    {b.is_active ? 'ENABLED' : 'DISABLED'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditingId(b.id); setFormData({ ...b }); }} className="p-2 rounded-lg bg-white/5 text-text-secondary hover:text-white border border-white/10 hover:border-white/20"><Pencil size={14} /></button>
                                                    <button onClick={() => handleDelete(b.id)} className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {bundles.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center opacity-30 italic text-text-secondary">Catalog is empty. Please create your first bundle.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const bonusPercent = (topUp: number, bonus: number) =>
    topUp > 0 ? ((bonus / topUp) * 100).toFixed(0) : '0';
