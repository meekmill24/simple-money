'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
    ChevronLeft, 
    Wallet, 
    AlertCircle, 
    CheckCircle, 
    Loader2, 
    Clock, 
    ShieldCheck, 
    Info,
    ArrowUpFromLine,
    CreditCard,
    Zap
} from 'lucide-react';
import Link from 'next/link';

// Salary structure from the Simple Music table
const SALARY_STRUCTURE: Record<number, { next: number; fourth: number; seventh: number; fifteenth: number; thirty: number; monthly: number }> = {
    1: { next: 1000, fourth: 3000, seventh: 10000, fifteenth: 18000, thirty: 50000, monthly: 82000 },
    2: { next: 2000, fourth: 6000, seventh: 20000, fifteenth: 36000, thirty: 100000, monthly: 164000 },
    3: { next: 3000, fourth: 9000, seventh: 30000, fifteenth: 54000, thirty: 150000, monthly: 246000 },
    4: { next: 4000, fourth: 12000, seventh: 40000, fifteenth: 72000, thirty: 200000, monthly: 328000 },
    5: { next: 10000, fourth: 30000, seventh: 100000, fifteenth: 180000, thirty: 500000, monthly: 820000 },
};

export default function WithdrawPage() {
    const { profile, refreshProfile } = useAuth();
    const [amount, setAmount] = useState('');
    const [walletAddress, setWalletAddress] = useState(profile?.wallet_address || '');
    const [network, setNetwork] = useState<'TRX' | 'BEP20' | 'ERC20' | 'BTC'>('TRX');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [minWithdrawal, setMinWithdrawal] = useState(100);
    const [levelName, setLevelName] = useState('Level 1');
    const [levelIndex, setLevelIndex] = useState(1);

    const balance = profile?.wallet_balance || 0;

    useEffect(() => {
        const fetchLevel = async () => {
            if (!profile?.level_id) return;
            const { data } = await supabase
                .from('levels')
                .select('name, min_withdrawal')
                .eq('id', profile.level_id)
                .single();
            if (data) {
                setLevelName(data.name);
                const lvNum = data.name.match(/\d+/)?.[0] ? parseInt(data.name.match(/\d+/)![0]) : 1;
                setLevelIndex(lvNum);
                const structMin = SALARY_STRUCTURE[lvNum]?.next || 100;
                setMinWithdrawal(data.min_withdrawal || structMin);
            }
        };
        fetchLevel();
    }, [profile?.level_id]);

    const salaryRow = SALARY_STRUCTURE[levelIndex] || SALARY_STRUCTURE[1];
    const quickAmounts = [minWithdrawal, salaryRow.fourth, salaryRow.seventh].filter(v => v <= balance);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const amt = parseFloat(amount);
        if (!amt || amt < minWithdrawal) {
            setError(`Minimum withdrawal for ${levelName} is $${minWithdrawal.toFixed(2)}.`);
            return;
        }
        if (amt > balance) {
            setError('Insufficient wallet balance.');
            return;
        }
        if (!walletAddress.trim()) {
            setError('Please enter your USDT wallet address.');
            return;
        }

        setLoading(true);
        try {
            const { error: updateErr } = await supabase
                .from('profiles')
                .update({ 
                    wallet_balance: balance - amt, 
                    frozen_amount: (profile?.frozen_amount || 0) + amt 
                })
                .eq('id', profile!.id);

            if (updateErr) throw updateErr;

            await supabase.from('transactions').insert({
                user_id: profile!.id,
                type: 'withdrawal',
                amount: amt,
                status: 'pending',
                wallet_address: walletAddress,
                description: `Withdrawal (${network}) to ${walletAddress.substring(0, 8)}... (${levelName})`,
            });

            await refreshProfile();
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Withdrawal failed.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-scale-in">
                <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center shadow-[0_0_30px_var(--color-success)]">
                    <CheckCircle size={40} className="text-success" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-text-primary dark:text-white uppercase tracking-tight">Withdrawal request submitted</h2>
                    <p className="text-text-secondary text-sm mt-2 max-w-xs mx-auto">
                        Your request for <span className="text-text-primary dark:text-white font-bold">${amount}</span> is under review. <br />
                        <span className="text-warning font-bold mt-2 inline-block italic">Under withdrawal usually take up to 24 hours to be processed.</span>
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    <Link href="/home" className="px-8 py-3 bg-white/5 text-text-secondary font-black text-xs uppercase tracking-widest rounded-full border border-white/10 hover:bg-white/10 transition-all">
                        Return to Dashboard
                    </Link>
                    <Link href="/record/withdraw" className="px-8 py-3 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-full shadow-lg shadow-primary/25 hover:bg-primary-light transition-all">
                        View Withdrawal Records
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
            
            <div className="flex flex-col items-center justify-center mb-6 text-center">
                <h2 className="text-2xl font-black text-text-primary dark:text-white uppercase tracking-tight">Withdrawal</h2>
            </div>

            {/* Available Funds Banner */}
            <div className="glass-card-glow p-8 flex flex-col items-center justify-center relative overflow-hidden group border-primary/20">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-50" />
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl opacity-50" />
                
                {/* Status Badge in Banner */}
                <div className="mb-4 px-3 py-1 rounded-full bg-success/20 border border-success/30 flex items-center gap-2">
                    <ShieldCheck size={12} className="text-success" />
                    <span className="text-[10px] font-black text-text-primary dark:text-white uppercase tracking-widest">{levelName} Verified Status</span>
                </div>

                <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em] mb-3 opacity-60">Available Funds for Payout</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-text-primary dark:text-white leading-none">${balance.toFixed(2)}</span>
                    <span className="text-xs font-black text-success uppercase tracking-widest">
                        {network === 'ERC20' ? 'ETH' : network === 'BTC' ? 'BTC' : 'USDT'}
                    </span>
                </div>
                
                <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                    <Zap size={12} className="text-warning animate-pulse" />
                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-[0.2em]">Escrow Control Active</span>
                </div>
            </div>

            <hr className="border-t border-white/5 my-4" />

            <div className="flex flex-col items-center space-y-10">
                {/* Withdrawal Form: Positioned Center */}
                <div className="w-full max-w-xl space-y-6">
                    <div className="text-center space-y-2">
                        <h3 className="text-sm font-black text-text-primary dark:text-white uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                            <CreditCard size={18} className="text-accent" />
                            Secure Claim Portal
                        </h3>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-60">Instant settlement to verified assets</p>
                    </div>

                    <form onSubmit={handleSubmit} className="glass-card-glow p-10 space-y-8 border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        
                        {/* Amount Field */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] block">Withdraw Amount</label>
                            <div className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-black text-2xl">$</div>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-[24px] py-6 pl-14 pr-6 text-3xl font-black text-text-primary dark:text-white placeholder:text-text-secondary/10 focus:border-primary/50 focus:bg-primary/5 transition-all outline-none"
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-text-secondary text-xs font-black uppercase tracking-widest opacity-40">
                                    {network === 'ERC20' ? 'ETH' : network === 'BTC' ? 'BTC' : 'USDT'}
                                </div>
                            </div>
                            
                            {/* Quick Chips */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                {quickAmounts.map(val => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setAmount(String(val))}
                                        className="px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-[11px] font-black text-white uppercase flex items-center gap-2 hover:bg-primary/20 hover:border-primary/30 transition-all shadow-sm"
                                    >
                                        <span>${val.toLocaleString()}</span>
                                        <img 
                                            src={
                                                network === 'ERC20' ? "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png" : 
                                                network === 'BTC' ? "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png" : 
                                                "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png"
                                            } 
                                            className="w-3.5 h-3.5 object-contain opacity-70" 
                                            alt=""
                                        />
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setAmount(String(balance))}
                                    className="px-5 py-3 rounded-xl bg-primary/10 border border-primary/20 text-[11px] font-black text-primary-light uppercase tracking-tighter hover:bg-primary/20 transition-all"
                                >
                                    MAX ALL
                                </button>
                            </div>
                        </div>

                        {/* Network Switcher */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] block">Target Network</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-2 bg-black/40 rounded-[24px] border border-white/5">
                                {[
                                    { id: 'TRX', label: 'USDT-TRC20', icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png' },
                                    { id: 'BEP20', label: 'USDT-BEP20', icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png' },
                                    { id: 'ERC20', label: 'ETH', icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png' },
                                    { id: 'BTC', label: 'BTC', icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png' }
                                ].map(net => (
                                    <button
                                        key={net.id}
                                        type="button"
                                        onClick={() => setNetwork(net.id as any)}
                                        className={`py-4 rounded-xl flex flex-col items-center gap-1.5 transition-all ${network === net.id 
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02] border border-primary-light/30' 
                                            : 'text-text-secondary hover:bg-white/5 hover:text-white border border-transparent'}`}
                                    >
                                        <img src={net.icon} alt="" className="w-5 h-5 object-contain" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{net.id === 'ERC20' ? 'ETH' : net.id === 'BTC' ? 'BTC' : net.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Wallet Field */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] block">
                                {network === 'ERC20' ? 'Ethereum (ETH)' : network === 'BEP20' ? 'USDT BEP-20' : network === 'BTC' ? 'Bitcoin (BTC)' : 'USDT TRC-20'} Address
                            </label>
                            <div className="relative group">
                                <Wallet size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-primary-light transition-all group-focus-within:scale-110" />
                                <input
                                    type="text"
                                    value={walletAddress}
                                    onChange={(e) => setWalletAddress(e.target.value)}
                                    placeholder={`Enter ${network === 'ERC20' ? 'ETH' : network === 'BTC' ? 'BTC' : network} Wallet Address`}
                                    className="w-full bg-black/40 border border-white/10 rounded-[24px] py-6 pl-14 pr-6 text-base md:text-lg font-black font-mono text-white placeholder:text-text-secondary/10 focus:border-primary/50 focus:bg-primary/5 transition-all outline-none tracking-tight"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-5 bg-danger/10 border border-danger/20 rounded-2xl text-xs font-bold text-danger flex gap-4 animate-shake">
                                <AlertCircle size={16} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <button
                                type="submit"
                                disabled={loading || balance < minWithdrawal}
                                className="w-full bg-danger text-white py-6 rounded-[24px] font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-danger/30 hover:bg-rose-500 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:translate-y-0"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                    <>Initiate Payout <ArrowUpFromLine size={18} /></>
                                )}
                            </button>

                            <div className="flex items-center justify-center gap-3 text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-40 pt-2">
                                <ShieldCheck size={14} className="text-success" />
                                Guaranteed Escrow Settlement
                            </div>
                        </div>
                    </form>
                </div>

                {/* Salary Schedule: Premium Grid */}
                <div className="w-full space-y-8">
                    <div className="text-center space-y-2">
                        <h3 className="text-sm font-black text-text-primary dark:text-white uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                            <Zap size={18} className="text-primary-light" />
                            Performance Salary Hub
                        </h3>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-60">Verified benefit structure for {levelName}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[
                            { label: 'Next Day', value: salaryRow.next, icon: Clock },
                            { label: '4th Day', value: salaryRow.fourth, icon: ShieldCheck },
                            { label: '7th Day', value: salaryRow.seventh, icon: Zap },
                            { label: '15th Day', value: salaryRow.fifteenth, icon: CreditCard },
                            { label: '30 Days', value: salaryRow.thirty, icon: Wallet },
                            { label: 'Monthly', value: salaryRow.monthly, icon: Info },
                        ].map((row, idx) => (
                            <div key={idx} className="glass-card p-6 flex flex-col items-center text-center space-y-3 border-white/5 hover:border-primary/20 hover:bg-white/5 transition-all group">
                                <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-primary/10 transition-colors">
                                    <row.icon size={20} className="text-text-secondary group-hover:text-primary-light transition-colors" />
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block mb-1">{row.label}</span>
                                    <p className="text-lg font-black text-text-primary dark:text-white font-mono tracking-tighter">${row.value.toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-center gap-4 p-6 bg-white/[0.02] rounded-[30px] border border-white/5 max-w-2xl mx-auto">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Info size={20} className="text-primary-light" />
                        </div>
                        <p className="text-[10px] font-bold text-text-secondary leading-relaxed uppercase tracking-wider italic">
                            Withdrawals are processed based on your current level tier and verified task sets. 
                            Our automatic review protocol usually takes up to 24 business hours to settle assets.
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
}
