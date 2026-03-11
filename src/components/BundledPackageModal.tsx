'use client';

import { Package, Zap, ArrowRight, Sparkles, Star, Smartphone, ShieldCheck } from 'lucide-react';

export interface BundlePackage {
    id: string;
    name: string;
    description: string;
    shortageAmount: number;  // deposit required
    totalAmount: number;     // product price shown to user
    bonusAmount: number;     // profit earned on completion
    expiresIn: number;       // seconds
    taskItem?: {
        title: string;
        image_url: string;
        category: string;
    } | null;
}

interface BundledPackageModalProps {
    isOpen: boolean;
    bundle: BundlePackage | null;
    onAccept: (bundle: BundlePackage) => void;
}

export default function BundledPackageModal({ isOpen, bundle, onAccept }: BundledPackageModalProps) {
    if (!isOpen || !bundle) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-fade-in md:pl-72">
            {/* Backdrop with extreme blur and amber tint */}
            <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />

            {/* Modal Container */}
            <div
                className="relative w-full max-w-[360px] h-auto max-h-[95vh] glass-card-glow overflow-y-auto animate-scale-in border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.2)] rounded-[32px] z-10 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Premium Background Effects */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 blur-[60px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-600/20 blur-[40px] rounded-full pointer-events-none" />

                <div className="p-8 flex-1 flex flex-col">
                    {/* Bundle Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shadow-[0_0_10px_var(--color-amber-500)]" />
                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em]">Special Acceleration</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5">
                            <Sparkles size={10} className="text-amber-500" />
                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">VIP</span>
                        </div>
                    </div>

                    {/* Product Row - COMPACT HORIZONTAL (Matching ItemDetailModal) */}
                    <div className="flex items-center gap-5 mb-8 text-left">
                        {bundle.taskItem?.image_url ? (
                            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-amber-500/20 p-1.5 shrink-0 relative group overflow-hidden">
                                <img
                                    src={bundle.taskItem.image_url}
                                    alt={bundle.taskItem.title}
                                    className="w-full h-full object-cover rounded-xl transition-transform group-hover:scale-110"
                                />
                                <div className="absolute -top-1 -right-1 bg-gradient-to-br from-amber-400 to-orange-600 p-1 rounded-lg shadow-lg z-20">
                                    <Star size={10} className="text-white fill-white" />
                                </div>
                            </div>
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                                <Package size={24} className="text-amber-500" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-black text-white uppercase tracking-tight line-clamp-2 leading-tight">
                                {bundle.taskItem?.title || bundle.name}
                            </h2>
                            <p className="text-[9px] text-text-secondary mt-2 leading-tight uppercase font-bold tracking-wider opacity-60">
                                {bundle.description}
                            </p>
                        </div>
                    </div>

                    {/* Financial Summary - COMPACT GLASS CARD */}
                    <div className="p-5 mb-8 rounded-2xl border border-amber-500/10 bg-amber-500/[0.04] backdrop-blur-md space-y-5 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />

                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.15em] px-1">
                            <span className="w-1/3 text-left text-white/40">Asset Logic</span>
                            <span className="w-1/3 text-center text-white/40">Required</span>
                            <span className="w-1/3 text-right text-white/40">Bonus Profit</span>
                        </div>
                        <div className="flex justify-between items-end px-1">
                            <div className="w-1/3 flex flex-col items-start gap-1">
                                <span className="text-sm font-black text-white truncate">${bundle.totalAmount.toFixed(2)}</span>
                                <div className="flex items-center gap-1 opacity-40">
                                    <div className="w-2.5 h-2.5 bg-amber-500/20 rounded-full flex items-center justify-center">
                                        <Zap size={6} className="text-amber-500 fill-amber-500" />
                                    </div>
                                    <span className="text-[7px] font-bold uppercase tracking-tighter text-white">USDT</span>
                                </div>
                            </div>
                            <div className="w-1/3 flex flex-col items-center">
                                <span className="text-sm font-black text-amber-500">${bundle.shortageAmount.toFixed(2)}</span>
                                <span className="text-[7px] font-bold text-amber-400 uppercase tracking-tighter mt-1">Deposit</span>
                            </div>
                            <div className="w-1/3 flex flex-col items-end gap-1 text-success">
                                <div className="flex items-center gap-1">
                                    <Zap size={14} className="fill-success opacity-80" />
                                    <span className="text-sm font-black">+${bundle.bonusAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-40">
                                    <img src="https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/usdt.png" className="w-2.5 h-2.5" alt="" />
                                    <span className="text-[7px] font-bold uppercase tracking-tighter text-white">USDT</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Requirement Alert */}
                    <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-8">
                        <ShieldCheck size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest leading-relaxed text-left">
                            MANDATORY: These assets are reserved. You must accept this bundle to unlock remaining daily tasks.
                        </p>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => onAccept(bundle)}
                        className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                    >
                        Accept & Continue <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
                    </button>

                    <div className="mt-6 flex items-center justify-center gap-2 opacity-30 pb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.3em]">Secured Bundle Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function generateRandomBundle(taskNumber: number, currentWalletBalance: number, baseTaskPrice: number): BundlePackage {
    const bundles = [
        { name: 'Turbo Growth Pack', description: 'A special accelerator bundle has been triggered! Top up your account to unlock this high-value combination order.' },
        { name: 'VIP Boost Bundle', description: 'You\'ve been selected for a VIP acceleration bundle! This task matched a dual-item optimization slot.' },
        { name: 'Flash Earnings Pack', description: 'A flash bundle opportunity has appeared! This asset is grouped into a multi-item optimization request.' },
        { name: 'Power Multiplier Pack', description: 'This task triggered a premium optimization slot. Add funds to activate your multiplier and complete the order.' },
    ];

    const chosen = bundles[taskNumber % bundles.length];
    const minShortagePercentage = 0.10;
    const maxShortagePercentage = 2.00;
    const randomShortagePercentage = minShortagePercentage + Math.random() * (maxShortagePercentage - minShortagePercentage);
    const shortageAmount = Math.round((currentWalletBalance * randomShortagePercentage) * 100) / 100;
    const totalAmount = Math.round((currentWalletBalance + shortageAmount) * 100) / 100;
    const bonusMultiplier = 0.027 + Math.random() * 0.073;
    const bonusAmount = Math.round((totalAmount * bonusMultiplier) * 100) / 100;

    return {
        id: `bundle-${Date.now()}`,
        name: chosen.name,
        description: chosen.description,
        shortageAmount,
        totalAmount,
        bonusAmount,
        expiresIn: 3600,
        taskItem: null,
    };
}
