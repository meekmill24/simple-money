'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { 
    ChevronLeft, 
    Copy, 
    CheckCircle, 
    AlertCircle, 
    Loader2, 
    QrCode,
    Smartphone,
    ShieldCheck,
    Flashlight,
    Upload,
    Image as ImageIcon,
    X
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

// Pre-set amounts from reference
const PRESET_AMOUNTS = [30, 50, 100, 300, 500, 1000, 3100, 6200];

export default function DepositPage() {
    const { profile } = useAuth();
    const [amount, setAmount] = useState('30');
    const [customAmount, setCustomAmount] = useState('');
    const [network, setNetwork] = useState<'TRX' | 'BEP20' | 'ERC20' | 'BTC'>('TRX');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofPreview, setProofPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const depositAddress = network === 'BTC' 
        ? '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' // Example BTC Genesis address as placeholder
        : 'TRx9mK2pQbN7cVh3dJwXeGfLkAoYsUP5rI8';

    const finalAmount = customAmount || amount;

    const copyAddress = () => {
        navigator.clipboard.writeText(depositAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProofFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProofPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeFile = () => {
        setProofFile(null);
        setProofPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmitDeposit = async () => {
        if (!profile || !finalAmount) return;
        if (!proofFile) {
            alert('Please upload a proof of payment screenshot.');
            return;
        }
        
        setLoading(true);

        try {
            // 1. Upload proof to storage
            const fileExt = proofFile.name.split('.').pop();
            const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;
            
            setUploading(true);
            const { error: uploadError } = await supabase.storage
                .from('deposit_proofs')
                .upload(filePath, proofFile);
            setUploading(false);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('deposit_proofs')
                .getPublicUrl(filePath);

            // 2. Create transaction
            await supabase.from('transactions').insert({
                user_id: profile.id,
                type: 'deposit',
                amount: parseFloat(finalAmount),
                description: `Deposit via USDT (${network})`,
                status: 'pending',
                proof_url: publicUrl
            });
            
            setSubmitted(true);
        } catch (err: any) {
            console.error('Failed to submit deposit:', err);
            alert(`Failed to submit: ${err.message || 'Please try again.'}`);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-scale-in">
                <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center shadow-[0_0_30px_var(--color-success)]">
                    <CheckCircle size={40} className="text-success" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Deposit submitted</h2>
                    <p className="text-text-secondary text-sm mt-2 max-w-xs mx-auto italic">
                        "Wait for Customer service to confirm you deposit"
                    </p>
                    <p className="text-text-secondary text-[11px] mt-4 max-w-xs mx-auto font-bold uppercase tracking-wider text-warning">
                        Deposits are processed within 4-5 hours depending on the network and blockchain confirmation.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    <Link href="/home" className="px-8 py-3 bg-white/5 text-text-secondary font-black text-xs uppercase tracking-widest rounded-full border border-white/10 hover:bg-white/10 transition-all">
                        Return to Dashboard
                    </Link>
                    <Link href="/record/deposit" className="px-8 py-3 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-full shadow-lg shadow-primary/25 hover:bg-primary-light transition-all">
                        View Deposit Records
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
            
            <div className="flex flex-col items-center justify-center text-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-text-primary dark:text-white uppercase tracking-tight">Add Funds</h2>
                    <p className="text-text-secondary text-xs mt-1 font-bold uppercase tracking-widest">
                        Deposit via {network === 'ERC20' ? 'ETH' : network === 'BTC' ? 'BTC' : 'USDT'} ({network})
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 px-4 py-2 rounded-xl">
                    <img 
                        src={
                            network === 'ERC20' ? "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png" : 
                            network === 'BTC' ? "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png" : 
                            "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png"
                        } 
                        alt={network} 
                        className="w-8 h-8 object-contain" 
                    />
                    <span className="text-sm font-black text-text-primary dark:text-white uppercase tracking-tighter">
                        {network === 'ERC20' ? 'ETH' : network === 'BTC' ? 'BTC' : 'USDT'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* Left Side: Amount & Proof */}
                <div className="space-y-8">
                    <div className="space-y-6">
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                            <ShieldCheck size={16} className="text-primary" />
                            1. Network & Amount
                        </h3>

                        {/* Network Switcher */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-2 bg-black/40 rounded-[24px] border border-white/5">
                            {[
                                { id: 'TRX', label: 'USDT-TRC20', icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png' },
                                { id: 'BEP20', label: 'USDT-BEP20', icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png' },
                                { id: 'ERC20', label: 'ETH', icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png' },
                                { id: 'BTC', label: 'BTC', icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png' }
                            ].map(net => (
                                <button
                                    key={net.id}
                                    onClick={() => setNetwork(net.id as any)}
                                    className={`py-4 rounded-xl flex flex-col items-center gap-1.5 transition-all ${network === net.id 
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02] border border-primary-light/30' 
                                        : 'text-text-secondary hover:bg-white/5 hover:text-white border border-transparent'}`}
                                >
                                    <img src={net.icon} alt="" className="w-5 h-5 object-contain" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{net.label}</span>
                                </button>
                            ))}
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3">
                            {PRESET_AMOUNTS.map((val) => (
                                <button
                                    key={val}
                                    onClick={() => {
                                        setAmount(String(val));
                                        setCustomAmount('');
                                    }}
                                    className={`p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                                        amount === String(val) && !customAmount
                                        ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(157,80,187,0.15)]' 
                                        : 'bg-white/5 border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <div className="relative z-10 flex flex-col items-center">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xl font-black transition-colors ${amount === String(val) && !customAmount ? 'text-white' : 'text-text-secondary group-hover:text-white'}`}>
                                                ${val}
                                            </span>
                                            <img 
                                                src={
                                                    network === 'ERC20' ? "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png" : 
                                                    network === 'BTC' ? "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png" : 
                                                    "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png"
                                                } 
                                                className="w-4 h-4 object-contain opacity-60" 
                                                alt=""
                                            />
                                        </div>
                                        <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">
                                            {network === 'ERC20' ? 'ETH' : network === 'BTC' ? 'BTC' : 'USDT'}
                                        </span>
                                    </div>
                                    {amount === String(val) && !customAmount && (
                                        <div className="absolute top-1 right-1">
                                            <CheckCircle size={14} className="text-primary" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Custom Amount Input */}
                        <div className="relative group">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-black text-xl">$</div>
                            <input
                                type="number"
                                value={customAmount}
                                onChange={(e) => {
                                    setCustomAmount(e.target.value);
                                    setAmount('');
                                }}
                                placeholder={`Enter amount in ${network === 'ERC20' ? 'ETH' : network === 'BTC' ? 'BTC' : 'USDT'}`}
                                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-[20px] py-6 pl-12 pr-6 text-xl font-black text-text-primary dark:text-white placeholder:text-text-secondary/20 focus:border-primary/50 focus:bg-primary/5 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                            <Upload size={16} className="text-success" />
                            2. Upload Payment Proof
                        </h3>

                        {!proofPreview ? (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-white/10 rounded-3xl p-10 flex flex-col items-center gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                            >
                                <div className="p-4 rounded-2xl bg-white/5 text-text-secondary group-hover:text-primary transition-colors">
                                    <ImageIcon size={32} />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-black text-white uppercase tracking-widest">Click to upload screenshot</p>
                                    <p className="text-[10px] text-text-secondary mt-1 uppercase font-bold opacity-60 font-mono tracking-tighter">JPG, PNG, WEBP (MAX 5MB)</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative glass-card p-2 border border-white/10 group animate-scale-in">
                                <img src={proofPreview} alt="Proof" className="w-full h-48 object-cover rounded-2xl" />
                                <button 
                                    onClick={removeFile}
                                    className="absolute top-4 right-4 p-2 bg-danger text-white rounded-xl shadow-xl hover:scale-110 active:scale-95 transition-all"
                                >
                                    <X size={16} />
                                </button>
                                <div className="p-4 flex items-center gap-3">
                                    <CheckCircle size={16} className="text-success" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest truncate">{proofFile?.name}</span>
                                </div>
                            </div>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            className="hidden" 
                        />
                    </div>
                </div>

                {/* Right Side: QR Code & Address */}
                <div className="space-y-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                        <QrCode size={16} className="text-accent" />
                        3. Complete Transfer
                    </h3>

                    <div className="glass-card-glow p-8 flex flex-col items-center gap-6 border border-white/10">
                        <div className="bg-white p-6 rounded-[32px] shadow-2xl relative group">
                            <div className="absolute inset-0 bg-primary/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <QRCodeSVG
                                value={depositAddress}
                                size={200}
                                bgColor="#ffffff"
                                fgColor="#000000"
                                level="H"
                            />
                        </div>

                        <div className="w-full space-y-4">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2">
                                    {network === 'ERC20' ? 'ETH' : network === 'BTC' ? 'BTC' : network} Address
                                </p>
                                <div className="glass-card px-4 py-4 border border-white/20 flex items-center justify-between group overflow-hidden bg-black/40">
                                    <span className="text-sm md:text-base font-black font-mono text-white truncate max-w-[220px] tracking-tight">{depositAddress}</span>
                                    <button 
                                        onClick={copyAddress}
                                        className="text-primary-light hover:text-white transition-all scale-125 ml-2 relative z-10"
                                    >
                                        {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                                    </button>
                                    <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform" />
                                </div>
                            </div>

                            <button
                                onClick={handleSubmitDeposit}
                                disabled={loading || !finalAmount || !proofFile}
                                className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/25 hover:bg-primary-light transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={18} />
                                        <span>{uploading ? 'UPLOADING PROOF...' : 'PROCESSING...'}</span>
                                    </div>
                                ) : (
                                    <>Submit Deposit ${finalAmount} <Smartphone size={16} /></>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl text-[10px] font-bold text-text-secondary leading-relaxed uppercase tracking-wider italic">
                        <AlertCircle size={14} className="shrink-0 text-warning" />
                        Only send {network === 'ERC20' ? 'ETH' : network === 'BTC' ? 'BTC' : 'USDT'} ({network}) to this address. Other assets will be permanently lost and cannot be recovered.
                    </div>
                </div>

            </div>

        </div>
    );
}
