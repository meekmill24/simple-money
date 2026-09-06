'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { Search, Edit2, Trash2, Save, X, Plus, Loader2, UserPlus, Copy, CheckCircle, Link2, Zap } from 'lucide-react';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Profile>>({});
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [copied, setCopied] = useState<string | null>(null);
    // Assign referrer modal
    const [assignReferrerUser, setAssignReferrerUser] = useState<Profile | null>(null);
    const [referrerCode, setReferrerCode] = useState('');
    const [assignError, setAssignError] = useState('');
    const [assigning, setAssigning] = useState(false);

    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        username: '',
        phone: '',
        role: 'user',
        wallet_balance: 45,
        level_id: 1, // default vip level
        referral_code: '', // custom referral code
        referred_by_code: '', // custom referrer
    });

    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (data) setUsers(data);
        setLoading(false);
    };

    useEffect(() => { fetchUsers(); }, []);

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.toLowerCase().includes(search.toLowerCase()) ||
        u.referral_code?.toLowerCase().includes(search.toLowerCase())
    );

    const handleEdit = (user: Profile) => {
        setEditingId(user.id);
        setEditData({ ...user });
    };

    const handleSave = async () => {
        if (!editingId) return;
        const { error } = await supabase.from('profiles').update({
            username: editData.username,
            phone: editData.phone,
            role: editData.role,
            wallet_balance: (editData.wallet_balance as any) === '' ? 0 : Number(editData.wallet_balance || 0),
            profit: (editData.profit as any) === '' ? 0 : Number(editData.profit || 0),
            total_profit: (editData.total_profit as any) === '' ? 0 : Number(editData.total_profit || 0),
            referral_earned: (editData.referral_earned as any) === '' ? 0 : Number(editData.referral_earned || 0),
            frozen_amount: (editData.frozen_amount as any) === '' ? 0 : Number(editData.frozen_amount || 0),
            level_id: editData.level_id || 1,
            completed_count: (editData.completed_count as any) === '' ? 0 : Number(editData.completed_count || 0),
            current_set: Number(editData.current_set || 1),
            referral_code: editData.referral_code,
        }).eq('id', editingId);

        if (!error) {
            setEditingId(null);
            fetchUsers();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user PERMANENTLY? This will also remove their login access.')) return;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: id }),
            });
            const result = await res.json();
            if (result.error) {
                alert(`Deletion failed: ${result.error}`);
            } else {
                fetchUsers();
            }
        } catch {
            alert('An unexpected error occurred during deletion.');
        } finally {
            setLoading(false);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');
        setCreating(true);
        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser),
            });
            const result = await res.json();
            if (!res.ok || result.error) {
                setCreateError(result.error || 'Failed to create user.');
            } else {
                setShowCreate(false);
                setNewUser({ email: '', password: '', username: '', phone: '', role: 'user', wallet_balance: 45, level_id: 1, referral_code: '', referred_by_code: '' });
                fetchUsers();
            }
        } catch {
            setCreateError('An unexpected error occurred.');
        } finally {
            setCreating(false);
        }
    };

    // Assign referrer to a user by entering a referral code
    const handleAssignReferrer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignReferrerUser) return;
        setAssignError('');
        setAssigning(true);
        try {
            // Find the owner of that referral code
            const { data: codeData, error: codeErr } = await supabase
                .from('referral_codes')
                .select('owner_id, code')
                .eq('code', referrerCode.toUpperCase().trim())
                .eq('is_active', true)
                .single();

            if (codeErr || !codeData) {
                setAssignError('Referral code not found or inactive.');
                setAssigning(false);
                return;
            }

            if (codeData.owner_id === assignReferrerUser.id) {
                setAssignError('User cannot be referred by themselves.');
                setAssigning(false);
                return;
            }

            // Update the user's referred_by field
            const { error: updateErr } = await supabase
                .from('profiles')
                .update({ referred_by: codeData.owner_id })
                .eq('id', assignReferrerUser.id);

            if (updateErr) {
                setAssignError(updateErr.message);
                setAssigning(false);
                return;
            }

            // Check if user has already received a welcome bonus
            const { count: welcomeDbCount } = await supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', assignReferrerUser.id)
                .like('description', 'Welcome bonus%');

            if ((welcomeDbCount || 0) === 0) {
                // Grant the $45 welcome bonus
                const welcomeBonusAmount = 45;
                await supabase
                    .from('profiles')
                    .update({ wallet_balance: (assignReferrerUser.wallet_balance || 0) + welcomeBonusAmount })
                    .eq('id', assignReferrerUser.id);

                await supabase.from('transactions').insert({
                    user_id: assignReferrerUser.id,
                    type: 'deposit',
                    amount: welcomeBonusAmount,
                    description: 'Welcome bonus - New member ($45)',
                    status: 'approved'
                });
            }

            // Increment uses_count on the referral code
            await supabase.from('referral_codes')
                .update({ uses_count: (codeData as { uses_count?: number }).uses_count ?? 0 + 1 })
                .eq('code', codeData.code);

            setAssignReferrerUser(null);
            setReferrerCode('');
            fetchUsers();
        } catch {
            setAssignError('An unexpected error occurred.');
        } finally {
            setAssigning(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        User <span className="text-primary italic">Portfolio</span>
                    </h1>
                    <p className="text-text-secondary text-xs font-medium uppercase tracking-[0.2em] opacity-40">Administrative User Directory</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group flex-1 md:flex-none">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Find by name, phone, ref..."
                            className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all w-full md:w-72 font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:bg-primary/80 transition-all shadow-lg shadow-primary/20 active:scale-95 shrink-0"
                    >
                        <Plus size={16} /> New User
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-widest text-[9px]">User Info</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-widest text-[9px]">Role</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-widest text-[9px]">Balance</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-widest text-[9px] text-success">Task Profit</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-widest text-[9px] text-primary-light">Ref Bonus</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-widest text-[9px]">Frozen</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-widest text-[9px] text-accent">Total Profit</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-widest text-[9px]">VIP</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-widest text-[9px]">Progress</th>
                                <th className="text-left p-4 text-text-secondary font-black uppercase tracking-widest text-[9px]">Affiliate</th>
                                <th className="text-right p-4 text-text-secondary font-black uppercase tracking-widest text-[9px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={10} className="p-8 text-center text-text-secondary">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="animate-spin text-primary" size={24} />
                                        <span className="text-xs font-medium tracking-widest uppercase opacity-50">Syncing database...</span>
                                    </div>
                                </td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={10} className="p-8 text-center text-text-secondary font-medium uppercase tracking-widest text-xs opacity-50">No users matched your search</td></tr>
                            ) : (
                                filteredUsers.map((user) => {
                                    const referrer = users.find(u => u.id === user.referred_by);
                                    return (
                                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                            {editingId === user.id ? (
                                                <>
                                                    <td className="p-3">
                                                        <div className="flex flex-col gap-1">
                                                            <input className="input-field py-1.5 text-xs font-bold" value={editData.username || ''} onChange={(e) => setEditData({ ...editData, username: e.target.value })} placeholder="Username" />
                                                            <input className="input-field py-1 text-[10px] opacity-70" value={editData.phone || ''} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} placeholder="Phone" />
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <select className="input-field py-1.5 text-[10px] font-black uppercase tracking-tighter w-20" value={editData.role || 'user'} onChange={(e) => setEditData({ ...editData, role: e.target.value as 'user' | 'admin' })}>
                                                            <option value="user">User</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-3"><input type="number" step="0.01" className="input-field py-1.5 text-[11px] w-20 font-mono font-bold text-white" value={editData.wallet_balance ?? 0} onChange={(e) => setEditData({ ...editData, wallet_balance: e.target.value as any })} title="Total Balance" /></td>
                                                    <td className="p-3"><input type="number" step="0.01" className="input-field py-1.5 text-[11px] w-20 font-mono font-bold text-success border-success/30" value={editData.profit ?? 0} onChange={(e) => setEditData({ ...editData, profit: e.target.value as any })} title="Task Profit Only" /></td>
                                                    <td className="p-3"><input type="number" step="0.01" className="input-field py-1.5 text-[11px] w-20 font-mono font-bold text-primary-light border-primary/30" value={editData.referral_earned ?? 0} onChange={(e) => setEditData({ ...editData, referral_earned: e.target.value as any })} title="Referral Bonuses Only" /></td>
                                                    <td className="p-3"><input type="number" step="0.01" className="input-field py-1.5 text-[11px] w-20 font-mono font-bold text-danger/70" value={editData.frozen_amount ?? 0} onChange={(e) => setEditData({ ...editData, frozen_amount: e.target.value as any })} title="Frozen Balance" /></td>
                                                    <td className="p-3"><input type="number" step="0.01" className="input-field py-1.5 text-[11px] w-20 font-mono font-bold text-accent border-accent/20" value={editData.total_profit ?? 0} onChange={(e) => setEditData({ ...editData, total_profit: e.target.value as any })} title="Lifetime Total Profit" /></td>
                                                    <td className="p-3">
                                                        <select className="input-field py-1.5 text-xs font-black w-24 border-primary/30" value={editData.level_id || 1} onChange={(e) => setEditData({ ...editData, level_id: parseInt(e.target.value) })}>
                                                            {[1, 2, 3, 4, 5].map(lvl => <option key={lvl} value={lvl} className="bg-[#1a1a2e]">Level {lvl}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex gap-1">
                                                                <input type="number" className="input-field py-1 px-2 text-xs w-12 font-mono bg-white/10"
                                                                    value={editData.completed_count || 0}
                                                                    onChange={(e) => setEditData({ ...editData, completed_count: parseInt(e.target.value) || 0 })}
                                                                />
                                                                <span className="text-[9px] text-text-secondary self-center font-black uppercase opacity-50">/ {(editData.current_set || 1) * ((editData.level_id || 1) * 5 + 35)}</span>
                                                            </div>
                                                            <div className="flex gap-0.5 mt-1.5 overflow-x-auto pb-1 max-w-[120px]">
                                                                {(() => {
                                                                    const tps = (editData.level_id || 1) * 5 + 35;
                                                                    const spd = (editData.level_id || 1) + 2;
                                                                    return Array.from({ length: spd }).map((_, i) => (
                                                                        <button
                                                                            key={i}
                                                                            onClick={() => setEditData({ ...editData, completed_count: tps * i, current_set: i + 1 })}
                                                                            className={`text-[7px] px-1 py-0.5 rounded border uppercase font-bold transition-all whitespace-nowrap
                                                                                ${i === 0 ? 'bg-white/5 text-white/50 border-white/5' :
                                                                                    i === 1 ? 'bg-primary/20 text-primary-light border-primary/20' :
                                                                                        i === 2 ? 'bg-accent/20 text-accent-light border-accent/20' :
                                                                                            'bg-success/20 text-success border-success/20'}
                                                                            `}
                                                                        >
                                                                            S{i + 1} ({tps * i}/{tps * (i + 1)})
                                                                        </button>
                                                                    ));
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex flex-col gap-1">
                                                            <input className="input-field py-1 text-[10px] font-mono w-24" value={editData.referral_code || ''} onChange={(e) => setEditData({ ...editData, referral_code: e.target.value.toUpperCase() })} placeholder="REF CODE" />
                                                            <span className="text-[9px] text-text-secondary opacity-50 font-medium">REF: {referrer?.username || 'NONE'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button onClick={handleSave} className="w-8 h-8 rounded-lg bg-success/20 text-success hover:bg-success/30 flex items-center justify-center transition-all shadow-lg shadow-success/10"><Save size={14} /></button>
                                                            <button onClick={() => setEditingId(null)} className="w-8 h-8 rounded-lg bg-white/5 text-text-secondary hover:bg-white/10 flex items-center justify-center transition-all"><X size={14} /></button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="p-4">
                                                        <div className="flex flex-col min-w-[120px]">
                                                            <span className="font-bold text-white text-sm">{user.username}</span>
                                                            <span className="text-[10px] text-text-secondary font-mono tracking-tighter opacity-70">{user.phone || 'NO PHONE'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${user.role === 'admin' ? 'bg-primary/10 text-primary-light border-primary/20' : 'bg-white/5 text-text-secondary border-white/10'}`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-4"><span className="font-mono font-bold text-white text-[11px] whitespace-nowrap">${user.wallet_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                                                    <td className="p-4"><span className="font-mono font-bold text-success text-[11px] whitespace-nowrap">${user.profit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                                                    <td className="p-4"><span className="font-mono font-bold text-primary-light text-[11px] whitespace-nowrap">${user.referral_earned?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                                                    <td className="p-4"><span className="font-mono font-bold text-danger/70 text-[11px] whitespace-nowrap">${user.frozen_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                                                    <td className="p-4"><span className="font-mono font-bold text-accent text-[11px] whitespace-nowrap">${user.total_profit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                                                                <span className="text-[10px] font-black text-primary-light">V{user.level_id || 1}</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tighter">Level {user.level_id || 1}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col min-w-[90px]">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[9px] font-black text-white/90 tracking-widest uppercase">Set {user.current_set || 1}</span>
                                                                <span className="text-[9px] text-text-secondary font-mono bg-white/5 px-1 rounded">
                                                                    {user.completed_count || 0}/{(user.current_set || 1) * ((user.level_id || 1) * 5 + 35)}
                                                                </span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-700 ease-out"
                                                                    style={{ width: `${Math.min(100, ((user.completed_count || 0) / ((user.current_set || 1) * ((user.level_id || 1) * 5 + 35))) * 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-1 min-w-[100px]">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-mono font-black text-white text-[11px] tracking-wider">{user.referral_code}</span>
                                                                <button onClick={() => copyCode(user.referral_code)} className="p-1 rounded bg-white/5 hover:bg-white/10 transition-colors">
                                                                    {copied === user.referral_code
                                                                        ? <CheckCircle size={10} className="text-success" />
                                                                        : <Copy size={10} className="text-text-secondary" />}
                                                                </button>
                                                            </div>
                                                            <span className="text-[9px] text-text-secondary font-medium opacity-50 uppercase tracking-tighter truncate">
                                                                Ref: {referrer?.username || 'NONE'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button onClick={() => handleEdit(user)} className="w-8 h-8 rounded-lg bg-primary/10 text-primary-light hover:bg-primary/20 flex items-center justify-center transition-all border border-primary/10"><Edit2 size={14} /></button>
                                                            <button onClick={() => handleDelete(user.id)} className="w-8 h-8 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 flex items-center justify-center transition-all border border-danger/10"><Trash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add New User Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card-strong max-w-md w-full relative overflow-hidden animate-scale-in">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/15 rounded-full blur-[60px] pointer-events-none" />
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                    <UserPlus size={20} className="text-primary-light" />
                                </div>
                                <h2 className="text-lg font-black text-text-primary">Add New User</h2>
                            </div>
                            <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                                <X size={16} className="text-text-secondary" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">Username</label>
                                    <input type="text" required value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} placeholder="vips_member" className="input-field py-3 text-sm font-bold bg-white/5 border-white/10" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">Pin / Password</label>
                                    <input type="password" required value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Min 6 chars" className="input-field py-3 text-sm font-mono tracking-widest bg-white/5 border-white/10" minLength={6} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">Email Address</label>
                                    <input type="email" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@email.com" className="input-field py-3 text-sm bg-white/5 border-white/10" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">Mobile Number</label>
                                    <input type="text" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="+1 234 567 8900" className="input-field py-3 text-sm bg-white/5 border-white/10" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">Role</label>
                                    <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="input-field py-3 text-xs font-black uppercase bg-white/5 border-white/10">
                                        <option value="user" className="bg-[#1a1a2e]">USER</option>
                                        <option value="admin" className="bg-[#1a1a2e]">ADMIN</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">VIP Rank</label>
                                    <select value={newUser.level_id} onChange={(e) => setNewUser({ ...newUser, level_id: parseInt(e.target.value) })} className="input-field py-3 text-xs font-black uppercase bg-white/5 border-primary/20 text-primary-light">
                                        {[1, 2, 3, 4, 5].map(lvl => <option key={lvl} value={lvl} className="bg-[#1a1a2e]">LEVEL {lvl}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">Balance</label>
                                    <input type="number" step="0.01" value={newUser.wallet_balance} onChange={(e) => setNewUser({ ...newUser, wallet_balance: parseFloat(e.target.value) || 0 })} className="input-field py-3 text-sm font-mono font-bold text-success bg-white/5 border-white/10" />
                                </div>
                            </div>
                            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                                        <Zap size={16} className="text-accent-light" />
                                    </div>
                                    <div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Affiliate Settings</h3>
                                        <p className="text-[9px] text-text-secondary font-medium opacity-50">Link this user to a sponsor</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-40 ml-1">Custom Ref Code</label>
                                        <input type="text" value={newUser.referral_code} onChange={(e) => setNewUser({ ...newUser, referral_code: e.target.value.toUpperCase() })} placeholder="SMVIP..." className="input-field py-2 text-sm font-mono tracking-widest bg-white/5 border-white/5" maxLength={12} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-40 ml-1">Sponsor Code</label>
                                        <input type="text" value={newUser.referred_by_code} onChange={(e) => setNewUser({ ...newUser, referred_by_code: e.target.value.toUpperCase() })} placeholder="OPTIONAL" className="input-field py-2 text-sm font-mono tracking-widest bg-white/5 border-white/5" />
                                    </div>
                                </div>
                            </div>
                            {createError && (
                                <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold animate-shake">{createError}</div>
                            )}
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-4 rounded-2xl bg-white/5 text-text-secondary hover:bg-white/10 font-black text-xs uppercase tracking-widest transition-all">Cancel</button>
                                <button type="submit" disabled={creating} className="flex-1 py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/80 disabled:opacity-50 shadow-xl shadow-primary/20 transition-all active:scale-95">
                                    {creating ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                    {creating ? 'Creating...' : 'Register User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Referrer Modal */}
            {assignReferrerUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card-strong max-w-sm w-full p-6 relative overflow-hidden animate-scale-in">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/15 rounded-full blur-[50px] pointer-events-none" />
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">
                                    <Link2 size={18} className="text-accent-light" />
                                </div>
                                <div>
                                    <h2 className="font-black text-text-primary">Assign Referrer</h2>
                                    <p className="text-xs text-text-secondary">{assignReferrerUser.username}</p>
                                </div>
                            </div>
                            <button onClick={() => setAssignReferrerUser(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                                <X size={16} className="text-text-secondary" />
                            </button>
                        </div>
                        <form onSubmit={handleAssignReferrer} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">Enter Referral Code of the Referrer</label>
                                <input
                                    type="text"
                                    required
                                    value={referrerCode}
                                    onChange={(e) => setReferrerCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. SM1A2B3C"
                                    className="input-field font-mono tracking-widest"
                                />
                            </div>
                            {assignError && (
                                <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">{assignError}</div>
                            )}
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setAssignReferrerUser(null)} className="flex-1 py-3 rounded-xl bg-white/5 text-text-secondary hover:bg-white/10 font-medium text-sm">Cancel</button>
                                <button type="submit" disabled={assigning} className="flex-1 py-3 rounded-xl bg-accent text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-80 disabled:opacity-50">
                                    {assigning ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                                    {assigning ? 'Assigning...' : 'Assign'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
