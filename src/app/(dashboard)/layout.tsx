'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { MobileNav } from '@/components/navigation/MobileNav';
import { MobileHeader } from '@/components/navigation/MobileHeader';
import { Backdrop } from '@/components/navigation/Backdrop';
import { BrandProvider } from '@/components/providers/BrandProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/auth/login'); return; }
      } catch {
        router.push('/auth/login');
        return;
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const handler = () => setMobileMenuOpen(true);
    window.addEventListener('openMobileMenu', handler);
    return () => window.removeEventListener('openMobileMenu', handler);
  }, []);

  // Close mobile sidebar whenever the route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 flex-col lg:flex-row">
      {/* Desktop Sidebar - Hidden on mobile & tablet, visible on desktop */}
      <div className="hidden lg:block">
        <BrandProvider><Sidebar /></BrandProvider>
      </div>

      {/* Mobile Sidebar - Visible on mobile & tablet with animation */}
      <div className="lg:hidden">
        <BrandProvider>
          <Sidebar 
            isOpen={mobileMenuOpen} 
            onClose={() => setMobileMenuOpen(false)}
            isMobile={true}
          />
        </BrandProvider>
      </div>

      {/* Backdrop - Visible when mobile menu is open */}
      <Backdrop 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header with Burger Menu - Visible only on mobile & tablet */}
        <MobileHeader 
          onMenuOpen={() => setMobileMenuOpen(true)}
          onAddBooking={() => {}}
          onAdjustPricing={() => {}}
          onBlockDates={() => {}}
          onMessageGuest={() => {}}
          onGenerateReport={() => {}}
        />

        {/* Mobile Navigation - Visible only on mobile & tablet */}
        <MobileNav />

        {/* Page content - Add top padding on mobile to account for header + action buttons */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden lg:pt-0 pb-4 sm:pb-0 ${['/booking-calendar','/alerts','/guests','/unit-performance','/properties','/expenses','/reports','/settings','/help'].includes(pathname) ? 'pt-0' : 'pt-20'}`}>
          <BrandProvider>
            {children}
          </BrandProvider>
        </main>
      </div>
    </div>
  );
}
