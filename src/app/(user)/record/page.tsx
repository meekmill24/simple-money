

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import type { UserTask, TaskItem } from '@/lib/types';
import { Clock, CheckCircle, XCircle, Search, Filter, ChevronRight, Zap, Headset } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RecordPage() {
    const router = useRouter();
    const { profile, refreshProfile } = useAuth();
    const { t, language } = useLanguage();
    const { format } = useCurrency();
    const [tasks, setTasks] = useState<(UserTask & { task_item: TaskItem })[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [profitAdded, setProfitAdded] = useState<number | null>(null);
    const [showBundleSuccessToast, setShowBundleSuccessToast] = useState(false);
    const [submittingTaskId, setSubmittingTaskId] = useState<number | null>(null);

    const fetchTasks = async () => {
        if (!profile) return;
        const { data } = await supabase
            .from('user_tasks')
            .select('*, task_item:task_items(*)')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false });

        if (data) {
            setTasks(data as (UserTask & { task_item: TaskItem })[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTasks();
    }, [profile]);

    const handleSubmitPending = async (taskItemId: number) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setSubmittingTaskId(taskItemId);

        try {
            const { data, error } = await supabase.rpc('complete_user_task', {
                p_task_item_id: taskItemId
            });

            if (error) throw error;

            if (data?.is_bundle) {
                setShowBundleSuccessToast(true);
                setTimeout(() => setShowBundleSuccessToast(false), 5000);
            } else {
                setProfitAdded(data?.earned_amount || 0);
                setTimeout(() => setProfitAdded(null), 3000);
            }

            await Promise.all([
                refreshProfile(),
                fetchTasks()
            ]);
        } catch (err: any) {
            console.error("Submission error:", err);
            alert(err.message || "Failed to submit optimization.");
        } finally {
            setIsSubmitting(false);
            setSubmittingTaskId(null);
        }
    };

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = t.task_item?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.id.toString().includes(searchQuery);
        const matchesFilter = filter === 'all' || t.status === filter;
        return matchesSearch && matchesFilter;
    });

    const statusBadge = (status: string) => {
        const statusLabel = t(status.toLowerCase());
        switch (status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-success/10 text-success border border-success/20 tracking-wider">
                        <CheckCircle size={10} /> {statusLabel}
                    </span>
                );
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-warning/10 text-warning border border-warning/20 tracking-wider">
                        <Clock size={10} /> {statusLabel}
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-danger/10 text-danger border border-danger/20 tracking-wider">
                        <XCircle size={10} /> {statusLabel}
                    </span>
                );
            default: return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-black/5 dark:bg-white/5 text-text-secondary border border-black/5 dark:border-white/5 tracking-wider">
                    {statusLabel}
                </span>
            );
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 space-y-4 animate-fade-in pb-12 font-record">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight">Activity records</h2>
                    <p className="text-text-secondary text-xs mt-1 font-bold uppercase tracking-widest">{filteredTasks.length} total records found</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                        <input
                            type="text"
                            placeholder={t('search_tasks')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-xs text-text-primary focus:outline-none focus:border-primary/50 w-[200px]"
                        />
                    </div>
                    <button className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-text-secondary hover:text-primary hover:border-primary/30 transition-all">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            <div className="flex border-b border-black/5 dark:border-white/5 relative">
                {(['all', 'completed', 'pending'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative z-10 ${filter === f ? 'text-primary-light' : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        {t(f)}
                        {filter === f && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-primary-light to-primary shadow-[0_0_10px_var(--color-primary)] animate-fade-in" />
                        )}
                    </button>
                ))}
            </div>

            <div className="glass-card overflow-hidden">
                <div className="grid grid-cols-4 md:grid-cols-5 bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">
                    <span className="px-4 py-3 border-r border-black/5 dark:border-white/5">{t('timestamp')}</span>
                    <span className="hidden md:block px-4 py-3 border-r border-black/5 dark:border-white/5">{t('task_type')}</span>
                    <span className="px-4 py-3 border-r border-black/5 dark:border-white/5">Details & Value</span>
                    <span className="px-4 py-3 border-r border-black/5 dark:border-white/5">Profit</span>
                    <span className="px-4 py-3 text-right">{t('status')}</span>
                </div>

                <div className="divide-y divide-black/5 dark:divide-white/5">
                    {loading ? (
                        <div className="flex items-center justify-center h-[200px]">
                            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-center px-6">
                            <Clock size={40} className="text-text-secondary/20 mb-4" />
                            <p className="text-sm font-bold text-text-secondary uppercase tracking-widest">{t('no_records_found')}</p>
                        </div>
                    ) : (
                        filteredTasks.map((task, idx) => (
                            <div key={task.id} className={`grid grid-cols-4 md:grid-cols-5 items-stretch hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors group ${idx % 2 === 0 ? 'bg-transparent' : 'bg-black/[0.01] dark:bg-white/[0.01]'}`}>
                                <div className="px-4 py-5 border-r border-black/5 dark:border-white/5 flex flex-col justify-center">
                                    <p className="text-[11px] text-text-primary font-bold">
                                        {new Date(task.created_at).toLocaleDateString(
                                            language === 'English' ? 'en-US' :
                                                language === 'Spanish' ? 'es-ES' :
                                                    language === 'French' ? 'fr-FR' :
                                                        language === 'German' ? 'de-DE' :
                                                            language === 'Chinese' ? 'zh-CN' :
                                                                language === 'Japanese' ? 'ja-JP' : 'en-US',
                                            { month: 'short', day: 'numeric', year: 'numeric' }
                                        )}
                                    </p>
                                    <p className="text-[10px] opacity-60 tracking-tight">
                                        {new Date(task.created_at).toLocaleTimeString(
                                            language === 'English' ? 'en-US' :
                                                language === 'Spanish' ? 'es-ES' :
                                                    language === 'French' ? 'fr-FR' :
                                                        language === 'German' ? 'de-DE' :
                                                            language === 'Chinese' ? 'zh-CN' :
                                                                language === 'Japanese' ? 'ja-JP' : 'en-US',
                                            { hour: '2-digit', minute: '2-digit' }
                                        )}
                                    </p>
                                </div>
                                <div className="hidden md:flex flex-col px-4 py-5 border-r border-black/5 dark:border-white/5 justify-center">
                                    <span className="text-[11px] font-bold text-text-primary uppercase tracking-tight truncate">
                                        {task.task_item?.title || `${t('task')} #${task.task_item_id}`}
                                    </span>
                                    {task.is_bundle && (
                                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                            <Zap size={8} fill="currentColor" /> Lucky Bundle
                                        </span>
                                    )}
                                </div>
                                <div className="px-4 py-5 border-r border-black/5 dark:border-white/5 flex flex-col justify-center gap-2">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] opacity-40 uppercase tracking-tighter font-black">Value</span>
                                        <span className="text-[11px] font-bold text-text-primary">{format(task.cost_amount || 0)}</span>
                                    </div>
                                    {task.is_bundle && task.status === 'pending' && (
                                        <div className="flex flex-col border-t border-black/5 dark:border-white/5 pt-1.5">
                                            <span className="text-[9px] opacity-40 uppercase tracking-tighter font-black">Require</span>
                                            <span className="text-[11px] font-black text-danger-light">-{format(Math.abs(profile?.wallet_balance || 0))}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="px-4 py-5 border-r border-black/5 dark:border-white/5 flex flex-col justify-center">
                                    <span className="text-[9px] opacity-40 uppercase tracking-tighter text-text-secondary font-black">Profit Applied</span>
                                    <span className="text-sm font-black text-success">
                                        {task.status === 'pending' ? (task.earned_amount > 0 ? `+${format(task.earned_amount)}` : format(0)) : `+${format(task.earned_amount)}`}
                                    </span>
                                </div>
                                <div className="px-4 py-5 flex flex-col items-end justify-center gap-2">
                                    {statusBadge(task.status)}
                                    {task.status === 'pending' && (
                                        profile && profile.wallet_balance < 0 ? (
                                            <button
                                                onClick={() => router.push('/service')}
                                                className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                                            >
                                                <Headset size={10} />
                                                Contact Support
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleSubmitPending(task.task_item_id)}
                                                disabled={isSubmitting}
                                                className={`px-3 py-1.5 rounded-lg bg-primary text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all
                                                    ${isSubmitting && submittingTaskId === task.task_item_id ? 'opacity-50 cursor-wait' : 'hover:scale-105 active:scale-95 cursor-pointer'}
                                                `}
                                            >
                                                {isSubmitting && submittingTaskId === task.task_item_id ? t('submitting') : t('submit_order')}
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            {/* Profit Toast */}
            {profitAdded !== null && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] animate-bounce-in">
                    <div className="bg-success text-white px-8 py-4 rounded-3xl shadow-[0_20px_50px_rgba(34,197,94,0.4)] flex items-center gap-4 border border-white/20">
                        <CheckCircle size={24} />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Cycle Profit Applied</span>
                            <span className="text-xl font-black">+{format(profitAdded)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Huge Profit Toast */}
            {showBundleSuccessToast && (
                <div className="fixed top-[58%] left-1/2 -translate-x-1/2 z-[1000] animate-bounce-in w-[90%] md:w-auto">
                    <div className="bg-gradient-to-br from-primary to-accent text-white px-8 py-6 rounded-3xl shadow-[0_20px_50px_rgba(157,80,187,0.5)] flex items-center gap-6 border border-white/30">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                            <Zap className="text-white animate-pulse" size={28} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Premium Order Success</span>
                            <p className="text-sm md:text-md font-bold text-white max-w-[300px]">You have gotten Huge profit from the bundle you can now continue your daily task.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
