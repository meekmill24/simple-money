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
    Pointer
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
        const loadPageData = async () => {
            if (!profile?.level_id || !profile?.id) return;
            setIsLoadingData(true);

            try {
                // Parallelize all initial global data fetches
                const [levelsRes, pastTasksRes, itemsRes] = await Promise.all([
                    supabase.from('levels').select('id, tasks_per_set, sets_per_day, commission_rate').order('price', { ascending: true }),
                    supabase.from('user_tasks').select('task_item_id, status').eq('user_id', profile.id).neq('status', 'cancelled'),
                    supabase.from('task_items').select('*').eq('is_active', true).eq('level_id', profile.level_id)
                ]);

                // 1. Level Logic
                if (pastTasksRes.data) {
                    const pending = pastTasksRes.data.some(t => t.status === 'pending');
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

                // 2. Items logic + Preloading
                const usedItemIds = (pastTasksRes.data || []).map(t => t.task_item_id);
                let availableItems = (itemsRes.data || []).filter(item => !usedItemIds.includes(item.id));

                // FALLBACK: If all products for this level are used, cycle back to the beginning of the pool
                // This prevents "shortages" when admins assign many multi-product bundles
                if (availableItems.length === 0 && itemsRes.data && itemsRes.data.length > 0) {
                    availableItems = itemsRes.data;
                } else if (availableItems.length === 0) {
                    // Final fallback with realistic naming examples if no DB items found
                    availableItems = Array.from({ length: 24 }).map((_, i) => ({
                        id: `fallback-${i}`,
                        title: i % 2 === 0 ? 'Premium electronics hub' : 'Luxury timepiece collection',
                        image_url: `https://picsum.photos/seed/prod-${i}/400/400`,
                        price: 150 + (i * 10),
                        commission_rate: 0.0045,
                        level_id: profile.level_id
                    }));
                }

                const shuffled = [...availableItems].sort(() => 0.5 - Math.random());
                const selectedItems = shuffled.slice(0, 24);
                setItems(selectedItems);

                // Proactive image preloading
                selectedItems.forEach(item => {
                    const img = new Image();
                    img.src = item.image_url;
                });

            } catch (err) {
                console.error("Error loading start page data:", err);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadPageData();
    }, [profile?.level_id, profile?.id]);

    // Rapid Spin Effect
    useEffect(() => {
        let spinInterval: NodeJS.Timeout;
        if (isSpinning) {
            spinInterval = setInterval(() => {
                setHighlightedIndex(prev => {
                    const next = Math.floor(Math.random() * items.length);
                    return next === prev && items.length > 1 ? (next + 1) % items.length : next;
                });
            }, 40); // Faster spinning for 5x5
        } else if (!selectedItem) {
            setHighlightedIndex(null);
        }
        return () => clearInterval(spinInterval);
    }, [isSpinning, items.length, selectedItem]);

    // Proactive Messaging Logic
    useEffect(() => {
        if (hasPendingTask) {
            setMatchingStatus("You have a pending order to submit");
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
            setMatchingStatus("You have a pending order to submit");
            setLockMessage("You have a pending order to submit. Please check your activity records.");
            setTimeout(() => setLockMessage(null), 3000);
            return;
        }

        if (profile && profile.wallet_balance < 0) {
            setShowPendingWarning(true);
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

            // 1. Check for Pending Bundle strictly by Index
            const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', profile?.id).single();
            const pb = (freshProfile as any)?.pending_bundle;
            const currentItemIndex = tasksInCurrentSet + 1; // 1-based index for the current task

            let finalIndex = Math.floor(Math.random() * items.length);
            let matchedItem = { ...items[finalIndex] };

            if (pb && Number(pb.targetIndex) === currentItemIndex) {
                // FORCE the landing on the bundle item
                if (pb.taskItem) {
                    matchedItem = {
                        id: Number(pb.taskItemIds?.[0] || 0),
                        title: pb.taskItem.title,
                        image_url: pb.taskItem.image_url,
                        category: pb.taskItem.category,
                        level_id: profile?.level_id || 1
                    } as TaskItem;

                    // Inject into items array visually so the highlight matches
                    const newItems = [...items];
                    newItems[finalIndex] = matchedItem;
                    setItems(newItems);
                }
            } else if (pb) {
                // Ensure we DON'T land on a bundle item randomly if it's not the target index
                const bundleIds = Array.isArray(pb.taskItemIds) ? pb.taskItemIds : [];
                if (bundleIds.includes(matchedItem.id)) {
                    const safeItems = items.filter(item => !bundleIds.includes(item.id));
                    if (safeItems.length > 0) {
                        const safeIdx = Math.floor(Math.random() * safeItems.length);
                        matchedItem = { ...safeItems[safeIdx] };
                        finalIndex = items.findIndex(item => item.id === matchedItem.id);
                        if (finalIndex === -1) finalIndex = 0; // Fallback
                    }
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

        // Use passed-in bundle or fetch fresh
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

            // Cleanup the bundle after trigger
            if (remainingIds.length === 0) await supabase.from('profiles').update({ pending_bundle: null }).eq('id', profile.id);
            else await supabase.from('profiles').update({ pending_bundle: { ...bundle, taskItemIds: remainingIds } }).eq('id', profile.id);

            await refreshProfile();
            return;
        }

        setSelectedItem({ ...item });
        setModalOpen(true);
    };

    const handleSubmitTask = async (item: TaskItem) => {
        if (isSubmitting) return;

        // Detailed check for return reasons
        if (!profile) {
            alert("Session lost. Please log in again.");
            router.push('/login');
            return;
        }

        if (profile.wallet_balance < 0) {
            setShowPendingWarning(true);
            return;
        }

        if (isLocked) {
            const msg = isAllSetsDone
                ? t('daily_limit_reached')
                : t('set_complete_contact_support').replace('{set}', String(currentSet));
            alert(msg);
            return;
        }

        setIsSubmitting(true);
        console.log("Submitting optimization for system ID:", item.id);

        try {
            const { data, error } = await supabase.rpc('complete_user_task', {
                p_task_item_id: item.id
            });

            if (error) {
                console.error("RPC Error Details:", error);
                throw error;
            }

            // 1. Show local feedback via Toast/Profit State IMMEDIATELY
            const earnedAmount = data?.earned_amount || 0;
            const newBalance = data?.new_balance || profile.wallet_balance;
            const isBundleResult = data?.is_bundle || false;

            console.log("Submission success data:", data);

            if (isBundleResult) {
                setShowBundleSuccessToast(true);
                setTimeout(() => setShowBundleSuccessToast(false), 6000);
            } else if (tasksInCurrentSet + 1 >= tasksPerSet) {
                setModalOpen(false);
                setModalSeen(false);
                setTimeout(() => setShowCompletionModal(true), 200);
            } else {
                setModalOpen(false);
                setProfitAdded(earnedAmount);
                setTimeout(() => setProfitAdded(null), 3000);
            }

            // 2. Sync with database
            await refreshProfile();
            console.log("Profile refreshed successfully");

        } catch (err: any) {
            console.error("Critical Task Submission Error:", err);
            const errorMsg = err?.message || err?.details || 'Optimization failed.';
            alert(`Optimization Failure: ${errorMsg}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmSettlement = async () => {
        setModalSeen(true);
        if ((window as any).Tawk_API && (window as any).Tawk_API.maximize) {
            (window as any).Tawk_API.maximize();
        } else {
            router.push('/support');
        }
        setShowCompletionModal(false);
    };

    const handleBundleAccept = async (bundle: BundlePackage) => {
        if (!profile) return;
        const newBalance = profile.wallet_balance - bundle.totalAmount;
        const newFrozen = profile.frozen_amount + bundle.totalAmount + bundle.bonusAmount;

        await supabase.from('profiles').update({
            wallet_balance: newBalance,
            frozen_amount: newFrozen,
            completed_count: (profile.completed_count || 0) + 1 // INCREMENT so it counts as 1 of the 40 tasks
        }).eq('id', profile.id);

        await supabase.from('transactions').insert({ user_id: profile.id, type: 'freeze', amount: bundle.totalAmount, description: `Bundle: ${bundle.name}` });

        if (pendingTaskItem) {
            await supabase.from('user_tasks').insert({
                user_id: profile.id,
                task_item_id: pendingTaskItem.id,
                status: 'pending',
                earned_amount: bundle.bonusAmount,
                cost_amount: bundle.totalAmount,
                is_bundle: true,
                completed_at: new Date().toISOString()
            });
            setPendingTaskItem(null);
        }
        await refreshProfile();
        setBundleModal(false);
        router.push('/record');
    };

    return (
        <div className="max-w-6xl mx-auto pb-12 animate-slide-up relative min-h-screen">
            <div className="absolute top-1/4 -left-20 w-80 h-80 glass-prism rounded-full opacity-20 pointer-events-none blur-xl animate-pulse-glow" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 glass-prism rounded-full opacity-20 pointer-events-none blur-2xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />

            {isProfileIncomplete && (
                <div className="mb-6 glass-card border-warning/30 p-4 flex items-center justify-between gap-4 animate-scale-in">
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

            <div className="glass-card p-0 mb-8 md:mb-12 relative overflow-hidden group border-primary/20 rounded-[32px] md:rounded-[40px] shadow-[0_0_30px_rgba(157,80,187,0.15)] animate-slide-up">
                <div className="absolute inset-0 z-0">
                    <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-15 md:opacity-20 scale-100 transition-transform duration-1000">
                        <source src="https://assets.mixkit.co/videos/preview/mixkit-abstract-glowing-particles-looping-background-28384-large.mp4" type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />
                </div>

                <div className="p-5 md:p-8 border-b border-black/5 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-[20px] md:rounded-[24px] bg-gradient-to-br from-primary to-accent p-1 shadow-lg shadow-primary/20 shrink-0">
                            <div className="w-full h-full rounded-[16px] md:rounded-[18px] bg-surface flex items-center justify-center border border-black/10 dark:border-white/10 overflow-hidden">
                                <span className="text-xl md:text-2xl font-black text-text-primary">{profile?.username?.[0].toUpperCase() || 'U'}</span>
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-text-primary tracking-tight uppercase leading-tight">
                                {t('welcome_back')}, <br className="md:hidden" />
                                <span className="text-primary-light">{profile?.username || 'User'}</span>
                            </h1>
                            <p className="text-[10px] md:text-xs text-text-secondary mt-1 font-medium italic opacity-80 uppercase tracking-widest">
                                {t('optimization_hub_active')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:block h-10 w-[1px] bg-black/10 dark:bg-white/10" />
                        <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-4">
                            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5 mr-auto md:mr-0">
                                <Zap size={20} className="text-primary-light animate-pulse" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-primary uppercase tracking-[0.25em] opacity-80">Available Balance</span>
                                    <span className="text-xl font-black text-text-primary tracking-tight leading-none mt-1 animate-scale-in">{format(profile?.wallet_balance || 0)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-accent/10 border border-accent/20 shadow-lg shadow-accent/5">
                                <TrendingUp size={20} className="text-accent-light animate-bounce" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-accent uppercase tracking-[0.25em] opacity-80">Daily profit</span>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-xl font-black text-text-primary tracking-tight leading-none animate-scale-in">{format(profile?.profit || 0)}</span>
                                        <span className="text-[10px] font-black text-accent-light opacity-60">USDT</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                                <Activity size={16} className="text-primary animate-pulse" />
                                <span className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest font-mono">ID: {profile?.referral_code || '------'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-3 grid grid-cols-2 lg:grid-cols-5 gap-3 relative z-10 bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="p-6 relative overflow-hidden group hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-[24px]">
                        <div className="absolute inset-0 bg-primary/5 transition-all duration-1000 origin-left" style={{ width: `${(tasksInCurrentSet / (totalTasks || 1)) * 100}%` }} />
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div>
                                <span className="text-[9px] font-black text-primary-light uppercase tracking-[0.2em] block mb-1">{t('set_progress')}</span>
                                <h2 className="text-xl font-black text-text-primary uppercase tracking-tighter">Set {currentSet}/{setsPerDay}</h2>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-[10px] font-mono text-text-secondary opacity-40">({tasksInCurrentSet}/{totalTasks}) {t('completed')}</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_5px_var(--color-primary)]" />
                            </div>
                        </div>
                    </div>

                    <Link href="/deposit" className="p-6 relative overflow-hidden group hover:bg-black/5 dark:hover:bg-white/5 transition-all rounded-[24px] border border-transparent hover:border-success/20 animate-diagonal-tl">
                        <div className="absolute -top-6 -right-6 w-16 h-16 bg-success/10 rounded-full blur-xl group-hover:bg-success/20 transition-all opacity-40" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-50">{t('recharge')}</span>
                                <Zap size={12} className="text-success animate-pulse" />
                            </div>
                            <p key={profile?.wallet_balance} className="text-2xl font-black text-success-light leading-none tracking-tight animate-scale-in">{format(profile?.wallet_balance || 0)}</p>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-[8px] font-black text-success uppercase tracking-widest">{t('recharge_now')}</span>
                                <ArrowRight size={12} className="text-success group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/withdraw" className="p-6 relative overflow-hidden group hover:bg-black/5 dark:hover:bg-white/5 transition-all rounded-[24px] border border-transparent hover:border-primary/20 animate-diagonal-tr">
                        <div className="absolute -top-6 -right-6 w-16 h-16 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all opacity-40" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-50">{t('withdraw')}</span>
                                <Wallet size={12} className="text-primary" />
                            </div>
                            <p className="text-2xl font-black text-text-primary leading-none tracking-tight">{t('withdraw')}</p>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-[8px] font-black text-primary-light uppercase tracking-widest">{t('secure_payout')}</span>
                                <ArrowRight size={12} className="text-primary-light group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>

                    <div className="p-6 relative overflow-hidden group hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-[24px]">
                        <div className="absolute -top-6 -right-6 w-16 h-16 bg-accent/10 rounded-full blur-xl group-hover:bg-accent/20 transition-all opacity-40" />
                        <div className="relative z-10">
                            <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] block mb-1 opacity-50">DAILY PROFITS</span>
                            <p key={profile?.profit} className="text-2xl font-black text-accent-light leading-none tracking-tight animate-scale-in">{format(profile?.profit || 0)}</p>
                            <div className="mt-4 flex items-center gap-1.5">
                                <span className="text-[8px] font-black text-accent uppercase tracking-widest">{t('secured_rebate')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 relative overflow-hidden group hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-[24px]">
                        <div className="absolute -top-6 -right-6 w-16 h-16 bg-danger/10 rounded-full blur-xl group-hover:bg-danger/20 transition-all opacity-40" />
                        <div className="relative z-10">
                            <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] block mb-1 opacity-50">{t('frozen_asset')}</span>
                            <p className="text-2xl font-black text-danger-light leading-none tracking-tight">{format(profile?.frozen_amount || 0)}</p>
                            <div className="mt-4 flex items-center gap-1.5">
                                <span className="text-[8px] font-black text-danger uppercase tracking-widest">{t('escrow_hold')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative flex flex-col items-center justify-center py-6 md:py-10">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-[800px] h-[500px] md:h-[600px] bg-primary/10 rounded-full blur-[100px] md:blur-[160px] transition-opacity duration-1000 ${isSpinning ? 'opacity-100' : 'opacity-40'}`} />

                <div className="w-full max-w-2xl mx-auto space-y-12 relative z-10 px-4">
                    {/* 5x5 Grid with Center START Button */}
                    <div className="grid grid-cols-5 gap-1.5 md:gap-2">
                        {Array.from({ length: 25 }).map((_, idx) => {
                            if (idx === 12) {
                                return (
                                    <div key="start-btn-slot" className="aspect-square flex items-center justify-center relative">
                                        <div className={`absolute inset-[-10px] bg-primary/20 rounded-full blur-lg transition-opacity duration-1000 ${isSpinning ? 'opacity-100' : 'opacity-0'}`} />
                                        <button
                                            onClick={handleStart}
                                            disabled={isSpinning}
                                            className={`relative w-full h-full rounded-full flex flex-col items-center justify-center p-1.5 transition-all duration-700 overflow-hidden !cursor-pointer
                                                ${isSpinning ? 'scale-95 shadow-none ring-4 ring-primary/20' : 'hover:scale-105 shadow-[0_0_30px_rgba(157,80,187,0.4)]'}
                                                ${(isLocked || (profile?.wallet_balance || 0) < 65 || profile?.pending_bundle) ? 'grayscale opacity-40 !cursor-not-allowed' : ''}
                                            `}
                                        >
                                            {/* Bubble Water Effect */}
                                            <div className="absolute inset-0 glass-water opacity-90" />

                                            {/* Surface Shine */}
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.4)_0%,transparent_60%)] z-10" />
                                            <div className="absolute top-1 left-4 right-4 h-1/4 bg-white/20 blur-md rounded-full z-10" />

                                            {/* Dynamic Liquid Waves */}
                                            <div className={`absolute inset-0 transition-transform duration-1000 ${isSpinning ? 'translate-y-[-20%] rotate-12' : 'translate-y-[60%]'}`}>
                                                <div className="absolute top-0 left-[-100%] w-[300%] h-[300%] bg-white/10 rounded-[45%] animate-spin-slow" />
                                                <div className="absolute top-2 left-[-100%] w-[300%] h-[300%] bg-white/5 rounded-[40%] animate-spin-slow opacity-50" style={{ animationDirection: 'reverse' }} />
                                            </div>

                                            <div className="relative z-20 flex flex-col items-center text-center">
                                                <h3 className="text-[12px] md:text-lg font-black text-white uppercase tracking-wider leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                                                    {isLocked ? t('status') : t('start')}
                                                </h3>
                                                {!isSpinning && !isLocked && <Pointer size={14} className="text-white animate-bounce mt-1 drop-shadow-md" />}
                                            </div>
                                        </button>
                                    </div>
                                );
                            }

                            const itemIdx = idx > 12 ? idx - 1 : idx;
                            return (
                                <div key={idx} className={`aspect-square glass-card p-0.5 border-black/5 dark:border-white/5 overflow-hidden transition-all duration-500 rounded-[8px] md:rounded-[12px] ${isSpinning && highlightedIndex === itemIdx ? 'ring-2 ring-primary scale-110 shadow-[0_0_12px_var(--color-primary)] opacity-100 z-10' : 'opacity-80 scale-100'}`}>
                                    {items[itemIdx] ? (
                                        <img src={items[itemIdx].image_url} className="w-full h-full object-cover rounded-[6px] md:rounded-[10px]" alt="" />
                                    ) : (
                                        <div className="w-full h-full bg-black/5 dark:bg-white/5 animate-pulse rounded-[6px] md:rounded-[10px]" />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Status Text Moved Below Grid */}
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

            {/* Profit Toast */}
            {profitAdded !== null && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] animate-bounce-in">
                    <div className="bg-success text-white px-8 py-4 rounded-3xl shadow-[0_20px_50px_rgba(34,197,94,0.4)] flex items-center gap-4 border border-white/20">
                        <CheckCircle size={24} />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Profit Applied</span>
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
                            <Zap size={28} className="text-white animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Premium Order Success</span>
                            <p className="text-sm md:text-md font-bold text-white max-w-[300px]">You have gotten Huge profit from the bundle you can now continue your daily task.</p>
                        </div>
                    </div>
                </div>
            )}

            {showMinBalanceModal && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-surface dark:bg-background/95 dark:backdrop-blur-2xl animate-fade-in text-center md:pl-72">
                    <div className="glass-card max-w-sm w-full p-10 animate-scale-in border-danger/30 rounded-[40px] relative">
                        <button
                            onClick={() => setShowMinBalanceModal(false)}
                            className="absolute top-6 right-6 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                        >
                            <X size={24} />
                        </button>
                        <div className="w-20 h-20 rounded-full bg-danger/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_var(--color-danger)] relative">
                            <AlertTriangle size={40} className="text-danger" />
                            <div className="absolute inset-0 rounded-full border border-danger animate-ping opacity-20" />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                            Access Denied
                        </h2>
                        <span className="text-danger font-black text-[10px] uppercase tracking-[0.4em] mb-10 block leading-relaxed">
                            Minimum amount required to start task is $65
                        </span>

                        <div className="space-y-4 mb-8">
                            <p className="text-text-secondary text-xs font-bold leading-relaxed uppercase tracking-wider opacity-60">
                                Your balance of {format(profile?.wallet_balance || 0)} is below the node activation threshold.
                            </p>
                        </div>

                        <Link
                            href="/deposit"
                            className="w-full py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-primary/25"
                        >
                            Refill Balance <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            )}

            {showCompletionModal && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-surface dark:bg-background/95 dark:backdrop-blur-2xl animate-fade-in text-center md:pl-72">
                    <div className="glass-card max-w-sm w-full p-10 animate-scale-in border-success/30 rounded-[40px] relative">
                        <button
                            onClick={handleConfirmSettlement}
                            className="absolute top-6 right-6 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                        >
                            <X size={24} />
                        </button>
                        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_var(--color-success)] relative">
                            <CheckCircle size={40} className="text-success" />
                            <div className="absolute inset-0 rounded-full border border-success animate-ping opacity-20" />
                        </div>
                        <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight mb-2">
                            {t('task_result')}
                        </h2>
                        <span className="text-success font-black text-[10px] uppercase tracking-[0.4em] mb-10 block leading-relaxed">
                            {isAllSetsDone
                                ? 'Daily Optimization Cycle Finished • Contact the Concierge Desk for assistance'
                                : 'Set Sequence Completed • Contact the Concierge Desk to unlock next set'}
                        </span>

                        <div className="space-y-4 mb-2">
                            <div className="flex justify-between items-center px-2 py-3 border-b border-black/5 dark:border-white/5">
                                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-60">{t('settlement_amount')}</span>
                                <span className="text-sm font-black text-text-primary">{format(profile?.wallet_balance || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center px-2 py-3 border-b border-black/5 dark:border-white/5">
                                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-60">{t('total_commissions')}</span>
                                <span className="text-sm font-black text-success">+{format(profile?.profit || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed top-24 inset-x-0 z-[1000] flex justify-center pointer-events-none md:pl-80 px-4">
                <div className="w-full max-w-sm flex flex-col gap-3">
                    {profitAdded !== null && (
                        <div className="bg-success text-white px-8 py-5 rounded-[28px] shadow-[0_20px_50px_rgba(34,197,94,0.4)] flex items-center justify-center gap-4 animate-slide-up border border-white/20">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <CheckCircle size={22} className="text-white fill-white/20" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Profit Applied</span>
                                <div className="flex items-end gap-1.5">
                                    <span className="text-xl font-black tracking-tight">+{format(profitAdded)}</span>
                                    <span className="text-[10px] font-black opacity-60 mb-0.5">USDT</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {lockMessage !== null && (
                        <div className="bg-surface dark:bg-surface/95 dark:backdrop-blur-xl border border-danger/30 px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(239,68,68,0.2)] flex items-center gap-3 animate-slide-up">
                            <AlertTriangle size={18} className="text-danger" />
                            <span className="text-sm font-bold text-text-primary tracking-wide uppercase">
                                {lockMessage}
                            </span>
                        </div>
                    )}
                </div>
            </div>
            {showPendingWarning && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-surface dark:bg-background/98 dark:backdrop-blur-2xl animate-fade-in">
                    <div className="glass-card max-w-sm w-full p-8 text-center animate-shake border-danger/40">
                        <div className="w-20 h-20 rounded-3xl bg-danger/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_var(--color-danger)]">
                            <AlertTriangle size={40} className="text-danger" />
                        </div>
                        <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight mb-2">{t('system_restricted')}</h2>
                        <p className="text-danger-light font-black text-[10px] uppercase tracking-[0.2em] mb-6">{t('negative_balance_detected')}</p>
                        <p className="text-text-secondary text-xs font-bold leading-relaxed uppercase tracking-wider mb-8 opacity-60">
                            Your account is currently locked due to an active bundle deficit. Optimization services are suspended until settlement.
                        </p>
                        <Link href="/deposit" className="w-full py-4 rounded-2xl bg-danger text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-danger/25">
                            {t('settlement_portal')} <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
