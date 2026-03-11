'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import type { TaskItem } from '@/lib/types';
import { useTheme } from '@/context/ThemeContext';

interface ItemDetailModalProps {
    item: TaskItem | null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (item: TaskItem, costAmount: number) => void;
    balance: number;
    commissionRate: number;
    format: (amount: number) => string;
    isSubmitting?: boolean;
}

export default function ItemDetailModal({
    item,
    isOpen,
    onClose,
    onSubmit,
    balance,
    commissionRate,
    format,
    isSubmitting = false
}: ItemDetailModalProps) {
    const { theme } = useTheme();
    const [success, setSuccess] = useState(false);
    const [displayProductValue, setDisplayProductValue] = useState(0);

    // Reset success state and randomize product value when modal opens
    useEffect(() => {
        if (isOpen) {
            setSuccess(false);
            if (balance > 0) {
                // Match the database logic: 40% to 85%
                const randomFactor = 0.40 + Math.random() * 0.45;
                let value = balance * randomFactor;

                // Safety logic matching SQL:
                if (value < 50 && balance >= 65) {
                    value = balance * 0.8;
                }
                setDisplayProductValue(Number(value.toFixed(2)));
            } else {
                setDisplayProductValue(0);
            }
        }
    }, [isOpen, balance]);

    if (!isOpen || !item) return null;

    const projectedProfit = displayProductValue * commissionRate;

    const handleLocalSubmit = async () => {
        if (isSubmitting || !item) return;
        try {
            await onSubmit(item, displayProductValue);
        } catch (err) {
            console.error("Local Submit Error:", err);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex animate-fade-in items-start justify-center p-4 pt-24 md:pt-36 md:pl-72 shrink-0">
            {/* Backdrop with heavy blur */}
            <div className="absolute inset-0 bg-white/80 dark:bg-black/90 backdrop-blur-sm dark:backdrop-blur-xl" />

            {/* Modal Container */}
            <div
                className="relative w-full max-w-[360px] h-auto max-h-[90vh] glass-card-strong overflow-y-auto animate-bounce-in border border-black/5 dark:border-white/10 shadow-2xl rounded-[32px] z-10 flex flex-col mt-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 blur-[40px] rounded-full pointer-events-none opacity-50 dark:opacity-100" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/20 blur-[40px] rounded-full pointer-events-none opacity-50 dark:opacity-100" />

                <div className="p-8 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-60">Processing task</span>
                    </div>

                    {/* Product Row - COMPACT HORIZONTAL */}
                    <div className="flex items-center gap-5 mb-8">
                        <div className="w-20 h-20 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 p-1.5 shrink-0 relative group overflow-hidden">
                            <img
                                src={item.image_url}
                                alt={item.title}
                                className="w-full h-full object-cover rounded-xl transition-transform group-hover:scale-110"
                                onError={e => {
                                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/200/200`;
                                }}
                            />
                            <div className="absolute -bottom-1 -right-1 bg-success p-1 rounded-lg border-2 border-surface dark:border-[#1a1a1a] shadow-lg">
                                <CheckCircle size={12} className="text-white" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-black text-text-primary dark:text-white uppercase tracking-tight line-clamp-2 leading-tight">
                                {item.title}
                            </h2>
                            <div className="mt-2 flex items-center gap-1.5">
                                <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded border border-primary/20">Active</span>
                                <span className="text-[8px] font-black text-success uppercase tracking-widest bg-success/10 px-2 py-0.5 rounded border border-success/20">Verified</span>
                            </div>
                        </div>
                    </div>

                    {/* Financial Summary - THEME AWARE COMPACT ROW */}
                    <div className={`p-5 mb-8 rounded-2xl border backdrop-blur-md space-y-5 relative overflow-hidden group transition-all duration-500 ${theme === 'dark'
                        ? 'border-white/10 bg-white/[0.03] shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                        : 'border-black/5 bg-black/[0.03] shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
                        }`}>
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />

                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.15em] px-1">
                            <span className="w-1/3 text-left text-text-secondary dark:text-white/40">Product value</span>
                            <span className="w-1/3 text-center text-text-secondary dark:text-white/40">Commission</span>
                            <span className="w-1/3 text-right text-text-secondary dark:text-white/40">Profit</span>
                        </div>
                        <div className="flex justify-between items-end px-1">
                            <div className="w-1/3 flex flex-col items-start gap-1">
                                <span className="text-sm font-black truncate transition-colors text-accent">{format(displayProductValue)}</span>
                                <div className="flex items-center gap-1 opacity-60 dark:opacity-40">
                                    <img src="https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/usdt.png" className="w-2.5 h-2.5" alt="" />
                                    <span className={`text-[7px] font-bold uppercase tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>USDT</span>
                                </div>
                            </div>
                            <div className="w-1/3 flex flex-col items-center">
                                <span className="text-sm font-black text-primary">{(commissionRate * 100).toFixed(2)}%</span>
                                <span className="text-[7px] font-bold text-primary dark:text-primary-light/40 uppercase tracking-tighter mt-1">Rebate rate</span>
                            </div>
                            <div className="w-1/3 flex flex-col items-end gap-1 text-success">
                                <div className="flex items-center gap-1">
                                    <Zap size={14} className="fill-success opacity-80" />
                                    <span className="text-sm font-black">{format(projectedProfit)}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-60 dark:opacity-40">
                                    <img src="https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/usdt.png" className="w-2.5 h-2.5" alt="" />
                                    <span className={`text-[7px] font-bold uppercase tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-text-primary'}`}>USDT</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleLocalSubmit}
                        disabled={isSubmitting}
                        className={`w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-primary/20 hover:bg-primary-light hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                Submit task <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
                            </>
                        )}
                    </button>

                    <div className="mt-6 flex items-center justify-center gap-2 opacity-60 dark:opacity-30 pb-2">
                        <ShieldCheck size={12} className="text-primary" />
                        <span className="text-[8px] font-black text-text-secondary uppercase tracking-[0.3em]">Secured channel</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
