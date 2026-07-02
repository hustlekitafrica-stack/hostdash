import { createClient } from '@/lib/supabase/server';
import { publicSupabase } from '@/lib/supabase/public';
import { NextResponse } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ADMIN_EMAIL || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Run all queries in parallel using service-role client (bypasses RLS)
    const [
      profilesResult,
      bookingsResult,
      paymentsResult,
      ticketsResult,
      pageViewsResult,
      recentUsersResult,
      recentTicketsResult,
      dailyRevenueResult,
    ] = await Promise.all([
      // All user profiles
      publicSupabase.from('profiles').select('id, email, full_name, subscription_status, subscription_plan, created_at').order('created_at', { ascending: false }),

      // All bookings (platform-wide)
      publicSupabase.from('bookings').select('id, status, total_amount, created_at').neq('status', 'blocked'),

      // All payment logs (platform-wide revenue)
      publicSupabase.from('payment_logs').select('amount, paid_at').gte('paid_at', thirtyDaysAgo + 'T00:00:00.000Z'),

      // Support tickets
      publicSupabase.from('support_tickets').select('id, status, subject, created_at, user_email').order('created_at', { ascending: false }),

      // Page views last 30 days
      publicSupabase.from('page_views').select('view_date, count').gte('view_date', thirtyDaysAgo).order('view_date', { ascending: true }),

      // Recent 10 signups
      publicSupabase.from('profiles').select('id, email, full_name, subscription_status, created_at').order('created_at', { ascending: false }).limit(10),

      // Recent 10 open tickets
      publicSupabase.from('support_tickets').select('id, subject, status, priority, user_email, created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(10),

      // Daily revenue last 30 days
      publicSupabase.from('payment_logs').select('amount, paid_at').gte('paid_at', thirtyDaysAgo + 'T00:00:00.000Z').order('paid_at', { ascending: true }),
    ]);

    const profiles = profilesResult.data ?? [];
    const bookings = bookingsResult.data ?? [];
    const payments = paymentsResult.data ?? [];
    const tickets  = ticketsResult.data ?? [];
    const pageViews = pageViewsResult.data ?? [];
    const recentUsers = recentUsersResult.data ?? [];
    const recentTickets = recentTicketsResult.data ?? [];
    const dailyPayments = dailyRevenueResult.data ?? [];

    // User stats
    const totalUsers = profiles.length;
    const paidUsers  = profiles.filter(p => p.subscription_status === 'paid').length;
    const trialUsers = profiles.filter(p => p.subscription_status !== 'paid').length;

    // Booking stats
    const confirmedBookings  = bookings.filter(b => b.status !== 'cancelled');
    const cancelledBookings  = bookings.filter(b => b.status === 'cancelled');
    const totalBookingRevenue = confirmedBookings.reduce((s, b) => s + Number(b.total_amount ?? 0), 0);

    // Payment stats (last 30 days)
    const totalPaymentsRevenue = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);

    // Ticket stats
    const openTickets     = tickets.filter(t => t.status === 'open').length;
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const totalTickets    = tickets.length;

    // Daily revenue chart (last 30 days)
    const revenueByDay: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
      revenueByDay[d.toISOString().split('T')[0]] = 0;
    }
    dailyPayments.forEach(p => {
      const day = p.paid_at.split('T')[0];
      if (day in revenueByDay) revenueByDay[day] += Number(p.amount ?? 0);
    });
    const dailyRevenueChart = Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue }));

    // Daily page views chart (last 30 days)
    const viewsByDay: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
      viewsByDay[d.toISOString().split('T')[0]] = 0;
    }
    pageViews.forEach(v => {
      if (v.view_date in viewsByDay) viewsByDay[v.view_date] += v.count;
    });
    const dailyViewsChart = Object.entries(viewsByDay).map(([date, views]) => ({ date, views }));

    // Total page views (all time)
    const totalPageViews = (pageViewsResult.data ?? []).reduce((s, v) => s + v.count, 0);

    return NextResponse.json({
      users: { total: totalUsers, paid: paidUsers, trial: trialUsers },
      bookings: { total: bookings.length, confirmed: confirmedBookings.length, cancelled: cancelledBookings.length, revenue: totalBookingRevenue },
      payments: { revenueThirtyDays: totalPaymentsRevenue },
      tickets: { total: totalTickets, open: openTickets, resolved: resolvedTickets },
      pageViews: { total: totalPageViews },
      charts: { dailyRevenue: dailyRevenueChart, dailyViews: dailyViewsChart },
      recentUsers,
      recentTickets,
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
