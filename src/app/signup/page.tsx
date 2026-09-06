'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, DollarSign, ArrowRight, Loader2, Users, Shield, CheckCircle, ChevronDown, Mail, KeyRound, User } from 'lucide-react';

import { COUNTRIES, Country } from '@/lib/countries';

import AnimatePage from '@/components/AnimatePage';

export default function SignupPage() {
    return (
        <AnimatePage>
            <OldSignupPage />
        </AnimatePage>
    );
}

function OldSignupPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        referralCode: '',
        acceptTerms: true,
    });
    const [signupMode, setSignupMode] = useState<'password' | 'magic'>('password');
    const [countryCode, setCountryCode] = useState(COUNTRIES[0]);
    const [showCountryCodes, setShowCountryCodes] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');

    const filteredCountries = COUNTRIES.filter(c => 
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
        c.dial_code.includes(countrySearch)
    );
    const [magicSent, setMagicSent] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const signupModes: { id: 'password' | 'magic'; label: string; icon: React.ReactNode }[] = [
        { id: 'password', label: 'Password', icon: <KeyRound size={16} /> },
        { id: 'magic', label: 'Magic', icon: <Mail size={16} /> },
    ];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const nextStep = () => {
        setError('');
        if (step === 1) {
            if (!formData.username || !formData.email || (signupMode !== 'magic' && !formData.phone)) {
                setError('Please fill in all fields');
                return;
            }
            if (!formData.email.includes('@')) {
                setError('Please enter a valid email');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (signupMode === 'password') {
                if (!formData.password || !formData.confirmPassword) {
                    setError('Please fill in both password fields');
                    return;
                }
                if (formData.password !== formData.confirmPassword) {
                    setError('Passwords do not match');
                    return;
                }
                if (formData.password.length < 6) {
                    setError('Password must be at least 6 characters');
                    return;
                }
            }
            setStep(3);
        }
    };

    const prevStep = () => {
        setError('');
        setStep(prev => prev - 1);
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.acceptTerms) {
            setError('Please accept the terms and conditions');
            return;
        }

        setLoading(true);

        try {
            // Mandatory Referral Code Validation (via server API to bypass RLS)
            if (!formData.referralCode || formData.referralCode.trim() === '') {
                throw new Error('A valid referral code is mandatory during sign up.');
            }

            const refRes = await fetch('/api/auth/validate-referral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referralCode: formData.referralCode.trim() }),
            });
            const refJson = await refRes.json();
            if (!refRes.ok || !refJson.valid) {
                throw new Error(refJson.error || 'Invalid referral code. Please check and try again.');
            }
            // Use the canonicalized code returned by the server
            const canonicalCode = refJson.code as string;

            const rawPhone = formData.phone.replace(/[\s\-().]/g, '');
            const fullPhone = (signupMode === 'magic' || formData.phone.startsWith('+')) ? formData.phone : `${countryCode.dial_code}${rawPhone}`;

            let signUpOptions: any = {
                data: {
                    username: formData.username,
                    phone: signupMode === 'magic' ? null : fullPhone,
                    referred_by: canonicalCode,
                    is_first_user: formData.email === 'amoafop08@gmail.com',
                },
            };

            if (signupMode === 'magic') {
                // signInWithOtp with options.data = signup
                const { error: magicError } = await supabase.auth.signInWithOtp({
                    email: formData.email,
                    options: {
                        emailRedirectTo: `${window.location.origin}/email-confirmed`,
                        data: signUpOptions.data,
                        shouldCreateUser: true
                    }
                });
                if (magicError) throw magicError;
                setMagicSent(true);
                return;
            }

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    ...signUpOptions,
                    emailRedirectTo: `${window.location.origin}/email-confirmed`,
                },
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                if (data.session) {
                    router.push('/home');
                } else {
                    // Redirect to a proper email-verification confirmation page
                    router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
                }
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Signup failed';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-50%] right-[-20%] w-[600px] h-[600px] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-30%] left-[-20%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md animate-scale-in">
                {/* Progress Bar moved above card */}
                {!magicSent && (
                    <div className="px-8 mb-6">
                        <div className="flex justify-between mb-2">
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${step >= s ? 'bg-primary border-primary text-white' : 'border-white/10 text-text-secondary'
                                        }`}
                                >
                                    {s}
                                </div>
                            ))}
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${((step - 1) / 2) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="glass-card-strong p-8">
                    {/* Logo & Title inside card */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4 shadow-lg shadow-primary/30">
                            <DollarSign className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-light to-accent-light bg-clip-text text-transparent">
                            Simple Money
                        </h1>
                        <p className="text-text-secondary mt-2 text-xs uppercase tracking-widest font-bold opacity-70">
                            Join Simple Money
                        </p>
                    </div>
                    {magicSent ? (
                        <div className="text-center py-8 animate-scale-in">
                            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                                <Mail size={32} className="text-success" />
                            </div>
                            <h2 className="text-xl font-bold text-text-primary">Check your email!</h2>
                            <p className="text-sm text-text-secondary mt-2">
                                We've sent a magic signup link to <span className="text-primary-light">{formData.email}</span>
                            </p>
                            <button
                                onClick={() => { setMagicSent(false); setStep(1); }}
                                className="mt-6 text-primary-light hover:underline text-sm font-bold uppercase tracking-widest"
                            >
                                Send Again
                            </button>
                        </div>
                    ) : (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (step === 3) handleSignup(e);
                                else nextStep();
                            }}
                            className="space-y-4 relative z-10"
                        >
                            {/* Step 1: Profile Info */}
                            {step === 1 && (
                                <div className="space-y-4 animate-slide-right">
                                    <div className="flex gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 mb-6">
                                        {signupModes.map(({ id, label, icon }) => (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() => setSignupMode(id)}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-2 ${signupMode === id ? 'bg-primary text-white shadow-lg shadow-primary/20 transform scale-[1.02]' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                                            >
                                                <div className={`${signupMode === id ? 'text-white' : 'text-primary/50'} transition-colors`}>{icon}</div>
                                                <span>{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-widest">Username</label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            placeholder="Choose a username"
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-widest">Email Address</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Enter your email"
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                    {signupMode !== 'magic' && (
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-widest">Phone Number</label>
                                            <div className="flex flex-nowrap gap-2">
                                                {!formData.phone.startsWith('+') && (
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCountryCodes(!showCountryCodes)}
                                                            className="input-field flex items-center justify-between gap-1 px-2 min-w-[90px] h-full"
                                                        >
                                                            <span className="text-lg">{countryCode.flag}</span>
                                                            <span className="text-sm font-bold text-text-primary">{countryCode.code}</span>
                                                            <ChevronDown size={14} className="text-text-secondary" />
                                                        </button>
                                                        {showCountryCodes && (
                                                            <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-900 border border-white/10 rounded-[24px] shadow-2xl z-50 overflow-hidden animate-slide-up backdrop-blur-xl">
                                                                <div className="p-3 border-b border-white/5">
                                                                    <div className="relative">
                                                                        <input 
                                                                            type="text"
                                                                            placeholder="Search or +Code"
                                                                            value={countrySearch}
                                                                            onChange={(e) => setCountrySearch(e.target.value)}
                                                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-primary/50 transition-all"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="overflow-y-auto max-h-56 custom-scrollbar">
                                                                    {filteredCountries.length > 0 ? (
                                                                        filteredCountries.map((c) => (
                                                                            <button
                                                                                key={c.code}
                                                                                type="button"
                                                                                onClick={() => { setCountryCode(c); setShowCountryCodes(false); setCountrySearch(''); }}
                                                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm text-text-primary transition-colors text-left"
                                                                            >
                                                                                <span className="text-lg">{c.flag}</span>
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-bold text-white text-xs">{c.dial_code}</span>
                                                                                    <span className="text-white/40 text-[10px] uppercase font-black">{c.name}</span>
                                                                                </div>
                                                                                {countryCode.code === c.code && (
                                                                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(157,80,187,1)]" />
                                                                                )}
                                                                            </button>
                                                                        ))
                                                                    ) : (
                                                                        <div className="p-4 text-center text-xs text-white/30 font-bold uppercase">No Match</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    placeholder={formData.phone.startsWith('+') ? "+Manual Entry" : "000 000 000"}
                                                    className="input-field flex-1 min-w-0 font-medium"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Security & Referral */}
                            {step === 2 && (
                                <div className="space-y-4 animate-slide-left">
                                    {signupMode === 'password' && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-widest">Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? 'text' : 'password'}
                                                        name="password"
                                                        value={formData.password}
                                                        onChange={handleChange}
                                                        placeholder="Create a password"
                                                        className="input-field pr-12"
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
                                                    >
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-widest">Confirm Password</label>
                                                <input
                                                    type="password"
                                                    name="confirmPassword"
                                                    value={formData.confirmPassword}
                                                    onChange={handleChange}
                                                    placeholder="Confirm your password"
                                                    className="input-field"
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-widest">Referral Code (Mandatory)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="referralCode"
                                                value={formData.referralCode}
                                                onChange={handleChange}
                                                placeholder="Enter required referral code"
                                                className="input-field pl-12 uppercase"
                                                required
                                            />
                                            <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-light" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Terms & Finish */}
                            {step === 3 && (
                                <div className="space-y-6 animate-slide-up py-4">
                                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center">
                                        <p className="text-sm text-text-primary font-medium">Ready to join!</p>
                                        <p className="text-xs text-text-secondary mt-1">Review your details and accept terms to complete registration.</p>
                                    </div>
                                    <div className="flex items-start gap-4 group cursor-pointer" onClick={() => setFormData(p => ({ ...p, acceptTerms: !p.acceptTerms }))}>
                                        <div className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.acceptTerms ? 'bg-primary border-primary' : 'border-white/10 bg-white/5'}`}>
                                            {formData.acceptTerms && <CheckCircle size={14} className="text-white" />}
                                        </div>
                                        <label htmlFor="terms" className="text-[11px] text-text-secondary leading-relaxed cursor-pointer select-none">
                                            I am at least 18 years old and I agree to the{' '}
                                            <Link href="/agreement" className="text-primary-light hover:text-accent-light transition-colors font-bold decoration-dotted underline underline-offset-4">Terms of Service</Link>
                                            {' '}and{' '}
                                            <Link href="/privacy" className="text-primary-light hover:text-accent-light transition-colors font-bold decoration-dotted underline underline-offset-4">Privacy Policy</Link>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold animate-shake text-center mb-4">
                                    {error}
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex gap-3 pt-2 relative z-20">
                                {step > 1 && (
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="btn-secondary flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] relative z-30"
                                    >
                                        Back
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading || (step === 3 && !formData.acceptTerms)}
                                    className="btn-primary flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] relative z-30"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            {step === 3 ? (signupMode === 'magic' ? 'Send Link' : 'Register') : 'Next'}
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-8 pt-6 border-t border-white/5 text-center flex flex-col items-center gap-3">
                        <p className="text-text-secondary text-xs font-medium">
                            Already have an account?{' '}
                            <Link href="/login" className="text-primary-light hover:text-accent-light transition-colors font-black uppercase tracking-widest ml-1 underline underline-offset-4">
                                Sign In
                            </Link>
                        </p>
                        <button
                            type="button"
                            onClick={() => (window as any).Tawk_API?.maximize()}
                            className="text-text-secondary/50 text-[10px] font-bold hover:text-primary-light transition-colors uppercase tracking-[0.2em]"
                        >
                            Need Help? Contact Customer Service
                        </button>
                    </div>
                </div>

                <p className="text-center text-text-secondary/30 text-[10px] mt-8 font-bold uppercase tracking-[0.3em]">
                    © 2026 Simple Money. Secure Protocol.
                </p>
            </div>
        </div>
    );
}
