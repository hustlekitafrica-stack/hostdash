'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Users, CreditCard, BookOpen, Ticket, Eye, TrendingUp,
  UserCheck, UserX, RefreshCw, ExternalLink,
} from 'lucide-react';

interface AdminStats {
  users: { total: number; paid: number; trial: number };
  bookings: { total: number; confirmed: number; cancelled: number; revenue: number };
  payments: { revenueThirtyDays: number };
  tickets: { total: number; open: number; resolved: number };
  pageViews: { total: number };
  charts: {
    dailyRevenue: { date: string; revenue: number }[];
    dailyViews:   { date: string; views: number }[];
  };
  recentUsers: { id: string; email: string; full_name: string | null; subscription_status: string; created_at: string }[];
  recentTickets: { id: string; subject: string; status: string; priority: string; user_email: string; created_at: string }[];
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function fmtMoney(n: number) {
  if (n >= 1_000_000) return `KSh ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `KSh ${(n / 1_000).toFixed(1)}K`;
  return `KSh ${n.toLocaleString()}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const KPI_CARDS = (s: AdminStats) => [
  { label: 'Total Users',       value: fmt(s.users.total),            icon: Users,      color: 'text-blue-400',    bg: 'bg-blue-900/30', border: 'border-blue-800' },
  { label: 'Paid Subscribers',  value: fmt(s.users.paid),             icon: UserCheck,  color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-800' },
  { label: 'Trial Users',       value: fmt(s.users.trial),            icon: UserX,      color: 'text-amber-400',   bg: 'bg-amber-900/30', border: 'border-amber-800' },
  { label: 'Platform Revenue (30d)', value: fmtMoney(s.payments.revenueThirtyDays), icon: CreditCard, color: 'text-violet-400', bg: 'bg-violet-900/30', border: 'border-violet-800' },
  { label: 'Total Bookings',    value: fmt(s.bookings.confirmed),      icon: BookOpen,   color: 'text-cyan-400',    bg: 'bg-cyan-900/30', border: 'border-cyan-800' },
  { label: 'Booking Revenue',   value: fmtMoney(s.bookings.revenue),  icon: TrendingUp, color: 'text-green-400',   bg: 'bg-green-900/30', border: 'border-green-800' },
  { label: 'Support Tickets',   value: fmt(s.tickets.total),          icon: Ticket,     color: 'text-rose-400',    bg: 'bg-rose-900/30', border: 'border-rose-800' },
  { label: 'Page Views (30d)',  value: fmt(s.pageViews.total),        icon: Eye,        color: 'text-orange-400',  bg: 'bg-orange-900/30', border: 'border-orange-800' },
];

const STATUS_COLOR: Record<string, string> = {
  paid:     'bg-emerald-500/20 text-emerald-300',
  trial:    'bg-amber-500/20 text-amber-300',
  expired:  'bg-red-500/20 text-red-300',
  open:     'bg-rose-500/20 text-rose-300',
  resolved: 'bg-emerald-500/20 text-emerald-300',
  closed:   'bg-gray-500/20 text-gray-400',
  normal:   'bg-blue-500/20 text-blue-300',
  high:     'bg-orange-500/20 text-orange-300',
  urgent:   'bg-red-500/20 text-red-300',
};

export default function AdminDashboard() {
  const [stats, setStats]     = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setStats(d);
      })
      .catch(() => setError('Failed to load stats'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Loading admin stats…</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-rose-400 font-medium">{error ?? 'No data'}</p>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const kpis = KPI_CARDS(stats);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time metrics across all hosted accounts</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`rounded-xl border ${border} ${bg} p-4 flex flex-col gap-2`}>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <span className={`text-2xl font-bold ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Daily Revenue — Last 30 Days</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.charts.dailyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: '#6b7280', fontSize: 11 }} interval={6} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} width={40} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v: unknown) => [fmtMoney(Number(v)), 'Revenue']}
                labelFormatter={(l: unknown) => shortDate(String(l))}
              />
              <Line type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Page views chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Page Views — Last 30 Days</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.charts.dailyViews} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: '#6b7280', fontSize: 11 }} interval={6} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} width={32} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v: unknown) => [Number(v), 'Views']}
                labelFormatter={(l: unknown) => shortDate(String(l))}
              />
              <Bar dataKey="views" fill="#f97316" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tickets + Users breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Ticket Summary</h2>
          <div className="space-y-3">
            {[
              { label: 'Open',     count: stats.tickets.open,     color: 'bg-rose-500' },
              { label: 'Resolved', count: stats.tickets.resolved, color: 'bg-emerald-500' },
              { label: 'Total',    count: stats.tickets.total,    color: 'bg-gray-600' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-gray-400 text-sm flex-1">{label}</span>
                <span className="text-white font-semibold">{count}</span>
              </div>
            ))}
          </div>
          <a href="/help" className="mt-4 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <ExternalLink className="w-3 h-3" /> View support centre
          </a>
        </div>

        {/* Subscription breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">User Breakdown</h2>
          <div className="space-y-3">
            {[
              { label: 'Paid',  count: stats.users.paid,  pct: stats.users.total ? Math.round((stats.users.paid  / stats.users.total) * 100) : 0, color: 'bg-emerald-500' },
              { label: 'Trial', count: stats.users.trial, pct: stats.users.total ? Math.round((stats.users.trial / stats.users.total) * 100) : 0, color: 'bg-amber-500' },
            ].map(({ label, count, pct, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <span className="text-white text-sm font-medium">{count} <span className="text-gray-500">({pct}%)</span></span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500">{stats.users.total} total registered accounts</p>
        </div>

        {/* Booking stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Booking Stats</h2>
          <div className="space-y-3">
            {[
              { label: 'Confirmed', count: stats.bookings.confirmed, color: 'bg-cyan-500' },
              { label: 'Cancelled', count: stats.bookings.cancelled, color: 'bg-rose-500' },
              { label: 'Total',     count: stats.bookings.total,     color: 'bg-gray-600' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-gray-400 text-sm flex-1">{label}</span>
                <span className="text-white font-semibold">{count}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500">Total revenue: {fmtMoney(stats.bookings.revenue)}</p>
        </div>
      </div>

      {/* Recent tickets */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Open Support Tickets</h2>
        </div>
        {stats.recentTickets.length === 0 ? (
          <p className="text-gray-500 text-sm px-5 py-6">No open tickets</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {stats.recentTickets.map(t => (
              <div key={t.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{t.subject}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.user_email} · {fmtDate(t.created_at)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[t.priority] ?? 'bg-gray-700 text-gray-300'}`}>{t.priority}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[t.status] ?? 'bg-gray-700 text-gray-300'}`}>{t.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent signups */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Recent Signups</h2>
        </div>
        {stats.recentUsers.length === 0 ? (
          <p className="text-gray-500 text-sm px-5 py-6">No users yet</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {stats.recentUsers.map(u => (
              <div key={u.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-sm font-medium shrink-0">
                  {(u.full_name ?? u.email)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{u.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[u.subscription_status] ?? 'bg-gray-700 text-gray-300'}`}>{u.subscription_status}</span>
                <span className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(u.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
