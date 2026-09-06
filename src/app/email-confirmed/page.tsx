'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, DollarSign, ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function EmailConfirmedContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'confirmed' | 'error'>('loading');
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        // Supabase appends #access_token=... or ?code=... after email click.
        // The SDK handles the token automatically via detectSessionInUrl = true.
        // We just need to check if the session is now valid.
        const checkSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (session) {
                setStatus('confirmed');
            } else {
                // May need a brief moment for the SDK to exchange the token
                setTimeout(async () => {
                    const { data: { session: s2 } } = await supabase.auth.getSession();
                    setStatus(s2 ? 'confirmed' : 'error');
                }, 1500);
            }
        };
        checkSession();
    }, []);

    // Auto-redirect countdown after confirmed
    useEffect(() => {
        if (status !== 'confirmed') return;
        if (countdown <= 0) {
            router.replace('/home');
            return;
        }
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [status, countdown, router]);

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Ambient background */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-success/15 blur-[130px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[450px] h-[450px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                        <DollarSign size={20} className="text-white" />
                    </div>
                    <span className="text-xl font-black text-text-primary tracking-tight">Simple<span className="text-primary">Money</span></span>
                </div>

                <div className="glass-card-strong rounded-3xl p-8 text-center space-y-6">

                    {/* Loading state */}
                    {status === 'loading' && (
                        <>
                            <div className="flex justify-center">
                                <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    <Loader2 size={36} className="text-primary animate-spin" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-black text-text-primary">Confirming your email…</h1>
                                <p className="text-sm text-text-secondary">Please wait a moment.</p>
                            </div>
                        </>
                    )}

                    {/* Confirmed state */}
                    {status === 'confirmed' && (
                        <>
                            <div className="flex justify-center">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-success/15 border border-success/30 flex items-center justify-center">
                                        <CheckCircle2 size={48} className="text-success" strokeWidth={1.5} />
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40 border-2 border-surface">
                                        <Sparkles size={14} className="text-white" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-2xl font-black text-text-primary tracking-tight">
                                    Email Verified! 🎉
                                </h1>
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    Your account is confirmed and ready to go. Welcome to <span className="text-primary font-bold">Simple Money</span>!
                                </p>
                            </div>

                            {/* Perks reminder */}
                            <div className="p-4 rounded-2xl bg-success/5 border border-success/15 space-y-2 text-left">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-success flex-shrink-0" />
                                    <span className="text-sm font-semibold text-success">Welcome bonus of $45.00 credited</span>
                                </div>
                                <p className="text-xs text-text-secondary pl-6">Start completing tasks to grow your balance.</p>
                            </div>

                            {/* Progress bar countdown */}
                            <div className="space-y-2">
                                <p className="text-xs text-text-secondary">
                                    Redirecting to dashboard in <span className="font-bold text-primary">{countdown}s</span>…
                                </p>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000"
                                        style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <Link
                                href="/home"
                                id="go-to-dashboard-btn"
                                className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-black text-sm tracking-wide hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/30"
                            >
                                <span>Go to Dashboard Now</span>
                                <ArrowRight size={16} />
                            </Link>
                        </>
                    )}

                    {/* Error state */}
                    {status === 'error' && (
                        <>
                            <div className="flex justify-center">
                                <div className="w-24 h-24 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center">
                                    <ShieldCheck size={36} className="text-danger" strokeWidth={1.5} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-black text-text-primary">Link Expired or Invalid</h1>
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    This verification link may have expired (24h limit) or already been used. Try logging in — if your email is already confirmed, it will work!
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Link
                                    href="/login"
                                    id="try-login-btn"
                                    className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-black text-sm tracking-wide hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/30"
                                >
                                    Try Logging In
                                    <ArrowRight size={16} />
                                </Link>
                                <Link
                                    href="/signup"
                                    id="back-to-signup-btn"
                                    className="text-sm text-text-secondary hover:text-primary transition-colors"
                                >
                                    ← Create a new account
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function EmailConfirmedPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-primary" />
            </div>
        }>
            <EmailConfirmedContent />
        </Suspense>
    );
}
