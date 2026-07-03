'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarItem } from './SidebarItem';
import { SidebarSection } from './SidebarSection';
import { SidebarUpgradeWidget } from './SidebarUpgradeWidget';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ isOpen = true, onClose, isMobile = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState('');
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const email = localStorage.getItem('user_email') || 'admin@hostdash.app';
    setUserEmail(email);
    const applyLocal = () => {};

    let alertTotal = 0;
    fetch('/api/alerts')
      .then(r => r.ok ? r.json() : {})
      .then((d: { checkIns?: unknown[]; checkOuts?: unknown[]; unpaid?: unknown[] }) => {
        alertTotal += (d.checkIns?.length ?? 0) + (d.checkOuts?.length ?? 0) + (d.unpaid?.length ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        fetch('/api/reminders')
          .then(r => r.ok ? r.json() : [])
          .then((list: { is_done: boolean }[]) => {
            alertTotal += list.filter(r => !r.is_done).length;
            setAlertCount(alertTotal);
          })
          .catch(() => setAlertCount(alertTotal));
      });
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMobile, isOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href);

  return (
    <div
      className={`
        fixed left-0 top-0 h-screen
        border-r border-slate-800 flex flex-col shadow-2xl rounded-r-2xl
        transition-all duration-300 ease-in-out z-40
        ${isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : ''}
        ${collapsed ? 'w-20' : 'w-64'}
      `}
      style={{ background: 'linear-gradient(to bottom, var(--brand-primary, #1e293b), var(--brand-primary-dark, #0f172a))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-6 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            {typeof window !== 'undefined' && localStorage.getItem('brand_logo') ? (
              <img src={localStorage.getItem('brand_logo')!} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white/10" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#9B1C1C' }}>
                HD
              </div>
            )}
            <span className="text-white font-bold text-lg">HostDash</span>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            {typeof window !== 'undefined' && localStorage.getItem('brand_logo') ? (
              <img src={localStorage.getItem('brand_logo')!} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white/10" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#9B1C1C' }}>
                HD
              </div>
            )}
          </div>
        )}

        {/* Close Button (Mobile) or Collapse Button (Desktop) */}
        <button
          onClick={() => {
            if (isMobile && onClose) {
              onClose();
            } else {
              const newCollapsedState = !collapsed;
              setCollapsed(newCollapsedState);
              // Emit event for dashboard to listen
              window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: { collapsed: newCollapsedState } }));
            }
          }}
          className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-300"
          title={isMobile ? 'Close sidebar' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isMobile ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${
                collapsed ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Navigation - Scrollable */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto px-2 py-6 space-y-6"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {/* HOSTING Section */}
        <SidebarSection title="HOSTING" collapsed={collapsed}>
          <SidebarItem
            icon={
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M3 13h2v8H3zm4-8h2v16H7zm4-2h2v18h-2zm4 4h2v14h-2zm4-4h2v18h-2z" />
              </svg>
            }
            label="Dashboard"
            href="/dashboard"
            isActive={isActive('/dashboard')}
            collapsed={collapsed}
          />
          <SidebarItem
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-4m0 0l4 4m-4-4v4"
                />
              </svg>
            }
            label="My Properties"
            href="/properties"
            isActive={isActive('/properties')}
            collapsed={collapsed}
          />
          <SidebarItem
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            }
            label="Unit Performance"
            href="/unit-performance"
            isActive={isActive('/unit-performance')}
            collapsed={collapsed}
          />
          <SidebarItem
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
            label="Booking Calendar"
            href="/booking-calendar"
            isActive={isActive('/booking-calendar')}
            collapsed={collapsed}
          />
          <SidebarItem
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM4 20h16a2 2 0 002-2v-2a3 3 0 00-5.856-1.487M9 10a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            label="Guests"
            href="/guests"
            isActive={isActive('/guests')}
            collapsed={collapsed}
          />
          <SidebarItem
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            }
            label="Alerts & Reminders"
            href="/alerts"
            isActive={isActive('/alerts')}
            collapsed={collapsed}
            badge={alertCount > 0 ? alertCount : undefined}
          />
        </SidebarSection>

        {/* BOOKKEEPING Section */}
        <SidebarSection title="BOOKKEEPING" collapsed={collapsed}>
          <SidebarItem
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            label="Expenses"
            href="/expenses"
            isActive={isActive('/expenses')}
            collapsed={collapsed}
          />
        </SidebarSection>

        {/* REPORTS Section */}
        <SidebarSection title="REPORTS" collapsed={collapsed}>
          <SidebarItem
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
            label="Reports Center"
            href="/reports"
            isActive={isActive('/reports')}
            collapsed={collapsed}
          />
        </SidebarSection>

        {/* SUPPORT Section */}
        <SidebarSection title="SUPPORT" collapsed={collapsed}>
          <SidebarItem
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
              </svg>
            }
            label="Help Center"
            href="/help"
            isActive={isActive('/help')}
            collapsed={collapsed}
          />
        </SidebarSection>

        {/* ACCOUNTS Section */}
        <SidebarSection title="ACCOUNTS" collapsed={collapsed}>
          <SidebarItem
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            label="Settings"
            href="/settings"
            isActive={isActive('/settings')}
            collapsed={collapsed}
          />
        </SidebarSection>
      </div>

      {/* Upgrade / Trial Section */}
      <div className="py-3 border-t border-slate-800">
        <SidebarUpgradeWidget collapsed={collapsed} />
      </div>
    </div>
  );
}
