'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface Unit {
  id: string;
  name: string;
  occupancy: number;
  revenue: number;
  bookings: number;
  score: number;
  adr?: number;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildMonthOptions() {
  const options: { label: string; year: number; month: number }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, year: d.getFullYear(), month: d.getMonth() });
  }
  return options;
}

function getOccupancyBucket(occ: number) {
  if (occ >= 90) return '90-100%';
  if (occ >= 80) return '80-89%';
  if (occ >= 70) return '70-79%';
  if (occ >= 60) return '60-69%';
  if (occ >= 50) return '50-59%';
  if (occ >= 40) return '40-49%';
  if (occ >= 30) return '30-39%';
  return '0-29%';
}

const BUCKETS = ['90-100%','80-89%','70-79%','60-69%','50-59%','40-49%','30-39%','0-29%'];

export default function UnitPerformancePage() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [underperformersOnly, setUnderperformersOnly] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ collapsed: boolean }>).detail;
      setSidebarCollapsed(detail.collapsed);
    };
    window.addEventListener('sidebarToggle', handler);
    return () => window.removeEventListener('sidebarToggle', handler);
  }, []);

  useEffect(() => {
    const email = localStorage.getItem('user_email') || 'admin@hostdash.app';
    setUserEmail(email);
  }, []);

  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0); // 0 = current month

  const fetchUnits = useCallback(async (idx: number) => {
    const opt = monthOptions[idx];
    if (!opt) return;
    setLoading(true);
    try {
      const from = new Date(opt.year, opt.month, 1).toISOString().split('T')[0];
      const to = new Date(opt.year, opt.month + 1, 0).toISOString().split('T')[0];
      const res = await fetch(`/api/units/performance?from=${from}&to=${to}`);
      const data = await res.json();
      if (!data.error) setUnits(data.units || []);
    } finally {
      setLoading(false);
    }
  }, [monthOptions]);

  useEffect(() => { fetchUnits(selectedMonthIdx); }, [selectedMonthIdx, fetchUnits]);

  const sorted = [...units].sort((a, b) => b.score - a.score);
  const groupFiltered = selectedGroup === 'all' ? sorted : sorted.filter(u => u.name.toLowerCase().includes(selectedGroup.toLowerCase()));
  const displayed = underperformersOnly ? groupFiltered.filter(u => u.occupancy < 30) : groupFiltered;
  // Attention section and charts respond to group filter but not underperformers toggle
  const attention = groupFiltered.filter(u => u.occupancy < 30);

  // KPIs reflect the active group filter
  const kpiUnits = groupFiltered;
  const totalUnits = units.length; // total is always all units
  const avgOccupancy = kpiUnits.length > 0 ? (kpiUnits.reduce((s, u) => s + u.occupancy, 0) / kpiUnits.length) : 0;
  const avgRevenue = kpiUnits.length > 0 ? Math.round(kpiUnits.reduce((s, u) => s + u.revenue, 0) / kpiUnits.length) : 0;
  const totalRevenue = kpiUnits.reduce((s, u) => s + u.revenue, 0);

  // Occupancy distribution buckets — respond to group filter
  const bucketCounts: Record<string, number> = {};
  BUCKETS.forEach(b => { bucketCounts[b] = 0; });
  groupFiltered.forEach(u => { bucketCounts[getOccupancyBucket(u.occupancy)]++; });
  const bucketValues = Object.values(bucketCounts);
  const maxBucket = bucketValues.length > 0 ? Math.max(...bucketValues, 1) : 1;

  // Score bar color
  const scoreBarColor = (s: number) => s >= 70 ? '#22c55e' : s >= 40 ? '#f97316' : '#ef4444';
  const scoreTextColor = (s: number) => s >= 70 ? 'text-green-600' : s >= 40 ? 'text-orange-500' : 'text-red-500';
  const occTextColor = (o: number) => o >= 60 ? 'text-green-600' : o >= 30 ? 'text-orange-500' : 'text-red-500';
  const dotColor = (idx: number) => idx === 0 ? 'bg-blue-500' : 'bg-green-500';

  // ADR scatter — respond to group filter
  const chartW = 340; const chartH = 220;
  const adrValues = groupFiltered.map(u => u.adr ?? 0).filter(v => v > 0);
  const maxAdr = adrValues.length > 0 ? Math.max(...adrValues) : 10000;
  const midAdr = Math.round(maxAdr / 2);
  const toX = (adr: number) => 50 + ((maxAdr - adr) / maxAdr) * (chartW - 10);
  const toY = (occ: number) => 10 + ((100 - occ) / 100) * (chartH - 20);
  const fmtK = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`;

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
            <div>
              <h1 className="text-lg font-bold text-gray-900">Unit Performance</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Leaderboard, analytics and diagnostics for all your units</p>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className={`px-2 py-4 sm:p-6 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[280px] lg:pr-[200px]' : 'lg:pl-[456px] lg:pr-[200px]'}`}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Month picker */}
            <div className="relative">
              <select
                value={selectedMonthIdx}
                onChange={e => setSelectedMonthIdx(Number(e.target.value))}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                {monthOptions.map((opt, i) => (
                  <option key={opt.label} value={i}>{opt.label}</option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {/* All groups */}
            <div className="relative">
              <select
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="all">All groups</option>
                {[...new Set(units.map(u => u.name.split(' ')[0]))].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {/* Underperformers */}
            <button
              onClick={() => setUnderperformersOnly(p => !p)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition ${
                underperformersOnly
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Underperformers only
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Units', value: loading ? '…' : totalUnits.toString() },
            { label: 'Avg Occupancy', value: loading ? '…' : `${avgOccupancy.toFixed(1)}%` },
            { label: 'Avg Revenue', value: loading ? '…' : `Ksh ${avgRevenue.toLocaleString()}` },
            { label: 'Total Revenue', value: loading ? '…' : `Ksh ${totalRevenue.toLocaleString()}`, bold: true },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <p className="text-xs text-gray-500 font-medium mb-2">{kpi.label}</p>
              <p className={`text-2xl font-bold text-gray-900 ${kpi.bold ? '' : ''}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Performance Leaderboard */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <h2 className="text-lg font-bold text-gray-900">Performance Leaderboard</h2>
            </div>
            <span className="text-sm text-gray-400">{units.length} units</span>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No units found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-center">
                    <th className="pb-3 px-2 text-xs font-semibold text-gray-500">Rank</th>
                    <th className="pb-3 px-2 text-xs font-semibold text-gray-500 text-left">Unit ↕</th>
                    <th className="pb-3 px-2 text-xs font-semibold text-gray-500">Occupancy ↕</th>
                    <th className="hidden sm:table-cell pb-3 px-2 text-xs font-semibold text-gray-500">Revenue ↕</th>
                    <th className="hidden sm:table-cell pb-3 px-2 text-xs font-semibold text-gray-500">Bookings ↕</th>
                    <th className="hidden sm:table-cell pb-3 px-2 text-xs font-semibold text-gray-500">Score ↕</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((unit, idx) => (
                    <tr key={unit.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-4 px-2 text-sm font-bold text-gray-900">#{idx + 1}</td>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor(idx)}`}></div>
                          <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{unit.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.max(2, unit.occupancy)}%`, backgroundColor: scoreBarColor(unit.occupancy) }}></div>
                          </div>
                          <span className={`text-sm font-semibold ${occTextColor(unit.occupancy)}`}>{unit.occupancy}%</span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell py-4 px-2 text-sm font-semibold text-gray-900 whitespace-nowrap">
                        Ksh {unit.revenue.toLocaleString()}
                      </td>
                      <td className="hidden sm:table-cell py-4 px-2 text-sm font-semibold text-gray-900">{unit.bookings}</td>
                      <td className="hidden sm:table-cell py-4 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.max(1, unit.score)}%`, backgroundColor: scoreBarColor(unit.score) }}></div>
                          </div>
                          <span className={`text-sm font-bold w-6 text-right ${scoreTextColor(unit.score)}`}>{unit.score}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <button className="text-gray-400 hover:text-gray-600 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ADR vs Occupancy Scatter */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">ADR vs Occupancy</h3>
            </div>
            <div className="flex items-center justify-between text-xs mb-4">
              <div className="flex items-center gap-1 text-blue-600">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Price Down</span>
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                </svg>
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <span className="font-medium">Sweet Spot</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19l7-7-7-7" />
                </svg>
              </div>
            </div>
            <svg viewBox="0 0 400 260" className="w-full h-56">
              {/* Dashed guide line */}
              <line x1="50" y1="220" x2="390" y2="220" stroke="#d1d5db" strokeWidth="1" strokeDasharray="4 3" />
              {/* Grid */}
              {[0,25,50,75,100].map((pct,i) => (
                <line key={i} x1="50" x2="390" y1={10 + (4-i)*((220-10)/4)} y2={10 + (4-i)*((220-10)/4)} stroke="#f3f4f6" strokeWidth="1" />
              ))}
              {/* Axes */}
              <line x1="50" y1="8" x2="50" y2="220" stroke="#9ca3af" strokeWidth="1.5" />
              <line x1="50" y1="220" x2="392" y2="220" stroke="#9ca3af" strokeWidth="1.5" />
              {/* Y labels */}
              {[0,25,50,75,100].map((pct,i) => (
                <text key={i} x="44" y={224 - i*((220-10)/4)} fontSize="10" fill="#9ca3af" textAnchor="end">{pct}%</text>
              ))}
              {/* X labels — dynamic based on actual ADR data */}
              <text x="110" y="236" fontSize="10" fill="#9ca3af" textAnchor="middle">{fmtK(maxAdr)}</text>
              <text x="220" y="236" fontSize="10" fill="#9ca3af" textAnchor="middle">{fmtK(midAdr)}</text>
              <text x="330" y="236" fontSize="10" fill="#9ca3af" textAnchor="middle">0</text>
              <text x="220" y="252" fontSize="10" fill="#6b7280" textAnchor="middle">ADR (KSH)</text>
              {/* Data points — respond to group filter */}
              {groupFiltered.map((u, i) => (
                <circle key={u.id} cx={toX(u.adr ?? 0)} cy={toY(u.occupancy)} r="6"
                  fill={i === 0 ? '#3b82f6' : '#10b981'}
                  stroke="white" strokeWidth="1.5" />
              ))}
              {/* "A" label */}
              <text x="388" y="218" fontSize="10" fill="#9ca3af">A</text>
            </svg>
          </div>

          {/* Occupancy Distribution — horizontal bar chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Occupancy Distribution</h3>
            <div className="space-y-2">
              {BUCKETS.map(bucket => {
                const count = bucketCounts[bucket] ?? 0;
                const barW = maxBucket > 0 ? (count / maxBucket) * 100 : 0;
                const isRed = bucket === '0-29%';
                return (
                  <div key={bucket} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 text-right flex-shrink-0">{bucket}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-sm overflow-hidden">
                      {count > 0 && (
                        <div
                          className="h-full rounded-sm transition-all duration-500"
                          style={{ width: `${barW}%`, backgroundColor: isRed ? '#ef4444' : '#3b82f6' }}
                        />
                      )}
                    </div>
                    <span className="text-xs text-gray-500 w-4 text-right">{count}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400 w-16"></span>
                <div className="flex-1 flex justify-between text-xs text-gray-400 px-0.5">
                  {Array.from({ length: Math.max(units.length, 1) + 1 }, (_, i) => (
                    <span key={i}>{i}</span>
                  ))}
                </div>
                <span className="w-4"></span>
              </div>
              <p className="text-xs text-gray-400 text-center">Units</p>
            </div>
          </div>
        </div>


      </div>
      </div>
    </div>
  );
}
