'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Users, User, Info, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

interface Profile {
    id: string;
    username: string;
}

const notifTypes = [
    { id: 'info', label: 'Info', icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
    { id: 'success', label: 'Success', icon: CheckCircle, color: 'text-success', bg: 'bg-success/20', border: 'border-success/30' },
    { id: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
    { id: 'danger', label: 'Alert', icon: XCircle, color: 'text-danger', bg: 'bg-danger/20', border: 'border-danger/30' },
];

export default function AdminNotifyPage() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [target, setTarget] = useState<'all' | 'specific'>('all');
    const [selectedUser, setSelectedUser] = useState('');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('info');
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [recentNotifs, setRecentNotifs] = useState<{ id: number; title: string; type: string; created_at: string; profile?: { username: string } }[]>([]);

    useEffect(() => {
        supabase.from('profiles').select('id, username').order('username').then(({ data }) => {
            if (data) setUsers(data);
        });
        supabase
            .from('notifications')
            .select('id, title, type, created_at, profile:profiles(username)')
            .order('created_at', { ascending: false })
            .limit(10)
            .then(({ data }) => {
                if (data) setRecentNotifs(data as any);
            });
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !message) { setError('Title and message are required.'); return; }
        if (target === 'specific' && !selectedUser) { setError('Please select a user.'); return; }
        setSending(true);
        setError('');
        setSuccess(false);

        try {
            if (target === 'all') {
                // Insert notification for each user
                const records = users.map(u => ({ user_id: u.id, title, message, type }));
                const chunkSize = 50;
                for (let i = 0; i < records.length; i += chunkSize) {
                    await supabase.from('notifications').insert(records.slice(i, i + chunkSize));
                }
            } else {
                await supabase.from('notifications').insert({ user_id: selectedUser, title, message, type });
            }
            setSuccess(true);
            setTitle('');
            setMessage('');
            // Refresh recent
            const { data } = await supabase
                .from('notifications')
                .select('id, title, type, created_at, profile:profiles(username)')
                .order('created_at', { ascending: false })
                .limit(10);
            if (data) setRecentNotifs(data as any);
        } catch {
            setError('Failed to send notifications. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const selectedType = notifTypes.find(t => t.id === type)!;

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Compose Form */}
            <form onSubmit={handleSend} className="glass-card p-6 space-y-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Send size={18} className="text-primary-light" />
                    Compose Notification
                </h3>

                {/* Target */}
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Send To</label>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setTarget('all')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-colors ${target === 'all' ? 'bg-primary/20 border-primary/40 text-primary-light' : 'border-white/10 text-text-secondary hover:bg-white/5'}`}>
                            <Users size={16} /> All Users
                        </button>
                        <button type="button" onClick={() => setTarget('specific')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-colors ${target === 'specific' ? 'bg-primary/20 border-primary/40 text-primary-light' : 'border-white/10 text-text-secondary hover:bg-white/5'}`}>
                            <User size={16} /> Specific User
                        </button>
                    </div>
                </div>

                {target === 'specific' && (
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Select User</label>
                        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="input-field" required>
                            <option value="">— Choose a user —</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                        </select>
                    </div>
                )}

                {/* Type */}
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Notification Type</label>
                    <div className="grid grid-cols-4 gap-2">
                        {notifTypes.map(t => (
                            <button key={t.id} type="button" onClick={() => setType(t.id)}
                                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition-colors ${type === t.id ? `${t.bg} ${t.border} ${t.color}` : 'border-white/10 text-text-secondary hover:bg-white/5'}`}>
                                <t.icon size={18} />
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Title</label>
                    <input className="input-field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title..." required maxLength={80} />
                </div>

                {/* Message */}
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Message</label>
                    <textarea className="input-field resize-none h-28" value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your message here..." required maxLength={500} />
                </div>

                {/* Preview */}
                {(title || message) && (
                    <div className={`p-4 rounded-xl border ${selectedType.bg} ${selectedType.border}`}>
                        <p className={`text-sm font-bold ${selectedType.color} flex items-center gap-1.5 mb-1`}>
                            <selectedType.icon size={14} /> {title || 'Preview title'}
                        </p>
                        <p className="text-xs text-text-secondary">{message || 'Preview message...'}</p>
                    </div>
                )}

                {error && <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl p-3">{error}</p>}
                {success && <p className="text-sm text-success bg-success/10 border border-success/20 rounded-xl p-3">✅ Notification sent successfully!</p>}

                <button type="submit" disabled={sending}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-50 hover:bg-primary/80 transition-colors">
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {sending ? 'Sending...' : `Send to ${target === 'all' ? `All ${users.length} Users` : 'User'}`}
                </button>
            </form>

            {/* Recent Notifications */}
            <div className="glass-card p-6">
                <h3 className="text-base font-bold text-white mb-4">Recent Notifications Sent</h3>
                {recentNotifs.length === 0 ? (
                    <p className="text-text-secondary text-sm text-center py-4">No notifications sent yet</p>
                ) : (
                    <div className="space-y-3">
                        {recentNotifs.map(n => {
                            const nt = notifTypes.find(t => t.id === n.type) || notifTypes[0];
                            return (
                                <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/3">
                                    <div className={`w-8 h-8 rounded-lg ${nt.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                        <nt.icon size={14} className={nt.color} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-white truncate">{n.title}</p>
                                        <p className="text-xs text-text-secondary mt-0.5">{(n.profile as { username?: string })?.username || 'All users'} · {new Date(n.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
