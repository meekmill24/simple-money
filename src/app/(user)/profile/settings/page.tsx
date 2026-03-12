'use client';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Globe, Moon, Sun, Bell, Lock, Mail, ChevronRight, CheckCircle, AlertCircle, Loader2, X, DollarSign, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
    const { user, profile, refreshProfile, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { t, availableLanguages, setLanguage: updateContextLanguage } = useLanguage();
    const { setCurrency: updateContextCurrency } = useCurrency();
    const [notifications, setNotifications] = useState(true);
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
    
    // Load local settings
    useEffect(() => {
        const savedNotifications = localStorage.getItem('notifications_enabled');
        if (savedNotifications !== null) {
            setNotifications(savedNotifications === 'true');
        }
    }, []);
    
    // Selection states
    const [language, setLanguage] = useState(profile?.language || 'English');
    const [currency, setCurrency] = useState(profile?.currency || 'USD');

    useEffect(() => {
        if (profile) {
            setLanguage(profile.language || 'English');
            setCurrency(profile.currency || 'USD');
        }
    }, [profile]);

    const handleUpdateProfileSetting = async (field: 'language' | 'currency' | 'notifications_enabled', value: any) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', user.id);
            if (error) throw error;
            
            if (field === 'language') {
                setLanguage(value);
                updateContextLanguage(value as any);
            } else if (field === 'currency') {
                setCurrency(value);
                updateContextCurrency(value as any);
            } else if (field === 'notifications_enabled') {
                setNotifications(value);
                localStorage.setItem('notifications_enabled', String(value));
            }
            
            await refreshProfile();
        } catch (error: any) {
            console.error(`Failed to update ${field}:`, error.message);
        }
    };
    
    // Modal states
    const [activeModal, setActiveModal] = useState<'email' | 'password' | 'language' | 'currency' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form states
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (activeModal) {
            setMessage(null);
            setNewEmail('');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    }, [activeModal]);

    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail || !newEmail.includes('@')) {
            setMessage({ type: 'error', text: 'Please enter a valid email address.' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;
            
            setMessage({ type: 'success', text: 'Confirmation link sent to your new email. Please verify to complete the change.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to update email.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            
            setMessage({ type: 'success', text: 'Password successfully updated.' });
            setTimeout(() => setActiveModal(null), 2000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to update password.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="pt-4 space-y-6 pb-20">
            <div className="flex items-center gap-3 animate-slide-up">
                <Link href="/profile" className="p-2 rounded-xl bg-text-primary/5 hover:bg-text-primary/10 transition-colors">
                    <ArrowLeft size={20} className="text-text-primary" />
                </Link>
                <h1 className="text-lg font-bold text-text-primary">{t('profile')}</h1>
            </div>

            <div className="glass-card divide-y divide-black/5 dark:divide-white/5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="p-4 bg-black/[0.02]">
                    <h2 className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">{t('dashboard')}</h2>
                </div>
                
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <Moon size={18} className="text-text-secondary" />
                        <span className="text-sm font-medium text-text-primary">{t('dark_mode')}</span>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className={`w-14 h-7 rounded-full transition-all duration-300 relative ${theme === 'dark' ? 'bg-primary shadow-[0_0_20px_rgba(157,80,187,0.3)]' : 'bg-slate-200'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500 ${theme === 'dark' ? 'translate-x-8 bg-white rotate-0' : 'translate-x-1 bg-slate-600 rotate-[360deg]'}`}>
                            {theme === 'dark' ? <Sun size={10} className="text-primary" /> : <Moon size={10} className="text-white" />}
                        </div>
                    </button>
                </div>

                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <Bell size={18} className="text-text-secondary" />
                        <span className="text-sm font-medium text-text-primary">{t('notifications')}</span>
                    </div>
                    <button
                        onClick={() => handleUpdateProfileSetting('notifications_enabled', !notifications)}
                        className={`w-12 h-6 rounded-full transition-all duration-300 relative ${notifications ? 'bg-success shadow-[0_0_15px_rgba(0,255,136,0.3)]' : 'bg-text-secondary/20'}`}
                    >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${notifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                </div>

                <button 
                    onClick={() => setActiveModal('language')}
                    className="w-full flex items-center justify-between p-4 hover:bg-black/[0.02] transition-colors group text-left"
                >
                    <div className="flex items-center gap-3">
                        <Globe size={18} className="text-text-secondary group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-text-primary">{t('language')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-secondary group-hover:text-primary transition-colors">{language}</span>
                        <ChevronRight size={16} className="text-text-secondary group-hover:translate-x-1 group-hover:text-primary transition-all" />
                    </div>
                </button>

                <button 
                    onClick={() => setActiveModal('currency')}
                    className="w-full flex items-center justify-between p-4 hover:bg-black/[0.02] transition-colors group text-left"
                >
                    <div className="flex items-center gap-3">
                        <DollarSign size={18} className="text-text-secondary group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-text-primary">{t('currency')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-secondary group-hover:text-primary transition-colors">{currency}</span>
                        <ChevronRight size={16} className="text-text-secondary group-hover:translate-x-1 group-hover:text-primary transition-all" />
                    </div>
                </button>

                <div className="p-4 bg-black/[0.02]">
                    <h2 className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">{t('account_security')}</h2>
                </div>

                <button 
                    onClick={() => setShowSignOutConfirm(true)}
                    className="w-full mt-8 p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger font-black uppercase tracking-[0.2em] text-xs hover:bg-danger/20 transition-all flex items-center justify-center gap-3 group"
                >
                    <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                    {t('sign_out')}
                </button>
                <button 
                    onClick={() => setActiveModal('email')}
                    className="w-full flex items-center justify-between p-4 hover:bg-black/[0.02] transition-colors group text-left"
                >
                    <div className="flex items-center gap-3">
                        <Mail size={18} className="text-text-secondary group-hover:text-primary transition-colors" />
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-medium text-text-primary">{t('email_address')}</span>
                            <span className="text-xs text-text-secondary">{user?.email || 'Not verified'}</span>
                        </div>
                    </div>
                    <ChevronRight size={18} className="text-text-secondary group-hover:translate-x-1 group-hover:text-primary transition-all" />
                </button>

                <button 
                    onClick={() => setActiveModal('password')}
                    className="w-full flex items-center justify-between p-4 hover:bg-black/[0.02] transition-colors group text-left"
                >
                    <div className="flex items-center gap-3">
                        <Lock size={18} className="text-text-secondary group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-text-primary">{t('change_password')}</span>
                    </div>
                    <ChevronRight size={18} className="text-text-secondary group-hover:translate-x-1 group-hover:text-primary transition-all" />
                </button>
            </div>

            <div className="text-center py-4 text-xs text-text-secondary/50">
                <p>App Version 1.0.0</p>
            </div>

            {/* Modals */}
            {activeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
                    
                    <div className="relative w-full max-w-sm glass-card p-6 animate-slide-up shadow-2xl shadow-primary/20">
                        <button 
                            onClick={() => setActiveModal(null)}
                            className="absolute top-4 right-4 p-2 rounded-xl bg-black/5 hover:bg-black/10 text-text-primary transition-colors"
                        >
                            <X size={16} />
                        </button>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary-light">
                                {activeModal === 'email' && <Mail size={20} />}
                                {activeModal === 'password' && <Lock size={20} />}
                                {activeModal === 'language' && <Globe size={20} />}
                                {activeModal === 'currency' && <DollarSign size={20} />}
                            </div>
                            <h2 className="text-lg font-bold text-text-primary">
                                {activeModal === 'email' && 'Update Email Address'}
                                {activeModal === 'password' && 'Change Password'}
                                {activeModal === 'language' && 'Select Language'}
                                {activeModal === 'currency' && 'Select Currency'}
                            </h2>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 animate-fade-in ${message.type === 'success' ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger'}`}>
                                {message.type === 'success' ? <CheckCircle size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
                                <p className="text-sm font-medium leading-relaxed">{message.text}</p>
                            </div>
                        )}

                        {activeModal === 'email' && (
                            <form onSubmit={handleUpdateEmail} className="space-y-4">
                                <div>
                                    <label className="text-xs font-black text-text-secondary uppercase tracking-wider mb-2 block">New Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="Enter your new email"
                                        className="w-full bg-text-primary/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-text-primary placeholder-text-secondary focus:border-primary focus:bg-primary/5 transition-all outline-none"
                                    />
                                    <p className="text-[10px] text-text-secondary mt-2 leading-relaxed">
                                        We will send a confirmation link to this new address. Your email won't change until you verify it.
                                    </p>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full py-4 mt-2 btn-primary rounded-xl font-bold flex justify-center items-center shadow-lg shadow-primary/20 enabled:hover:scale-[1.02] transition-all disabled:opacity-50">
                                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Save Changes'}
                                </button>
                            </form>
                        )}

                        {activeModal === 'password' && (
                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div>
                                    <label className="text-xs font-black text-text-secondary uppercase tracking-wider mb-2 block">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        className="w-full bg-text-primary/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-text-primary placeholder-text-secondary focus:border-primary focus:bg-primary/5 transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-text-secondary uppercase tracking-wider mb-2 block">Confirm Password</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your new password"
                                        className="w-full bg-text-primary/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-text-primary placeholder-text-secondary focus:border-primary focus:bg-primary/5 transition-all outline-none"
                                    />
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full py-4 mt-2 btn-primary rounded-xl font-bold flex justify-center items-center shadow-lg shadow-primary/20 enabled:hover:scale-[1.02] transition-all disabled:opacity-50">
                                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Save Changes'}
                                </button>
                            </form>
                        )}

                        {activeModal === 'language' && (
                            <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[300px] pr-1">
                                {availableLanguages.map((opt) => (
                                    <button 
                                        key={opt}
                                        onClick={() => { handleUpdateProfileSetting('language', opt); setActiveModal(null); }}
                                        className={`flex items-center justify-between p-4 rounded-xl transition-all ${language === opt ? 'bg-primary/20 border border-primary/30 text-text-primary' : 'hover:bg-black/5 dark:hover:bg-white/5 text-text-secondary'}`}
                                    >
                                        <span className="font-bold">{opt}</span>
                                        {language === opt && <CheckCircle size={16} className="text-primary-light" />}
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeModal === 'currency' && (
                            <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[300px] pr-1">
                                {[
                                    { code: 'USD', name: 'US Dollar', symbol: '$' },
                                    { code: 'EUR', name: 'Euro', symbol: '€' },
                                    { code: 'GBP', name: 'British Pound', symbol: '£' },
                                    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
                                    { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
                                    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
                                    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
                                    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
                                    { code: 'GHC', name: 'Ghana Cedi', symbol: 'GH₵' },
                                    { code: 'AED', name: 'UAE Dirham', symbol: 'Dh' },
                                    { code: 'BTC', name: 'Bitcoin', symbol: '₿' }
                                ].map((opt) => (
                                    <button 
                                        key={opt.code}
                                        onClick={() => { handleUpdateProfileSetting('currency', opt.code); setActiveModal(null); }}
                                        className={`flex items-center justify-between p-4 rounded-xl transition-all ${currency === opt.code ? 'bg-primary/20 border border-primary/30 text-text-primary' : 'hover:bg-black/5 dark:hover:bg-white/5 text-text-secondary'}`}
                                    >
                                        <div className="flex flex-col items-start text-left">
                                            <span className="font-bold text-sm">{opt.code} - {opt.name}</span>
                                            <span className="text-[10px] opacity-60 uppercase">{opt.symbol} Base</span>
                                        </div>
                                        {currency === opt.code && <CheckCircle size={16} className="text-primary-light" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sign Out Confirmation Modal */}
            {showSignOutConfirm && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 sm:p-0">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setShowSignOutConfirm(false)} />
                    <div className="relative glass-card-strong w-full max-w-sm p-8 animate-scale-up border-danger/20">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center text-danger animate-pulse">
                                <LogOut size={40} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">Confirm Sign Out</h3>
                                <p className="text-sm text-text-secondary font-medium">Are you sure you want to end your session?</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <button 
                                    onClick={() => setShowSignOutConfirm(false)}
                                    className="p-4 rounded-xl bg-text-primary/5 text-text-primary font-bold hover:bg-text-primary/10 transition-colors uppercase text-xs tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => signOut()}
                                    className="p-4 rounded-xl bg-danger text-white font-black hover:bg-danger-hover transition-colors shadow-lg shadow-danger/30 uppercase text-xs tracking-widest"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
