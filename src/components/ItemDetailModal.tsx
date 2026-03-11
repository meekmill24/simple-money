'use client';

import React from 'react';
import { X, CheckCircle, Package, Loader2 } from 'lucide-react';

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
    if (!isOpen || !item) return null;

    // Use the logic expected by the backend/page.tsx
    const displayProductValue = Math.floor(balance * 0.8);

    const handleSubmit = async () => {
        if (isSubmitting) return;
        try {
            await onSubmit(item, displayProductValue);
        } catch (err) {
            console.error("Local Submit Error:", err);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
                className="bg-surface dark:bg-surface-light w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-fade-in relative flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary z-10 transition-colors"
                    disabled={isSubmitting}
                >
                    <X size={20} />
                </button>

                <div className="p-6 md:p-8 flex flex-col items-center">
                    <div className="w-full aspect-square rounded-2xl overflow-hidden mb-6 bg-white/5 border border-black/5 dark:border-white/5 shadow-inner">
                        <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-contain p-4"
                        />
                    </div>

                    <div className="flex flex-col items-center text-center w-full">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 bg-primary/10 px-3 py-1 rounded-full">
                            Product optimization
                        </span>
                        <h3 className="text-xl font-black text-text-primary mb-2 line-clamp-1">{item.title}</h3>
                        <p className="text-xs text-text-secondary mb-6 line-clamp-2 px-2 opacity-70">{item.description}</p>

                        <div className="w-full space-y-3 mb-8">
                            <div className="flex justify-between items-center p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Market Value</span>
                                <span className="text-lg font-black text-text-primary">{format(displayProductValue)}</span>
                            </div>
                            <div className="flex justify-between items-center p-4 rounded-2xl bg-success/10 border border-success/20">
                                <span className="text-[10px] font-black text-success uppercase tracking-widest">Est. Profit</span>
                                <span className="text-lg font-black text-success">+{format(displayProductValue * commissionRate)}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} /> Processing...
                                </>
                            ) : (
                                <>
                                    Submit Order <CheckCircle size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
