'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !bundle || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl transition-all duration-300 md:pl-72">
            <div
                className="bg-surface dark:bg-[#0f0a15] w-full max-w-sm max-h-[85vh] rounded-[40px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,1)] border border-amber-500/20 animate-fade-in relative flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Visual Top Bar */}
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    <div className="flex flex-col items-center">
                        <div className="w-24 h-24 rounded-[32px] bg-amber-500/20 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(245,158,11,0.3)] border border-amber-500/20">
                            <Zap size={40} className="text-amber-500 fill-amber-500/20 animate-pulse" />
                        </div>

                        <div className="text-center mb-10">
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-3 block">
                                Combined Sequence Activation
                            </span>
                            <h3 className="text-3xl font-black text-white mb-4 italic tracking-tight">Super Optimization!</h3>
                            <p className="text-sm text-text-secondary leading-relaxed opacity-70 px-4">
                                {bundle.description || "You've successfully triggered a high-yield bundle sequence. These are priority matching cycles for institutional merchants."}
                            </p>
                        </div>

                        <div className="w-full space-y-4">
                            <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 flex items-center justify-between shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                                        <TrendingUp size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40">Total Value</span>
                                        <span className="text-xl font-black text-white">{format(bundle.totalAmount)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 rounded-[32px] bg-success/10 border border-success/20 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-success/20 text-success">
                                        <CheckCircle size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-success uppercase tracking-[0.2em] opacity-60">Locked Profit</span>
                                        <span className="text-xl font-black text-success">+{format(bundle.bonusAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fixed Footer */}
                <div className="p-10 pt-4 flex flex-col gap-4">
                    <button
                        onClick={() => onAccept(bundle)}
                        className="w-full py-5 rounded-[28px] bg-gradient-to-br from-amber-500 to-amber-700 text-white font-black uppercase tracking-[0.25em] text-[11px] flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(245,158,11,0.3)] hover:scale-[1.03] active:scale-[0.97] transition-all"
                    >
                        START SEQUENCE <ShieldCheck size={20} />
                    </button>

                    <p className="text-[9px] text-center text-text-secondary font-bold opacity-30 uppercase tracking-[0.2em] mt-4 px-6 leading-relaxed">
                        Funds will remain in the secure clearance node until the full sequence is finalized.
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
