'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    Settings, 
    Globe, 
    DollarSign, 
    Palette, 
    Save, 
    RotateCcw, 
    Plus, 
    X,
    Loader2,
    CheckCircle2
} from 'lucide-react';

interface SiteSetting {
    key: string;
    value: any;
    description: string;
}

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<SiteSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('site_settings')
            .select('*')
            .order('key');
        
        if (!error && data) {
            setSettings(data);
        }
        setLoading(false);
    };

    const handleUpdateValue = (key: string, newValue: any) => {
        setSettings(prev => prev.map(s => 
            s.key === key ? { ...s, value: newValue } : s
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess(false);

        try {
            const updates = settings.map(s => ({
                key: s.key,
                value: s.value
            }));

            // Supabase upsert doesn't work well with multiple rows and unique keys in some configs
            // So we loop or use a custom query. Here we'll do them in parallel.
            const results = await Promise.all(updates.map(update => 
                supabase
                    .from('site_settings')
                    .update({ value: update.value, updated_at: new Date().toISOString() })
                    .eq('key', update.key)
            ));

            const hasError = results.some(r => r.error);
            if (hasError) throw new Error('Some settings failed to save');

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Save error:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const currencySettings = settings.find(s => s.key === 'currency')?.value || {};
    const languages = settings.find(s => s.key === 'languages')?.value || [];
    const themeColors = settings.find(s => s.key === 'theme_colors')?.value || {};

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Settings className="text-primary" />
                        Platform Settings
                    </h1>
                    <p className="text-text-secondary mt-1">Configure global platform behavior and aesthetics</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary px-8 py-3 flex items-center gap-2 group"
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} className="group-hover:scale-110 transition-transform" />}
                    {success ? 'Saved!' : 'Save All Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Currency Section */}
                <div className="glass-card-strong p-8 space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <DollarSign size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Currency Configuration</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-text-secondary opacity-70">Default Currency</label>
                            <input 
                                type="text" 
                                value={currencySettings.default}
                                onChange={(e) => handleUpdateValue('currency', { ...currencySettings, default: e.target.value.toUpperCase() })}
                                className="input-field w-full"
                                placeholder="USDT"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-text-secondary opacity-70">Symbol</label>
                            <input 
                                type="text" 
                                value={currencySettings.symbol}
                                onChange={(e) => handleUpdateValue('currency', { ...currencySettings, symbol: e.target.value })}
                                className="input-field w-full"
                                placeholder="$"
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <label className="text-xs font-black uppercase tracking-widest text-text-secondary opacity-70">Conversion Rate (to 1 USD)</label>
                            <input 
                                type="number" 
                                step="any"
                                value={currencySettings.conversion_rate}
                                onChange={(e) => handleUpdateValue('currency', { ...currencySettings, conversion_rate: parseFloat(e.target.value) })}
                                className="input-field w-full"
                                placeholder="1.0"
                            />
                        </div>
                    </div>
                </div>

                {/* Languages Section */}
                <div className="glass-card-strong p-8 space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <Globe size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Support Languages</h2>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {languages.map((lang: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 group hover:border-primary/50 transition-colors">
                                <span className="text-xs font-medium text-white">{lang}</span>
                                <button 
                                    onClick={() => handleUpdateValue('languages', languages.filter((_: any, i: number) => i !== index))}
                                    className="text-text-secondary hover:text-danger"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        <button 
                            onClick={() => {
                                const newLang = prompt('Enter new language name:');
                                if (newLang) handleUpdateValue('languages', [...languages, newLang]);
                            }}
                            className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 text-primary-light hover:bg-primary/20 transition-all text-xs font-bold"
                        >
                            <Plus size={14} /> Add New
                        </button>
                    </div>
                </div>

                {/* Theme Colors Section */}
                <div className="glass-card-strong p-8 space-y-6 lg:col-span-2">
                    <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary-light">
                            <Palette size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Visual Theme (CSS Variables)</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(themeColors).map(([key, value]) => (
                            <div key={key} className="space-y-3 p-4 bg-black/20 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary flex items-center justify-between">
                                    {key.replace(/_/g, ' ')}
                                    <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: value as string }}></div>
                                </label>
                                <div className="flex gap-2">
                                    <input 
                                        type="color" 
                                        value={value as string}
                                        onChange={(e) => handleUpdateValue('theme_colors', { ...themeColors, [key]: e.target.value })}
                                        className="w-10 h-10 rounded-lg bg-surface border border-white/10 cursor-pointer overflow-hidden"
                                    />
                                    <input 
                                        type="text" 
                                        value={value as string}
                                        onChange={(e) => handleUpdateValue('theme_colors', { ...themeColors, [key]: e.target.value })}
                                        className="input-field flex-1 font-mono text-xs uppercase"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="pt-4 flex items-center gap-2 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <Loader2 size={16} className="text-primary-light animate-pulse" />
                        <p className="text-xs text-text-secondary">Changes to theme colors apply instantly to your current view upon saving.</p>
                    </div>
                </div>
            </div>

            {/* Floating Save Reminder */}
            {settings.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-bounce-slow">
                    {success ? (
                        <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl shadow-emerald-500/20 font-black uppercase text-xs tracking-widest border border-white/20">
                            <CheckCircle2 size={18} /> Settings Applied Successfully
                        </div>
                    ) : (
                        <div className="bg-surface/80 backdrop-blur-xl px-1 py-1 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-1">
                             <button 
                                onClick={fetchSettings}
                                className="px-4 py-2 hover:bg-white/5 rounded-xl text-xs font-bold text-text-secondary transition-all"
                            >
                                Reset
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-primary text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                            >
                                {saving ? 'Saving...' : 'Save Draft'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
