'use client';

import { useState, useEffect } from 'react';

interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  total_stays: number;
  total_spent: number;
  last_stay: string | null;
  bookings: { id: string; total_amount: number; check_in: string; status: string }[];
}

const AVATAR_COLORS = [
  'bg-green-500', 'bg-yellow-500', 'bg-blue-500', 'bg-purple-500',
  'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-red-400',
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function whatsappHref(phone: string) {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.447-.521.148-.173.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.570-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.533 5.848L0 24l6.335-1.508A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.714 9.714 0 01-5.031-1.401l-.36-.214-3.732.978.995-3.635-.243-.374A9.72 9.72 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
    </svg>
  );
}

const INP = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white';

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Guest | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Add guest modal state
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const h = (e: Event) => setSidebarCollapsed((e as CustomEvent<{ collapsed: boolean }>).detail.collapsed);
    window.addEventListener('sidebarToggle', h);
    return () => window.removeEventListener('sidebarToggle', h);
  }, []);

  useEffect(() => {
    const email = localStorage.getItem('user_email') || 'admin@hostdash.app';
    setUserEmail(email);
  }, []);

  useEffect(() => {
    fetch('/api/guests')
      .then(r => r.json())
      .then(d => { setGuests(d.guests ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = guests.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.phone.includes(search)
  );

  const handleAdd = async () => {
    setFormError('');
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    if (!form.phone.trim()) { setFormError('Phone is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) { setFormError(data.error); return; }
      setGuests(prev => [...prev, data.guest].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAdd(false);
      setForm({ name: '', phone: '', email: '' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Sticky Top Header - Desktop Only */}
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
            <h1 className="text-lg font-bold text-gray-900">Guests</h1>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[280px] lg:pr-[200px]' : 'lg:pl-[456px] lg:pr-[200px]'}`}>
      <div className="px-2 py-4 sm:p-6 w-full space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-end gap-4">
          <button
            onClick={() => { setShowAdd(true); setFormError(''); setForm({ name: '', phone: '', email: '' }); }}
            className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            <span className="text-lg leading-none">+</span> Add Guest
          </button>
        </div>

        {/* ── Two-panel layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">

          {/* ── Left: Guest list ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-base font-bold text-gray-900">All guests</span>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 w-52 bg-white"
                />
              </div>
            </div>

            {/* Guest rows */}
            {loading ? (
              <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">
                {guests.length === 0 ? 'No guests yet. Add your first guest.' : 'No guests match your search.'}
              </div>
            ) : (
              <div>
                {filtered.map((g, i) => (
                  <div
                    key={g.id}
                    onClick={() => setSelected(g.id === selected?.id ? null : g)}
                    className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors ${g.id === selected?.id ? 'bg-gray-100' : 'hover:bg-gray-50'} ${i < filtered.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${avatarColor(g.name)}`}>
                      {getInitials(g.name)}
                    </div>

                    {/* Name + phone */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{g.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{g.phone || '—'}</p>
                    </div>

                    {/* Stays + amount */}
                    <div className="text-right shrink-0 mr-3">
                      <p className="text-sm font-bold text-gray-900">{g.total_stays} {g.total_stays === 1 ? 'stay' : 'stays'}</p>
                      <p className="text-xs text-gray-500">Ksh {Number(g.total_spent).toLocaleString()}</p>
                    </div>

                    {/* WhatsApp button */}
                    <a
                      href={whatsappHref(g.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shrink-0 transition-colors"
                      title={`WhatsApp ${g.name}`}
                    >
                      <WhatsAppIcon />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Guest details ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 min-h-[200px]">
            {!selected ? (
              <>
                <p className="text-base font-bold text-gray-900 mb-2">Guest details</p>
                <p className="text-sm text-gray-400">Select a guest to see their details and booking history.</p>
              </>
            ) : (
              <div className="space-y-4">
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${avatarColor(selected.name)}`}>
                    {getInitials(selected.name)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{selected.name}</p>
                    <p className="text-xs text-gray-500">{selected.phone}</p>
                  </div>
                </div>

                {/* Contact */}
                {selected.email && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Email</p>
                    <p className="text-sm text-gray-700">{selected.email}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-gray-400">Total stays</p>
                    <p className="text-lg font-bold text-gray-900">{selected.total_stays}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-gray-400">Total spent</p>
                    <p className="text-lg font-bold text-gray-900">Ksh {Number(selected.total_spent).toLocaleString()}</p>
                  </div>
                </div>

                {/* Last stay */}
                {selected.last_stay && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Last stay</p>
                    <p className="text-sm text-gray-700">{selected.last_stay}</p>
                  </div>
                )}

                {/* WhatsApp CTA */}
                <a
                  href={whatsappHref(selected.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <WhatsAppIcon />
                  Message on WhatsApp
                </a>

                {/* Booking history */}
                {selected.bookings.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Booking history</p>
                    <div className="space-y-2">
                      {selected.bookings.map(b => (
                        <div key={b.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                          <span className="text-gray-600">{b.check_in}</span>
                          <span className="font-semibold text-gray-900">Ksh {Number(b.total_amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* ── Add Guest Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900">Add Guest</h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full name <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="James Otieno" className={INP} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0712 345 678" className={INP} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email <span className="text-gray-400">(optional)</span></label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="guest@email.com" className={INP} />
            </div>

            {formError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Add Guest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
