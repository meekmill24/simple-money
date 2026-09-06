'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, CheckCircle2, ArrowRight, RotateCcw, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const email = searchParams.get('email') || '';
    const [countdown, setCountdown] = useState(60);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    // Auto-redirect countdown
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    // Resend cooldown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const handleResend = async () => {
        if (!email || resendCooldown > 0) return;
        setResendLoading(true);
        setResendMessage('');
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
            });
            if (error) throw error;
            setResendMessage('Verification email sent! Check your inbox.');
            setResendCooldown(60);
        } catch (err: unknown) {
            setResendMessage(err instanceof Error ? err.message : 'Failed to resend. Try again later.');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Ambient background blobs */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/15 blur-[130px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[450px] h-[450px] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />
            <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-success/5 blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                        <DollarSign size={20} className="text-white" />
                    </div>
                    <span className="text-xl font-black text-text-primary tracking-tight">Simple<span className="text-primary">Money</span></span>
                </div>

                {/* Card */}
                <div className="glass-card-strong rounded-3xl p-8 text-center space-y-6">

                    {/* Animated mail icon with glow */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse-slow">
                                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                                    <Mail size={32} className="text-primary" strokeWidth={1.5} />
                                </div>
                            </div>
                            {/* Success badge */}
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-success flex items-center justify-center shadow-lg shadow-success/40 border-2 border-surface">
                                <CheckCircle2 size={16} className="text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="space-y-2">
                        <h1 className="text-2xl font-black text-text-primary tracking-tight">
                            Verify Your Email
                        </h1>
                        <p className="text-sm text-text-secondary leading-relaxed">
                            We've sent a confirmation link to
                        </p>
                        {email && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                                <Mail size={14} className="text-primary" />
                                <span className="text-sm font-bold text-primary break-all">{email}</span>
                            </div>
                        )}
                    </div>

                    {/* Steps */}
                    <div className="space-y-3 text-left">
                        {[
                            { step: '1', text: 'Open your email inbox' },
                            { step: '2', text: 'Find the email from Simple Money' },
                            { step: '3', text: 'Click "Confirm your email" link' },
                            { step: '4', text: 'You\'ll be redirected & can log in!' },
                        ].map(({ step, text }) => (
                            <div key={step} className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-black text-primary">{step}</span>
                                </div>
                                <span className="text-sm text-text-secondary">{text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/5" />

                    {/* Go to Login button */}
                    <Link
                        href="/login"
                        id="go-to-login-btn"
                        className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-black text-sm tracking-wide hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/30"
                    >
                        <span>Go to Login</span>
                        <ArrowRight size={16} />
                    </Link>

                    {/* Resend */}
                    <div className="space-y-2">
                        {resendMessage && (
                            <p className={`text-xs font-medium px-3 py-2 rounded-xl ${resendMessage.includes('sent') ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
                                {resendMessage}
                            </p>
                        )}
                        <button
                            id="resend-email-btn"
                            onClick={handleResend}
                            disabled={resendLoading || resendCooldown > 0}
                            className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-2xl border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {resendLoading ? (
                                <Loader2 size={15} className="animate-spin" />
                            ) : (
                                <RotateCcw size={15} />
                            )}
                            {resendCooldown > 0
                                ? `Resend in ${resendCooldown}s`
                                : resendLoading
                                    ? 'Sending...'
                                    : 'Resend Confirmation Email'}
                        </button>
                    </div>

                    {/* Info note */}
                    <p className="text-xs text-text-secondary opacity-60">
                        Didn't receive anything? Check your spam/junk folder. The link expires in 24 hours.
                    </p>
                </div>

                {/* Back to signup */}
                <div className="text-center mt-6">
                    <Link href="/signup" className="text-xs text-text-secondary hover:text-primary transition-colors">
                        ← Back to Sign Up
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-primary" />
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
