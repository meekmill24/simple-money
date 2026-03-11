'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Loader2 } from 'lucide-react';

interface ItemDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: {
        title: string;
        image_url: string;
        description: string;
        category: string;
    } | null;
    onSubmit: (item: any, displayValue: number) => Promise<void>;
    balance: number;
    commissionRate: number;
    format: (val: number) => string;
    isSubmitting: boolean;
}

export default function ItemDetailModal({
    isOpen,
    onClose,
    item,
    onSubmit,
    balance,
    commissionRate,
    format,
    isSubmitting
}: ItemDetailModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !item || !mounted) return null;

    // Use the logic expected by the backend
    const displayProductValue = Math.floor(balance * 0.8);

    const handleSubmit = async () => {
        if (isSubmitting) return;
        try {
            await onSubmit(item, displayProductValue);
        } catch (err) {
            console.error("Local Submit Error:", err);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300 md:pl-72"
            onClick={onClose}
        >
            <div
                className="bg-surface dark:bg-[#120a1d] w-full max-w-sm max-h-[85vh] rounded-[40px] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/5 animate-fade-in relative flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Area */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-60">Verification Stage</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                        disabled={isSubmitting}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="w-full aspect-square rounded-3xl overflow-hidden mb-8 bg-white/5 border border-white/5 shadow-inner">
                        <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-contain p-6"
                        />
                    </div>

                    <div className="flex flex-col items-center text-center w-full">
                        <h3 className="text-xl font-black text-text-primary mb-2 leading-tight">{item.title}</h3>
                        <p className="text-xs text-text-secondary mb-8 leading-relaxed opacity-70 italic px-4">
                            Matching this high-frequency product sequence for global merchant optimization.
                        </p>

                        <div className="w-full space-y-4">
                            <div className="flex justify-between items-center p-5 rounded-[24px] bg-white/5 border border-white/5">
                                <div className="flex flex-col items-start text-left">
                                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-40">Product Value</span>
                                    <span className="text-lg font-black text-text-primary">{format(displayProductValue)}</span>
                                </div>
                                <div className="h-8 w-px bg-white/10 mx-2" />
                                <div className="flex flex-col items-end text-right">
                                    <span className="text-[10px] font-black text-success uppercase tracking-widest opacity-60">Reward</span>
                                    <span className="text-lg font-black text-success">+{format(displayProductValue * commissionRate)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fixed Footer Button */}
                <div className="p-8 pt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-5 rounded-[24px] bg-gradient-to-r from-primary to-accent text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin" size={20} /> Optimizing...
                            </>
                        ) : (
                            <>
                                SUBMIT TASK <CheckCircle size={20} />
                            </>
                        )}
                    </button>
                    <p className="text-[9px] text-center text-text-secondary font-bold opacity-30 mt-4 uppercase tracking-widest">
                        Secured End-to-End Encryption Enabled
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
