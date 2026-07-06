'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useSubscription } from '@/lib/use-subscription';

type Tab = 'general' | 'brand' | 'categories' | 'tax' | 'notifications' | 'api' | 'account';

interface ApiKeyEntry {
  id: string;
  key_prefix: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
}
type TaxLine = { label: string; rate: string };

const COLOR_PRESETS = [
  { primary: '#1e293b', secondary: '#16a34a' },
  { primary: '#1e293b', secondary: '#f97316' },
  { primary: '#1e293b', secondary: '#7c3aed' },
  { primary: '#991b1b', secondary: '#dc2626' },
  { primary: '#1e3a5f', secondary: '#0ea5e9' },
];

const QUICK_COLORS = [
  '#1e293b','#111827','#1e3a5f','#7c3aed','#991b1b',
  '#b45309','#065f46','#0e7490','#1d4ed8','#be185d',
  '#16a34a','#f97316','#0ea5e9','#a855f7','#dc2626',
  '#f59e0b','#14b8a6','#6366f1','#ec4899','#64748b',
];

function isValidHex(v: string) { return /^#[0-9a-fA-F]{6}$/.test(v); }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function SettingsPage() {
  const { isPro, isLoaded: subLoaded } = useSubscription();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState('admin@hostdash.app');
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // Notifications tab state
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [waSaving, setWaSaving] = useState(false);

  // API Keys tab state
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('Default');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyGenerating, setKeyGenerating] = useState(false);

  // General tab state
  const [businessName, setBusinessName] = useState('');
  const [currencyCode, setCurrencyCode] = useState('KSH');
  const [fyMonth, setFyMonth] = useState('January');
  const [fyYear, setFyYear] = useState(new Date().getFullYear());

  // Brand tab state
  const [primaryColor, setPrimaryColor] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('brand_primary') || '#1e293b' : '#1e293b'
  );
  const [secondaryColor, setSecondaryColor] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('brand_secondary') || '#16a34a' : '#16a34a'
  );
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoName, setLogoName] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('brand_logo') || '';
    return '';
  });
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [faviconName, setFaviconName] = useState('');
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [faviconPreview, setFaviconPreview] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('brand_favicon') || '';
    return '';
  });

  // Categories tab state
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [catLoading, setCatLoading] = useState(false);

  // Profile photo state
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Profile details state
  const [profName,    setProfName]    = useState('');
  const [profPhone,   setProfPhone]   = useState('');
  const [profEmail,   setProfEmail]   = useState('');
  const [profSaving,  setProfSaving]  = useState(false);

  // Tax & KRA state
  const [kraPin,      setKraPin]      = useState('');
  const [taxLines,    setTaxLines]    = useState<TaxLine[]>([]);
  const [taxSaving,   setTaxSaving]   = useState(false);

  // Change password state
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [pwSaving,    setPwSaving]    = useState(false);
  const [showNewPw,   setShowNewPw]   = useState(false);

  useEffect(() => {
    fetch('/api/expense-categories')
      .then(r => r.json())
      .then(d => { if (d.categories) setCategories(d.categories); })
      .catch(() => {});
  }, []);  

  useEffect(() => {
    const h = (e: CustomEvent) => setSidebarCollapsed(e.detail.collapsed);
    window.addEventListener('sidebarToggle', h as EventListener);
    return () => window.removeEventListener('sidebarToggle', h as EventListener);
  }, []);

  useEffect(() => {
    const email = localStorage.getItem('user_email') || 'admin@hostdash.app';
    setUserEmail(email);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const meta = data.user.user_metadata ?? {};
      setProfName(meta.full_name ?? meta.name ?? '');
      setProfPhone(meta.phone ?? '');
      setProfEmail(data.user.email ?? '');
      // Load KRA + tax config from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('kra_pin, tax_lines, logo_url, favicon_url, whatsapp_phone')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profile) {
        setKraPin(profile.kra_pin ?? '');
        setWhatsappPhone(profile.whatsapp_phone ?? '');
        const tl = Array.isArray(profile.tax_lines) ? profile.tax_lines : [];
        setTaxLines(tl.map((t: any) => ({ label: t.label ?? '', rate: String(t.rate ?? '') })));
        if (profile.logo_url) {
          setLogoPreview(profile.logo_url);
          localStorage.setItem('brand_logo', profile.logo_url);
        }
        if (profile.favicon_url) {
          setFaviconPreview(profile.favicon_url);
          localStorage.setItem('brand_favicon', profile.favicon_url);
        }
      }
    });
  }, []);

  const handleSaveProfile = async () => {
    if (!profName.trim()) { toast.error('Name is required'); return; }
    if (!profPhone.trim()) { toast.error('Phone is required'); return; }
    setProfSaving(true);
    try {
      const supabase = createClient();
      const updates: Record<string, unknown> = { data: { full_name: profName.trim(), phone: profPhone.trim() } };
      if (profEmail.trim() && profEmail !== userEmail) (updates as any).email = profEmail.trim();
      const { error } = await supabase.auth.updateUser(updates as any);
      if (error) { toast.error(error.message); return; }
      toast.success('Profile updated');
    } catch { toast.error('Network error'); }
    finally { setProfSaving(false); }
  };

  const handleChangePassword = async () => {
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    setPwSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) { toast.error(error.message); return; }
      setNewPw(''); setConfirmPw('');
      toast.success('Password changed successfully');
    } catch { toast.error('Network error'); }
    finally { setPwSaving(false); }
  };

  const handleAvatarUpload = async (file: File) => {
    if (file.size > 3 * 1024 * 1024) { toast.error('Photo must be under 3 MB'); return; }
    setAvatarUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not authenticated'); return; }
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from('profile-photos').upload(path, file, { upsert: true });
      if (error) { toast.error('Upload failed'); return; }
      const { data: { publicUrl } } = supabase.storage.from('profile-photos').getPublicUrl(path);
      setAvatarUrl(publicUrl);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      toast.success('Profile photo updated');
    } catch { toast.error('Network error'); }
    finally { setAvatarUploading(false); }
  };

  const handleSaveTax = async () => {
    setTaxSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not authenticated'); return; }
      const resolved = taxLines
        .filter(tl => tl.label.trim() && tl.rate.trim())
        .map(tl => ({ label: tl.label.trim(), rate: Number(tl.rate) || 0 }));
      const { error } = await supabase
        .from('profiles')
        .update({ kra_pin: kraPin.trim(), tax_lines: resolved })
        .eq('id', user.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Tax settings saved');
    } catch { toast.error('Network error'); }
    finally { setTaxSaving(false); }
  };

  const handleSaveGeneral = () => toast.success('Settings saved!');

  const handleLogoUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2 MB'); return; }
    setLogoUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not authenticated'); return; }
      const ext = file.name.split('.').pop();
      const path = `${user.id}/brand/logo.${ext}`;
      const { error } = await supabase.storage.from('property-photos').upload(path, file, { upsert: true });
      if (error) { toast.error('Upload failed: ' + error.message); return; }
      const { data: { publicUrl } } = supabase.storage.from('property-photos').getPublicUrl(path);
      setLogoPreview(publicUrl);
      setLogoName(file.name);
      localStorage.setItem('brand_logo', publicUrl);
      await supabase.from('profiles').update({ logo_url: publicUrl }).eq('id', user.id);
      window.dispatchEvent(new Event('brandUpdated'));
      toast.success('Logo saved!');
    } catch { toast.error('Network error'); }
    finally { setLogoUploading(false); }
  };

  const handleFaviconUpload = async (file: File) => {
    if (file.size > 1 * 1024 * 1024) { toast.error('Favicon must be under 1 MB'); return; }
    setFaviconUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not authenticated'); return; }
      const ext = file.name.split('.').pop();
      const path = `${user.id}/brand/favicon.${ext}`;
      const { error } = await supabase.storage.from('property-photos').upload(path, file, { upsert: true });
      if (error) { toast.error('Upload failed: ' + error.message); return; }
      const { data: { publicUrl } } = supabase.storage.from('property-photos').getPublicUrl(path);
      setFaviconPreview(publicUrl);
      setFaviconName(file.name);
      localStorage.setItem('brand_favicon', publicUrl);
      await supabase.from('profiles').update({ favicon_url: publicUrl }).eq('id', user.id);
      window.dispatchEvent(new Event('brandUpdated'));
      toast.success('Favicon saved!');
    } catch { toast.error('Network error'); }
    finally { setFaviconUploading(false); }
  };

  const handleSaveColors = () => {
    localStorage.setItem('brand_primary', primaryColor);
    localStorage.setItem('brand_secondary', secondaryColor);
    window.dispatchEvent(new Event('brandUpdated'));
    toast.success('Brand colors saved!');
  };

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    setCatLoading(true);
    try {
      const res = await fetch('/api/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to add category'); return; }
      setCategories(prev => [...prev, data.category]);
      setNewCategory('');
      toast.success('Category added');
    } catch {
      toast.error('Network error');
    } finally {
      setCatLoading(false);
    }
  };

  const handleRemoveCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/expense-categories/${id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Failed to remove category'); return; }
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch {
      toast.error('Network error');
    }
  };

  // ── WhatsApp save handler ──
  const handleSaveWhatsApp = async () => {
    setWaSaving(true);
    try {
      const res = await fetch('/api/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_phone: whatsappPhone.trim() || null }),
      });
      if (!res.ok) { toast.error('Failed to save'); return; }
      toast.success('WhatsApp number saved');
    } catch { toast.error('Network error'); }
    finally { setWaSaving(false); }
  };

  // ── API Keys handlers ──
  const loadApiKeys = async () => {
    setApiKeysLoading(true);
    try {
      const res = await fetch('/api/api-keys');
      if (res.ok) { const d = await res.json(); setApiKeys(d.keys ?? []); }
    } catch { /* ignore */ }
    finally { setApiKeysLoading(false); }
  };

  const handleGenerateKey = async () => {
    setKeyGenerating(true);
    setGeneratedKey(null);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newKeyLabel.trim() || 'Default' }),
      });
      const d = await res.json();
      if (res.ok && d.raw_key) {
        setGeneratedKey(d.raw_key);
        setNewKeyLabel('Default');
        loadApiKeys();
        toast.success('API key generated');
      } else {
        toast.error(d.error ?? 'Failed to generate key');
      }
    } catch { toast.error('Network error'); }
    finally { setKeyGenerating(false); }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' });
      if (res.ok) { loadApiKeys(); toast.success('Key revoked'); }
      else toast.error('Failed to revoke');
    } catch { toast.error('Network error'); }
  };

  useEffect(() => { if (activeTab === 'api' && isPro) loadApiKeys(); }, [activeTab, isPro]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'brand', label: 'Brand' },
    { id: 'categories', label: 'Expenses' },
    { id: 'tax', label: 'Tax & KRA' },
    { id: 'notifications', label: 'Notifications' },
    ...(isPro ? [{ id: 'api' as Tab, label: 'API Keys' }] : []),
    { id: 'account', label: 'Account' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className={`flex items-center justify-between px-4 lg:px-8 h-[80px] transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[100px]' : 'lg:pl-[300px]'}`}>
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-700"
              onClick={() => window.dispatchEvent(new CustomEvent('openMobileMenu'))}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className={`px-2 py-4 sm:p-6 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[280px] lg:pr-[200px]' : 'lg:pl-[456px] lg:pr-[200px]'}`}>

        {/* Tab Bar */}
        <div className="bg-gray-100 rounded-lg p-1 flex gap-0.5 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? 'bg-white font-semibold text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── GENERAL TAB ── */}
        {activeTab === 'general' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-3xl">
            <h2 className="text-base font-bold text-gray-900 mb-1">Business Profile</h2>
            <p className="text-sm text-gray-500 mb-6">Basic information about your business.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency Code</label>
                <input
                  type="text"
                  value={currencyCode}
                  onChange={e => setCurrencyCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year Start Month</label>
                <select
                  value={fyMonth}
                  onChange={e => setFyMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Financial Start Year</label>
                <input
                  type="number"
                  value={fyYear}
                  onChange={e => setFyYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-gray-200">
              <button
                onClick={handleSaveGeneral}
                className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* ── BRAND TAB ── */}
        {activeTab === 'brand' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Brand Colors card */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-base font-bold text-gray-900 mb-1">Brand Colors</h2>
                <p className="text-sm text-gray-500 mb-5">Pick any color using the swatch, type a hex code, or choose from the palette below. Changes preview live.</p>

                <div className="space-y-6 mb-6">
                  {/* Primary Color */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-0.5">Primary Color</p>
                    <p className="text-xs text-gray-400 mb-2">Sidebar, buttons, and headers.</p>
                    <div className="flex items-center gap-3 mb-3">
                      <label className="relative cursor-pointer group flex-shrink-0">
                        <div className="w-11 h-11 rounded-xl border-2 border-gray-300 group-hover:border-gray-500 transition-colors shadow-sm"
                          style={{ backgroundColor: isValidHex(primaryColor) ? primaryColor : '#1e293b' }} />
                        <input type="color" value={isValidHex(primaryColor) ? primaryColor : '#1e293b'}
                          onChange={e => setPrimaryColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                      </label>
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={e => { const v = e.target.value; if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) setPrimaryColor(v.startsWith('#') ? v : '#' + v); }}
                        onBlur={() => { if (!isValidHex(primaryColor)) setPrimaryColor('#1e293b'); }}
                        maxLength={7}
                        spellCheck={false}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
                        placeholder="#1e293b"
                      />
                      <span className="text-xs text-gray-400">Click swatch or type hex</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_COLORS.map(c => (
                        <button key={c} onClick={() => setPrimaryColor(c)} title={c}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0 ${primaryColor === c ? 'border-gray-700 scale-110 ring-2 ring-offset-1 ring-gray-400' : 'border-white shadow-sm'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>

                  {/* Secondary Color */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-0.5">Secondary Color</p>
                    <p className="text-xs text-gray-400 mb-2">Accents, highlights, and badges.</p>
                    <div className="flex items-center gap-3 mb-3">
                      <label className="relative cursor-pointer group flex-shrink-0">
                        <div className="w-11 h-11 rounded-xl border-2 border-gray-300 group-hover:border-gray-500 transition-colors shadow-sm"
                          style={{ backgroundColor: isValidHex(secondaryColor) ? secondaryColor : '#16a34a' }} />
                        <input type="color" value={isValidHex(secondaryColor) ? secondaryColor : '#16a34a'}
                          onChange={e => setSecondaryColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                      </label>
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={e => { const v = e.target.value; if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) setSecondaryColor(v.startsWith('#') ? v : '#' + v); }}
                        onBlur={() => { if (!isValidHex(secondaryColor)) setSecondaryColor('#16a34a'); }}
                        maxLength={7}
                        spellCheck={false}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
                        placeholder="#16a34a"
                      />
                      <span className="text-xs text-gray-400">Click swatch or type hex</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_COLORS.map(c => (
                        <button key={c} onClick={() => setSecondaryColor(c)} title={c}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0 ${secondaryColor === c ? 'border-gray-700 scale-110 ring-2 ring-offset-1 ring-gray-400' : 'border-white shadow-sm'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preset combos */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Quick Combos</p>
                  <div className="flex items-center gap-2 mb-5">
                    {COLOR_PRESETS.map((p, i) => (
                      <button key={i} onClick={() => { setPrimaryColor(p.primary); setSecondaryColor(p.secondary); }}
                        className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-gray-400 transition-colors flex-shrink-0 shadow-sm"
                        title={`${p.primary} / ${p.secondary}`}
                        style={{ background: `linear-gradient(135deg, ${p.primary} 50%, ${p.secondary} 50%)` }} />
                    ))}
                    <button onClick={() => { setPrimaryColor('#1e293b'); setSecondaryColor('#16a34a'); }}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
                      title="Reset to default">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <button onClick={handleSaveColors}
                  className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors">
                  Save Colors
                </button>
              </div>

              {/* Business Logo card */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-base font-bold text-gray-900 mb-1">Business Logo</h2>
                <p className="text-sm text-gray-500 mb-5">Appears in the sidebar, nav header, and frontend. PNG, JPG, SVG or WEBP — max 2 MB.</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg,.webp"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }}
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                    >
                      {logoUploading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                      )}
                      {logoUploading ? 'Uploading…' : 'Upload Logo'}
                    </button>
                    {logoName && <p className="text-xs text-gray-500 mt-1">{logoName}</p>}
                  </div>
                </div>
              </div>

              {/* Favicon card */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-base font-bold text-gray-900 mb-1">Favicon</h2>
                <p className="text-sm text-gray-500 mb-5">Shown in browser tabs and bookmarks for both the dashboard and guest-facing site. PNG or ICO — max 1 MB. Recommended size: 32×32 or 64×64 px.</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                    {faviconPreview ? (
                      <img src={faviconPreview} alt="Favicon" className="w-10 h-10 object-contain" />
                    ) : (
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M3 12h1m8-9v1m8 8h-1M5.6 5.6l.7.7m12.1-.7-.7.7M12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14z"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept=".png,.ico,.jpg,.jpeg"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFaviconUpload(f); e.target.value = ''; }}
                    />
                    <button
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={faviconUploading}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                    >
                      {faviconUploading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                      )}
                      {faviconUploading ? 'Uploading…' : 'Upload Favicon'}
                    </button>
                    {faviconName && <p className="text-xs text-gray-500 mt-1">{faviconName}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Preview card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 h-fit">
              <h2 className="text-base font-bold text-gray-900 mb-1">Live Preview</h2>
              <p className="text-sm text-gray-500 mb-5">How your brand colors look in the interface.</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 text-white text-sm font-bold" style={{ backgroundColor: primaryColor }}>
                  HostDash
                </div>
                <div className="bg-gray-50 px-4 py-3 space-y-2">
                  {['Dashboard', 'My Properties', 'Expenses', 'Reports Center'].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-white border-t border-gray-200 flex gap-3">
                  <button className="px-4 py-1.5 text-white text-xs font-medium rounded-md" style={{ backgroundColor: primaryColor }}>
                    Primary Button
                  </button>
                  <button className="px-4 py-1.5 text-white text-xs font-medium rounded-md" style={{ backgroundColor: secondaryColor }}>
                    Secondary
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EXPENSE CATEGORIES TAB ── */}
        {activeTab === 'categories' && (
          <div className="bg-white border-l-4 border-l-red-400 border border-gray-200 rounded-xl p-6 max-w-md">
            <h2 className="text-base font-bold text-gray-900 mb-1">Expense Categories</h2>
            <p className="text-sm text-gray-500 mb-5">
              Customise the expense categories used across reports and entries.<br />Max 30 categories.
            </p>
            <div className="flex gap-2 mb-5">
              <input
                type="text"
                placeholder="New category name"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-3">
                No categories yet — add <span className="text-teal-600 font-medium">one</span> above.
              </p>
            ) : (
              <ul className="space-y-2">
                {categories.map(cat => (
                  <li key={cat.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-800">{cat.name}</span>
                    <button
                      onClick={() => handleRemoveCategory(cat.id)}
                      className="text-red-400 hover:text-red-600 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── TAX & KRA TAB ── */}
        {activeTab === 'tax' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 mb-1">KRA Details</h2>
              <p className="text-sm text-gray-500 mb-5">Your KRA PIN will appear on all receipts issued to guests.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KRA PIN</label>
                <input
                  type="text"
                  value={kraPin}
                  onChange={e => setKraPin(e.target.value)}
                  placeholder="e.g. A123456789B"
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 mb-1">Tax Lines</h2>
              <p className="text-sm text-gray-500 mb-1">Configure up to 3 tax lines applied to every receipt (tax-exclusive — added on top of the room subtotal).</p>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">These are default values. You can override them per-receipt when issuing from Booking Requests.</p>

              <div className="space-y-3 mb-4">
                {taxLines.map((tl, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={tl.label}
                      onChange={e => setTaxLines(prev => prev.map((t, j) => j === i ? { ...t, label: e.target.value } : t))}
                      placeholder="Label (e.g. VAT)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <div className="relative w-32">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={tl.rate}
                        onChange={e => setTaxLines(prev => prev.map((t, j) => j === i ? { ...t, rate: e.target.value } : t))}
                        placeholder="Rate"
                        className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                    </div>
                    <button
                      onClick={() => setTaxLines(prev => prev.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0"
                      title="Remove"
                    >×</button>
                  </div>
                ))}
              </div>

              {taxLines.length < 3 && (
                <button
                  onClick={() => setTaxLines(prev => [...prev, { label: '', rate: '' }])}
                  className="flex items-center gap-1.5 text-sm text-green-700 font-medium hover:text-green-900 transition-colors mb-5"
                >
                  <span className="text-lg leading-none">+</span> Add Tax Line
                </button>
              )}

              <button
                onClick={handleSaveTax}
                disabled={taxSaving}
                className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {taxSaving ? 'Saving…' : 'Save Tax Settings'}
              </button>
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 mb-1">WhatsApp Notifications</h2>
              <p className="text-sm text-gray-500 mb-5">
                {isPro
                  ? 'Enter your WhatsApp number to receive booking notifications via WhatsApp.'
                  : 'Upgrade to Pro to enable automated WhatsApp notifications for bookings.'}
              </p>
              {isPro ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Phone Number</label>
                    <input
                      type="tel"
                      value={whatsappPhone}
                      onChange={e => setWhatsappPhone(e.target.value)}
                      placeholder="+254 7XX XXX XXX"
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Used for booking confirmations and admin alerts.</p>
                  </div>
                  <button
                    onClick={handleSaveWhatsApp}
                    disabled={waSaving}
                    className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                  >
                    {waSaving ? 'Saving…' : 'Save WhatsApp Number'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => window.location.href = '/upgrade'}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #0f766e, #0ea5e9)' }}
                >
                  Upgrade to Pro
                </button>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 mb-1">SMS Notifications</h2>
              <p className="text-sm text-gray-500 mb-2">SMS notifications are enabled for all plans. Booking confirmations, requests, and reminders are sent automatically.</p>
              <span className="inline-block px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">Active</span>
            </div>
          </div>
        )}

        {/* ── API KEYS TAB (Pro only) ── */}
        {activeTab === 'api' && isPro && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 mb-1">API Keys</h2>
              <p className="text-sm text-gray-500 mb-5">Generate API keys to access the HostDash API programmatically.</p>

              {generatedKey && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5">
                  <p className="text-sm font-semibold text-green-800 mb-1">New API Key Generated</p>
                  <p className="text-xs text-green-700 mb-2">Copy it now — you won&apos;t be able to see it again.</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border border-green-300 text-sm font-mono text-green-900 break-all select-all">
                      {generatedKey}
                    </code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(generatedKey); toast.success('Copied!'); }}
                      className="px-3 py-2 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-end gap-3 mb-6">
                <div className="flex-1 max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key Label</label>
                  <input
                    type="text"
                    value={newKeyLabel}
                    onChange={e => setNewKeyLabel(e.target.value)}
                    placeholder="e.g. My Script"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <button
                  onClick={handleGenerateKey}
                  disabled={keyGenerating}
                  className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60"
                >
                  {keyGenerating ? 'Generating…' : 'Generate Key'}
                </button>
              </div>

              {apiKeysLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
                </div>
              ) : apiKeys.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No API keys yet. Generate one above.</p>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Key</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Label</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Created</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Last Used</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {apiKeys.map(k => (
                        <tr key={k.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 font-mono text-xs text-gray-700">{k.key_prefix}••••••••</td>
                          <td className="px-4 py-3 text-gray-700">{k.label}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(k.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleRevokeKey(k.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Revoke</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ACCOUNT TAB ── */}
        {activeTab === 'account' && (
          <div className="space-y-6 max-w-3xl">

          {/* Profile Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">Profile Details</h2>
            <p className="text-sm text-gray-500 mb-5">Update your name, phone number, and email address.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={profName} onChange={e => setProfName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" value={profPhone} onChange={e => setProfPhone(e.target.value)}
                  placeholder="+254 700 000 000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" value={profEmail} onChange={e => setProfEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                <p className="text-xs text-gray-400 mt-1">Changing email sends a confirmation to the new address.</p>
              </div>
            </div>
            <button onClick={handleSaveProfile} disabled={profSaving}
              className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
              {profSaving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>

          {/* Change Password */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">Change Password</h2>
            <p className="text-sm text-gray-500 mb-5">Choose a strong password with at least 8 characters.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <button type="button" onClick={() => setShowNewPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      {showNewPw
                        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input type={showNewPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            <button onClick={handleChangePassword} disabled={pwSaving || !newPw}
              className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">Profile Photo</h2>
            <p className="text-sm text-gray-500 mb-5">Shown on your profile. Max 3 MB — JPG, PNG, WebP.</p>
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center bg-gray-50 flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                )}
              </div>
              <div>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
                <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60">
                  {avatarUploading ? (
                    <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg> Upload Photo</>
                  )}
                </button>
                {avatarUrl && <p className="text-xs text-teal-600 mt-1">Photo saved ✓</p>}
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">Account Status</h2>
            <p className="text-sm text-gray-500 mb-6">Your subscription and billing information.</p>
            <div className="space-y-0">
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <span className="text-sm text-gray-700">Email</span>
                <span className="text-sm font-bold text-gray-900">{userEmail}</span>
              </div>
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <span className="text-sm text-gray-700">Subscription Status</span>
                <span className="text-xs font-semibold text-teal-600 border border-teal-400 rounded-full px-3 py-1 tracking-wide">
                  ACTIVE
                </span>
              </div>
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Sign Out</p>
                  <p className="text-xs text-gray-400 mt-0.5">Log out of your account on this device</p>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_email');
                    window.location.href = '/auth/login';
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log Out
                </button>
              </div>
            </div>
          </div>
          </div>
        )}

      </div>
    </div>
  );
}
