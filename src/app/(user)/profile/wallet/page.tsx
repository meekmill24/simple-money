'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Wallet, Shield, CheckCircle, AlertCircle, Loader2, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function BindWalletPage() {
    const { profile, refreshProfile, signOut } = useAuth();
    const [network, setNetwork] = useState<'USDT-TRC20' | 'USDT-BEP20' | 'ETH' | 'BTC'>('USDT-TRC20');
    const [walletAddress, setWalletAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

    useEffect(() => {
        if (profile?.wallet_address) {
            setWalletAddress(profile.wallet_address);
        }
        if (profile?.wallet_network) {
            setNetwork(profile.wallet_network as any);
        }
    }, [profile]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!walletAddress.trim()) {
            setMessage({ type: 'error', text: `Please enter a valid ${network} wallet address` });
            return;
        }

        // Basic validation
        if (network === 'USDT-TRC20') {
            if (!walletAddress.startsWith('T') || walletAddress.length !== 34) {
                setMessage({ type: 'error', text: 'Invalid TRC20 address format' });
                return;
            }
        } else if (network === 'USDT-BEP20' || network === 'ETH') {
            if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
                setMessage({ type: 'error', text: `Invalid ${network} address format` });
                return;
            }
        } else if (network === 'BTC') {
            const btcRegex = /^(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{11,71})$/;
            if (!btcRegex.test(walletAddress)) {
                setMessage({ type: 'error', text: 'Invalid BTC address format' });
                return;
            }
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    wallet_address: walletAddress,
                    wallet_network: network
                })
                .eq('id', profile?.id);

            if (error) throw error;

            await refreshProfile();
            setMessage({ type: 'success', text: 'Wallet configuration saved successfully' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to bind wallet address' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-[calc(100vh-80px)] -mx-4 -mt-4 px-4 pt-4 pb-8 overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-accent/20 blur-[100px] pointer-events-none" />

            <div className="relative z-10 space-y-6 max-w-md mx-auto">
                <div className="flex items-center justify-between animate-slide-up">
                    <Link href="/profile" className="p-2 -ml-2 hover:bg-text-primary/10 rounded-full transition-colors group">
                        <ArrowLeft className="text-text-primary group-hover:text-primary-light transition-colors" />
                    </Link>
                    <h1 className="text-xl font-bold text-text-primary tracking-wide">Bind Wallet</h1>
                    <div className="w-10" />
                </div>

                <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: '0.05s' }}>
                    {/* Network Selector Scroller */}
                    <div className="flex border-b border-black/5 dark:border-white/5 overflow-x-auto no-scrollbar bg-black/5 dark:bg-white/5">
                        {[
                            { id: 'USDT-TRC20', label: 'USDT-TRC20', icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
                            { id: 'USDT-BEP20', label: 'USDT-BEP20', icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
                            { id: 'ETH', label: 'ETH', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
                            { id: 'BTC', label: 'BTC', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' }
                        ].map((net) => (
                            <button 
                                key={net.id}
                                onClick={() => { setNetwork(net.id as any); setWalletAddress(''); setMessage(null); }}
                                className={`flex-1 min-w-[120px] py-4 px-2 flex flex-col items-center gap-2 transition-all relative ${network === net.id ? 'text-primary-light' : 'text-text-secondary opacity-50 hover:opacity-100'}`}
                            >
                                <img src={net.icon} alt={net.label} className={`w-6 h-6 object-contain ${network === net.id ? 'grayscale-0' : 'grayscale opacity-50'}`} />
                                <span className="text-[10px] font-black uppercase tracking-wider">{net.label}</span>
                                {network === net.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary shadow-[0_0_10px_var(--color-primary)]" />}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        <div className="flex justify-center mb-6">
                            <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-all ${
                                network === 'BTC' ? 'bg-orange-500/20 border-orange-500/30 shadow-orange-500/20' : 
                                network === 'ETH' ? 'bg-indigo-500/20 border-indigo-500/30' :
                                'bg-primary/20 border-primary/30'
                            }`}>
                                <Wallet size={32} className={
                                    network === 'BTC' ? 'text-orange-400' :
                                    network === 'ETH' ? 'text-indigo-400' :
                                    'text-primary-light'
                                } />
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-text-primary text-center mb-2">{network} Address</h2>
                        <p className="text-sm text-text-secondary text-center mb-8">
                            Ensure the network matches exactly for successful transactions.
                        </p>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="relative group">
                                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 block">
                                    {network} Destination Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Shield size={18} className="text-text-secondary group-focus-within:text-primary-light transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={walletAddress}
                                        onChange={(e) => setWalletAddress(e.target.value)}
                                        placeholder="Enter wallet address"
                                        className="w-full bg-text-primary/5 border border-text-primary/10 rounded-xl py-4 pl-12 pr-4 text-text-primary placeholder-text-primary/30 focus:border-primary-light focus:bg-text-primary/10 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            {message && (
                                <div className={`p-4 rounded-xl flex items-start gap-3 animate-fade-in ${message.type === 'success' ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger'}`}>
                                    {message.type === 'success' ? <CheckCircle size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
                                    <p className="text-sm font-medium">{message.text}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`btn-primary w-full py-4 text-lg font-bold flex justify-center items-center shadow-[0_0_20px_rgba(var(--primary),0.4)] ${
                                    network === 'BTC' ? 'from-orange-500 to-orange-600 shadow-orange-500/30' : 
                                    network === 'ETH' ? 'from-indigo-500 to-indigo-600 shadow-indigo-500/30' :
                                    ''
                                }`}
                            >
                                {isLoading ? <Loader2 size={24} className="animate-spin text-text-primary" /> : `Save ${network} Wallet`}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="glass-card p-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <div className="flex gap-3">
                        <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                        <div className="text-xs text-text-secondary leading-relaxed">
                            <p className="font-semibold text-text-primary mb-1">Important Notice</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Ensure the network matches your selection ({network}).</li>
                                <li>Entering an incorrect address will result in permanent loss of funds.</li>
                                <li>Once bound, the address cannot be easily modified for your security. Please contact the Concierge Desk for help.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sign Out Confirmation Modal (Just in case user wants to sign out from here) */}
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
