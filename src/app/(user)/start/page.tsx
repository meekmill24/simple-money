'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import type { TaskItem } from '@/lib/types';
import ItemDetailModal from '@/components/ItemDetailModal';
import BundledPackageModal from '@/components/BundledPackageModal';
import type { BundlePackage } from '@/components/BundledPackageModal';
import Portal from '@/components/Portal';
import {
    Wallet,
    AlertTriangle,
    ArrowRight,
    Zap,
    CheckCircle,
    X,
    Activity,
    TrendingUp,
    Sparkles,
    Pointer,
    Trophy,
    Star,
    MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

export default function StartPage() {
    const { profile, refreshProfile } = useAuth();
    const { t } = useLanguage();
    const { format } = useCurrency();
    const router = useRouter();
    const [items, setItems] = useState<TaskItem[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
    const [selectedItem, setSelectedItem] = useState<TaskItem | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [profitAdded, setProfitAdded] = useState<number | null>(null);
    const [recentlyUsedIdsState, setRecentlyUsedIdsState] = useState<Set<number>>(new Set());

    // Matching States
    const [matchingStatus, setMatchingStatus] = useState<string>(t('ready_to_match'));
    const [bundleModal, setBundleModal] = useState(false);
    const [activeBundle, setActiveBundle] = useState<BundlePackage | null>(null);
    const [pendingTaskItem, setPendingTaskItem] = useState<TaskItem | null>(null);
    const [showPendingWarning, setShowPendingWarning] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalSeen, setModalSeen] = useState(false);
    const [lockMessage, setLockMessage] = useState<string | null>(null);
    const [showMinBalanceModal, setShowMinBalanceModal] = useState(false);
    const [showBundleSuccessToast, setShowBundleSuccessToast] = useState(false);
    const [hasPendingTask, setHasPendingTask] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Simplified scroll management
    useEffect(() => {
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    // Dynamic Progress Logic
    const [tasksPerSet, setTasksPerSet] = useState(40);
    const [setsPerDay, setSetsPerDay] = useState(3);
    const [taskBaseOffset, setTaskBaseOffset] = useState(0);
    const [commissionRate, setCommissionRate] = useState(0.0045);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const completedCount = profile?.completed_count || 0;
    const currentSet = profile?.current_set || 1;

    // Profile Completion check
    const isProfileIncomplete = !profile?.phone || profile?.phone === '';

    // Progress calculation based on current level (offset) and current set
    const tasksInCurrentSet = Math.max(0, Math.min(completedCount - taskBaseOffset - ((currentSet - 1) * tasksPerSet), tasksPerSet));
    const isLocked = tasksInCurrentSet >= tasksPerSet;
    const isAllSetsDone = currentSet >= setsPerDay && isLocked;
    const totalTasks = tasksPerSet;

    // Reset modal unseen when set changes
    useEffect(() => {
        setModalSeen(false);
    }, [currentSet, isLocked]);

    // Consolidated Data Load (Optimized)
    useEffect(() => {
        window.scrollTo(0, 0); // Reset scroll on page load
        const loadPageData = async () => {
            if (!profile?.level_id || !profile?.id) return;
            setIsLoadingData(true);

            try {
                // Parallelize all initial global data fetches
                // PERFORMANCE FIX: Only fetch tasks from the last 24 hours for pool filtering
                const filterDate = profile.last_reset_at ? new Date(profile.last_reset_at).toISOString() : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

                const [levelsRes, pastTasksRes, itemsRes] = await Promise.all([
                    supabase.from('levels').select('id, tasks_per_set, sets_per_day, commission_rate').order('price', { ascending: true }),
                    supabase.from('user_tasks')
                        .select('task_item_id, status, completed_at')
                        .eq('user_id', profile.id)
                        .neq('status', 'cancelled')
                        .gt('completed_at', filterDate),
                    supabase.from('task_items')
                        .select('*')
                        .eq('is_active', true)
                        .eq('level_id', profile.level_id)
                        .order('created_at', { ascending: false })
                        .limit(300)
                ]);

                // 1. Level Logic
                if (pastTasksRes.data) {
                    const pending = (pastTasksRes.data as any[]).some(t => t.status === 'pending');
                    setHasPendingTask(pending);
                }
                if (levelsRes.data) {
                    let offset = 0;
                    const currentLevel = levelsRes.data.find(l => l.id === profile.level_id);
                    if (currentLevel) {
                        setTasksPerSet(currentLevel.tasks_per_set);
                        setSetsPerDay(currentLevel.sets_per_day || 3);
                        setCommissionRate(Number(currentLevel.commission_rate) || 0.0045);

                        for (const level of levelsRes.data) {
                            if (level.id === profile.level_id) break;
                            offset += (level.sets_per_day || 3) * (level.tasks_per_set || 40);
                        }
                        setTaskBaseOffset((profile.completed_count || 0) < offset ? 0 : offset);
                    }
                }

                // 2. Items logic + Preloading (Enhanced Visual Uniqueness)
                const lastResetDate = profile.last_reset_at ? new Date(profile.last_reset_at) : new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recentIds = new Set(
                    ((pastTasksRes.data || []) as any[])
                        .filter(t => t.completed_at && new Date(t.completed_at) > lastResetDate)
                        .map(t => t.task_item_id)
                );
                setRecentlyUsedIdsState(recentIds);

                const allItemsFromDb = itemsRes.data || [];
                const poolByImage = new Map();
                // Filter by image uniqueness first to avoid visual clutter
                allItemsFromDb.forEach(item => {
                    if (!poolByImage.has(item.image_url) && !recentIds.has(item.id)) {
                        poolByImage.set(item.image_url, item);
                    }
                });

                let availableItems = Array.from(poolByImage.values());

                if (availableItems.length < 24 && allItemsFromDb.length > 0) {
                    availableItems = allItemsFromDb; // Fallback if too many filtered
                } else if (availableItems.length === 0) {
                    availableItems = Array.from({ length: 24 }).map((_, i) => ({
                        id: 0,
                        title: i % 2 === 0 ? 'Premium electronics hub' : 'Luxury timepiece collection',
                        image_url: `https://picsum.photos/seed/prod-${i}/400/400`,
                        category: 'premium',
                        description: 'High-quality matched asset for task processing',
                        is_active: true,
                        created_at: new Date().toISOString(),
                        level_id: profile.level_id
                    }));
                }

                const shuffled = [...availableItems].sort(() => 0.5 - Math.random());
                const selectedItems = shuffled.slice(0, 24);
                setItems(selectedItems);
                
                if (itemsRes.data) {
                    (window as any)._allPoolItems = itemsRes.data;
                }

            } catch (err) {
                console.error("Error loading start page data:", err);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadPageData();
    }, [profile?.level_id, profile?.id]);

    useEffect(() => {
        let spinInterval: NodeJS.Timeout;
        if (isSpinning) {
            spinInterval = setInterval(() => {
                setHighlightedIndex(prev => {
                    const next = Math.floor(Math.random() * items.length);
                    return next === prev && items.length > 1 ? (next + 1) % items.length : next;
                });
            }, 40);
        } else if (!selectedItem) {
            setHighlightedIndex(null);
        }
        return () => clearInterval(spinInterval);
    }, [isSpinning, items.length, selectedItem]);

    useEffect(() => {
        if (showCompletionModal) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 20000 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
        }
    }, [showCompletionModal]);

    useEffect(() => {
        if (hasPendingTask) {
            setMatchingStatus("You have a pending order");
        } else if (isLocked) {
            if (currentSet >= setsPerDay) {
                setMatchingStatus(t('daily_limit_reached'));
            } else {
                setMatchingStatus(t('set_complete_contact_support').replace('{set}', String(currentSet)));
            }
        } else {
            setMatchingStatus(t('ready_to_match'));
        }
    }, [isLocked, currentSet, t, setsPerDay, hasPendingTask]);

    const handleStart = useCallback(async () => {
        if (isSpinning || items.length === 0) return;

        const walletBalance = profile?.wallet_balance || 0;

        if (walletBalance < 65 && walletBalance >= 0) {
            setShowMinBalanceModal(true);
            return;
        }

        if (isLocked) {
            const msg = isAllSetsDone
                ? t('daily_limit_reached')
                : t('set_complete_contact_support').replace('{set}', String(currentSet));
            setMatchingStatus(msg);

            if (!modalSeen) {
                setShowCompletionModal(true);
            } else {
                setLockMessage(msg);
                setTimeout(() => setLockMessage(null), 3000);
            }
            return;
        }

        if (hasPendingTask) {
            setMatchingStatus("You have a pending order");
            setLockMessage("you have a pending order");
            setTimeout(() => {
                setLockMessage(null);
                router.push('/record');
            }, 1500);
            return;
        }

        if (profile && profile.wallet_balance < 0) {
            setShowPendingWarning(true);
            router.push('/record');
            return;
        }

        setIsSpinning(true);
        setSelectedItem(null);
        setMatchingStatus(t('connecting_to_cloud'));

        const stages = [
            t('analyzing_market'),
            t('identifying_optimal_match'),
            t('finalizing_allocation')
        ];

        let stageIdx = 0;
        const stageInterval = setInterval(() => {
            if (stageIdx < stages.length) {
                setMatchingStatus(stages[stageIdx]);
            }
        }, 60);

        setTimeout(async () => {
            clearInterval(stageInterval);
            const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', profile?.id).single();
            const pb = (freshProfile as any)?.pending_bundle;
            const currentItemIndex = tasksInCurrentSet + 1;

            let finalIndex = Math.floor(Math.random() * items.length);
            let matchedItem = { ...items[finalIndex] };

            if (pb && Number(pb.targetIndex) === currentItemIndex) {
                if (pb.taskItem) {
                    matchedItem = {
                        id: Number(pb.taskItemIds?.[0] || 0),
                        title: pb.taskItem.title,
                        image_url: pb.taskItem.image_url,
                        category: pb.taskItem.category,
                        description: pb.taskItem.description || '',
                        is_active: true,
                        created_at: new Date().toISOString(),
                        level_id: profile?.level_id || 1
                    } as TaskItem;

                    const newItems = [...items];
                    newItems[finalIndex] = matchedItem;
                    setItems(newItems);
                }
            }
            setHighlightedIndex(finalIndex);
            setIsSpinning(false);
            setMatchingStatus(t('match_found'));
            setTimeout(() => handleTaskSelection(matchedItem, pb, currentItemIndex), 50);
        }, 250);
    }, [isSpinning, items, isLocked, profile, t, currentSet, isAllSetsDone, modalSeen]);

    const handleTaskSelection = async (item: TaskItem, pb?: any, currentItemIndex?: number) => {
        if (!profile || isLocked) return;
        let bundle = pb;
        if (!bundle) {
            const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', profile.id).single();
            bundle = (freshProfile as any)?.pending_bundle;
        }

        if (bundle && Number(bundle.targetIndex) === currentItemIndex) {
            const bundleIds = Array.isArray(bundle.taskItemIds) ? bundle.taskItemIds : [];
            const remainingIds = bundleIds.filter((id: number) => id !== item.id);

            setPendingTaskItem(item);
            setActiveBundle({
                id: String(bundle.id || `admin-${Date.now()}`),
                name: String(bundle.name || 'Special Bundle Package'),
                description: String(bundle.description || ''),
                shortageAmount: Number(bundle.shortageAmount || 0),
                totalAmount: Number(bundle.totalAmount || 0),
                bonusAmount: Number(bundle.bonusAmount || 0),
                expiresIn: Number(bundle.expiresIn || 86400),
                taskItem: { title: item.title, image_url: item.image_url, category: item.category ?? '' },
            });
            setBundleModal(true);

            if (remainingIds.length === 0) await supabase.from('profiles').update({ pending_bundle: null }).eq('id', profile.id);
            else await supabase.from('profiles').update({ pending_bundle: { ...bundle, taskItemIds: remainingIds } }).eq('id', profile.id);
            await refreshProfile();
            return;
        }

        setSelectedItem({ ...item });
        setModalOpen(true);
    };

    const handleSubmitTask = async (item: TaskItem, costAmount?: number) => {
        if (isSubmitting) return;
        if (!profile) { router.push('/login'); return; }
        if (profile.wallet_balance < 0) { setShowPendingWarning(true); return; }

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.rpc('complete_user_task', {
                p_task_item_id: item.id,
                p_cost_amount: costAmount
            });

            if (error) throw error;

            const earnedAmount = data?.earned_amount ? Number(data.earned_amount) : 0;
            const isBundleResult = data?.is_bundle || false;

            if (isBundleResult) {
                setShowBundleSuccessToast(true);
                setTimeout(() => setShowBundleSuccessToast(false), 6000);
            } else {
                setModalOpen(false);
                setProfitAdded(earnedAmount > 0 ? earnedAmount : 0);
                setTimeout(() => setProfitAdded(null), 4000);

                // NATURAL RE-OPTIMIZATION TRANSITION
                setIsRefreshing(true);
                    setMatchingStatus("Refreshing tasks...");
                
                setTimeout(() => {
                    const pool = (window as any)._allPoolItems || [];
                    const updatedRecent = new Set(recentlyUsedIdsState);
                    updatedRecent.add(item.id);
                    setRecentlyUsedIdsState(updatedRecent);

                    if (pool.length > 0) {
                        const poolByImage = new Map();
                        pool.forEach((p: any) => {
                            if (!poolByImage.has(p.image_url) && !updatedRecent.has(p.id)) {
                                poolByImage.set(p.image_url, p);
                            }
                        });

                        let freshPool = Array.from(poolByImage.values());
                        if (freshPool.length < 24) freshPool = pool; 

                        const reshuffled = [...freshPool].sort(() => 0.5 - Math.random()).slice(0, 24);
                        setItems(reshuffled);
                    }
                    setIsRefreshing(false);
                    setMatchingStatus(t('ready_to_match'));
                }, 800);

                if (tasksInCurrentSet + 1 >= tasksPerSet) {
                    setModalSeen(false);
                    setTimeout(() => setShowCompletionModal(true), 1500);
                }
            }
            await refreshProfile();
        } catch (err: any) {
            alert(`Task Failure: ${err?.message || 'Error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmSettlement = async () => {
        setModalSeen(true);
        if ((window as any).Tawk_API && (window as any).Tawk_API.maximize) {
            (window as any).Tawk_API.maximize();
        } else { router.push('/service'); }
        setShowCompletionModal(false);
    };

    const handleBundleAccept = async (bundle: BundlePackage) => {
        if (!profile) return;
        const newBalance = profile.wallet_balance - bundle.totalAmount;
        const newFrozen = profile.frozen_amount + bundle.totalAmount + bundle.bonusAmount;
        await supabase.from('profiles').update({ wallet_balance: newBalance, frozen_amount: newFrozen, completed_count: (profile.completed_count || 0) + 1 }).eq('id', profile.id);
        if (pendingTaskItem) {
            await supabase.from('user_tasks').insert({ user_id: profile.id, task_item_id: pendingTaskItem.id, status: 'pending', earned_amount: bundle.bonusAmount, cost_amount: bundle.totalAmount, is_bundle: true });
            setPendingTaskItem(null);
        }
        setBundleModal(false);
        router.push('/record');
        await refreshProfile();
    };

    return (
        <div className="relative space-y-8">
            <div className="absolute top-0 -left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            
            {/* Banner / Profile Card - LIVE EDITION */}
            <div className="glass-card-strong p-0 mb-6 md:mb-10 relative overflow-hidden group border border-white/20 rounded-[32px] md:rounded-[40px] shadow-2xl z-20 animate-scan">
                {/* Background Pattern - Animated Mesh */}
                <div className="absolute inset-0 z-0 animate-mesh bg-[radial-gradient(circle_at_50%_50%,rgba(157,80,187,0.15),transparent_70%),radial-gradient(circle_at_0%_0%,rgba(6,182,212,0.1),transparent_50%)] bg-surface/80">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay" />
                </div>

                {/* Premium Welcome Header Block */}
                <div className="p-8 md:p-12 pb-6 md:pb-8 border-b border-white/10 relative z-20">
                    <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
                        {/* Avatar Cell */}
                        <div className="relative group/avatar">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-primary via-accent to-primary-light rounded-[30px] md:rounded-[36px] blur-sm opacity-40 group-hover/avatar:opacity-100 transition duration-1000 group-hover/avatar:duration-200"></div>
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-[26px] md:rounded-[32px] bg-gradient-to-br from-primary via-accent to-primary p-[2.5px] shadow-2xl relative shrink-0">
                                <div className="w-full h-full rounded-[24px] md:rounded-[30px] bg-slate-900 flex items-center justify-center border border-white/10 overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
                                    <span className="text-3xl md:text-5xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                        {profile?.username?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-2xl bg-surface border-4 border-slate-900 flex items-center justify-center shadow-lg">
                                <div className="w-3 h-3 rounded-full bg-success animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            </div>
                        </div>

                        {/* Name & Title */}
                        <div className="flex flex-col flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-1">
                                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-text-secondary uppercase tracking-[0.25em]">
                                    {t('optimization_hub_active')}
                                </span>
                                <div className="h-1 w-1 rounded-full bg-white/20" />
                                <span className="text-[9px] font-black text-primary-light uppercase tracking-[0.25em]">
                                    Verified Terminal 042
                                </span>
                            </div>
                            
                            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none mb-3">
                                {t('welcome_back')}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-primary-light to-white/80">{profile?.username || 'User'}</span>
                            </h1>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-md">
                                    <Trophy size={14} className="text-primary-light" />
                                    <span className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-widest">
                                        Level {profile?.level_id || 1} Elite
                                    </span>
                                </div>
                                <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
                                <div className="hidden sm:flex items-center gap-2 opacity-50">
                                    <Activity size={12} className="text-text-secondary" />
                                    <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest italic">
                                        Network Latency: 14ms
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-[1px] bg-white/10 relative z-20">

                    {/* Progress */}
                    <div className="p-6 bg-surface/60 backdrop-blur-md group hover:bg-surface/80 transition-all hover:-translate-y-1">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{t('set_progress')}</span>
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                                <Activity size={12} className="text-primary-light" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-sm">SET {currentSet}/{setsPerDay}</h2>
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-[9px] font-mono text-white/40">({tasksInCurrentSet}/{totalTasks}) {t('completed')}</span>
                            <div className="flex gap-0.5">
                                <div className="w-1 h-1 rounded-full bg-primary-light animate-pulse" />
                                <div className="w-1 h-1 rounded-full bg-primary-light/40" />
                            </div>
                        </div>
                    </div>

                    {/* Recharge */}
                    <Link href="/deposit" className="p-6 bg-surface/60 backdrop-blur-md group hover:bg-success/10 transition-all hover:-translate-y-1 border-l border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-success/5 rounded-full -mr-8 -mt-8 animate-pulse" />
                        <div className="flex items-center justify-between mb-1 relative z-10">
                            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{t('recharge')}</span>
                            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center animate-float">
                                <Zap size={14} className="text-success fill-success/40" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-success tracking-tight relative z-10 drop-shadow-md">{format(profile?.wallet_balance || 0)}</p>
                        <div className="mt-4 flex items-center justify-between relative z-10">
                            <span className="text-[8px] font-black text-success uppercase tracking-widest">{t('recharge_now')}</span>
                            <ArrowRight size={12} className="text-success group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>

                    {/* Withdraw */}
                    <Link href="/withdraw" className="p-6 bg-surface/60 backdrop-blur-md group hover:bg-primary/5 transition-colors border-l border-white/10">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{t('withdraw')}</span>
                            <Wallet size={12} className="text-primary-light" />
                        </div>
                        <p className="text-2xl font-black text-white tracking-tight">{t('withdraw')}</p>
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-[8px] font-black text-primary-light uppercase tracking-widest">{t('secure_payout')}</span>
                            <ArrowRight size={12} className="text-primary-light group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>

                    {/* Daily Profits */}
                    <div className="p-6 bg-surface/60 backdrop-blur-md group hover:bg-accent/10 transition-all hover:-translate-y-1 border-l border-white/10 relative overflow-hidden">
                        <div className="absolute bottom-0 right-0 w-20 h-20 bg-accent/5 rounded-full -br-10 -bb-10 animate-mesh" />
                        <div className="flex items-center justify-between mb-1 relative z-10">
                            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{t('daily_profits')}</span>
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center animate-float" style={{ animationDelay: '1s' }}>
                                <TrendingUp size={14} className="text-accent-light" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-accent-light tracking-tight relative z-10 drop-shadow-md">{format(profile?.profit || 0)}</p>
                        <div className="mt-4 flex items-center gap-1.5 relative z-10">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent/50 animate-pulse" />
                            <span className="text-[8px] font-black text-accent uppercase tracking-widest">{t('secured_rebate')}</span>
                        </div>
                    </div>

                    {/* Frozen Asset */}
                    <div className="p-6 bg-surface/60 backdrop-blur-md group hover:bg-danger/5 transition-colors border-l border-white/10">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{t('frozen_asset')}</span>
                            <AlertTriangle size={12} className="text-danger-light" />
                        </div>
                        <p className="text-2xl font-black text-danger-light tracking-tight">{format(profile?.frozen_amount || 0)}</p>
                        <div className="mt-4 flex items-center gap-1.5">
                            <span className="text-[8px] font-black text-danger uppercase tracking-widest">{t('escrow_hold')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {isProfileIncomplete && (
                <div className="mb-8 glass-card border-warning/30 p-4 flex items-center justify-between gap-4 animate-scale-in">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning shrink-0">
                            <Sparkles size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-text-primary uppercase tracking-tight">{t('complete_your_profile')}</p>
                            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-60">Add your phone number and password to secure your account.</p>
                        </div>
                    </div>
                    <Link href="/profile/info" className="px-5 py-2.5 rounded-xl bg-warning text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-transform">
                        {t('complete_now')}
                    </Link>
                </div>
            )}

            <div className="relative flex flex-col items-center justify-center py-6 md:py-10">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-[800px] h-[500px] md:h-[600px] bg-primary/10 rounded-full blur-[100px] md:blur-[160px] transition-opacity duration-1000 ${isSpinning ? 'opacity-100' : 'opacity-40'}`} />

                <div className="w-full max-w-2xl mx-auto space-y-12 z-10 px-4 relative">
                    <div className="grid grid-cols-5 gap-2 md:gap-4 relative">


                        {Array.from({ length: 25 }).map((_, idx) => {
                            if (idx === 12) {
                                return (
                                    <div key="start-btn-slot" className="aspect-square flex items-center justify-center relative">
                                        <div className={`absolute inset-[-10px] bg-primary/20 rounded-full blur-lg transition-opacity duration-1000 ${isSpinning ? 'opacity-100' : 'opacity-0'}`} />
                                        <button
                                            onClick={handleStart}
                                            disabled={isSpinning}
                                            className={`relative w-full h-full rounded-full flex flex-col items-center justify-center p-2 transition-all duration-300 overflow-hidden !cursor-pointer
                                                ${isSpinning ? 'scale-95 shadow-none ring-4 ring-primary/20' : 'hover:scale-105 active:scale-95 shadow-[0_10px_40px_rgba(157,80,187,0.4)]'}
                                                ${(isLocked || (profile?.wallet_balance || 0) < 65 || profile?.pending_bundle) 
                                                    ? 'grayscale opacity-40 !cursor-not-allowed bg-slate-900/50' 
                                                    : 'glass-water border-0'
                                                }
                                            `}
                                        >
                                            <div className="relative z-20 flex flex-col items-center text-center">
                                                <h3 className="text-sm md:text-base font-black text-white uppercase tracking-[0.2em] drop-shadow-lg leading-tight">
                                                    {hasPendingTask ? "SUBMIT" : (isLocked ? t('status') : t('start'))}
                                                </h3>
                                                {!isSpinning && !isLocked && !hasPendingTask && (
                                                    <div className="mt-1.5 flex flex-col items-center">
                                                        <Pointer size={14} className="text-white animate-bounce" />
                                                        <div className="w-8 h-1 bg-white/30 rounded-full blur-[2px] mt-1 animate-pulse" />
                                                    </div>
                                                )}
                                                {isSpinning && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mt-2" />}
                                            </div>
                                            
                                            {/* Extra inner glow for the water effect */}
                                            {!(isLocked || (profile?.wallet_balance || 0) < 65 || profile?.pending_bundle) && (
                                                <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
                                            )}
                                        </button>
                                    </div>
                                );
                            }

                            const itemIdx = idx > 12 ? idx - 1 : idx;
                            const isCurrentHighlighted = highlightedIndex === itemIdx;
                            
                            return (
                                <div 
                                    key={idx} 
                                    className={`
                                        aspect-square bg-slate-900/40 p-1 border border-white/5 overflow-hidden transition-all duration-700 rounded-[12px] md:rounded-[24px] relative
                                        ${isSpinning && isCurrentHighlighted ? 'ring-2 ring-primary scale-110 shadow-[0_0_25px_rgba(157,80,187,0.6)] opacity-100 z-10 bg-slate-800' : 'opacity-80'}
                                        ${isRefreshing ? 'scale-90 opacity-0' : 'scale-100 opacity-80'}
                                        group/item hover:scale-[1.03] hover:opacity-100 transition-all cursor-pointer shadow-lg
                                    `}
                                    style={{ 
                                        transitionDelay: isRefreshing ? `${(idx % 6) * 30 + Math.floor(idx / 6) * 30}ms` : '0ms',
                                        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                                    }}
                                >
                                    {items[itemIdx] ? (
                                        <div className="w-full h-full relative">
                                            <img src={items[itemIdx].image_url} className="w-full h-full object-cover rounded-[8px] md:rounded-[18px]" alt="" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity rounded-[8px] md:rounded-[18px]" />
                                            {/* Subtle reflection overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20 pointer-events-none" />
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-white/5 animate-pulse rounded-[8px] md:rounded-[18px]" />
                                    )}
                                </div>
                            );
                        })}

                        {/* ANCHORED MODALS (NON-FIXED) */}
                        <ItemDetailModal
                            item={selectedItem}
                            isOpen={modalOpen}
                            onClose={() => setModalOpen(false)}
                            onSubmit={handleSubmitTask}
                            balance={profile?.wallet_balance || 0}
                            commissionRate={commissionRate}
                            format={format}
                            isSubmitting={isSubmitting}
                        />
                        <BundledPackageModal isOpen={bundleModal} bundle={activeBundle} onAccept={handleBundleAccept} />

                        {showMinBalanceModal && (
                            <Portal>
                                <div
                                    className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in text-center cursor-pointer"
                                    onClick={() => setShowMinBalanceModal(false)}
                                >
                                    <div
                                        className="glass-card-strong max-w-sm w-full p-10 animate-scale-in border-danger/30 rounded-[32px] relative shadow-[0_50px_140px_rgba(0,0,0,0.95)] cursor-default md:fixed md:left-[59%] md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="w-20 h-20 rounded-[28px] bg-danger/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(239,68,68,0.3)] relative group overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-tr from-danger/20 to-transparent" />
                                            <AlertTriangle size={40} className="text-danger relative z-10" />
                                        </div>
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Access Denied</h2>
                                        <span className="text-danger font-black text-[10px] uppercase tracking-[0.4em] mb-10 block leading-relaxed opacity-80">Minimum amount required to start task is $65</span>
                                        <Link href="/deposit" className="w-full py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all">Refill Balance <ArrowRight size={18} /></Link>
                                    </div>
                                </div>
                            </Portal>
                        )}

                        {showCompletionModal && (
                            <Portal>
                                <div
                                    className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fade-in text-center cursor-pointer"
                                    onClick={handleConfirmSettlement}
                                >
                                    <div
                                        className="glass-card-strong max-w-sm w-full p-6 md:p-8 animate-scale-in border-primary/30 rounded-[32px] md:rounded-[40px] relative shadow-[0_50px_160px_rgba(157,80,187,0.3)] cursor-default md:fixed md:left-[59%] md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 overflow-hidden"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-light to-transparent" />

                                        <div className="relative mb-6">
                                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-[24px] md:rounded-[32px] bg-gradient-to-br from-primary via-accent to-primary-light flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(157,80,187,0.4)] animate-bounce-slow">
                                                <Trophy size={32} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] md:w-10 md:h-10" />
                                            </div>
                                            <div className="absolute -top-2 -right-2">
                                                <Sparkles className="text-warning animate-pulse" size={20} />
                                            </div>
                                            <div className="absolute -bottom-2 -left-2">
                                                <Star className="text-amber-400 animate-spin-slow" size={20} />
                                            </div>
                                        </div>

                                        <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter mb-1 leading-tight drop-shadow-lg">
                                            {isAllSetsDone ? "Day Complete" : "Set Finalized"}
                                        </h2>

                                        <p className="text-[9px] md:text-[10px] font-black text-primary-light uppercase tracking-[0.3em] mb-6 opacity-80 flex items-center justify-center gap-1.5">
                                            <Zap size={8} className="fill-primary-light" />
                                            {isAllSetsDone ? "Maximum Efficiency" : `Sequence ${currentSet} / ${setsPerDay} Success`}
                                            <Zap size={8} className="fill-primary-light" />
                                        </p>

                                        <div className="space-y-3 mb-6 bg-black/40 rounded-3xl p-5 md:p-6 border border-white/5 shadow-inner">
                                            <div className="flex flex-col gap-0.5 items-center pb-4 border-b border-white/5">
                                                <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40">Wallet Balance</span>
                                                <span className="text-3xl md:text-4xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                                    {format(profile?.wallet_balance || 0)}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-3">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-[0.15em] opacity-40 leading-none mb-2">Today's Profit</span>
                                                    <div className="flex items-center gap-1">
                                                        <TrendingUp size={10} className="text-success" />
                                                        <span className="text-sm font-black text-success tabular-nums leading-none">+{format(profile?.profit || 0)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-center border-l border-white/5">
                                                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-[0.15em] opacity-40 leading-none mb-2">Referrals</span>
                                                    <div className="flex items-center gap-1">
                                                        <Sparkles size={10} className="text-primary-light" />
                                                        <span className="text-sm font-black text-primary-light tabular-nums leading-none">+{format(profile?.referral_earned || 0)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-[10px] md:text-[11px] font-bold text-text-secondary uppercase tracking-widest leading-relaxed mb-8 opacity-70 px-2">
                                            {isAllSetsDone
                                                ? "Daily threshold reached. Protocols resume tomorrow."
                                                : "Batch cleared for settlement. Synchronize with support to continue."}
                                        </p>

                                        <div className="flex flex-col gap-3">
                                            {!isAllSetsDone ? (
                                                <button
                                                    onClick={handleConfirmSettlement}
                                                    className="relative w-full py-4 md:py-5 rounded-[24px] overflow-hidden group transition-all duration-300"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary animate-shimmer" />
                                                    <div className="relative z-10 flex items-center justify-center gap-2 text-white font-black uppercase tracking-[0.2em] text-[11px] md:text-[12px]">
                                                        <MessageCircle size={18} className="group-hover:rotate-12 transition-transform md:w-5 md:h-5" />
                                                        Portal
                                                    </div>
                                                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            ) : (
                                                <Link
                                                    href="/home"
                                                    className="w-full py-4 md:py-5 rounded-[24px] bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-[11px] md:text-[12px] hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                                >
                                                    Return to Home
                                                </Link>
                                            )}
                                            
                                            <p className="text-[8px] font-black text-text-secondary/30 uppercase tracking-[0.3em] mt-1">SYSTEM PROTOCOL ACTIVE</p>
                                        </div>
                                    </div>
                                </div>
                            </Portal>
                        )}

                        {showPendingWarning && (
                            <Portal>
                                <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                                    <div className="glass-card-strong max-w-sm w-full p-8 text-center animate-scale-in border-danger/40 shadow-[0_50px_140px_rgba(0,0,0,0.9)] rounded-[32px] md:fixed md:left-[59%] md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
                                        <div className="w-20 h-20 rounded-[28px] bg-danger/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
                                            <AlertTriangle size={40} className="text-danger" />
                                        </div>
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">{t('system_restricted')}</h2>
                                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-8 opacity-60">Pending settlement detected</p>
                                        <Link href="/deposit" className="w-full py-4 rounded-2xl bg-danger text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-xl shadow-danger/25 hover:bg-danger/80 transition-all active:scale-95">Settlement Portal <ArrowRight size={18} /></Link>
                                    </div>
                                </div>
                            </Portal>
                        )}
                    </div>

                    <div className="flex flex-col items-center text-center">
                        <p className={`text-[10px] md:text-xs font-black uppercase tracking-[0.3em] transition-all duration-500 ${isSpinning ? 'text-primary-light animate-pulse' : 'text-text-primary/40'}`}>
                            {matchingStatus || 'System Ready'}
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5">
                            <div className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-danger' : 'bg-success animate-pulse'} `} />
                            <span className="text-[8px] md:text-[9px] font-black text-text-secondary uppercase tracking-[0.25em] opacity-50">{t('neural_active')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-16 max-w-2xl mx-auto">
                <div className="glass-card p-8 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-20 h-[1px] bg-primary animate-pulse" />
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-3">{t('important_notes')}</h3>
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest leading-relaxed opacity-60">
                        {t('working_hours_note')}
                    </p>
                </div>
            </div>

            {/* TOAST ALIGNED 59% ON DESKTOP, CENTER ON MOBILE */}
            <Portal>
                <div className="fixed top-28 left-1/2 md:left-[59%] -translate-x-1/2 z-[20000] flex justify-center pointer-events-none px-4 w-full md:w-auto">
                    <div className="w-full max-w-sm flex flex-col gap-3">
                        {profitAdded !== null && (
                            <div className="glass-card-strong px-5 py-4 rounded-[20px] shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-success/30 flex items-center gap-4 animate-scale-in pointer-events-auto bg-surface/90">
                                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success shrink-0">
                                    <TrendingUp size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-white uppercase tracking-tighter">Profit Applied</span>
                                    <span className="text-sm font-black text-success">+{format(profitAdded)} USDT</span>
                                </div>
                                <div className="ml-auto pl-3 border-l border-white/5 flex flex-col items-center">
                                    <Zap size={14} className="text-success animate-pulse" />
                                    <span className="text-[7px] font-mono text-success/40">ADDED</span>
                                </div>
                            </div>
                        )}
                        {showBundleSuccessToast && (
                            <div className="bg-gradient-to-br from-primary via-primary-light to-accent text-white px-6 py-4 rounded-[20px] shadow-[0_20px_50px_rgba(157,80,187,0.5)] flex items-center gap-4 border border-white/30 animate-scale-in pointer-events-auto backdrop-blur-xl">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                    <Zap size={20} className="text-white animate-pulse" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/80">Premium Order Success</span>
                                    <p className="text-[10px] font-bold text-white leading-relaxed">Cycle complete!</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Portal>

            {/* Lock message toast */}
            {lockMessage !== null && (
                <div className="fixed bottom-32 left-[58%] -translate-x-1/2 z-[1000] flex justify-center pointer-events-none px-4">
                    <div className="bg-surface/90 dark:bg-surface/95 backdrop-blur-xl border border-danger/30 px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-slide-up pointer-events-auto">
                        <AlertTriangle size={18} className="text-danger" />
                        <span className="text-[10px] font-black text-text-primary tracking-[0.2em] uppercase">
                            {lockMessage}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
