'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface Expense {
  id: string;
  date: string;
  category_name: string;
  vendor: string;
  gross: number;
  tax: number;
  net: number;
  receipt_url?: string;
}

export default function ExpensesPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savedCategories, setSavedCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    vendor: '',
    gross: '',
    tax: '',
  });

  useEffect(() => {
    const h = (e: CustomEvent) => setSidebarCollapsed(e.detail.collapsed);
    window.addEventListener('sidebarToggle', h as EventListener);
    return () => window.removeEventListener('sidebarToggle', h as EventListener);
  }, []);

  useEffect(() => {
    fetch('/api/expense-categories')
      .then(r => r.json())
      .then(d => { if (d.categories) setSavedCategories(d.categories); })
      .catch(() => {});

    setLoadingExpenses(true);
    fetch('/api/expenses')
      .then(r => r.json())
      .then(d => { if (d.expenses) setExpenses(d.expenses); })
      .catch(() => {})
      .finally(() => setLoadingExpenses(false));
  }, []);

  useEffect(() => {
    const email = localStorage.getItem('user_email') || 'admin@hostdash.app';
    setUserEmail(email);
  }, []);

  const handleAddExpense = async () => {
    if (!formData.date || !formData.category || !formData.vendor || !formData.gross) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          category_name: formData.category,
          vendor: formData.vendor,
          gross: formData.gross,
          tax: formData.tax,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to add expense'); return; }
      const newExpense = data.expense;
      // Upload receipt if attached
      if (receiptFile && newExpense?.id) {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const ext = receiptFile.name.split('.').pop();
            const path = `${user.id}/${newExpense.id}/receipt.${ext}`;
            const { error: upErr } = await supabase.storage.from('expense-receipts').upload(path, receiptFile, { upsert: true });
            if (!upErr) {
              const { data: { publicUrl } } = supabase.storage.from('expense-receipts').getPublicUrl(path);
              await fetch(`/api/expenses/${newExpense.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receipt_url: publicUrl }),
              });
              newExpense.receipt_url = publicUrl;
            }
          }
        } catch { /* receipt upload is non-critical */ }
      }
      setExpenses(prev => [newExpense, ...prev]);
      setShowAddModal(false);
      setReceiptFile(null);
      setFormData({ date: new Date().toISOString().split('T')[0], category: '', vendor: '', gross: '', tax: '' });
      toast.success('Expense added');
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Failed to delete expense'); return; }
      setExpenses(prev => prev.filter(e => e.id !== id));
      toast.success('Expense deleted');
    } catch {
      toast.error('Network error');
    }
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) { toast.error('No expenses to export'); return; }
    const rows = [
      ['Date', 'Category', 'Vendor/Service', 'Gross', 'Tax', 'Net'],
      ...expenses.map(e => [e.date, e.category_name, e.vendor, e.gross, e.tax, e.net]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'expenses.csv'; a.click();
    URL.revokeObjectURL(url);
  };

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
            <h1 className="text-lg font-bold text-gray-900">Expenses</h1>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className={`px-2 py-4 sm:p-6 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[280px] lg:pr-[200px]' : 'lg:pl-[456px] lg:pr-[200px]'}`}>

        {/* Page Header */}
        <div className="flex items-center justify-end mb-6">
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
            >
              + Add Expense
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-sm text-gray-600 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600 font-medium">Vendor/Service</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {loadingExpenses ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-sm text-gray-400">Loading expenses...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-sm text-gray-500">
                    No expenses recorded yet. Click &quot;Add Expense&quot; to get started.
                  </td>
                </tr>
              ) : (
                expenses.map(expense => (
                  <tr key={expense.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{expense.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{expense.category_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{expense.vendor}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        KSh {expense.net.toLocaleString()}
                        {expense.receipt_url && (
                          <a href={expense.receipt_url} target="_blank" rel="noreferrer" title="View receipt"
                            className="text-teal-500 hover:text-teal-700 flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Add Expense</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                {savedCategories.length > 0 ? (
                  <select value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">— Select a category —</option>
                    {savedCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-400 bg-gray-50">
                    No categories yet —{' '}
                    <a href="/settings" className="text-teal-600 underline">add one in Settings</a>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor/Service</label>
                <input type="text" placeholder="e.g. ABC Cleaning Services" value={formData.vendor}
                  onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gross (KSh)</label>
                  <input type="number" placeholder="0" value={formData.gross}
                    onChange={e => setFormData({ ...formData, gross: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax (KSh)</label>
                  <input type="number" placeholder="0" value={formData.tax}
                    onChange={e => setFormData({ ...formData, tax: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              {formData.gross && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                  Net: <span className="font-semibold text-gray-900">KSh {((parseFloat(formData.gross) || 0) - (parseFloat(formData.tax) || 0)).toLocaleString()}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt <span className="text-gray-400 font-normal">(optional)</span></label>
                <input ref={receiptInputRef} type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={e => setReceiptFile(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => receiptInputRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-teal-400 hover:text-teal-600 transition-colors">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  {receiptFile ? receiptFile.name : 'Attach receipt or PDF'}
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddExpense} disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? 'Saving...' : 'Add Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
