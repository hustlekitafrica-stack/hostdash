'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StatsRow } from '@/components/stats/StatsRow';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [timeframe, setTimeframe] = useState('today');
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();

  // Listen for sidebar collapse state changes
  useEffect(() => {
    const handleSidebarChange = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.collapsed);
    };

    window.addEventListener('sidebarToggle', handleSidebarChange as EventListener);
    return () => window.removeEventListener('sidebarToggle', handleSidebarChange as EventListener);
  }, []);

  const handleAddBooking    = () => router.push('/booking-calendar');
  const handleAdjustPricing = () => router.push('/properties');
  const handleBlockDates    = () => router.push('/booking-calendar');
  const handleMessageGuest  = () => router.push('/guests');
  const handleGenerateReport = () => router.push('/reports');
  const handleAddProperty   = () => router.push('/properties');

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<any>(null);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [alertsSummary, setAlertsSummary] = useState<{ checkIns: number; checkOuts: number; unpaid: number; upcoming: number } | null>(null);
  const [activeSeries, setActiveSeries] = useState({ revenue: true, expenses: true, profit: true, occupancy: false });
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const getDateRange = useCallback(() => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    if (timeframe === 'today') { const t = fmt(today); return { from: t, to: t }; }
    if (timeframe === 'this week') {
      const day = today.getDay();
      const mon = new Date(today);
      mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
      return { from: fmt(mon), to: fmt(today) };
    }
    if (timeframe === 'this month') {
      return { from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), to: fmt(today) };
    }
    if (timeframe === 'this year') {
      return { from: fmt(new Date(today.getFullYear(), 0, 1)), to: fmt(today) };
    }
    return { from: customFrom, to: customTo };
  }, [timeframe, customFrom, customTo]);

  useEffect(() => {
    const { from, to } = getDateRange();
    setLoading(true);
    fetch(`/api/dashboard/stats?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(data => { if (!data.error) setStats(data); })
      .finally(() => setLoading(false));
  }, [getDateRange]);

  useEffect(() => {
    const { from, to } = getDateRange();
    setTrendsLoading(true);
    fetch(`/api/dashboard/trends?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setTrends(d); })
      .finally(() => setTrendsLoading(false));
  }, [getDateRange]);

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then(d => {
        if (!d.error) setAlertsSummary({
          checkIns: d.checkIns?.length  ?? 0,
          checkOuts: d.checkOuts?.length ?? 0,
          unpaid:   d.unpaid?.length    ?? 0,
          upcoming: d.upcoming?.length  ?? 0,
        });
      });
  }, []);

  const periodLabel = timeframe === 'custom'
    ? `${customFrom.split('-').reverse().join('/')} – ${customTo.split('-').reverse().join('/')}`
    : timeframe.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const { from: _drFrom, to: _drTo } = getDateRange();
  const _fmtD = (iso: string) => iso.split('-').reverse().join('/');
  const dateRangeLabel = `${_fmtD(_drFrom)} – ${_fmtD(_drTo)}`;


  return (
    <div className="space-y-0">
      {/* Desktop Sticky Header + Action Buttons */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 hidden lg:block h-[80px]">
        <div className={`flex items-center h-[80px] px-3 sm:px-4 md:px-6 lg:px-8 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[100px]' : 'lg:pl-[300px]'}`}>
          {/* Action Buttons - scrollable */}
          <div className="flex gap-2 overflow-x-auto flex-1 scrollbar-hide" style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleAddBooking();
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-teal-500 text-teal-500 rounded-full hover:bg-teal-500 hover:text-white transition-colors font-medium text-xs whitespace-nowrap flex-shrink-0 min-w-[140px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14m7-7H5"/>
            </svg>
            Add Booking
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleAdjustPricing();
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-teal-500 text-teal-500 rounded-full hover:bg-teal-500 hover:text-white transition-colors font-medium text-xs whitespace-nowrap flex-shrink-0 min-w-[140px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="1"/>
              <circle cx="19" cy="12" r="1"/>
              <circle cx="5" cy="12" r="1"/>
            </svg>
            Adjust Pricing
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleBlockDates();
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-teal-500 text-teal-500 rounded-full hover:bg-teal-500 hover:text-white transition-colors font-medium text-xs whitespace-nowrap flex-shrink-0 min-w-[140px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            Block Dates
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleMessageGuest();
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-teal-500 text-teal-500 rounded-full hover:bg-teal-500 hover:text-white transition-colors font-medium text-xs whitespace-nowrap flex-shrink-0 min-w-[140px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Message Guest
          </button>
          <button
            type="button"
            onClick={handleGenerateReport}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-teal-500 text-teal-500 rounded-full hover:bg-teal-500 hover:text-white transition-colors font-medium text-xs whitespace-nowrap flex-shrink-0 min-w-[140px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
            Generate Report
          </button>
          <button
            type="button"
            onClick={handleAddProperty}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-teal-500 text-teal-500 rounded-full hover:bg-teal-500 hover:text-white transition-colors font-medium text-xs whitespace-nowrap flex-shrink-0 min-w-[140px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Add Property
          </button>
          </div>
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            <span className="text-xs text-gray-600">admin@kogelosuites.com</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`py-4 md:py-6 px-2 sm:px-4 md:px-6 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[280px] lg:pr-[200px]' : 'lg:pl-[456px] lg:pr-[200px]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back 👋</h2>
            <p className="text-sm text-gray-500 mt-0.5">Here&apos;s what&apos;s happening with your properties.</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}`}</style>
              {['Today', 'This Week', 'This Month', 'This Year', 'Custom'].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeframe(period.toLowerCase())}
                  className={`px-3 py-1.5 rounded-full font-semibold text-xs transition-all whitespace-nowrap flex-shrink-0 active:scale-95 ${
                    timeframe === period.toLowerCase()
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            {timeframe === 'custom' && (
              <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 w-fit border border-gray-200 shadow-sm">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="bg-transparent text-xs text-gray-700 font-medium focus:outline-none w-[108px] cursor-pointer"
                />
                <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M3 8h18"/><path d="M16 4l5 4-5 4"/>
                  <path d="M21 16H3"/><path d="M8 12l-5 4 5 4"/>
                </svg>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="bg-transparent text-xs text-gray-700 font-medium focus:outline-none w-[108px] cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Occupancy Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Occupancy</h3>
              <span className="text-xs text-gray-400">{periodLabel}</span>
            </div>
            
            {/* Stats Cards - Responsive Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Rate Card */}
              <div className="bg-red-50 rounded-xl p-5 border border-red-200 hover:shadow-md transition-shadow duration-300 flex flex-col items-center justify-center gap-3">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Rate</p>
                <p className="text-3xl font-bold text-red-600">{loading ? '…' : `${stats?.occupancy.rate ?? 0}%`}</p>
                <div className="w-16 bg-gray-300 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, stats?.occupancy.rate ?? 0)}%` }}></div>
                </div>
              </div>

              {/* Occupied Card */}
              <div className="bg-green-50 rounded-xl p-5 border border-green-200 hover:shadow-md transition-shadow duration-300 flex flex-col items-center justify-center gap-3">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Occupied</p>
                <p className="text-3xl font-bold text-green-600">{loading ? '…' : stats?.occupancy.occupied ?? 0}</p>
                <div className="w-16 bg-gray-300 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: (stats?.properties?.length ?? 0) > 0 ? `${Math.round(((stats?.occupancy.occupied ?? 0) / stats.properties.length) * 100)}%` : '0%' }}></div>
                </div>
              </div>

              {/* Available Card */}
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-200 hover:shadow-md transition-shadow duration-300 flex flex-col items-center justify-center gap-3">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Available</p>
                <p className="text-3xl font-bold text-blue-600">{loading ? '…' : stats?.occupancy.available ?? 0}</p>
                <div className="w-16 bg-gray-300 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: (stats?.properties?.length ?? 0) > 0 ? `${Math.round(((stats?.occupancy.available ?? 0) / stats.properties.length) * 100)}%` : '0%' }}></div>
                </div>
              </div>

              {/* Blocked Card */}
              <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 hover:shadow-md transition-shadow duration-300 flex flex-col items-center justify-center gap-3">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Blocked</p>
                <p className="text-3xl font-bold text-amber-600">{loading ? '…' : stats?.occupancy.blocked ?? 0}</p>
                <div className="w-16 bg-gray-300 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>

            {/* Unit Status Section */}
            <div className="pt-4 border-t border-gray-200 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit Status</h4>
                {(stats?.properties ?? []).length > 3 && (
                  <button
                    onClick={() => router.push('/properties')}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium hover:underline"
                  >
                    See more
                  </button>
                )}
              </div>
              {(stats?.properties ?? []).length === 0 ? (
                <p className="text-xs text-gray-400">No properties yet.</p>
              ) : (stats.properties as any[]).slice(0, 3).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-1">
                  <span className="text-sm text-gray-700 font-medium truncate max-w-[130px]">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${p.status === 'available' ? 'bg-green-500' : p.status === 'occupied' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                    <span className={`text-xs font-medium capitalize ${p.status === 'available' ? 'text-green-700' : p.status === 'occupied' ? 'text-red-700' : 'text-amber-700'}`}>{p.status}</span>
                  </div>
                </div>
              ))}
              {(stats?.properties ?? []).length > 3 && (
                <button
                  onClick={() => router.push('/properties')}
                  className="w-full mt-1 text-xs text-teal-600 hover:text-teal-700 font-medium text-center py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  See all {(stats.properties as any[]).length} units →
                </button>
              )}
            </div>

            {/* Booking Forecast */}
            <div className="flex items-center gap-6">
              <div className="flex flex-col gap-1">
                <p className="text-xs text-gray-600 font-medium">Next 7 days</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-teal-700">{loading ? '…' : `${stats?.forecast.next7 ?? 0}%`}</p>
                  <div className="w-12 h-2 bg-gray-300 rounded-full overflow-hidden">
                    <div className="bg-teal-500 h-full" style={{ width: `${stats?.forecast.next7 ?? 0}%` }}></div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">booked</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs text-gray-600 font-medium">Next 30 days</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-gray-900">{loading ? '…' : `${stats?.forecast.next30 ?? 0}%`}</p>
                  <div className="w-12 h-2 bg-gray-300 rounded-full overflow-hidden">
                    <div className="bg-gray-700 h-full" style={{ width: `${stats?.forecast.next30 ?? 0}%` }}></div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">booked</p>
              </div>
            </div>
          </div>

          {/* Revenue Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Revenue</h3>
              <span className="text-xs text-gray-400">{periodLabel}</span>
            </div>
            <div className="space-y-4">
              {/* Total Revenue */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">TOTAL REVENUE</p>
                <p className="text-3xl font-bold text-teal-600 mt-2">{loading ? '…' : `KSH ${(stats?.revenue.total ?? 0).toLocaleString()}`}</p>
              </div>

              {/* Revenue Breakdown - Stacked Progress Bar */}
              <div>
                <p className="text-xs text-gray-600 font-medium mb-2">Revenue breakdown — KSH {(stats?.revenue.total ?? 0).toLocaleString()} total</p>
                
                {/* Stacked Progress Bar */}
                <div className="flex h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
                  <div className="bg-teal-500 h-full" style={{ width: (stats?.revenue.total ?? 0) > 0 ? `${Math.round((stats.revenue.stay / stats.revenue.total) * 100)}%` : '0%' }}></div>
                  <div className="bg-purple-500 h-full" style={{ width: (stats?.revenue.total ?? 0) > 0 ? `${Math.round((stats.revenue.cleaning / stats.revenue.total) * 100)}%` : '0%' }}></div>
                  <div className="bg-red-500 h-full" style={{ width: (stats?.revenue.total ?? 0) > 0 ? `${Math.round((stats.revenue.extra / stats.revenue.total) * 100)}%` : '0%' }}></div>
                </div>

                {/* Legend */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                    <span className="text-xs text-gray-700">Stay KSH {(stats?.revenue.stay ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-xs text-gray-700">Cleaning KSH {(stats?.revenue.cleaning ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-gray-700">Extra KSH {(stats?.revenue.extra ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Warning Alert */}
              {!loading && (
                (stats?.occupancy.rate ?? 0) < 60 ? (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200 flex gap-2">
                    <span className="text-lg">🔴</span>
                    <p className="text-sm text-red-800">Occupancy is {stats?.occupancy.rate ?? 0}%. A 10-15% discount could fill more nights.</p>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200 flex gap-2">
                    <span className="text-lg">✅</span>
                    <p className="text-sm text-green-800">Good occupancy at {stats?.occupancy.rate ?? 0}%. Keep it up!</p>
                  </div>
                )
              )}

              {/* Revenue sparkline — period-aware */}
              {(() => {
                const rangeDays = Math.round((new Date(_drTo).getTime() - new Date(_drFrom).getTime()) / 86400000) + 1;
                const sparkLabel = rangeDays <= 60 ? 'Daily payments' : rangeDays <= 365 ? 'Weekly payments' : 'Monthly payments';

                const buildSparkData = (cf: any[]): Array<{ total: number }> => {
                  if (rangeDays <= 60) return cf.map((r: any) => ({ total: Number(r.total) || 0 }));
                  if (rangeDays <= 365) {
                    const wkMap: Record<string, number> = {};
                    cf.forEach((r: any) => {
                      const d = new Date(r.date + 'T12:00:00'); const day = d.getDay();
                      const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
                      const wk = mon.toISOString().split('T')[0];
                      wkMap[wk] = (wkMap[wk] || 0) + (Number(r.total) || 0);
                    });
                    return Object.keys(wkMap).sort().map(k => ({ total: wkMap[k] }));
                  }
                  const moMap: Record<string, number> = {};
                  cf.forEach((r: any) => { const ym = r.date.slice(0, 7); moMap[ym] = (moMap[ym] || 0) + (Number(r.total) || 0); });
                  return Object.keys(moMap).sort().map(k => ({ total: moMap[k] }));
                };

                return (
                  <div className="mt-4">
                    <p className="text-xs text-gray-400 mb-1">{sparkLabel} — {periodLabel}</p>
                    <div className="h-24 bg-gradient-to-b from-gray-50 to-white rounded-lg overflow-hidden">
                      {loading ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (stats?.cashflow ?? []).length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-xs text-gray-400">No payments in this period</p>
                        </div>
                      ) : (() => {
                        const pts = buildSparkData(stats.cashflow);
                        const W = 300, H = 80;
                        const maxVal = Math.max(...pts.map(p => p.total), 1);
                        const n = pts.length;
                        const xs = pts.map((_, i) => n > 1 ? Math.round((i / (n - 1)) * W) : W / 2);
                        const ys = pts.map(p => Math.round(H - Math.max(3, (p.total / maxVal) * (H - 8))));
                        const linePts = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
                        const areaD = `M ${xs[0]},${ys[0]} ` + xs.slice(1).map((x, i) => `L ${x},${ys[i + 1]}`).join(' ') + ` L ${xs[n - 1]},${H} L ${xs[0]},${H} Z`;
                        return (
                          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.02" />
                              </linearGradient>
                            </defs>
                            <path d={areaD} fill="url(#sparkGrad)" />
                            <polyline points={linePts} stroke="#14b8a6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Bookings Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-semibold text-gray-900">Bookings</h3>
              <span className="text-xs text-gray-500">{periodLabel}</span>
            </div>

            {/* Top Row - 3 Stat Boxes */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {/* Rooms Sold - Bed */}
              <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:shadow-sm transition-shadow">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M3 10h18M3 10v8a2 2 0 002 2h14a2 2 0 002-2v-8M3 10l1.5-3h15l1.5 3M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
                <p className="text-2xl font-bold text-gray-900">{loading ? '…' : stats?.bookings.roomsSold ?? 0}</p>
                <p className="text-xs text-gray-600">Rooms Sold</p>
              </div>

              {/* New Today - Plus */}
              <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:shadow-sm transition-shadow">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 5v14m7-7H5"/>
                </svg>
                <p className="text-2xl font-bold text-gray-900">{loading ? '…' : stats?.bookings.newToday ?? 0}</p>
                <p className="text-xs text-gray-600">New Today</p>
              </div>

              {/* Cancellations - X Circle */}
              <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:shadow-sm transition-shadow">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
                <p className="text-2xl font-bold text-gray-900">{loading ? '…' : stats?.bookings.cancellations ?? 0}</p>
                <p className="text-xs text-gray-600">Cancellations</p>
              </div>
            </div>

            {/* Second Row - 2 Wider Stat Boxes */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {/* Check-ins - Login */}
              <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:shadow-sm transition-shadow">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M11 16l-4-4m0 0l4-4m-4 4h12.5M11 5h7a2 2 0 012 2v10a2 2 0 01-2 2h-7"/>
                </svg>
                <p className="text-2xl font-bold text-gray-900">{loading ? '…' : stats?.bookings.checkInsToday ?? 0}</p>
                <p className="text-xs text-gray-600">Check-ins</p>
              </div>

              {/* Check-outs - Door Exit */}
              <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:shadow-sm transition-shadow">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 11l3 3 5-5M12 3v2"/>
                </svg>
                <p className="text-2xl font-bold text-gray-900">{loading ? '…' : stats?.bookings.checkOutsToday ?? 0}</p>
                <p className="text-xs text-gray-600">Check-outs</p>
              </div>
            </div>

            {/* Bottom Section - Donut Chart & Source Legend */}
            {(() => {
              const sources = stats?.bookings.sources ?? {};
              const total = stats?.bookings.roomsSold ?? 0;
              const sorted = Object.entries(sources).sort(([,a],[,b]) => (b as number) - (a as number));
              const topEntry = sorted[0];
              const COLORS = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4'];
              const circumference = 251.2;
              let offset = 0;
              const segments = sorted.map(([src, cnt], i) => {
                const pct = total > 0 ? (cnt as number) / total : 0;
                const dash = pct * circumference;
                const seg = { src, pct: Math.round(pct * 100), dash, offset, color: COLORS[i % COLORS.length] };
                offset += dash;
                return seg;
              });
              return (
                <div className="flex gap-4 items-center">
                  <div className="flex-shrink-0">
                    <svg width="88" height="88" viewBox="0 0 100 100" className="transform -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                      {segments.length === 0 && (
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" strokeDasharray="251.2 251.2" />
                      )}
                      {segments.map((s, i) => (
                        <circle key={i} cx="50" cy="50" r="40" fill="none"
                          stroke={s.color} strokeWidth="10"
                          strokeDasharray={`${s.dash} ${circumference}`}
                          strokeDashoffset={-s.offset}
                          strokeLinecap="butt" />
                      ))}
                    </svg>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {sorted.length === 0 ? (
                      <p className="text-xs text-gray-400">No booking data yet</p>
                    ) : sorted.map(([src, cnt], i) => {
                      const pct = total > 0 ? Math.round(((cnt as number) / total) * 100) : 0;
                      return (
                        <div key={src} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-sm font-medium text-gray-800 capitalize truncate">{src}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900 flex-shrink-0 ml-2">{loading ? '…' : `${pct}%`}</span>
                        </div>
                      );
                    })}
                    {topEntry && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 flex items-center gap-1.5 mt-2">
                        <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-xs text-amber-900 font-medium capitalize">{topEntry[0]} is your #1 source</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Unit Performance Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Unit Performance</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{periodLabel}</span>
                {(stats?.unitPerformance ?? []).length > 4 && (
                  <button
                    onClick={() => router.push('/unit-performance')}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium hover:underline"
                  >
                    See more
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 font-medium">
                    <th className="text-left px-5 py-2.5">Unit</th>
                    <th className="text-left px-4 py-2.5">Occupancy</th>
                    <th className="text-left px-4 py-2.5">Rev ↓</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} className="px-5 py-6 text-center text-gray-400 text-xs">Loading…</td></tr>
                  ) : (stats?.unitPerformance ?? []).length === 0 ? (
                    <tr><td colSpan={3} className="px-5 py-6 text-center text-gray-400 text-xs">No active properties yet.</td></tr>
                  ) : (stats.unitPerformance as any[]).slice(0, 4).map((u: any) => {
                    const maxRev = stats.maxUnitRevenue ?? 1;
                    return (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${u.status === 'occupied' ? 'bg-blue-500' : 'bg-green-500'}`} />
                            <span className="text-gray-800 font-medium truncate max-w-[120px]">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-600 font-medium">{u.occupancyPct}%</span>
                            <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.min(100, u.occupancyPct)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-700 font-medium whitespace-nowrap">Ksh {Number(u.revenue).toLocaleString()}</span>
                            <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${u.revenue > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                                style={{ width: maxRev > 0 ? `${Math.round((u.revenue / maxRev) * 100)}%` : '0%' }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(stats?.unitPerformance ?? []).length > 4 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => router.push('/unit-performance')}
                  className="w-full text-xs text-teal-600 hover:text-teal-700 font-medium text-center hover:underline"
                >
                  See all {(stats.unitPerformance as any[]).length} units →
                </button>
              </div>
            )}
          </div>

          {/* Payment Methods Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                Payment Methods
              </h3>
              <span className="text-xs text-gray-400">{periodLabel}</span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'M-Pesa', val: stats?.revenue.mpesa ?? 0, color: 'bg-green-500' },
                { label: 'Cash',   val: stats?.revenue.cash  ?? 0, color: 'bg-blue-500'  },
                { label: 'Other',  val: Math.max(0, (stats?.revenue.total ?? 0) - (stats?.revenue.mpesa ?? 0) - (stats?.revenue.cash ?? 0)), color: 'bg-gray-400' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                    <p className="text-sm text-gray-600">KSH {item.val.toLocaleString()}</p>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: (stats?.revenue.total ?? 0) > 0 ? `${Math.round((item.val / stats.revenue.total) * 100)}%` : '0%' }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(stats?.revenue.total ?? 0) > 0 ? `${Math.round((item.val / stats.revenue.total) * 100)}%` : '0%'} of total
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Alerts ── */}
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">Alerts</h3>
            <a href="/alerts" className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors font-medium">
              All Alerts
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>
          {alertsSummary === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (alertsSummary.checkIns + alertsSummary.checkOuts + alertsSummary.unpaid + alertsSummary.upcoming) === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              No urgent alerts right now.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {alertsSummary.checkIns > 0 && <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 font-medium">{alertsSummary.checkIns} Check-in{alertsSummary.checkIns !== 1 ? 's' : ''} today</span>}
              {alertsSummary.checkOuts > 0 && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 font-medium">{alertsSummary.checkOuts} Check-out{alertsSummary.checkOuts !== 1 ? 's' : ''} today</span>}
              {alertsSummary.unpaid > 0 && <span className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1 font-medium">{alertsSummary.unpaid} Unpaid balance{alertsSummary.unpaid !== 1 ? 's' : ''}</span>}
              {alertsSummary.upcoming > 0 && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 font-medium">{alertsSummary.upcoming} Upcoming this week</span>}
            </div>
          )}
        </div>

        {/* ── 12-Month Trends ── */}
        <div className="mt-4 mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-base font-bold text-gray-900">Trends — {periodLabel}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Hover to see exact values</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'revenue',   label: 'Revenue',   on: 'bg-green-50 border-green-400 text-green-700',    dot: 'bg-green-500'  },
                { key: 'expenses',  label: 'Expenses',  on: 'bg-red-50 border-red-400 text-red-600',          dot: 'bg-red-500'    },
                { key: 'profit',    label: 'Profit',    on: 'bg-blue-50 border-blue-400 text-blue-700',       dot: 'bg-blue-500'   },
                { key: 'occupancy', label: 'Occupancy', on: 'bg-purple-50 border-purple-400 text-purple-700', dot: 'bg-purple-500' },
              ] as const).map(s => (
                <button key={s.key}
                  onClick={() => setActiveSeries(p => ({ ...p, [s.key]: !p[s.key] }))}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-semibold transition-all ${
                    activeSeries[s.key] ? s.on : 'bg-white border-gray-200 text-gray-300'
                  }`}>
                  <div className={`w-2 h-2 rounded-full ${activeSeries[s.key] ? s.dot : 'bg-gray-200'}`} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {trendsLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (() => {
            const monthly: any[] = trends?.monthly ?? [];
            if (monthly.length === 0) return <p className="text-sm text-gray-400 py-8 text-center">No trend data yet.</p>;

            const todayIso = new Date().toISOString().split('T')[0];

            const W = 820, H = 220;
            const ML = 62, MR = activeSeries.occupancy ? 50 : 16, MT = 14, MB = 32;
            const cW = W - ML - MR;
            const cH = H - MT - MB;
            const n  = monthly.length;

            const kvs: number[] = [];
            if (activeSeries.revenue)  monthly.forEach((m: any) => kvs.push(Number(m.revenue)  || 0));
            if (activeSeries.expenses) monthly.forEach((m: any) => kvs.push(Number(m.expenses) || 0));
            if (activeSeries.profit)   monthly.forEach((m: any) => kvs.push(Number(m.profit)   || 0));
            const rawMax = kvs.length > 0 ? Math.max(...kvs, 1) : 10000;
            const mag    = Math.pow(10, Math.floor(Math.log10(rawMax)));
            const maxVal = Math.ceil(rawMax / (mag * 2)) * (mag * 2) || 10000;

            const baseline = MT + cH;
            const yOf = (v: number) => baseline - Math.max(0, Math.min(cH, (Math.max(0, v) / maxVal) * cH));
            const hOf = (v: number) => Math.max(0, Math.min(cH, (Math.max(0, v) / maxVal) * cH));
            const occY = (p: number) => baseline - Math.max(0, Math.min(cH, (Math.max(0, p) / 100) * cH));

            const groupW  = cW / n;
            const pad     = groupW * 0.2;
            const barW    = (groupW - pad * 2) / 3;
            const groupCx = (i: number) => ML + i * groupW + groupW / 2;

            const grids = [0, 0.25, 0.5, 0.75, 1].map(f => ({
              y: MT + cH * (1 - f),
              label: f * maxVal >= 1000 ? `${((f * maxVal) / 1000).toFixed(0)}k` : (f * maxVal).toFixed(0),
            }));

            const occPts = monthly.map((m: any, i: number) => `${groupCx(i)},${occY(Number(m.occupancy) || 0)}`).join(' ');

            const hm  = hoveredMonth !== null ? monthly[hoveredMonth] : null;
            const ttW = 148;
            const activeCnt = [activeSeries.revenue, activeSeries.expenses, activeSeries.profit, activeSeries.occupancy].filter(Boolean).length;
            const ttH = 18 + activeCnt * 16 + 6;
            const ttRawX = hoveredMonth !== null ? groupCx(hoveredMonth) - ttW / 2 : 0;
            const ttX = Math.max(ML, Math.min(W - MR - ttW, ttRawX));

            return (
              <>
                <div className="overflow-x-auto -mx-1">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" style={{ overflow: 'visible' }}
                  onMouseLeave={() => setHoveredMonth(null)}>

                  {/* Current period highlight */}
                  {monthly.map((m: any, i: number) => (m.from <= todayIso && todayIso <= m.to) ? (
                    <rect key={`hl${i}`} x={ML + i * groupW} y={MT} width={groupW} height={cH}
                      fill="#f0fdf4" rx="3" />
                  ) : null)}

                  {/* Gridlines + left Y labels */}
                  {grids.map((g, i) => (
                    <g key={`grid-${i}`}>
                      <line x1={ML} y1={g.y} x2={W - MR} y2={g.y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
                      <text x={ML - 6} y={g.y + 4} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="system-ui,sans-serif">{g.label}</text>
                    </g>
                  ))}

                  {/* Right Y axis — occupancy % */}
                  {activeSeries.occupancy && [0, 25, 50, 75, 100].map(pct => (
                    <text key={pct} x={W - MR + 6} y={occY(pct) + 4} textAnchor="start"
                      fontSize="9" fill="#a855f7" fontFamily="system-ui,sans-serif">{pct}%</text>
                  ))}

                  {/* Baseline */}
                  <line x1={ML} y1={baseline} x2={W - MR} y2={baseline} stroke="#d1d5db" strokeWidth="1" />

                  {/* Bars + hover targets */}
                  {monthly.map((m: any, i: number) => {
                    const gx = ML + i * groupW + pad;
                    const isH = hoveredMonth === i;
                    return (
                      <g key={`bar-${i}`}>
                        {isH && <rect x={ML + i * groupW + 1} y={MT} width={groupW - 2} height={cH} fill="#f9fafb" rx="2" />}
                        {activeSeries.revenue && (
                          <rect x={gx} y={yOf(Number(m.revenue) || 0)} width={barW - 1} height={hOf(Number(m.revenue) || 0)}
                            fill="#16a34a" rx="2" opacity={isH ? 1 : 0.8} />
                        )}
                        {activeSeries.expenses && (
                          <rect x={gx + barW} y={yOf(Number(m.expenses) || 0)} width={barW - 1} height={hOf(Number(m.expenses) || 0)}
                            fill="#ef4444" rx="2" opacity={isH ? 1 : 0.75} />
                        )}
                        {activeSeries.profit && (
                          <rect x={gx + barW * 2} y={yOf(Number(m.profit) || 0)} width={barW - 1} height={hOf(Number(m.profit) || 0)}
                            fill="#2563eb" rx="2" opacity={isH ? 1 : 0.8} />
                        )}
                        {(() => {
                          const isCur = m.from <= todayIso && todayIso <= m.to;
                          const showLbl = n <= 20 || i % Math.ceil(n / 20) === 0 || i === n - 1;
                          return showLbl ? (
                            <text x={groupCx(i)} y={H - 12} textAnchor="middle" fontSize="9"
                              fill={isCur ? '#16a34a' : '#9ca3af'}
                              fontWeight={isCur ? 'bold' : 'normal'}
                              fontFamily="system-ui,sans-serif">{m.label}</text>
                          ) : null;
                        })()}
                        <rect x={ML + i * groupW} y={MT} width={groupW} height={cH + MB}
                          fill="transparent" onMouseEnter={() => setHoveredMonth(i)} />
                      </g>
                    );
                  })}

                  {/* Occupancy line */}
                  {activeSeries.occupancy && monthly.length > 1 && (
                    <>
                      <polyline points={occPts} fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="6,3" opacity="0.9" />
                      {monthly.map((m: any, i: number) => (
                        <circle key={`occ-${i}`} cx={groupCx(i)} cy={occY(Number(m.occupancy) || 0)} r="3"
                          fill="#a855f7" stroke="white" strokeWidth="1.5" />
                      ))}
                    </>
                  )}

                  {/* Hover tooltip */}
                  {hm !== null && (
                    <g transform={`translate(${ttX},${MT})`}>
                      <rect width={ttW} height={ttH} rx="6" fill="white" stroke="#e5e7eb" strokeWidth="1"
                        style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.10))' }} />
                      <text x={ttW / 2} y="13" textAnchor="middle" fontSize="9.5" fontWeight="bold"
                        fill="#111827" fontFamily="system-ui,sans-serif">{hm.label}</text>
                      {(() => {
                        const rows: React.ReactElement[] = [];
                        let ry = 22;
                        if (activeSeries.revenue)  { rows.push(<g key="r" transform={`translate(10,${ry})`}><circle cx="5" cy="5" r="3.5" fill="#16a34a"/><text x="13" y="9" fontSize="9" fill="#374151" fontFamily="system-ui,sans-serif">Rev: Ksh {Number(hm.revenue||0).toLocaleString()}</text></g>); ry+=16; }
                        if (activeSeries.expenses) { rows.push(<g key="e" transform={`translate(10,${ry})`}><circle cx="5" cy="5" r="3.5" fill="#ef4444"/><text x="13" y="9" fontSize="9" fill="#374151" fontFamily="system-ui,sans-serif">Exp: Ksh {Number(hm.expenses||0).toLocaleString()}</text></g>); ry+=16; }
                        if (activeSeries.profit)   { rows.push(<g key="p" transform={`translate(10,${ry})`}><circle cx="5" cy="5" r="3.5" fill="#2563eb"/><text x="13" y="9" fontSize="9" fill="#374151" fontFamily="system-ui,sans-serif">Profit: Ksh {Number(hm.profit||0).toLocaleString()}</text></g>); ry+=16; }
                        if (activeSeries.occupancy){ rows.push(<g key="o" transform={`translate(10,${ry})`}><circle cx="5" cy="5" r="3.5" fill="#a855f7"/><text x="13" y="9" fontSize="9" fill="#374151" fontFamily="system-ui,sans-serif">Occ: {Number(hm.occupancy||0).toFixed(0)}%</text></g>); }
                        return rows;
                      })()}
                    </g>
                  )}
                </svg>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-5 mt-1 mb-3 text-xs">
                  {activeSeries.revenue  && <span className="flex items-center gap-1.5 text-green-700 font-medium"><span className="inline-block w-3 h-3 rounded-sm bg-green-500"/>Revenue</span>}
                  {activeSeries.expenses && <span className="flex items-center gap-1.5 text-red-600 font-medium"><span className="inline-block w-3 h-3 rounded-sm bg-red-500"/>Expenses</span>}
                  {activeSeries.profit   && <span className="flex items-center gap-1.5 text-blue-700 font-medium"><span className="inline-block w-3 h-3 rounded-sm bg-blue-500"/>Profit</span>}
                  {activeSeries.occupancy&& <span className="flex items-center gap-1.5 text-purple-700 font-medium"><span className="inline-block w-8 border-t-2 border-dashed border-purple-500"/>Occupancy %</span>}
                </div>

                {/* Summary stats */}
                <div className="flex flex-wrap gap-6 pt-3 border-t border-gray-100 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h3v3H2V2zm4 0h3v3H6V2zm4 0h4v3h-4V2zM2 6h3v3H2V6zm4 0h3v3H6V6zm4 0h4v3h-4V6zM2 10h3v4H2v-4zm4 0h3v4H6v-4zm4 0h4v4h-4v-4z"/></svg>
                    <span><strong>Best:</strong> {trends?.bestMonth ? `${trends.bestMonth.label} (Ksh ${Number(trends.bestMonth.revenue).toLocaleString()})` : '—'}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span><strong>Slowest:</strong> {trends?.slowestMonth?.label ?? '—'}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    <span><strong>Avg monthly:</strong> Ksh {Number(trends?.avgMonthly ?? 0).toLocaleString()}</span>
                  </span>
                </div>
              </>
            );
          })()}
        </div>

      </div>
    </div>
  );
}
