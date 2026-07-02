'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase puts the session tokens in the URL hash after redirect
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { toast.error(error.message); return; }
      toast.success('Password updated! Please sign in.');
      router.push('/auth/login');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center px-4 py-3" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#16a34a' }}>KS</div>
          <span className="text-white font-bold text-base">Kogelo Suites</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-md">
          {!ready ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4" style={{ borderColor: '#16a34a' }} />
              <p className="text-sm text-gray-500">Verifying reset link…</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Set new password</h1>
              <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoFocus
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none transition-all"
                    onFocus={e => { e.target.style.boxShadow = '0 0 0 2px #22c55e'; e.target.style.borderColor = '#22c55e'; }}
                    onBlur={e => { e.target.style.boxShadow = ''; e.target.style.borderColor = '#d1d5db'; }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none transition-all"
                    onFocus={e => { e.target.style.boxShadow = '0 0 0 2px #22c55e'; e.target.style.borderColor = '#22c55e'; }}
                    onBlur={e => { e.target.style.boxShadow = ''; e.target.style.borderColor = '#d1d5db'; }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white font-semibold py-3 px-4 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ backgroundColor: '#16a34a' }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#15803d'; }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#16a34a'; }}
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
