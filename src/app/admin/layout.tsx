import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) redirect('/auth/login');
  if (!ADMIN_EMAIL || session.user.email !== ADMIN_EMAIL) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold text-emerald-400 uppercase tracking-widest">Admin Console</span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-400 text-sm">HostDash</span>
        </div>
        <span className="text-xs text-gray-500">{session.user.email}</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
