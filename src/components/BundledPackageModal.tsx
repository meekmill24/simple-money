'use client';

import { useEffect } from 'react';
import { Package, Zap, ArrowRight, Sparkles, Star, ShieldCheck, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';

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

    // Celebration Effect
    useEffect(() => {
        if (isOpen && bundle) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

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

            return () => clearInterval(interval);
        }
    }, [isOpen, bundle]);

    if (!isOpen || !bundle) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop with extreme blur and amber tint */}
            <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />

            {/* Modal Container */}
            <div
                className="relative w-full max-w-[360px] max-h-[90vh] overflow-y-auto glass-card-glow border border-amber-500/30 shadow-[0_0_80px_rgba(245,158,11,0.4)] rounded-[40px] z-[1001] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Premium Background Effects */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/30 blur-[60px] rounded-full pointer-events-none animate-pulse" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-600/30 blur-[40px] rounded-full pointer-events-none animate-pulse" />

                <div className="p-6 flex-1 flex flex-col relative text-center items-center w-full">
                    {/* Floating Celebration Icons */}
                    <div className="absolute -top-4 -left-4 animate-bounce delay-75">
                        <Star size={24} className="text-amber-400 fill-amber-400 opacity-50" />
                    </div>
                    <div className="absolute top-20 -right-2 animate-bounce delay-300">
                        <Sparkles size={20} className="text-amber-300 opacity-40" />
                    </div>

                    {/* Bundle Header */}
                    <div className="flex items-center justify-between mb-4 w-full">
                        <div className="flex items-center gap-2">
                            <Gift size={16} className="text-amber-500 animate-bounce" />
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Surprise Unlocked!</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                            <Sparkles size={10} className="text-amber-500 animate-pulse" />
                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">LUCKY YOU</span>
                        </div>
                    </div>

                    {/* Product Row - COMPACT HORIZONTAL */}
                    <div className="flex items-center gap-5 mb-4 text-left w-full">
                        {bundle.taskItem?.image_url ? (
                            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-amber-500/40 p-1.5 shrink-0 relative group overflow-hidden shadow-2xl">
                                <img
                                    src={bundle.taskItem.image_url}
                                    alt={bundle.taskItem.title}
                                    className="w-full h-full object-cover rounded-xl transition-transform group-hover:scale-110"
                                />
                                <div className="absolute -top-1 -right-1 bg-gradient-to-br from-amber-300 to-orange-600 p-1.5 rounded-lg shadow-lg z-20 animate-pulse">
                                    <Star size={12} className="text-white fill-white" />
                                </div>
                            </div>
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                                <Package size={24} className="text-amber-500" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-black text-white uppercase tracking-tight line-clamp-2 leading-tight drop-shadow-lg">
                                Wow! Lucky You!
                            </h2>
                            <p className="text-[10px] text-amber-200/80 mt-1 leading-tight uppercase font-bold tracking-wider">
                                You have gotten a special bundle!
                            </p>
                        </div>
                    </div>

                    {/* Financial Summary - COMPACT GLASS CARD */}
                    <div className="p-4 mb-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] to-orange-600/[0.08] backdrop-blur-md space-y-4 relative overflow-hidden group w-full">
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />

                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.15em] px-1">
                            <span className="w-1/3 text-left text-white/40">Combo Value</span>
                            <span className="w-1/3 text-center text-white/40">Required</span>
                            <span className="w-1/3 text-right text-white/40">Super Profit</span>
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
                                <span className="text-sm font-black text-amber-500 animate-pulse">${bundle.shortageAmount.toFixed(2)}</span>
                                <span className="text-[7px] font-bold text-amber-400 uppercase tracking-tighter mt-1">Deposit</span>
                            </div>
                            <div className="w-1/3 flex flex-col items-end gap-1 text-success">
                                <div className="flex items-center gap-1">
                                    <Sparkles size={14} className="text-success fill-success animate-pulse" />
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
                    <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-4 w-full">
                        <ShieldCheck size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest leading-relaxed text-left">
                            MANDATORY: Reserved assets secured. Accept this surprise bundle to unlock remaining tasks.
                        </p>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => onAccept(bundle)}
                        className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-[0_15px_35px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group border border-white/10"
                    >
                        Accept Surprise <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
                    </button>

                    <div className="mt-6 flex items-center justify-center gap-2 opacity-40 pb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,1)]" />
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.3em]">Exclusive Lucky Bundle Active</span>
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
