'use client';


import { useEffect, useState } from 'react';
import Link from 'next/link';


import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';


import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';


import { 
    ArrowUpRight, 
    ArrowDownLeft, 
    Building2, 
    FileText, 
    ChevronRight, 
    Play, 
    TrendingUp, 
    ShieldCheck, 
    Clock, 
    ArrowRight,
    LogOut,
    Sparkles,
    Users,
    TrendingDown,
    Award,
    Lock,
    Headset
} from 'lucide-react';

export default function HomePage() {
    const { profile, signOut } = useAuth();
    const { t } = useLanguage();
    const { format } = useCurrency();
    const [stats, setStats] = useState({
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0
    });
    const [levels, setLevels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!profile) return;
            setLoading(true);
            
            try {
                // Fetch stats and levels concurrently
                const [allRes, completedRes, pendingRes, levelsResult] = await Promise.all([
                    supabase.from('user_tasks').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
                    supabase.from('user_tasks').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('status', 'completed'),
                    supabase.from('user_tasks').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('status', 'pending'),
                    supabase.from('levels').select('*').order('price', { ascending: true }).limit(2)
                ]);
                
                setStats({
                    totalTasks: allRes.count || 0,
                    completedTasks: completedRes.count || 0,
                    pendingTasks: pendingRes.count || 0
                });

                if (levelsResult.data) {
                    setLevels(levelsResult.data);
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [profile]);

    return (
        <div className="space-y-8 animate-fade-in transition-colors duration-300">
            

            <div className="relative group perspective-1000">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-[32px] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative glass-card-strong p-8 md:p-12 min-h-[220px] flex flex-col justify-center overflow-hidden">
                    {/* Animated background elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 animate-pulse-slow"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-[60px] -ml-24 -mb-24 animate-pulse-slow"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-4 max-w-2xl">
                            <div className="flex items-center gap-3 animate-slide-up">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-primary to-accent p-[1px]">
                                    <div className="w-full h-full rounded-[15px] bg-white dark:bg-surface flex items-center justify-center text-2xl animate-blob-fluid">👋</div>
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3">
                                        <Link href="/profile" className="hover:opacity-80 transition-opacity">
                                            <h1 className="text-xl md:text-3xl font-black text-text-primary tracking-tight drop-shadow-lg leading-tight uppercase">
                                                {t('welcome_back')}, <span className="text-primary-light">{profile?.username || 'User'}</span>
                                            </h1>
                                        </Link>
                                        <button 
                                            onClick={() => signOut()}
                                            className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-text-secondary hover:text-danger hover:bg-danger/10 transition-all group/exit"
                                            title={t('sign_out')}
                                        >
                                            <LogOut size={18} className="group-hover/exit:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                    <p className="text-[10px] md:text-sm font-black text-text-secondary uppercase tracking-[0.3em] opacity-80 animate-slide-up [animation-delay:0.1s]">
                                        NEURAL NETWORK OPTIMIZATION ACTIVE
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Decorative floating icon */}
                        <div className="hidden lg:block animate-float">
                            <div className="w-16 h-16 rounded-3xl bg-surface/10 backdrop-blur-md border border-black/10 dark:border-white/10 flex items-center justify-center rotate-12 shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <TrendingUp className="text-primary-light relative z-10" size={32} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Available Balance Card */}
                <div className="glass-card-glow p-8 group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] sm:col-span-2 lg:col-span-1">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500 origin-top-right">
                        <TrendingUp size={80} className="text-primary" />
                    </div>
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-1 opacity-70">{t('available_balance')}</p>
                    <div className="flex items-baseline gap-1 mb-6">
                        <h2 className="text-4xl md:text-5xl font-black text-text-primary tracking-tighter drop-shadow-md">
                            {format(profile?.wallet_balance || 0)}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 w-fit group-hover:bg-primary/10 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_5px_var(--color-primary)]"></div>
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('available_tether')}</span>
                    </div>
                </div>

                {/* Today's Profit Card */}
                <div className="glass-card p-8 group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] dark:bg-gradient-to-br dark:from-black/20 dark:to-transparent">
                    <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-500 origin-top-right">
                        <TrendingUp size={80} className="text-accent" />
                    </div>
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-1 opacity-70">{t('today_profit')}</p>
                    <div className="flex items-baseline gap-1 mb-6">
                        <h2 className="text-4xl md:text-5xl font-black text-accent tracking-tighter drop-shadow-md">
                            {format(profile?.profit || 0)}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 w-fit">
                        <TrendingUp className="text-accent" size={12} />
                        <span className="text-[10px] font-black text-accent uppercase tracking-widest">{t('secured_rebate')}</span>
                    </div>
                </div>

                {/* Referral Bonus Card */}
                <div className="glass-card p-8 group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] dark:bg-gradient-to-br dark:from-black/20 dark:to-transparent">
                    <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-500 origin-top-right">
                        <Users size={80} className="text-success" />
                    </div>
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-1 opacity-70">{t('referral_bonus')}</p>
                    <div className="flex items-baseline gap-1 mb-6">
                        <h2 className="text-4xl md:text-5xl font-black text-success tracking-tighter drop-shadow-md">
                            {format(profile?.referral_earned || 0)}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 w-fit">
                        <Sparkles className="text-success" size={12} />
                        <span className="text-[10px] font-black text-success uppercase tracking-widest">Network Earned</span>
                    </div>
                </div>
            </div>


            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-3 bg-primary rounded-full" />
                        <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] opacity-60">Employee Levels</h3>
                    </div>
                    <Link href="/levels" className="text-[10px] font-black text-primary-light uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center gap-1 group">
                        {t('view_more')} <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loading ? (
                        // Skeleton Loaders for Employee Levels
                        [...Array(2)].map((_, i) => (
                            <div key={`skeleton-${i}`} className="glass-card-strong p-6 animate-pulse">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-xl bg-black/10 dark:bg-white/10" />
                                        <div className="space-y-2">
                                            <div className="w-24 h-5 bg-black/10 dark:bg-white/10 rounded" />
                                            <div className="w-16 h-3 bg-black/5 dark:bg-white/5 rounded" />
                                        </div>
                                    </div>
                                    <div className="w-12 h-6 bg-black/10 dark:bg-white/10 rounded" />
                                </div>
                                <div className="flex justify-between mb-5">
                                    <div className="w-12 h-8 bg-black/5 dark:bg-white/5 rounded" />
                                    <div className="w-12 h-8 bg-black/5 dark:bg-white/5 rounded" />
                                    <div className="w-12 h-8 bg-black/5 dark:bg-white/5 rounded" />
                                </div>
                                <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full" />
                            </div>
                        ))
                    ) : levels.map((level, i) => {
                        const isUnlocked = profile?.level_id ? profile.level_id >= level.id : i === 0;
                        const isHigherLevel = profile?.level_id ? profile.level_id > level.id : false;
                        
                        // Calculate progress for current set
                        const currentCount = profile?.completed_count || 0;
                        const tasksPerSet = level.tasks_per_set || 40;
                        const setsPerDay = level.sets_per_day || 3;
                        
                        let progressPercent = 0;
                        if (isHigherLevel) {
                            progressPercent = 100;
                        } else if (isUnlocked) {
                            const progressInSet = currentCount % tasksPerSet;
                            const displayProgress = (currentCount > 0 && progressInSet === 0) ? 100 : Math.round((progressInSet / tasksPerSet) * 100);
                            progressPercent = Math.min(displayProgress, 100);
                        }
                        
                        return (
                            <div 
                                key={level.id} 
                                className={`glass-card-strong p-6 group transition-all duration-500 relative overflow-hidden ${!isUnlocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                                style={{
                                    borderLeft: `3px solid ${level.badge_color || '#06b6d4'}`,
                                    boxShadow: isUnlocked ? `0 0 30px ${level.badge_color}1a` : 'none'
                                }}
                            >
                                <div className="relative z-10 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div 
                                                className="w-11 h-11 rounded-xl flex items-center justify-center text-text-primary dark:text-white shadow-lg"
                                                style={{ backgroundColor: `${level.badge_color}22`, border: `1px solid ${level.badge_color}44` }}
                                            >
                                                <Award size={22} style={{ color: level.badge_color }} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-lg font-black text-text-primary uppercase tracking-tight leading-none">
                                                        {level.name || `LV${i + 1}`}
                                                    </h4>
                                                    {isHigherLevel && (
                                                        <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[8px] font-black uppercase tracking-widest border border-success/20">
                                                            Completed
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[8px] font-bold text-text-secondary uppercase tracking-widest opacity-60">
                                                    {isHigherLevel ? 'Platform Verified' : 'Member Tier'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black text-text-primary mb-1 block">${level.price}</span>
                                            {!isUnlocked && !isHigherLevel && <Lock size={12} className="text-text-secondary ml-2 inline-block opacity-40" />}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest gap-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-text-secondary opacity-60">Commission</span>
                                            <span className="text-text-primary text-xs">{(level.commission_rate * 100).toFixed(2)}%</span>
                                        </div>
                                        <div className="flex flex-col gap-1 text-center">
                                            <span className="text-text-secondary opacity-60">Tasks/Set</span>
                                            <span className="text-text-primary text-xs">{level.tasks_per_set}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 text-right">
                                            <span className="text-text-secondary opacity-60">Max Sets</span>
                                            <span className="text-text-primary text-xs">{level.sets_per_day}</span>
                                        </div>
                                    </div>

                                    {/* Progress Bar Container */}
                                    <div className="space-y-2">
                                        <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                                            <div 
                                                className="h-full transition-all duration-1000 ease-out rounded-full relative"
                                                style={{ 
                                                    width: `${progressPercent}%`, 
                                                    backgroundColor: level.badge_color,
                                                    boxShadow: `0 0 10px ${level.badge_color}`
                                                }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 dark:bg-black/20 animate-shimmer" />
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <span className="text-[10px] font-black text-text-secondary opacity-60 tabular-nums tracking-widest">
                                                {progressPercent}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Background glow effect */}
                                <div 
                                    className="absolute -right-8 -bottom-8 w-32 h-32 blur-[60px] opacity-10 transition-opacity group-hover:opacity-20 pointer-events-none"
                                    style={{ backgroundColor: level.badge_color }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>


            <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-1 h-3 bg-primary rounded-full" />
                    <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] opacity-60">QUICK MENU</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: ArrowDownLeft, label: t('deposit'), color: 'text-primary', bg: 'bg-primary/10', href: '/deposit' },
                        { icon: ArrowUpRight, label: t('withdraw'), color: 'text-accent', bg: 'bg-accent/10', href: '/withdraw' },
                        { icon: Building2, label: t('institutional'), color: 'text-yellow-500', bg: 'bg-yellow-500/10', href: '/company' },
                        { icon: FileText, label: 'Certificate', color: 'text-success', bg: 'bg-success/10', href: '/certificate' },
                    ].map((item, i) => (
                        <Link key={i} href={item.href} className="group">
                            <div className="glass-card p-6 flex flex-col items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-center h-full border border-transparent hover:border-black/5 dark:hover:border-white/5">
                                <span className="text-[10px] md:text-xs font-bold text-text-primary uppercase tracking-wider">{item.label}</span>
                                <div className={`w-12 h-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-black/5`}>
                                    <item.icon size={24} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>


            <div className="relative group overflow-hidden rounded-[32px]">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-90"></div>
                <div className="absolute inset-0 mix-blend-overlay opacity-30 bg-[url('https://images.unsplash.com/photo-1621504450181-5d356f63d3ee?auto=format&fit=crop&q=80')] bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"></div>
                
                <div className="relative px-8 py-10 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8 z-10">
                    <div className="space-y-4 max-w-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-black/20 dark:bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <ShieldCheck className="text-text-primary dark:text-white" size={18} />
                            </div>
                            <span className="text-[10px] font-black text-text-primary/80 dark:text-white/80 uppercase tracking-[0.3em]">AFFILIATE PROGRAM</span>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl md:text-3xl font-black text-text-primary dark:text-white tracking-tight leading-tight uppercase">
                                Invite friends & <br />
                                <span className="text-text-primary/70 dark:text-white/70">earn together</span>
                            </h3>
                            <p className="text-[10px] font-bold text-text-primary/60 dark:text-white/60 uppercase tracking-widest leading-relaxed max-w-sm">
                                Expand the Simple Money network. Direct referrals grant a perpetual yields optimization fee based on their productivity.
                            </p>
                        </div>
                        <div className="flex gap-4 pt-2">
                            <div className="flex flex-col">
                                <span className="text-lg font-black text-text-primary dark:text-white">20%</span>
                                <span className="text-[8px] font-black text-text-primary/40 dark:text-white/40 uppercase tracking-widest">Commission</span>
                            </div>
                            <div className="w-px h-8 bg-text-primary/10 dark:bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-lg font-black text-text-primary dark:text-white">Instant</span>
                                <span className="text-[8px] font-black text-text-primary/40 dark:text-white/40 uppercase tracking-widest">Settlements</span>
                            </div>
                        </div>
                    </div>

                    <Link href="/invite" className="group/btn relative inline-flex items-center justify-center px-10 py-5 bg-[#00FF88] text-black font-black text-sm uppercase tracking-[0.15em] rounded-2xl shadow-[0_0_30px_rgba(0,255,136,0.3)] hover:shadow-[0_0_50px_rgba(0,255,136,0.5)] transition-all hover:-translate-y-1 active:translate-y-0 w-full md:w-auto overflow-hidden z-20">
                        <span className="relative z-10 flex items-center gap-3">
                            INVITE NETWORK <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-white dark:bg-black opacity-0 group-hover/btn:opacity-20 transition-opacity"></div>
                    </Link>
                </div>
            </div>
            

            <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-1 h-3 bg-primary rounded-full" />
                    <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] opacity-60">System Protocols</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { icon: Play, label: t('start_tasks_label'), desc: t('click_to_optimize_now'), href: '/start' },
                        { icon: Clock, label: t('activity_records_label'), desc: t('view_recent_settlements'), href: '/record' },
                        { icon: Users, label: t('my_profile_label'), desc: t('manage_account_identity'), href: '/profile' },
                        { icon: Headset, label: 'Concierge Hub', desc: 'Protocol support & network help', href: '/concierge' },
                        { icon: ShieldCheck, label: t('legal_governance_label'), desc: t('compliance_framework'), href: '/rules' }
                    ].map((item, i) => (
                        <Link 
                            key={i} 
                            href={item.href} 
                            className={`glass-card-strong p-6 hover:border-primary/40 transition-all group relative overflow-hidden flex items-center justify-between ${i === 4 ? 'sm:col-span-2' : ''}`}
                        >
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-text-secondary group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                    <item.icon size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-black text-text-primary text-xs uppercase tracking-wider leading-none">{item.label}</h4>
                                    <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest opacity-40">{item.desc}</p>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center opacity-40 dark:opacity-20 group-hover:opacity-100 transition-opacity">
                                <ChevronRight size={16} className="text-text-primary group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                            </div>
                            
                            {/* Subtle background detail */}
                            <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
