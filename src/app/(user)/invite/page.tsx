'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import {
    Users,
    TrendingUp,
    Copy,
    Check,
    Share2,
    ShieldCheck,
    ChevronLeft,
    Gift,
    Zap
} from 'lucide-react';
import Link from 'next/link';

export default function InvitePage() {
    const { profile } = useAuth();
    const { t } = useLanguage();
    const { format } = useCurrency();
    const [stats, setStats] = useState({
        totalReferrals: 0,
        commissionEarned: 0
    });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchReferralStats = async () => {
            if (!profile) return;

            // 1. Get total referrals count
            const { count: referralCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('referred_by', profile.id);

            // 2. Get total commission earned from referrals
            const { data: commissions } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', profile.id)
                .eq('type', 'commission')
                .ilike('description', '%Referral%');

            const totalCommission = commissions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

            setStats({
                totalReferrals: referralCount || 0,
                commissionEarned: totalCommission
            });
        };

        fetchReferralStats();
    }, [profile]);

    const referralLink = typeof window !== 'undefined'
        ? `${window.location.origin}/register?ref=${profile?.referral_code}`
        : '';

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join Simple Money',
                    text: 'Start earning today with Simple Money AI optimization network!',
                    url: referralLink,
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            handleCopyLink();
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-24 animate-fade-in space-y-8">

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/home" className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-text-secondary hover:text-text-primary transition-all">
                    <ChevronLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-xl font-black text-text-primary uppercase tracking-tight">{t('referral_program')}</h1>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-60">Network Expansion Hub</p>
                </div>
            </div>

            {/* Main Stats Card (Image 4 Style) */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-[32px] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                <div className="relative glass-card-strong p-8 md:p-10 space-y-10 overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />

                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Users size={20} className="text-primary-light" />
                        </div>
                        <h2 className="text-lg font-black text-text-primary uppercase tracking-tight">Referral Matrix</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-60">{t('total_referrals')}</p>
                            <p className="text-4xl font-black text-text-primary tabular-nums tracking-tighter">{stats.totalReferrals}</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-60">{t('commission_earned')}</p>
                            <p className="text-4xl font-black text-accent tabular-nums tracking-tighter">{format(stats.commissionEarned)}</p>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="relative">
                            <input
                                type="text"
                                readOnly
                                value={referralLink}
                                className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-text-secondary pr-16 focus:outline-none"
                            />
                            <button
                                onClick={handleCopyLink}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-surface/50 dark:bg-black/50 hover:bg-white/10 transition-all text-primary"
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>

                        <button
                            onClick={handleShare}
                            className="w-full py-4 bg-gradient-to-r from-primary to-accent text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            <Share2 size={18} />
                            {t('invite_friends')}
                        </button>
                    </div>
                </div>
            </div>

            {/* How it works grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    {
                        icon: Gift,
                        title: '01. Share',
                        desc: 'Send your unique referral link to potential contributors.',
                        color: 'text-primary'
                    },
                    {
                        icon: Zap,
                        title: '02. Activate',
                        desc: 'They join and begin optimizing asset batches in the network.',
                        color: 'text-accent'
                    },
                    {
                        icon: ShieldCheck,
                        title: '03. Yield',
                        desc: 'Earn a perpetual 20% yield from their successful optimization tasks.',
                        color: 'text-success'
                    }
                ].map((step, i) => (
                    <div key={i} className="glass-card p-6 space-y-4 group hover:border-white/10 transition-all">
                        <div className={`w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center ${step.color} group-hover:scale-110 transition-transform`}>
                            <step.icon size={20} />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-text-primary text-xs uppercase tracking-wide">{step.title}</h4>
                            <p className="text-[10px] text-text-secondary font-medium uppercase tracking-widest opacity-60 leading-relaxed">{step.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Program Notice */}
            <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp size={16} className="text-primary-light" />
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-primary-light uppercase tracking-widest leading-relaxed">Network Growth Protocol</p>
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest leading-relaxed opacity-60">
                        Rewards are calculated real-time upon successful node validation. Tier benefits stack with referral yields for maximum capital efficiency.
                    </p>
                </div>
            </div>

        </div>
    );
}
