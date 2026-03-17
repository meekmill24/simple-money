'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, DollarSign, ArrowRight, Loader2, Mail, User, KeyRound, ChevronDown } from 'lucide-react';
import AnimatePage from '@/components/AnimatePage';

// Common country codes
const COUNTRY_CODES = [
    { code: '+1', flag: '🇺🇸', name: 'US' },
    { code: '+44', flag: '🇬🇧', name: 'UK' },
    { code: '+233', flag: '🇬🇭', name: 'GH' },
    { code: '+234', flag: '🇳🇬', name: 'NG' },
    { code: '+254', flag: '🇰🇪', name: 'KE' },
    { code: '+27', flag: '🇿🇦', name: 'ZA' },
    { code: '+91', flag: '🇮🇳', name: 'IN' },
    { code: '+86', flag: '🇨🇳', name: 'CN' },
    { code: '+60', flag: '🇲🇾', name: 'MY' },
    { code: '+63', flag: '🇵🇭', name: 'PH' },
    { code: '+66', flag: '🇹🇭', name: 'TH' },
    { code: '+62', flag: '🇮🇩', name: 'ID' },
    { code: '+84', flag: '🇻🇳', name: 'VN' },
    { code: '+971', flag: '🇦🇪', name: 'AE' },
    { code: '+966', flag: '🇸🇦', name: 'SA' },
];

type LoginMethod = 'email' | 'id' | 'magic';

export default function LoginPage() {
    const [method, setMethod] = useState<LoginMethod>('email');
    const [identifier, setIdentifier] = useState('');
    const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
    const [showCountryCodes, setShowCountryCodes] = useState(false);
    const [password, setPassword] = useState('');
    const [magicLoading, setMagicLoading] = useState(false);
    const [magicSent, setMagicSent] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    // Forgot password
    const [mode, setMode] = useState<'login' | 'forgot'>('login');
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(true);
    const router = useRouter();

    // Check if user is already logged in and redirect to home
    // Do NOT auto-logout - this was causing the double login issue
    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    // User is already logged in, redirect to home
                    router.replace('/home');
                }
            } catch (err) {
                // Ignore errors - user can proceed to login
            }
        };
        checkSession();
    }, [router]);


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let emailToUse = '';
            const normalizedIdentifier = identifier.trim();

            if (method === 'email') {
                if (normalizedIdentifier.includes('@')) {
                    emailToUse = normalizedIdentifier;
                } else {
                    const lookupRes = await fetch('/api/auth/lookup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ identifier: normalizedIdentifier, type: 'username' })
                    });
                    if (!lookupRes.ok) throw new Error('No account found with this username.');
                    const lookupData = await lookupRes.json();
                    emailToUse = lookupData.email;
                }
            } else if (method === 'id') {
                const fullPhone = normalizedIdentifier.startsWith('+')
                    ? normalizedIdentifier
                    : `${countryCode.code}${normalizedIdentifier.replace(/\D/g, '')}`;
                const lookupRes = await fetch('/api/auth/lookup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: fullPhone, type: 'phone' })
                });
                if (!lookupRes.ok) throw new Error('No account found with this Phone Number.');
                const lookupData = await lookupRes.json();
                emailToUse = lookupData.email;
            }

            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: emailToUse,
                password,
            });

            if (signInError) throw signInError;

            if (signInData?.user) {
                console.log('--- LOGIN SUCCESS ---');
                console.log('Auth User ID:', signInData.user.id);
                console.log('Auth User Email:', signInData.user.email);
                console.log('--- FETCHING PROFILE ---');
                
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, role')
                    .eq('id', signInData.user.id)
                    .maybeSingle();

                console.log('Profile lookup result:', { profileData, profileError });

                if (!profileData) {
                    await supabase.auth.signOut();
                    const errMsg = profileError ? `DB Error: ${profileError.message}` : `No profile found for ID: ${signInData.user.id.substring(0,8)}...`;
                    throw new Error(`Account verification failed. ${errMsg}`);
                }

                const isAdmin = profileData?.role === 'admin';
                router.push(isAdmin ? '/admin' : '/home');
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message.replace('Invalid login credentials', 'Incorrect identifier or password'));
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        const input = identifier.trim();
        if (!input) { setError('Please enter an identifier.'); return; }
        setError('');
        setMagicLoading(true);
        try {
            let emailToUse = input;
            if (!input.includes('@')) {
                const lookupRes = await fetch('/api/auth/lookup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: input, type: 'username' })
                });
                if (!lookupRes.ok) throw new Error('No account found with this username.');
                const lookupData = await lookupRes.json();
                emailToUse = lookupData.email;
            }
            const { error } = await supabase.auth.signInWithOtp({
                email: emailToUse,
                options: { emailRedirectTo: `${window.location.origin}/home` }
            });
            if (error) throw error;
            setMagicSent(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setMagicLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetEmail) { setError('Enter your email.'); return; }
        setError('');
        setResetLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/login`,
            });
            if (error) throw error;
            setResetSent(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setResetLoading(false);
        }
    };

    const methodOptions: { id: LoginMethod; label: string; icon: React.ReactNode }[] = [
        { id: 'email', label: 'Password', icon: <KeyRound size={16} /> },
        { id: 'magic', label: 'Magic', icon: <Mail size={16} /> },
        { id: 'id', label: 'Phone', icon: <User size={16} /> },
    ];

    return (
        <AnimatePage>
            <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden bg-surface">
                {/* Background Effects */}
                <div className="absolute top-[-50%] left-[-20%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-30%] right-[-20%] w-[500px] h-[500px] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

                <div className="w-full max-w-md">
                    <div className="glass-card-strong p-8">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4">
                                <DollarSign className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-white">Simple Money</h1>
                            <p className="text-text-secondary mt-2 text-xs uppercase tracking-widest font-bold opacity-70">
                                {mode === 'login' ? 'Welcome back' : 'Reset password'}
                            </p>
                        </div>
                        {mode === 'login' ? (
                            <>
                                <div className="flex gap-2 mb-8 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                                    {methodOptions.map(({ id, label, icon }) => (
                                        <button
                                            key={id}
                                            onClick={() => { setMethod(id); setError(''); setIdentifier(''); }}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-2 ${method === id ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
                                        >
                                            <div className={`${method === id ? 'text-white' : 'text-primary/50'}`}>{icon}</div>
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                </div>
                                <form onSubmit={handleLogin} className="space-y-5">
                                    {method === 'id' ? (
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-2">Phone</label>
                                            <div className="flex gap-2">
                                                {!identifier.startsWith('+') && (
                                                    <div className="relative">
                                                        <button type="button" onClick={() => setShowCountryCodes(!showCountryCodes)} className="input-field px-2 h-full min-w-[80px] flex items-center justify-between">
                                                            <span>{countryCode.flag} {countryCode.code}</span>
                                                        </button>
                                                        {showCountryCodes && (
                                                            <div className="absolute top-full left-0 mt-1 w-48 bg-surface border border-white/10 rounded-xl shadow-2xl z-50 max-h-48 overflow-auto">
                                                                {COUNTRY_CODES.map(c => (
                                                                    <button key={c.code} type="button" onClick={() => { setCountryCode(c); setShowCountryCodes(false) }} className="w-full p-3 text-left hover:bg-white/5 text-xs text-white">
                                                                        {c.flag} {c.code} {c.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="Phone number" className="input-field flex-1" required />
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-2">Identifier</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <User size={18} className="text-text-secondary" />
                                                </div>
                                                <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="Email or Username" className="input-field pl-12" required />
                                            </div>
                                        </div>
                                    )}
                                    {method !== 'magic' && (
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-sm font-medium text-text-secondary">Password</label>
                                                <button type="button" onClick={() => setMode('forgot')} className="text-xs text-primary-light">Forgot?</button>
                                            </div>
                                            <div className="relative">
                                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input-field pr-12" required />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary">
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {error && <div className="p-3 rounded-xl bg-danger/10 text-danger text-sm">{error}</div>}
                                    <div className="flex items-start gap-3 py-2">
                                        <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-1" id="terms" />
                                        <label htmlFor="terms" className="text-[10px] text-text-secondary">I agree to Terms & Privacy</label>
                                    </div>
                                    <button type="submit" disabled={loading || !acceptTerms} className="btn-primary w-full py-4 uppercase tracking-widest text-xs font-black">
                                        {loading ? <Loader2 className="animate-spin mx-auto" /> : (method === 'magic' ? 'Send Link' : 'Sign In')}
                                    </button>
                                </form>
                                <div className="mt-8 text-center">
                                    <p className="text-text-secondary text-sm">New here? <Link href="/signup" className="text-primary-light font-black uppercase text-xs">Sign Up</Link></p>
                                </div>
                            </>
                        ) : (
                            <form onSubmit={handleForgotPassword} className="space-y-6">
                                <p className="text-sm text-center text-text-secondary">Enter your email to reset password.</p>
                                <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="Email" className="input-field" required />
                                {error && <div className="p-3 bg-danger/10 text-danger text-sm">{error}</div>}
                                {resetSent && <p className="text-success text-xs text-center">Reset link sent!</p>}
                                <button type="submit" className="btn-primary w-full py-4 uppercase text-xs font-black">Send Reset Link</button>
                                <button type="button" onClick={() => setMode('login')} className="w-full text-center text-xs text-text-secondary">Back to Login</button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </AnimatePage>
    );
}
