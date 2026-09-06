'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { TaskItem } from '@/lib/types';
import { Plus, Edit2, Trash2, Save, X, Image as ImageIcon, Eye, EyeOff, RefreshCw, Power, ChevronDown, CheckCircle, ArrowUpDown } from 'lucide-react';

const PROFESSIONAL_PHOTO_PATHS = [
    '/items/premium/headphones.png',
    '/items/premium/smartwatch.png',
    '/items/premium/laptop.png',
    '/items/premium/chair.png',
    '/items/premium/dumbbells.png',
    '/items/premium/treadmill.png'
];

const PLACEHOLDER_BASES = PROFESSIONAL_PHOTO_PATHS;

// Product pool is loaded dynamically from /api/product-pool (scans /public/items/premium at runtime)
// This means all 1000+ images are automatically included without manual listing


function ImagePreview({ url, alt, size = 'md' }: { url: string; alt: string; size?: 'sm' | 'md' | 'lg' }) {
    const [errored, setErrored] = useState(false);
    const heights = { sm: 'h-24', md: 'h-36', lg: 'h-48' };

    return (
        <div className={`${heights[size]} w-full bg-black/20 rounded-xl overflow-hidden flex items-center justify-center border border-white/5`}>
            {url && !errored ? (
                <img
                    src={url}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={() => setErrored(true)}
                />
            ) : (
                <div className="flex flex-col items-center gap-2 text-text-secondary">
                    <ImageIcon size={24} />
                    <span className="text-xs">{errored ? 'Image failed to load' : 'No image URL'}</span>
                </div>
            )}
        </div>
    );
}

const emptyForm = { title: '', image_url: '', description: '', category: 'general', level_id: 1, is_active: true };

export default function AdminTasksPage() {
    const [items, setItems] = useState<TaskItem[]>([]);
    const [levels, setLevels] = useState<any[]>([]);
    const [productPool, setProductPool] = useState<{name: string; cat: string; path: string}[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState<Partial<TaskItem>>({});
    const [showCreate, setShowCreate] = useState(false);
    const [newItem, setNewItem] = useState({ ...emptyForm });
    const [previewUrl, setPreviewUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [filterLevel, setFilterLevel] = useState<number | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showLevelDropdown, setShowLevelDropdown] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterSet, setFilterSet] = useState<number | 'all'>('all');
    const [setsToGenerate, setSetsToGenerate] = useState(1);

    const fetchItems = async () => {
        setLoading(true);
        // Supabase has a default limit of 1000. We explicitly request 5000 to see the full catalog.
        const { data, error } = await supabase
            .from('task_items')
            .select('*')
            .order('id', { ascending: true })
            .limit(5000);
            
        if (data) setItems(data);
        if (error) console.error('Error fetching items:', error);
        setLoading(false);
    };

    const fetchLevels = async () => {
        const { data } = await supabase.from('levels').select('id, name, price, tasks_per_set, sets_per_day').order('id', { ascending: true });
        if (data) setLevels(data);
    };

    useEffect(() => { 
        fetchItems(); 
        fetchLevels();
        // Load full product pool from API (reads all 1000+ images from filesystem)
        fetch('/api/product-pool')
            .then(r => r.json())
            .then(data => { if (data.pool) setProductPool(data.pool); })
            .catch(() => console.warn('Could not load product pool from API'));
    }, []);

    const generateFallbackUrl = (seed: string) => {
        const index = Math.abs(seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % PROFESSIONAL_PHOTO_PATHS.length;
        return PROFESSIONAL_PHOTO_PATHS[index];
    };

    const handleCreate = async () => {
        setSaving(true);
        const item = {
            ...newItem,
            image_url: newItem.image_url.trim() || generateFallbackUrl(newItem.title || `item-${Date.now()}`),
        };
        const { error } = await supabase.from('task_items').insert(item);
        setSaving(false);
        if (!error) {
            setShowCreate(false);
            setNewItem({ ...emptyForm });
            setPreviewUrl('');
            fetchItems();
        }
    };

    const handleSave = async () => {
        if (!editingId) return;
        setSaving(true);
        const updated = {
            ...editData,
            image_url: editData.image_url?.trim() || generateFallbackUrl(editData.title || `item-${editingId}`),
        };
        const { error } = await supabase.from('task_items').update(updated).eq('id', editingId);
        setSaving(false);
        if (!error) { setEditingId(null); fetchItems(); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this task item?')) return;
        await supabase.from('task_items').delete().eq('id', id);
        fetchItems();
    };

    const toggleActive = async (id: number, current: boolean) => {
        await supabase.from('task_items').update({ is_active: !current }).eq('id', id);
        fetchItems();
    };

    const handlePurgeAll = async () => {
        if (!confirm('EXTREME WARNING: This will PERMANENTLY DELETE ALL items in the entire catalog. Are you absolutely sure?')) return;
        setLoading(true);
        await supabase.from('task_items').delete().neq('id', -1);
        await fetchItems();
        alert('All items have been purged from the database.');
    };

    const handleBulkGenerateAll = async () => {
        if (levels.length === 0) {
            alert('Levels data not loaded yet.');
            return;
        }

        const generationMap = levels.map(l => ({
            level: l.id,
            count: (l.tasks_per_set || 40) * (l.sets_per_day || 3) // Dynamic from DB: LV1=120, LV2=180, LV3=250, LV4=330, LV5=420
        }));

        const totalToGenerate = generationMap.reduce((acc, curr) => acc + curr.count, 0);

        const clearExisting = confirm(`CRITICAL: This will DELETE ALL current ${items.length} items and generate exactly ${totalToGenerate} premium products across VIP Levels 1-${levels.length}. \n\nClick OK to start fresh.`);
        
        setLoading(true);

        if (clearExisting) {
            // Absolute purge of all task items regardless of level
            const { error: delError } = await supabase.from('task_items').delete().neq('id', -1);
            if (delError) console.error('Purge error:', delError);
        }
        
        let allGeneratedItems: any[] = [];
        let poolIndex = 0;

        for (const config of generationMap) {
            const pool = productPool.length > 0 ? productPool : [{ name: 'Premium Product', cat: 'general', path: '/items/premium/headphones.png' }];
            let levelPool = pool;
            
            // Level-specific filtering
            if (config.level === 1) levelPool = pool.filter(p => p.cat === 'electrical');
            else if (config.level === 2) levelPool = pool.filter(p => p.cat === 'furniture');
            else if (config.level === 3) levelPool = pool.filter(p => p.cat === 'gym' || p.cat === 'fashion');
            else if (config.level === 4) levelPool = pool.filter(p => p.cat === 'automotive' || p.cat === 'electrical');
            
            if (levelPool.length === 0) levelPool = pool;

            for (let i = 0; i < config.count; i++) {
                const product = levelPool[poolIndex % levelPool.length];
                poolIndex++;
                const seqId = (i + 1).toString().padStart(3, '0');

                allGeneratedItems.push({
                    title: `LEVEL ${config.level} - #${seqId} - ${product.name}`,
                    description: `Premium grade ${product.cat} product curated for VIP ${config.level}. High authority and verified quality.`,
                    category: product.cat,
                    level_id: config.level,
                    image_url: product.path,
                    is_active: true
                });
            }
        }

        for (let i = 0; i < allGeneratedItems.length; i += 50) {
            const batch = allGeneratedItems.slice(i, i + 50);
            await supabase.from('task_items').insert(batch);
        }
        
        await fetchItems();
        alert(`Successfully generated ${allGeneratedItems.length} items across VIP Levels!`);
    };

    const handleBulkGenerateCurrentLevel = async () => {
        if (filterLevel === 'all') {
            alert('Please select a specific VIP Level first.');
            return;
        }

        const levelInfo = levels.find(l => l.id === filterLevel);
        const tasksPerSet = levelInfo?.tasks_per_set || 40;
        const count = tasksPerSet * Math.max(1, setsToGenerate);
        
        const pool = productPool.length > 0 ? productPool : [{ name: 'Premium Product', cat: 'general', path: '/items/premium/headphones.png' }];
        let levelPool = pool;
        if (filterLevel === 1) levelPool = pool.filter(p => p.cat === 'electrical');
        else if (filterLevel === 2) levelPool = pool.filter(p => p.cat === 'furniture');
        else if (filterLevel === 3) levelPool = pool.filter(p => p.cat === 'gym' || p.cat === 'fashion');
        else if (filterLevel === 4) levelPool = pool.filter(p => p.cat === 'automotive' || p.cat === 'electrical');
        if (levelPool.length === 0) levelPool = pool;

        const clearExisting = confirm(`Generate ${count} new products for VIP Level ${filterLevel} (${setsToGenerate} set${setsToGenerate > 1 ? 's' : ''} × ${tasksPerSet} tasks)?\n\nClick OK to clear existing items for this level first, or Cancel to just add more.`);
        
        setLoading(true);

        if (clearExisting) {
            await supabase.from('task_items').delete().eq('level_id', filterLevel);
        }

        const newItems = Array.from({ length: count }).map((_, i) => {
            const product = levelPool[Math.floor(Math.random() * levelPool.length)];
            const imgUrl = product.path;
            const seqId = (i + 1).toString().padStart(2, '0');

            return {
                title: `LEVEL ${filterLevel} - #${seqId} - ${product.name}`,
                description: `A premium, high-rated ${product.cat} product specifically curated for VIP Level ${filterLevel}. Featured in top-selling categories globally.`,
                category: product.cat,
                level_id: filterLevel,
                image_url: imgUrl,
                is_active: true
            };
        });

        await supabase.from('task_items').insert(newItems);
        await fetchItems();
        alert(`Successfully generated ${count} items (${setsToGenerate} set${setsToGenerate > 1 ? 's' : ''}) for VIP Level ${filterLevel}!`);
    };

    const filteredItems = items
        .filter(t => {
            const matchesLevel = filterLevel === 'all' || t.level_id === filterLevel;
            const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 `level ${t.level_id}`.includes(searchQuery.toLowerCase());
            return matchesLevel && matchesSearch;
        })
        .sort((a, b) => {
            if (sortOrder === 'asc') return a.title.localeCompare(b.title);
            return b.title.localeCompare(a.title);
        });

    // Apply Set filtering strictly when a Level is selected
    let finalItems = filteredItems;
    if (filterLevel !== 'all' && filterSet !== 'all') {
        const levelInfo = levels.find(l => l.id === filterLevel);
        const perSet = levelInfo?.tasks_per_set || 40;
        const start = (Number(filterSet) - 1) * perSet;
        const end = Number(filterSet) * perSet;
        finalItems = filteredItems.slice(start, end);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end flex-wrap gap-6 bg-black/20 p-6 rounded-2xl border border-white/5 relative group">
                {/* Clipped Background Glow */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl transition-opacity group-hover:opacity-100 opacity-50"></div>
                </div>
                
                <div className="space-y-2 relative z-10">
                    <h1 className="text-xl font-black text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                            <Plus size={18} className="text-primary-light" />
                        </div>
                        Product Management
                    </h1>
                    <p className="text-text-secondary text-xs max-w-md">Manage items shown on the Start page matching grid. Use search to filter by title or category across matching tasks.</p>
                    <div className="flex items-center gap-4 pt-1">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-text-secondary/50 uppercase tracking-widest">Total Catalog</span>
                            <span className="text-sm font-black text-white">{items.length} <span className="text-[10px] text-text-secondary font-normal lowercase">items</span></span>
                        </div>
                        <div className="w-px h-6 bg-white/10"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-primary-light/50 uppercase tracking-widest">Current View</span>
                            <span className="text-sm font-black text-primary-light">{finalItems.length} <span className="text-[10px] text-text-secondary font-normal lowercase">matching</span></span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 items-center flex-wrap relative z-30 w-full lg:w-auto">
                    {/* Search Field */}
                    <div className="relative flex-1 min-w-[200px] lg:min-w-[320px] z-10 flex gap-2">
                        <div className="relative flex-1">
                            <input 
                                type="text"
                                placeholder="Search title, category or level..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-text-secondary/40"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/40" />
                        </div>
                        <button 
                            className="bg-primary hover:bg-primary-light text-white px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-2 shrink-0 group active:scale-95"
                            onClick={fetchItems}
                        >
                            <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
                            Search
                        </button>
                    </div>

                    {/* Custom Premium Dropdown for Level */}
                    <div className="relative min-w-[160px]">
                        <button 
                            type="button"
                            onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                            className={`w-full bg-white/5 border rounded-xl py-2.5 px-4 flex items-center justify-between text-xs font-bold transition-all ${
                                showLevelDropdown ? 'border-primary/50 ring-2 ring-primary/20 bg-black/20' : 'border-white/10 hover:border-white/20'
                            }`}
                        >
                            <span className={filterLevel === 'all' ? 'text-text-secondary' : 'text-primary-light'}>
                                {filterLevel === 'all' ? 'All VIP Levels' : `VIP Level ${filterLevel}`}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-text-secondary transition-transform ${showLevelDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showLevelDropdown && (
                            <div className="absolute z-50 top-full mt-2 w-full rounded-xl bg-[#1a1f2e] border border-white/10 shadow-2xl overflow-hidden animate-scale-in">
                                <div 
                                    onClick={() => { setFilterLevel('all'); setShowLevelDropdown(false); }}
                                    className={`px-4 py-2.5 text-xs cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 flex items-center justify-between ${filterLevel === 'all' ? 'text-primary-light bg-primary/5' : 'text-text-secondary'}`}
                                >
                                    <span>All VIP Levels</span>
                                    {filterLevel === 'all' && <CheckCircle size={12} className="text-primary-light" />}
                                </div>
                                {levels.map(l => (
                                    <div 
                                        key={l.id}
                                        onClick={() => { setFilterLevel(l.id); setShowLevelDropdown(false); }}
                                        className={`px-4 py-2.5 text-xs cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between ${filterLevel === l.id ? 'text-primary-light bg-primary/5 font-bold' : 'text-white'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>Level {l.id}</span>
                                            {filterLevel === l.id && <CheckCircle size={12} className="text-primary-light" />}
                                        </div>
                                        <span className="text-[10px] text-text-secondary font-normal">${l.price}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <button 
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs font-bold text-text-secondary transition-all active:scale-95"
                            title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                        >
                            <ArrowUpDown size={14} className={sortOrder === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                            <span>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
                        </button>
                    </div>

                    {/* Set Filter (Visible when level is selected) — dynamic based on level's sets_per_day */}
                    {filterLevel !== 'all' && (() => {
                        const levelInfo = levels.find(l => l.id === filterLevel);
                        const totalSets = levelInfo?.sets_per_day || 3;
                        const setOptions: (number | 'all')[] = ['all', ...Array.from({ length: totalSets }, (_, i) => i + 1)];
                        return (
                            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1 flex-wrap">
                                {setOptions.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setFilterSet(s as any)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                            filterSet === s
                                                ? 'bg-primary text-white shadow-lg'
                                                : 'text-text-secondary hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {s === 'all' ? 'All Sets' : `Set ${s}`}
                                    </button>
                                ))}
                            </div>
                        );
                    })()}

                    <div className="h-6 w-px bg-white/10 mx-1 hidden lg:block"></div>

                    {/* Generate N Sets control */}
                    {filterLevel !== 'all' && (
                        <div className="flex items-center gap-1 bg-white/5 border border-primary/30 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setSetsToGenerate(v => Math.max(1, v - 1))}
                                className="px-2.5 py-2 text-primary-light hover:bg-primary/10 transition-colors font-black text-sm"
                            >−</button>
                            <input
                                type="number"
                                min={1}
                                max={50}
                                value={setsToGenerate}
                                onChange={e => setSetsToGenerate(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-10 bg-transparent text-center text-xs font-black text-white focus:outline-none"
                            />
                            <button
                                onClick={() => setSetsToGenerate(v => Math.min(50, v + 1))}
                                className="px-2.5 py-2 text-primary-light hover:bg-primary/10 transition-colors font-black text-sm"
                            >+</button>
                            <button
                                onClick={handleBulkGenerateCurrentLevel}
                                className="px-3 py-2 bg-primary/20 text-primary-light hover:bg-primary/30 text-[10px] font-black uppercase tracking-widest transition-all border-l border-primary/20 flex items-center gap-1"
                            >
                                <Plus size={11} /> Add {setsToGenerate} Set{setsToGenerate > 1 ? 's' : ''}
                            </button>
                        </div>
                    )}
                    <button onClick={handlePurgeAll}
                        className="btn-secondary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest py-2.5 border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 size={14} /> Purge All
                    </button>
                    <button onClick={handleBulkGenerateAll}
                        className="btn-secondary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest py-2.5 border-dashed border-white/20 hover:border-white/40 transition-all">
                        <RefreshCw size={14} /> Auto-Gen All
                    </button>
                    <button onClick={() => { setShowCreate(!showCreate); setPreviewUrl(''); setNewItem({ ...emptyForm }); }}
                        className="btn-primary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest py-2.5 px-6 shadow-xl shadow-primary/20 transition-all">
                        <Plus size={16} /> New Product
                    </button>
                </div>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="glass-card p-6 animate-slide-up border border-primary/20">
                    <h3 className="font-bold text-white mb-5 flex items-center gap-2">
                        <Plus size={16} className="text-primary-light" /> Create Task Item
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Left: fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">Title *</label>
                                <input className="input-field" value={newItem.title}
                                    onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                    placeholder="e.g. Industrial Lathe 500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-text-secondary/50 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['electrical', 'furniture', 'gym', 'general'].map(cat => (
                                        <button 
                                            key={cat}
                                            type="button"
                                            onClick={() => setNewItem({ ...newItem, category: cat })}
                                            className={`py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                                                newItem.category === cat 
                                                    ? 'bg-primary/20 border-primary/40 text-primary-light shadow-lg shadow-primary/5' 
                                                    : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
                                            }`}
                                        >
                                            {cat === 'electrical' ? 'Gadgets' : cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-text-secondary/50 uppercase tracking-widest mb-1.5 ml-1">VIP Level Requirement</label>
                                <div className="flex gap-2 flex-wrap">
                                    {levels.map(l => (
                                        <button 
                                            key={l.id}
                                            type="button"
                                            onClick={() => setNewItem({ ...newItem, level_id: l.id })}
                                            className={`p-2.5 min-w-[50px] rounded-xl border flex flex-col items-center transition-all ${
                                                newItem.level_id === l.id 
                                                    ? 'bg-primary/20 border-primary/40 text-primary-light shadow-lg' 
                                                    : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
                                            }`}
                                        >
                                            <span className="text-[10px] font-black uppercase">LV{l.id}</span>
                                            <span className="text-[8px] font-bold opacity-50">${l.price}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">Image URL</label>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input className="input-field flex-1 text-sm" value={newItem.image_url}
                                            onChange={e => { setNewItem({ ...newItem, image_url: e.target.value }); setPreviewUrl(e.target.value); }}
                                            placeholder="https://... (leave blank for auto)" />
                                        <button type="button"
                                            onClick={() => { const url = generateFallbackUrl(newItem.title || `item-${Date.now()}`); setNewItem({ ...newItem, image_url: url }); setPreviewUrl(url); }}
                                            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary transition-colors shrink-0" title="Auto-generate">
                                            <RefreshCw size={15} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-px bg-white/5" />
                                        <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">OR</span>
                                        <div className="flex-1 h-px bg-white/5" />
                                    </div>
                                    <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors text-sm text-text-secondary hover:text-white group">
                                        <ImageIcon size={16} className="group-hover:scale-110 transition-transform" />
                                        Upload from computer
                                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                                setSaving(true);
                                                const fileExt = file.name.split('.').pop();
                                                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                                                // Upload to storage
                                                const { error: uploadErr } = await supabase.storage.from('task_images').upload(fileName, file);
                                                if (uploadErr) throw uploadErr;
                                                // Get public URL
                                                const { data: { publicUrl } } = supabase.storage.from('task_images').getPublicUrl(fileName);
                                                setNewItem({ ...newItem, image_url: publicUrl });
                                                setPreviewUrl(publicUrl);
                                            } catch (err) {
                                                console.error('Upload failed:', err);
                                                alert('Failed to upload image. Make sure you ran the storage SQL migration.');
                                            } finally {
                                                setSaving(false);
                                            }
                                        }} />
                                    </label>
                                    <p className="text-[10px] text-text-secondary mt-1">Leave blank to auto-generate from title</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">Description</label>
                                <textarea className="input-field resize-none h-20 text-sm" value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                    placeholder="Short description of this item" />
                            </div>
                        </div>
                        {/* Right: preview */}
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1.5">Image Preview</label>
                            <ImagePreview url={previewUrl || newItem.image_url} alt={newItem.title} size="lg" />
                            {!newItem.image_url && !previewUrl && newItem.title && (
                                <p className="text-xs text-text-secondary mt-2 text-center">
                                    Auto image will be based on: <span className="text-primary-light font-semibold">{newItem.title}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3 mt-5">
                        <button onClick={handleCreate} disabled={saving || !newItem.title}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/80 disabled:opacity-50 transition-colors">
                            <Save size={14} /> {saving ? 'Creating...' : 'Create Item'}
                        </button>
                        <button onClick={() => setShowCreate(false)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 text-text-secondary font-bold text-sm hover:bg-white/10">
                            <X size={14} /> Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12 relative z-0">
                {loading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-32 space-y-4">
                        <RefreshCw size={40} className="text-primary/20 animate-spin-slow" />
                        <p className="text-text-secondary font-bold text-sm tracking-widest uppercase animate-pulse">Synchronizing Catalog...</p>
                    </div>
                ) : finalItems.length === 0 ? (
                    <div className="col-span-full glass-card p-12 text-center border-dashed border-white/10 bg-white/[0.02]">
                        <ImageIcon size={48} className="mx-auto text-text-secondary/20 mb-4" />
                        <h3 className="text-white font-bold mb-2">No Items in this Set</h3>
                        <p className="text-text-secondary text-xs max-w-sm mx-auto">This set hasn't been populated yet. Adjust your Level/Set filters or use Auto-Gen to create items.</p>
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="mt-4 text-xs text-primary-light font-black uppercase tracking-widest hover:underline">Clear Search</button>
                        )}
                    </div>
                ) : (
                    finalItems.map(item => (
                        <div key={item.id} className={`glass-card overflow-hidden border border-white/5 hover:border-white/10 transition-all ${!item.is_active ? 'opacity-50' : ''}`}>
                            {editingId === item.id ? (
                                /* Edit Mode */
                                <div className="p-4 space-y-3">
                                    <p className="text-xs font-bold text-primary-light mb-2">Editing Task</p>
                                    <div>
                                        <label className="text-[10px] text-text-secondary font-medium block mb-1">Title</label>
                                        <input className="input-field text-sm py-2" value={editData.title || ''}
                                            onChange={e => setEditData({ ...editData, title: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-text-secondary font-medium block mb-1">Image URL</label>
                                        <input className="input-field text-sm py-2 mb-2" value={editData.image_url || ''}
                                            onChange={e => setEditData({ ...editData, image_url: e.target.value })}
                                            placeholder="https://... or leave blank for auto" />
                                        <label className="flex items-center justify-center gap-1 w-full py-1.5 rounded border border-dashed border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors text-[10px] text-text-secondary hover:text-white cursor-pointer group">
                                            <ImageIcon size={12} className="group-hover:scale-110 transition-transform" />
                                            Upload Image File
                                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                    setSaving(true);
                                                    const fileExt = file.name.split('.').pop();
                                                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                                                    const { error: uploadErr } = await supabase.storage.from('task_images').upload(fileName, file);
                                                    if (uploadErr) throw uploadErr;
                                                    const { data: { publicUrl } } = supabase.storage.from('task_images').getPublicUrl(fileName);
                                                    setEditData({ ...editData, image_url: publicUrl });
                                                } catch (err) {
                                                    console.error('Upload failed:', err);
                                                    alert('Failed to upload image.');
                                                } finally {
                                                    setSaving(false);
                                                }
                                            }} />
                                        </label>
                                    </div>
                                    {/* Live preview in edit mode */}
                                    <ImagePreview url={editData.image_url || ''} alt={editData.title || ''} size="sm" />
                                    <div>
                                        <label className="text-[10px] text-text-secondary font-medium block mb-1">Description</label>
                                        <input className="input-field text-sm py-2" value={editData.description || ''}
                                            onChange={e => setEditData({ ...editData, description: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary/50 uppercase tracking-widest mb-2 ml-1">Category</label>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {['electrical', 'furniture', 'gym', 'general'].map(cat => (
                                                <button 
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setEditData({ ...editData, category: cat })}
                                                    className={`py-1.5 px-2 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${
                                                        editData.category === cat 
                                                            ? 'bg-primary/20 border-primary/40 text-primary-light shadow-md' 
                                                            : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
                                                    }`}
                                                >
                                                    {cat === 'electrical' ? 'Gadgets' : cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-text-secondary/50 uppercase tracking-widest mb-2 ml-1">VIP Level Requirement</label>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {levels.map(l => (
                                                <button 
                                                    key={l.id}
                                                    type="button"
                                                    onClick={() => setEditData({ ...editData, level_id: l.id })}
                                                    className={`p-2 min-w-[44px] rounded-lg border flex flex-col items-center transition-all ${
                                                        editData.level_id === l.id 
                                                            ? 'bg-primary/20 border-primary/40 text-primary-light shadow-md' 
                                                            : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
                                                    }`}
                                                >
                                                    <span className="text-[9px] font-black">LV{l.id}</span>
                                                    <span className="text-[7px] font-bold opacity-40">${l.price}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleSave} disabled={saving}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-success/20 text-success hover:bg-success/30 text-xs font-bold disabled:opacity-50">
                                            <Save size={13} /> {saving ? 'Saving...' : 'Save'}
                                        </button>
                                        <button onClick={() => setEditingId(null)}
                                            className="flex items-center justify-center px-3 py-2 rounded-lg bg-white/5 text-text-secondary hover:bg-white/10">
                                            <X size={13} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* View Mode */
                                <div className="flex flex-col h-full">
                                    <div className="h-40 overflow-hidden relative">
                                        <img
                                            src={item.image_url || generateFallbackUrl(item.title)}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                            onError={e => {
                                                (e.target as HTMLImageElement).src = generateFallbackUrl(item.title + item.id);
                                            }}
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                                        <div className="absolute top-2 left-2 flex gap-1">
                                             {/* Internal ID hidden as requested */}
                                        </div>
                                        <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1">
                                             <span className="text-[10px] font-black bg-primary text-white px-3 py-1.5 rounded-lg border border-white/20 shadow-xl tracking-tight">
                                                LEVEL {item.level_id}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="mb-2">
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className="font-bold text-white text-sm leading-tight line-clamp-1">{item.title}</h4>
                                                <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap bg-white/5 px-2 py-0.5 rounded-md">
                                                    {item.category}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-text-secondary line-clamp-2 mt-1 min-h-[2rem]">
                                                {item.description || 'No description provided.'}
                                            </p>
                                        </div>
                                        
                                        <div className="mt-auto pt-3 flex gap-2 border-t border-white/5">
                                            <button onClick={() => { setEditingId(item.id); setEditData({ ...item }); }}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white transition-all text-xs font-bold">
                                                <Edit2 size={13} /> Edit
                                            </button>
                                            <button onClick={() => toggleActive(item.id, item.is_active)}
                                                className={`w-10 flex items-center justify-center rounded-xl transition-all ${item.is_active ? 'bg-success/15 text-success hover:bg-success/25' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
                                                title={item.is_active ? 'Deactivate' : 'Activate'}>
                                                <Power size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)}
                                                className="w-10 flex items-center justify-center rounded-xl bg-danger/10 text-danger hover:bg-danger/20 transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
