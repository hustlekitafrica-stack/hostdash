'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

type NavSection = 'quick' | 'financial' | 'property' | 'booking' | 'guest' | 'operational';

interface Report {
  name: string;
  desc: string;
  quick: boolean;
}

interface Section {
  id: NavSection;
  label: string;
  iconColor: string;
  navIcon: React.ReactNode;
  headerIcon: React.ReactNode;
  reports: Report[];
}

const SECTIONS: Section[] = [
  {
    id: 'financial',
    label: 'Financial Reports',
    iconColor: 'text-teal-600',
    navIcon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    headerIcon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    reports: [
      { name: 'Profit & Loss Statement', quick: true,  desc: 'Full income vs expenses breakdown with gross profit and margin.' },
      { name: 'Revenue Report',          quick: false, desc: 'Detailed breakdown of all income by property, category and date.' },
      { name: 'Expense Report',          quick: false, desc: 'All outgoings grouped by category and property with anomaly flags.' },
      { name: 'Cash Flow Report',        quick: false, desc: 'Money in vs money out with opening and closing balances.' },
    ],
  },
  {
    id: 'property',
    label: 'Property Reports',
    iconColor: 'text-blue-600',
    navIcon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    headerIcon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    reports: [
      { name: 'Occupancy Report', quick: false, desc: 'Nightly occupancy rates across your portfolio with trends.' },
    ],
  },
  {
    id: 'booking',
    label: 'Booking Reports',
    iconColor: 'text-purple-600',
    navIcon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    headerIcon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    reports: [
      { name: 'Booking Summary',    quick: true,  desc: 'All bookings with source, stay length and payment status breakdown.' },
      { name: 'Cancellations Report', quick: false, desc: 'Cancellation rates, revenue lost and recovery with insights.' },
      { name: 'Upcoming Bookings', quick: false, desc: 'Forward-looking view of all confirmed bookings in the next 30 days.' },
    ],
  },
  {
    id: 'guest',
    label: 'Guest Reports',
    iconColor: 'text-orange-500',
    navIcon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    headerIcon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    reports: [
      { name: 'Guest Directory', quick: true, desc: 'Full guest list with contact details, stay history and lifetime spend.' },
    ],
  },
  {
    id: 'operational',
    label: 'Operational Reports',
    iconColor: 'text-orange-500',
    navIcon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
    headerIcon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
    reports: [
      { name: 'Daily Operations Sheet', quick: true, desc: "Today's check-ins, check-outs, staying guests and vacant units." },
    ],
  },
];

const QUICK_BADGE = (
  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 ml-2">
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
    Quick
  </span>
);

interface ReportData {
  title: string;
  period: string;
  summary: { label: string; value: string }[];
  columns: string[];
  rows: (string | number)[][];
}

export default function ReportsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [activeSection, setActiveSection] = useState<NavSection | 'quick'>('quick');

  // Preview modal state
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [reportData, setReportData]   = useState<ReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const jan1  = `${new Date().getFullYear()}-01-01`;
  const [dateFrom, setDateFrom] = useState(jan1);
  const [dateTo,   setDateTo]   = useState(today);

  useEffect(() => {
    const h = (e: CustomEvent) => setSidebarCollapsed(e.detail.collapsed);
    window.addEventListener('sidebarToggle', h as EventListener);
    return () => window.removeEventListener('sidebarToggle', h as EventListener);
  }, []);

  useEffect(() => {
    const email = localStorage.getItem('user_email') || 'admin@hostdash.app';
    setUserEmail(email);
  }, []);

  const handleOpenReport = async (name: string, from = dateFrom, to = dateTo) => {
    setPreviewName(name);
    setLoadingReport(true);
    setReportData(null);
    try {
      const res = await fetch(
        `/api/reports/data?type=${encodeURIComponent(name)}&from=${from}&to=${to}`
      );
      const data = await res.json();
      if (res.ok) setReportData(data);
      else toast.error(data.error ?? 'Failed to load report');
    } catch {
      toast.error('Network error');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleRefresh = () => handleOpenReport(previewName!, dateFrom, dateTo);

  const handlePrint = () => {
    if (!reportData) return;
    const summaryHTML = reportData.summary.map(s =>
      `<div class="sc"><div class="sl">${s.label}</div><div class="sv">${s.value}</div></div>`
    ).join('');
    const headHTML = reportData.columns.map(c => `<th>${c}</th>`).join('');
    const bodyHTML = reportData.rows.length === 0
      ? `<tr><td colspan="${reportData.columns.length}" style="text-align:center;padding:32px;color:#9ca3af;">No data for this period</td></tr>`
      : reportData.rows.map(row =>
          `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
        ).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${reportData.title}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;padding:40px}
      .brand{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0f766e;margin-bottom:6px}
      h1{font-size:22px;font-weight:700;margin-bottom:3px}
      .period{font-size:13px;color:#6b7280;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #0f766e}
      .sg{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px}
      .sc{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;min-width:130px}
      .sl{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;margin-bottom:3px}
      .sv{font-size:17px;font-weight:700;color:#111827}
      table{width:100%;border-collapse:collapse}
      th{background:#f3f4f6;padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:#6b7280;border-bottom:1px solid #e5e7eb}
      td{padding:9px 12px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6}
      tr:last-child td{border-bottom:none}
      .footer{margin-top:28px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px}
      @media print{body{padding:20px}}
    </style></head><body>
      <div class="brand">HostDash</div>
      <h1>${reportData.title}</h1>
      <div class="period">Period: ${reportData.period}</div>
      <div class="sg">${summaryHTML}</div>
      <table><thead><tr>${headHTML}</tr></thead><tbody>${bodyHTML}</tbody></table>
      <div class="footer">Generated by HostDash &mdash; ${new Date().toLocaleDateString('en-KE',{dateStyle:'full'})}</div>
    </body></html>`;

    const w = window.open('', '_blank', 'width=1000,height=750');
    if (!w) { toast.error('Allow pop-ups to print / save PDF'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const handleEmailShare = () => {
    if (!reportData) return;
    const subject = encodeURIComponent(`${reportData.title} — HostDash`);
    const lines = reportData.summary.map(s => `${s.label}: ${s.value}`).join('\n');
    const body = encodeURIComponent(
      `${reportData.title}\nPeriod: ${reportData.period}\n\n${lines}\n\nGenerated by HostDash`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleWhatsAppShare = () => {
    if (!reportData) return;
    const lines = reportData.summary.map(s => `• ${s.label}: ${s.value}`).join('\n');
    const text = encodeURIComponent(
      `*${reportData.title}*\nPeriod: ${reportData.period}\n\n${lines}\n\n_Generated by HostDash_`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (!reportData) return;
    const lines = reportData.summary.map(s => `${s.label}: ${s.value}`).join('\n');
    const shareText = `${reportData.title}\nPeriod: ${reportData.period}\n\n${lines}\n\nGenerated by HostDash`;
    if (navigator.share) {
      await navigator.share({ title: reportData.title, text: shareText });
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success('Report summary copied to clipboard!');
    }
  };

  const allQuickReports = SECTIONS.flatMap(s =>
    s.reports.filter(r => r.quick).map(r => ({ ...r, sectionLabel: s.label, iconColor: s.iconColor }))
  );

  const activeData = SECTIONS.find(s => s.id === activeSection);

  const reportsToShow: Report[] =
    activeSection === 'quick'
      ? allQuickReports
      : (activeData?.reports ?? []);

  const sectionTitle =
    activeSection === 'quick' ? 'Quick Reports' : (activeData?.label ?? '');

  const sectionCount =
    activeSection === 'quick' ? allQuickReports.length : reportsToShow.length;

  const sectionSubtitle =
    activeSection === 'quick'
      ? `${sectionCount} report${sectionCount !== 1 ? 's' : ''} available — all instantly ready to preview and download.`
      : `${sectionCount} report${sectionCount !== 1 ? 's' : ''} available — click a card to expand, then preview before downloading.`;

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
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
            <h1 className="text-lg font-bold text-gray-900">Reports Center</h1>
          </div>
        </div>
      </div>

      {/* Mobile horizontal section nav */}
      <div className="lg:hidden sticky top-[80px] z-20 bg-white border-b border-gray-200">
        <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}`}</style>
          <button
            onClick={() => setActiveSection('quick')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 active:scale-95 ${
              activeSection === 'quick' ? 'bg-teal-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Quick
          </button>
          {SECTIONS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 active:scale-95 ${
                activeSection === item.id ? 'bg-teal-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className={activeSection === item.id ? 'text-white' : item.iconColor}>{item.navIcon}</span>
              {item.label.replace(' Reports', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className={`flex transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[280px] lg:pr-[200px]' : 'lg:pl-[456px] lg:pr-[200px]'}`}>

        {/* Left Report Nav */}
        <div className="hidden lg:flex flex-col w-56 flex-shrink-0 bg-[#f5f5f0] border-r border-gray-200 min-h-[calc(100vh-80px)] pt-5 px-3">
          {/* Quick Reports */}
          <button
            onClick={() => setActiveSection('quick')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-5 transition-colors ${activeSection === 'quick' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white/60'}`}
          >
            <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Quick Reports
          </button>

          {/* Browse */}
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">Browse</p>
          <div className="space-y-0.5">
            {SECTIONS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${activeSection === item.id ? 'bg-white text-gray-900 font-medium shadow-sm' : 'text-gray-600 hover:bg-white/60'}`}
              >
                <span className={item.iconColor}>{item.navIcon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-2 py-4 sm:p-8 min-w-0 max-w-3xl">

          {/* Section Header */}
          <div className="flex items-center gap-3 mb-1">
            {activeSection === 'quick' ? (
              <span className="text-teal-500">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </span>
            ) : (
              <span className={activeData?.iconColor}>
                {activeData?.headerIcon}
              </span>
            )}
            <h1 className="text-xl font-bold text-gray-900">{sectionTitle}</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6 ml-10">{sectionSubtitle}</p>

          {/* Report Cards — vertical list */}
          <div className="space-y-3">
            {reportsToShow.map((report) => (
              <button
                key={report.name}
                onClick={() => handleOpenReport(report.name)}
                className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-left hover:shadow-sm transition-shadow flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-gray-900">{report.name}</span>
                    {report.quick && QUICK_BADGE}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{report.desc}</p>
                </div>
                <svg className="w-5 h-5 text-gray-300 flex-shrink-0 ml-4 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {previewName && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center py-8 px-4">
            <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col">

              {/* Modal Header */}
              <div className="relative flex flex-wrap items-center gap-3 px-6 pr-14 py-4 border-b border-gray-200">
                {/* Close — pinned top-right */}
                <button onClick={() => { setPreviewName(null); setReportData(null); }}
                  className="absolute top-3 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-gray-900 truncate">{previewName}</h2>
                  {reportData && <p className="text-xs text-gray-400 mt-0.5">Period: {reportData.period}</p>}
                </div>

                {/* Date range + refresh */}
                <div className="flex items-center gap-1.5 text-sm">
                  <input type="date" value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  <span className="text-gray-400 text-xs">to</span>
                  <input type="date" value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  <button onClick={handleRefresh} title="Refresh"
                    className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 active:scale-95 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button onClick={handlePrint} disabled={!reportData}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                    </svg>
                    Print / PDF
                  </button>
                  <button onClick={handleNativeShare} disabled={!reportData}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-semibold hover:bg-teal-600 active:scale-95 disabled:opacity-40 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    Share
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto">
                {loadingReport ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading {previewName}...</p>
                  </div>
                ) : reportData ? (
                  <>
                    {/* Summary Cards */}
                    {reportData.summary.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                        {reportData.summary.map(s => (
                          <div key={s.label} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                            <p className="text-lg font-bold text-gray-900">{s.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Data Table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            {reportData.columns.map(col => (
                              <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.rows.length === 0 ? (
                            <tr><td colSpan={reportData.columns.length} className="text-center py-14 text-sm text-gray-400">No data for this period.</td></tr>
                          ) : (
                            reportData.rows.map((row, i) => (
                              <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                {row.map((cell, j) => (
                                  <td key={j} className="px-4 py-3 text-gray-700 whitespace-nowrap">{cell}</td>
                                ))}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <p className="text-xs text-gray-400 mt-4 text-right">
                      Generated by HostDash &mdash; {new Date().toLocaleDateString('en-KE', { dateStyle: 'full' })}
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 gap-2">
                    <p className="text-sm text-gray-400">Could not load report data. Please try again.</p>
                    <button onClick={handleRefresh} className="text-sm text-teal-600 underline">Retry</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
