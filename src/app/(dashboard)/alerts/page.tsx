'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

interface BookingAlert {
  id: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: string;
  booking_source: string;
  guests: { name: string; phone: string } | null;
  properties: { name: string } | null;
}

interface Reminder {
  id: string;
  title: string;
  due_date: string | null;
  notes: string | null;
  is_done: boolean;
  created_at: string;
}

function fmt(n: number) {
  return `KSh ${Number(n).toLocaleString()}`;
}

function AlertCard({
  icon, title, count, accent, children, emptyText,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  accent: string;
  children?: React.ReactNode;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-5 text-left"
        onClick={() => count > 0 && setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`${accent} text-white text-xs font-bold px-2 py-0.5 rounded min-w-[22px] text-center`}>
            {count}
          </span>
          {count > 0 && (
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </div>
      </button>
      {!open && (
        <p className="text-sm text-gray-500 px-5 pb-4 -mt-2">
          {count === 0 ? emptyText : `${count} item${count !== 1 ? 's' : ''} — click to expand`}
        </p>
      )}
      {open && count > 0 && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

export default function AlertsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const [checkIns,  setCheckIns]  = useState<BookingAlert[]>([]);
  const [checkOuts, setCheckOuts] = useState<BookingAlert[]>([]);
  const [upcoming,  setUpcoming]  = useState<BookingAlert[]>([]);
  const [unpaid,    setUnpaid]    = useState<BookingAlert[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle,    setNewTitle]    = useState('');
  const [newDueDate,  setNewDueDate]  = useState('');
  const [newNotes,    setNewNotes]    = useState('');
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    const h = (e: CustomEvent) => setSidebarCollapsed(e.detail.collapsed);
    window.addEventListener('sidebarToggle', h as EventListener);
    return () => window.removeEventListener('sidebarToggle', h as EventListener);
  }, []);

  useEffect(() => {
    setUserEmail(localStorage.getItem('user_email') || 'admin@hostdash.app');
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsRes, remindersRes] = await Promise.all([
        fetch('/api/alerts'),
        fetch('/api/reminders'),
      ]);
      if (alertsRes.ok) {
        const d = await alertsRes.json();
        setCheckIns(d.checkIns   ?? []);
        setCheckOuts(d.checkOuts ?? []);
        setUpcoming(d.upcoming   ?? []);
        setUnpaid(d.unpaid       ?? []);
      }
      if (remindersRes.ok) {
        setReminders(await remindersRes.json());
      }
    } catch {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddReminder = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, due_date: newDueDate || null, notes: newNotes || null }),
      });
      if (res.ok) {
        const r = await res.json();
        setReminders(prev => [r, ...prev]);
        setNewTitle(''); setNewDueDate(''); setNewNotes('');
        setShowAddModal(false);
        toast.success('Reminder saved');
      } else {
        const e = await res.json();
        toast.error(e.error ?? 'Failed to save reminder');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDone = async (r: Reminder) => {
    const updated = !r.is_done;
    setReminders(prev => prev.map(x => x.id === r.id ? { ...x, is_done: updated } : x));
    const res = await fetch(`/api/reminders/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_done: updated }),
    });
    if (!res.ok) {
      setReminders(prev => prev.map(x => x.id === r.id ? { ...x, is_done: r.is_done } : x));
      toast.error('Could not update reminder');
    }
  };

  const handleDeleteReminder = async (id: string) => {
    setReminders(prev => prev.filter(x => x.id !== id));
    const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Could not delete reminder');
      loadData();
    } else {
      toast.success('Reminder removed');
    }
  };

  const BookingRow = ({ b, showBalance = false }: { b: BookingAlert; showBalance?: boolean }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-gray-100 last:border-0 gap-1">
      <div>
        <p className="text-sm font-medium text-gray-900">{b.guests?.name ?? '—'}</p>
        <p className="text-xs text-gray-500">{b.properties?.name ?? '—'} · {b.check_in} → {b.check_out}</p>
        {b.guests?.phone && <p className="text-xs text-gray-400">{b.guests.phone}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        {showBalance ? (
          <>
            <p className="text-sm font-semibold text-red-600">{fmt(b.balance_due)} owed</p>
            <p className="text-xs text-gray-400">{fmt(b.amount_paid)} of {fmt(b.total_amount)} paid</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">{fmt(b.total_amount)}</p>
            <p className="text-xs text-gray-400">{b.booking_source || 'Direct'}</p>
          </>
        )}
      </div>
    </div>
  );

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
            <h1 className="text-lg font-bold text-gray-900">Alerts &amp; Reminders</h1>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className={`px-2 py-4 sm:p-6 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[280px] lg:pr-[200px]' : 'lg:pl-[456px] lg:pr-[200px]'}`}>

        <div className="mb-6 flex items-center justify-end">
          <button onClick={loadData} className="flex text-xs text-gray-500 hover:text-gray-800 items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">

            {/* Check-ins / Check-outs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AlertCard
                icon={<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>}
                title="Today's check-ins"
                count={checkIns.length}
                accent="bg-green-500"
                emptyText="Nothing to check in today."
              >
                {checkIns.map(b => <BookingRow key={b.id} b={b} />)}
              </AlertCard>

              <AlertCard
                icon={<svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>}
                title="Today's check-outs"
                count={checkOuts.length}
                accent="bg-amber-400"
                emptyText="No check-outs today."
              >
                {checkOuts.map(b => <BookingRow key={b.id} b={b} showBalance={b.balance_due > 0} />)}
              </AlertCard>
            </div>

            {/* Unpaid balances */}
            <AlertCard
              icon={<svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              title="Unpaid balances"
              count={unpaid.length}
              accent="bg-red-500"
              emptyText="All bookings paid in full."
            >
              {unpaid.map(b => <BookingRow key={b.id} b={b} showBalance />)}
            </AlertCard>

            {/* Upcoming this week */}
            <AlertCard
              icon={<svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              title="Upcoming this week"
              count={upcoming.length}
              accent="bg-blue-500"
              emptyText="No upcoming bookings in the next 7 days."
            >
              {upcoming.map(b => <BookingRow key={b.id} b={b} />)}
            </AlertCard>

            {/* Custom reminders */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="font-semibold text-gray-900">Custom reminders</span>
                  <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded">{reminders.length}</span>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1 bg-gray-900 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <span>+</span> Add
                </button>
              </div>

              {reminders.length === 0 ? (
                <p className="text-sm text-gray-500">No reminders. Add one for cleaning, maintenance, KPLC bills, etc.</p>
              ) : (
                <ul className="space-y-2">
                  {reminders.map(r => (
                    <li key={r.id} className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 border transition-colors ${r.is_done ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}>
                      <button onClick={() => handleToggleDone(r)} className="flex-shrink-0 mt-0.5">
                        {r.is_done
                          ? <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                          : <svg className="w-4 h-4 text-gray-300 hover:text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${r.is_done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{r.title}</p>
                        {r.due_date && <p className="text-xs text-gray-400 mt-0.5">Due: {r.due_date}</p>}
                        {r.notes    && <p className="text-xs text-gray-400 mt-0.5">{r.notes}</p>}
                      </div>
                      <button onClick={() => handleDeleteReminder(r.id)} className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Reminder</h2>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddReminder()}
                  placeholder="e.g. KPLC bill, cleaning day"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Due date (optional)</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes (optional)</label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional details..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowAddModal(false); setNewTitle(''); setNewDueDate(''); setNewNotes(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Cancel
              </button>
              <button onClick={handleAddReminder} disabled={!newTitle.trim() || saving}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Save Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
