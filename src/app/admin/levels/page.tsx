'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Level } from '@/lib/types';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export default function AdminLevelsPage() {
    const [levels, setLevels] = useState<Level[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState<Partial<Level>>({});
    const [showCreate, setShowCreate] = useState(false);
    const [newLevel, setNewLevel] = useState({ 
        name: '', 
        price: 0, 
        commission_rate: 0.0045, 
        tasks_per_set: 40, 
        sets_per_day: 3,
        description: '', 
        badge_color: '#06b6d4' 
    });

    const fetchLevels = async () => {
        const { data } = await supabase.from('levels').select('*').order('price', { ascending: true });
        if (data) setLevels(data);
        setLoading(false);
    };

    useEffect(() => { fetchLevels(); }, []);

    const handleCreate = async () => {
        const { error } = await supabase.from('levels').insert(newLevel);
        if (!error) {
            setShowCreate(false);
            setNewLevel({ 
                name: '', 
                price: 0, 
                commission_rate: 0.0045, 
                tasks_per_set: 40, 
                sets_per_day: 3,
                description: '', 
                badge_color: '#06b6d4' 
            });
            fetchLevels();
        }
    };

    const handleSave = async () => {
        if (!editingId) return;
        const { error } = await supabase.from('levels').update(editData).eq('id', editingId);
        if (!error) {
            setEditingId(null);
            fetchLevels();
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this level?')) return;
        await supabase.from('levels').delete().eq('id', id);
        fetchLevels();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <p className="text-text-secondary">Manage user level tiers and commission rates</p>
                <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Add Level
                </button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="glass-card p-6 animate-slide-up">
                    <h3 className="font-bold text-white mb-4">Create New Level</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-text-secondary mb-1">Name</label>
                            <input className="input-field" value={newLevel.name} onChange={(e) => setNewLevel({ ...newLevel, name: e.target.value })} placeholder="Level name" />
                        </div>
                        <div>
                            <label className="block text-xs text-text-secondary mb-1">Price ($)</label>
                            <input type="number" className="input-field" value={newLevel.price} onChange={(e) => setNewLevel({ ...newLevel, price: parseFloat(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-xs text-text-secondary mb-1">Commission Rate</label>
                            <input type="number" step="0.0001" className="input-field" value={newLevel.commission_rate} onChange={(e) => setNewLevel({ ...newLevel, commission_rate: parseFloat(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-xs text-text-secondary mb-1">Tasks per Set</label>
                            <input type="number" className="input-field" value={newLevel.tasks_per_set} onChange={(e) => setNewLevel({ ...newLevel, tasks_per_set: parseInt(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-xs text-text-secondary mb-1">Sets per Day</label>
                            <input type="number" className="input-field" value={newLevel.sets_per_day} onChange={(e) => setNewLevel({ ...newLevel, sets_per_day: parseInt(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-xs text-text-secondary mb-1">Badge Color</label>
                            <div className="flex gap-2">
                                <input type="color" value={newLevel.badge_color} onChange={(e) => setNewLevel({ ...newLevel, badge_color: e.target.value })} className="w-12 h-10 rounded-lg cursor-pointer" />
                                <input className="input-field flex-1" value={newLevel.badge_color} onChange={(e) => setNewLevel({ ...newLevel, badge_color: e.target.value })} />
                            </div>
                        </div>
                        <div className="md:col-span-2 lg:col-span-1">
                            <label className="block text-xs text-text-secondary mb-1">Description</label>
                            <input className="input-field" value={newLevel.description} onChange={(e) => setNewLevel({ ...newLevel, description: e.target.value })} placeholder="Level description" />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={handleCreate} className="btn-primary">Create Level</button>
                        <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                    </div>
                </div>
            )}

            {/* Levels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-8 text-text-secondary">Loading...</div>
                ) : (
                    levels.map((level) => (
                        <div key={level.id} className="glass-card p-5 relative" style={{ borderLeft: `3px solid ${level.badge_color}` }}>
                            {editingId === level.id ? (
                                <div className="space-y-3">
                                    <input className="input-field text-sm" value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" className="input-field text-sm" value={editData.price || 0} onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) })} />
                                        <input type="number" step="0.0001" className="input-field text-sm" value={editData.commission_rate || 0} onChange={(e) => setEditData({ ...editData, commission_rate: parseFloat(e.target.value) })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" className="input-field text-sm" value={editData.tasks_per_set || 0} onChange={(e) => setEditData({ ...editData, tasks_per_set: parseInt(e.target.value) })} placeholder="Tasks/Set" />
                                        <input type="number" className="input-field text-sm" value={editData.sets_per_day || 0} onChange={(e) => setEditData({ ...editData, sets_per_day: parseInt(e.target.value) })} placeholder="Sets/Day" />
                                    </div>
                                    <input className="input-field text-sm" value={editData.description || ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} />
                                    <div className="flex gap-2">
                                        <button onClick={handleSave} className="p-2 rounded-lg bg-success/20 text-success hover:bg-success/30"><Save size={16} /></button>
                                        <button onClick={() => setEditingId(null)} className="p-2 rounded-lg bg-white/5 text-text-secondary hover:bg-white/10"><X size={16} /></button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-bold text-white">{level.name}</h3>
                                            <p className="text-2xl font-bold mt-1" style={{ color: level.badge_color }}>${level.price}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => { setEditingId(level.id); setEditData({ ...level }); }} className="p-2 rounded-lg bg-primary/20 text-primary-light hover:bg-primary/30"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(level.id)} className="p-2 rounded-lg bg-danger/20 text-danger hover:bg-danger/30"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-sm text-text-secondary">
                                        <p>Commission: <span className="text-white">{(level.commission_rate * 100).toFixed(2)}%</span></p>
                                        <p>Tasks/Set: <span className="text-white">{level.tasks_per_set}</span></p>
                                        <p>Sets/Day: <span className="text-white">{level.sets_per_day}</span></p>
                                    </div>
                                    <p className="text-xs text-text-secondary mt-3 line-clamp-2">{level.description}</p>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
