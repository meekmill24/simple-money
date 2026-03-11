'use client';

import React from 'react';
import { X, CheckCircle, Zap, TrendingUp, ShieldCheck } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

export interface BundlePackage {
    id: string;
    name: string;
    description: string;
    shortageAmount: number;
    totalAmount: number;
    bonusAmount: number;
    expiresIn: number;
    taskItem: {
        title: string;
        image_url: string;
        category: string;
    };
}

interface BundledPackageModalProps {
    isOpen: boolean;
    bundle: BundlePackage | null;
    onAccept: (bundle: BundlePackage) => Promise<void>;
}

export default function BundledPackageModal({
    isOpen,
    bundle,
    onAccept
}: BundledPackageModalProps) {
    const { format } = useCurrency();

    if (!isOpen || !bundle) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div
                className="bg-surface dark:bg-surface-light w-full max-w-sm rounded-[40px] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5)] border border-amber-500/20 animate-fade-in relative flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

                <div className="p-8 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-3xl bg-amber-500/20 flex items-center justify-center mb-6 shadow-glow shadow-amber-500/30">
                        <Zap size={32} className="text-amber-500 fill-amber-500/20 animate-pulse" />
                    </div>

                    <div className="text-center mb-8">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-2 block">
                            Premium Bundle Sequence
                        </span>
                        <h3 className="text-2xl font-black text-text-primary mb-2">{bundle.name || 'Surprise Reward!'}</h3>
                        <p className="text-xs text-text-secondary leading-relaxed opacity-70">
                            {bundle.description || "You've unlocked a high-valuation combination task. This sequence offers significantly higher commissions than standard optimizations."}
                        </p>
                    </div>

                    <div className="w-full space-y-3 mb-8">
                        <div className="p-5 rounded-3xl bg-black/5 dark:bg-white/5 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-primary/20 text-primary">
                                    <TrendingUp size={16} />
                                </div>
                                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest text-left">Bundle Value</span>
                            </div>
                            <span className="text-lg font-black text-text-primary">{format(bundle.totalAmount)}</span>
                        </div>

                        <div className="p-5 rounded-3xl bg-success/10 border border-success/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-success/20 text-success">
                                    <CheckCircle size={16} />
                                </div>
                                <span className="text-[10px] font-black text-success uppercase tracking-widest text-left">Commission Reward</span>
                            </div>
                            <span className="text-lg font-black text-success">+{format(bundle.bonusAmount)}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={() => onAccept(bundle)}
                            className="w-full py-5 rounded-[24px] bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Process Bundle Now <ShieldCheck size={18} />
                        </button>

                        <p className="text-[10px] text-text-secondary font-bold opacity-40 uppercase tracking-tighter text-center">
                            Funds will be locked until sequence settlement
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
