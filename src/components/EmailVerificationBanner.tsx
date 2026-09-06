'use client';

import { useState } from 'react';
import { Mail, X, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function EmailVerificationBanner() {
    const { user } = useAuth();
    const [dismissed, setDismissed] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendDone, setResendDone] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // Only show if user is logged in AND email is NOT confirmed
    if (!user || user.email_confirmed_at || dismissed) return null;

    const handleResend = async () => {
        if (resendLoading || cooldown > 0 || !user.email) return;
        setResendLoading(true);
        try {
            await supabase.auth.resend({
                type: 'signup',
                email: user.email,
                options: {
                    emailRedirectTo: `${window.location.origin}/email-confirmed`,
                },
            });
            setResendDone(true);
            // 60-second cooldown
            let secs = 60;
            setCooldown(secs);
            const interval = setInterval(() => {
                secs -= 1;
                setCooldown(secs);
                if (secs <= 0) clearInterval(interval);
            }, 1000);
        } catch {
            // silent
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div
            id="email-verification-banner"
            className="relative flex items-center gap-3 px-4 py-3 text-sm"
            style={{
                background: 'linear-gradient(90deg, rgba(var(--color-warning-rgb, 234 179 8), 0.12) 0%, rgba(var(--color-primary-rgb, 99 102 241), 0.10) 100%)',
                borderBottom: '1px solid rgba(234, 179, 8, 0.25)',
            }}
        >
            {/* Icon */}
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-warning/20 border border-warning/30 flex items-center justify-center">
                <Mail size={13} className="text-warning" />
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
                {resendDone ? (
                    <span className="flex items-center gap-1.5 text-success font-semibold text-xs">
                        <CheckCircle2 size={13} />
                        Confirmation email sent! Check your inbox.
                    </span>
                ) : (
                    <span className="text-text-secondary text-xs">
                        <span className="font-bold text-warning">Email not verified.</span>{' '}
                        Please confirm your email to keep full access.{' '}
                        <button
                            id="resend-banner-btn"
                            onClick={handleResend}
                            disabled={resendLoading || cooldown > 0}
                            className="inline-flex items-center gap-1 text-primary font-bold hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed underline underline-offset-2 decoration-dotted"
                        >
                            <RotateCcw size={11} className={resendLoading ? 'animate-spin' : ''} />
                            {cooldown > 0 ? `Resend in ${cooldown}s` : resendLoading ? 'Sending…' : 'Resend email'}
                        </button>
                    </span>
                )}
            </div>

            {/* Dismiss */}
            <button
                id="dismiss-verification-banner-btn"
                onClick={() => setDismissed(true)}
                className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Dismiss"
            >
                <X size={13} />
            </button>
        </div>
    );
}
