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
                const [statsResult, levelsResult] = await Promise.all([
                    supabase
                        .from('user_tasks')
                        .select('status')
                        .eq('user_id', profile.id),
                    supabase
                        .from('levels')
                        .select('*')
                        .order('price', { ascending: true })
                        .limit(2)
                ]);

                if (statsResult.data) {
                    setStats({
                        totalTasks: statsResult.data.length,
                        completedTasks: statsResult.data.filter(t => t.status === 'completed').length,
                        pendingTasks: statsResult.data.filter(t => t.status === 'pending').length
                    });
                }

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
        <div className="space-y-8 animate-fade-in transition-colors duration-300 relative -mt-16 md:-mt-20">
            

            <div className="glass-card p-0 mb-8 md:mb-12 relative overflow-hidden group border-primary/20 rounded-[32px] md:rounded-[40px] shadow-[0_0_30px_rgba(157,80,187,0.15)] animate-fade-in">
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
                                {t('optimization_hub_active') || 'Optimization hub active'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:block h-10 w-[1px] bg-black/10 dark:bg-white/10" />
                        <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-4">
                            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5 mr-auto md:mr-0">
                                <TrendingUp size={20} className="text-primary-light animate-pulse" />
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
                                <Sparkles size={16} className="text-primary animate-pulse" />
                                <span className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest font-mono">ID: {profile?.referral_code || '------'}</span>
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
                        { icon: Headset, label: 'Concierge Hub', color: 'text-purple-500', bg: 'bg-purple-500/10', href: '/concierge' },
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
                        <h3 className="text-2xl md:text-3xl font-black text-text-primary dark:text-white tracking-tight leading-tight uppercase">
                            Invite friends & <br />
                            <span className="text-text-primary/70 dark:text-white/70">earn together</span>
                        </h3>
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
