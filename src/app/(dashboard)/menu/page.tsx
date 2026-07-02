'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Save, X, ChefHat, ImagePlus, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Tab = 'breakfast' | 'mains' | 'snacks' | 'drinks' | 'sides';
const TABS: { id: Tab; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'mains',     label: 'Main Dishes' },
  { id: 'snacks',    label: 'Sharing Bites' },
  { id: 'drinks',    label: 'Drinks & Fruits' },
  { id: 'sides',     label: 'Sides' },
];

type FeaturedDish = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  badge: string;
  badge_color: string;
  sort_order: number;
  is_active: boolean;
};

const DISH_EMPTY: Omit<FeaturedDish, 'id'> = {
  name: '', description: '', price: 0, image_url: '',
  badge: '', badge_color: '#D97706', sort_order: 0, is_active: true,
};

type MenuItem = {
  id: string;
  tab: Tab;
  category: string;
  name: string;
  description: string;
  price: number;
  tag: 'popular' | 'special' | null;
  active: boolean;
  position: number;
  image_url: string | null;
};

const EMPTY: Omit<MenuItem, 'id'> = {
  tab: 'breakfast', category: '', name: '', description: '', price: 0, tag: null, active: true, position: 0, image_url: null,
};

export default function MenuPage() {
  const [items, setItems]       = useState<MenuItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<Tab | 'featured'>('breakfast');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<MenuItem | null>(null);
  const [form, setForm]         = useState<Omit<MenuItem, 'id'>>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [pendingUploadItem, setPendingUploadItem] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // ── Featured Dishes state ──────────────────────────────────────────────────
  const [dishes, setDishes]           = useState<FeaturedDish[]>([]);
  const [dishesLoading, setDishesLoading] = useState(false);
  const [dishForm, setDishForm]       = useState<Omit<FeaturedDish, 'id'>>(DISH_EMPTY);
  const [editingDish, setEditingDish] = useState<FeaturedDish | null>(null);
  const [showDishForm, setShowDishForm] = useState(false);
  const [dishSaving, setDishSaving]   = useState(false);
  const [dishError, setDishError]     = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const uploadRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadDishes = () => {
    setDishesLoading(true);
    fetch('/api/featured-dishes')
      .then(r => r.json())
      .then(d => setDishes(d.dishes ?? []))
      .finally(() => setDishesLoading(false));
  };

  const handleDishImageUpload = async (dish: FeaturedDish, file: File) => {
    if (file.size > 10 * 1024 * 1024) { alert('Image too large — max 10 MB'); return; }
    setUploadingId(dish.id);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Please log in'); return; }
      const ext = file.name.split('.').pop();
      const path = `${user.id}/dining/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('property-photos').upload(path, file, { upsert: true });
      if (upErr) { alert(`Upload failed: ${upErr.message}`); return; }
      const { data: { publicUrl } } = supabase.storage.from('property-photos').getPublicUrl(path);
      const res = await fetch(`/api/featured-dishes/${dish.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: publicUrl }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDishes(prev => prev.map(d => d.id === dish.id ? updated.dish : d));
      }
    } finally {
      setUploadingId(null);
    }
  };

  const handleDishSave = async () => {
    if (!dishForm.name.trim()) { setDishError('Dish name is required.'); return; }
    setDishSaving(true); setDishError('');
    try {
      const url    = editingDish ? `/api/featured-dishes/${editingDish.id}` : '/api/featured-dishes';
      const method = editingDish ? 'PATCH' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dishForm) });
      const data   = await res.json();
      if (!res.ok) { setDishError(data.error ?? 'Failed to save.'); return; }
      loadDishes();
      setShowDishForm(false); setEditingDish(null); setDishForm(DISH_EMPTY);
    } finally {
      setDishSaving(false);
    }
  };

  const handleDishDelete = async (id: string) => {
    if (!confirm('Delete this featured dish?')) return;
    await fetch(`/api/featured-dishes/${id}`, { method: 'DELETE' });
    setDishes(prev => prev.filter(d => d.id !== id));
  };

  const handleDishToggle = async (dish: FeaturedDish) => {
    const res  = await fetch(`/api/featured-dishes/${dish.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !dish.is_active }) });
    const data = await res.json();
    if (res.ok) setDishes(prev => prev.map(d => d.id === dish.id ? data.dish : d));
  };

  const handleItemImageUpload = async (item: MenuItem, file: File) => {
    if (file.size > 10 * 1024 * 1024) { alert('Image too large — max 10 MB'); return; }
    setUploadingItemId(item.id);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Please log in'); return; }
      const ext  = file.name.split('.').pop();
      const path = `${user.id}/menu/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('property-photos').upload(path, file, { upsert: true });
      if (upErr) { alert(`Upload failed: ${upErr.message}`); return; }
      const { data: { publicUrl } } = supabase.storage.from('property-photos').getPublicUrl(path);
      const res = await fetch(`/api/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: publicUrl }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems(prev => prev.map(i => i.id === item.id ? updated.item : i));
      }
    } finally {
      setUploadingItemId(null);
      setPendingUploadItem(null);
    }
  };

  const load = () => {
    setLoading(true);
    fetch('/api/menu')
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); loadDishes(); }, []);

  const visibleItems = activeTab !== 'featured' ? items.filter(i => i.tab === (activeTab as Tab)) : [];

  const openNew = () => {
    if (activeTab === 'featured') {
      setEditingDish(null);
      setDishForm(DISH_EMPTY);
      setShowDishForm(true);
      setDishError('');
      return;
    }
    setEditing(null);
    setForm({ ...EMPTY, tab: activeTab as Tab });
    setShowForm(true);
    setError('');
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({ tab: item.tab, category: item.category, name: item.name, description: item.description, price: item.price, tag: item.tag, active: item.active, position: item.position, image_url: item.image_url });
    setShowForm(true);
    setError('');
  };

  const closeForm = () => { setShowForm(false); setEditing(null); setError(''); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Item name is required.'); return; }
    setSaving(true); setError('');
    try {
      const url    = editing ? `/api/menu/${editing.id}` : '/api/menu';
      const method = editing ? 'PATCH' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data   = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to save.'); return; }
      load();
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    setDeleting(id);
    await fetch(`/api/menu/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.id !== id));
    setDeleting(null);
  };

  const handleToggleActive = async (item: MenuItem) => {
    const res  = await fetch(`/api/menu/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !item.active }) });
    const data = await res.json();
    if (res.ok) setItems(prev => prev.map(i => i.id === item.id ? data.item : i));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-primary, #1e293b)' }}>
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Menu Management</h1>
              <p className="text-xs text-gray-500">{items.length} menu items · {dishes.length} featured dishes</p>
            </div>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'var(--brand-primary, #1e293b)' }}>
            <Plus className="w-4 h-4" />{activeTab === 'featured' ? 'Add Dish' : 'Add Item'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Tab Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === t.id ? 'text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}
              style={activeTab === t.id ? { background: 'var(--brand-primary, #1e293b)' } : {}}>
              {t.label}
              <span className={`ml-1.5 text-xs ${activeTab === t.id ? 'text-white/70' : 'text-gray-400'}`}>
                ({items.filter(i => i.tab === t.id).length})
              </span>
            </button>
          ))}
          {/* Featured Dishes tab */}
          <button onClick={() => setActiveTab('featured')}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'featured' ? 'text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
            }`}
            style={activeTab === 'featured' ? { background: '#D97706' } : {}}>
            🍽️ Featured Dishes
            <span className={`text-xs ${activeTab === 'featured' ? 'text-white/70' : 'text-gray-400'}`}>({dishes.length})</span>
          </button>
        </div>

        {/* ── Featured Dishes section ── */}
        {activeTab === 'featured' ? (
          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5 flex items-start gap-3">
              <span className="text-amber-500 mt-0.5">💡</span>
              <p className="text-xs text-amber-800 leading-relaxed">
                These are the <strong>4 dishes shown on the homepage dining card</strong>. Upload a photo for each — it replaces the static image file.
                Changes appear immediately on the guest-facing site.
              </p>
            </div>
            {dishesLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
            ) : dishes.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-amber-200">
                <p className="text-gray-500 font-semibold text-sm mb-1">No featured dishes yet.</p>
                <p className="text-xs text-gray-400 mb-4">Run <code className="bg-gray-100 px-1 rounded">sql/29_featured_dishes.sql</code> to seed the defaults.</p>
                <button onClick={openNew} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#D97706' }}>Add First Dish</button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {dishes.map(dish => (
                  <div key={dish.id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${dish.is_active ? 'border-gray-100' : 'border-gray-100 opacity-55'}`}>
                    {/* Image area */}
                    <div className="relative h-40 bg-gray-100">
                      {dish.image_url ? (
                        <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                          <ImagePlus className="w-8 h-8 text-gray-300" />
                          <p className="text-xs text-gray-400">No image yet</p>
                        </div>
                      )}
                      {/* Badge overlay */}
                      {dish.badge && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                          style={{ background: dish.badge_color }}>
                          {dish.badge}
                        </span>
                      )}
                      {/* Upload button overlay */}
                      <label className="absolute bottom-2 right-2 cursor-pointer">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg"
                          style={{ background: uploadingId === dish.id ? '#9ca3af' : '#1e293b' }}>
                          {uploadingId === dish.id
                            ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</>
                            : <><ImagePlus className="w-3 h-3" /> {dish.image_url ? 'Change' : 'Upload'}</>}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingId === dish.id}
                          ref={el => { uploadRefs.current[dish.id] = el; }}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleDishImageUpload(dish, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    {/* Info row */}
                    <div className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{dish.name}</p>
                        <p className="text-xs text-gray-500 truncate">{dish.description}</p>
                        <p className="text-xs font-black mt-0.5" style={{ color: '#D97706' }}>KSh {dish.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleDishToggle(dish)} title={dish.is_active ? 'Hide' : 'Show'}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                          {dish.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                        </button>
                        <button onClick={() => { setEditingDish(dish); setDishForm({ name: dish.name, description: dish.description, price: dish.price, image_url: dish.image_url, badge: dish.badge, badge_color: dish.badge_color, sort_order: dish.sort_order, is_active: dish.is_active }); setShowDishForm(true); setDishError(''); }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                          <Pencil className="w-4 h-4 text-gray-400" />
                        </button>
                        <button onClick={() => handleDishDelete(dish.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <>
        {/* Item list */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--brand-primary, #1e293b)', borderTopColor: 'transparent' }} /></div>
        ) : visibleItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
            <ChefHat className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold text-sm mb-1">No items in this category yet.</p>
            <button onClick={openNew} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'var(--brand-primary, #1e293b)' }}>
              Add First Item
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleItems.map(item => (
              <div key={item.id} className={`bg-white rounded-2xl border transition-all flex items-start gap-0 overflow-hidden ${item.active ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
                {/* Thumbnail */}
                <label className="relative cursor-pointer flex-shrink-0" style={{ width: 80, height: 80 }}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-1">
                      <ImagePlus className="w-5 h-5 text-gray-300" />
                      <span className="text-[10px] text-gray-400">Add photo</span>
                    </div>
                  )}
                  {uploadingItemId === item.id && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden"
                    disabled={uploadingItemId === item.id}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleItemImageUpload(item, f); e.target.value = ''; }}
                  />
                </label>
                <div className="flex-1 min-w-0 p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                    {item.tag === 'popular' && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#D97706' }}>Popular</span>}
                    {item.tag === 'special' && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--brand-primary, #1e293b)' }}>Special</span>}
                    {item.category && <span className="text-xs text-gray-400">{item.category}</span>}
                  </div>
                  {item.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>}
                  <p className="text-sm font-black mt-1" style={{ color: 'var(--brand-primary, #1e293b)' }}>
                    {item.price === 0 ? 'Free' : `KSh ${item.price.toLocaleString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 pr-2 pt-2">
                  <button onClick={() => handleToggleActive(item)} title={item.active ? 'Deactivate' : 'Activate'}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                    {item.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => openEdit(item)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </>
        )}
      </div>

      {/* ── Featured Dish Add/Edit Modal ── */}
      {showDishForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between" style={{ background: '#D97706' }}>
              <h2 className="text-base font-black text-white">{editingDish ? 'Edit Featured Dish' : 'Add Featured Dish'}</h2>
              <button onClick={() => { setShowDishForm(false); setEditingDish(null); setDishError(''); }} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {dishError && <div className="text-sm text-red-600 font-semibold bg-red-50 rounded-xl px-4 py-3">{dishError}</div>}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Dish Name *</label>
                <input value={dishForm.name} onChange={e => setDishForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Chicken Pilau"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Price (KSh)</label>
                  <input type="number" value={dishForm.price} onChange={e => setDishForm(f => ({ ...f, price: Number(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Sort Order</label>
                  <input type="number" value={dishForm.sort_order} onChange={e => setDishForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Short Description</label>
                <input value={dishForm.description} onChange={e => setDishForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Spiced basmati rice"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Badge Label</label>
                  <input value={dishForm.badge} onChange={e => setDishForm(f => ({ ...f, badge: e.target.value }))}
                    placeholder="e.g. ⭐ Chef's Pick"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Badge Colour</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={dishForm.badge_color} onChange={e => setDishForm(f => ({ ...f, badge_color: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                    <input value={dishForm.badge_color} onChange={e => setDishForm(f => ({ ...f, badge_color: e.target.value }))}
                      className="flex-1 px-3 py-3 rounded-xl border border-gray-200 text-sm outline-none font-mono" />
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={dishForm.is_active} onChange={e => setDishForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded accent-amber-500" />
                <span className="text-sm font-semibold text-gray-700">Show on homepage</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => { setShowDishForm(false); setEditingDish(null); setDishError(''); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleDishSave} disabled={dishSaving}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: '#D97706' }}>
                <Save className="w-4 h-4" />{dishSaving ? 'Saving…' : 'Save Dish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between" style={{ background: 'var(--brand-primary, #1e293b)' }}>
              <h2 className="text-base font-black text-white">{editing ? 'Edit Item' : 'Add Menu Item'}</h2>
              <button onClick={closeForm} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {error && <div className="text-sm text-red-600 font-semibold bg-red-50 rounded-xl px-4 py-3">{error}</div>}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Item Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Masala Chips"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Menu Tab</label>
                  <select value={form.tab} onChange={e => setForm(f => ({ ...f, tab: e.target.value as Tab }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 bg-white">
                    {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Price (KSh)</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Category Group</label>
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Sharing Bites, Beverages"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Brief description…"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Badge</label>
                  <select value={form.tag ?? ''} onChange={e => setForm(f => ({ ...f, tag: (e.target.value || null) as 'popular' | 'special' | null }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 bg-white">
                    <option value="">None</option>
                    <option value="popular">Popular</option>
                    <option value="special">Special</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Sort Order</label>
                  <input type="number" value={form.position} onChange={e => setForm(f => ({ ...f, position: Number(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors" />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="w-4 h-4 rounded accent-slate-800" />
                <span className="text-sm font-semibold text-gray-700">Active (visible to guests)</span>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={closeForm} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: 'var(--brand-primary, #1e293b)' }}>
                <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
