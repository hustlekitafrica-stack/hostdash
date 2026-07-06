'use client';

import { useState, useEffect, useCallback } from 'react';
import ChannelManagerTab from '@/components/channel-manager/ChannelManagerTab';
import { useSubscription } from '@/lib/use-subscription';
import { ProGate } from '@/components/paywall/ProGate';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const PILL_COLORS = ['#22c55e','#3b82f6','#f97316','#a855f7','#ec4899','#14b8a6','#eab308','#ef4444'];
const SOURCES = ['Direct','Booking.com','Airbnb','Expedia','VRBO','Other'];
const CHANNEL_BADGES: Record<string, string> = {
  Airbnb: '✈️',
  'Booking.com': '📅',
  'Google Calendar': '📆',
  Jiji: '🛒',
  VRBO: '🏠',
  Other: '🔗',
};
const CHANNEL_STRIPES: Record<string, string> = {
  Airbnb: '#ef4444',
  'Booking.com': '#3b82f6',
  'Google Calendar': '#22c55e',
  Jiji: '#f97316',
  VRBO: '#a855f7',
  Other: '#6b7280',
};

const PAYMENT_METHODS = [
  { value: 'mpesa',    icon: '📱', label: 'M-Pesa' },
  { value: 'cash',     icon: '💵', label: 'Cash' },
  { value: 'card',     icon: '💳', label: 'Credit Card' },
  { value: 'bank',     icon: '🏦', label: 'Bank Transfer' },
  { value: 'airtel',   icon: '📲', label: 'Airtel Money' },
  { value: 'paypal',   icon: '🌐', label: 'PayPal' },
  { value: 'platform', icon: '✈️', label: 'Platform Payout' },
  { value: 'other',    icon: '➕', label: 'Other' },
];

const PAYMENT_STATUS_CONFIG: Record<string, { bg: string; icon: string; label: string }> = {
  unpaid:   { bg: 'bg-red-100 text-red-700',    icon: '🔴', label: 'UNPAID' },
  partial:  { bg: 'bg-yellow-100 text-yellow-700', icon: '🟡', label: 'PARTIAL PAYMENT' },
  paid:     { bg: 'bg-green-100 text-green-700',  icon: '🟢', label: 'PAID IN FULL' },
  overpaid: { bg: 'bg-purple-100 text-purple-700', icon: '🟣', label: 'OVERPAID' },
};

interface Booking {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  nights: number;
  nightly_rate: number;
  total_amount: number;
  property_id: string;
  booking_source: string;
  status: string;
  notes: string;
  source_channel?: string | null;
}

const STEPS = ['Property & Dates', 'Guest Details', 'Pricing & Notes', 'Payment'];

function validatePhone(raw: string): { valid: boolean; hint: string } {
  const p = raw.replace(/[\s\-().]/g, '');
  if (!p) return { valid: false, hint: '' };
  if (/^(\+?254|0)[71]\d{8}$/.test(p)) return { valid: true, hint: '✅ Valid' };
  if (p.length < 9) return { valid: false, hint: 'Too short' };
  if (p.length > 13) return { valid: false, hint: 'Too long' };
  return { valid: false, hint: 'Use format: 07XX XXX XXX or +254 7XX XXX XXX' };
}
const INP = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white';
const LBL = 'block text-xs font-semibold text-gray-700 mb-1';

interface GuestItem { id: string; name: string; phone: string; email: string; }

interface PaymentEntry {
  amount: string; method: string;
  mpesa_phone: string; mpesa_code: string; mpesa_paybill: string;
  airtel_phone: string; airtel_txn_id: string;
  cash_received_by: string; cash_receipt: string;
  card_type: string; card_last4: string; card_processor: string; card_auth: string;
  bank_name: string; bank_account_name: string; bank_reference: string; bank_confirmation: string;
  paypal_email: string; paypal_txn_id: string;
  platform_name: string; platform_reservation: string; platform_payout_date: string; platform_commission_pct: string;
  other_method_name: string; other_reference: string;
  date_type: string; date: string; notes: string;
}

const EMPTY_PAYMENT: PaymentEntry = {
  amount: '', method: 'mpesa',
  mpesa_phone: '', mpesa_code: '', mpesa_paybill: '',
  airtel_phone: '', airtel_txn_id: '',
  cash_received_by: '', cash_receipt: '',
  card_type: 'visa', card_last4: '', card_processor: 'pesapal', card_auth: '',
  bank_name: '', bank_account_name: '', bank_reference: '', bank_confirmation: '',
  paypal_email: '', paypal_txn_id: '',
  platform_name: 'airbnb', platform_reservation: '', platform_payout_date: '', platform_commission_pct: '15',
  other_method_name: '', other_reference: '',
  date_type: 'now', date: '', notes: '',
};

const EMPTY_FORM = {
  is_blocked: false,
  block_reason: '',
  // Step 1
  property_id: '',
  check_in: '',
  check_out: '',
  // Step 2
  selected_guest_id: '',
  guest_name: '',
  guest_phone: '',
  guest_email: '',
  booking_source: 'Direct',
  status: 'confirmed',
  // Step 3
  nightly_rate: '',
  cleaning_fee: '',
  extra_fees: '',
  discount: '',
  security_deposit: '',
  notes: '',
};

interface Property {
  id: string;
  name: string;
  nightly_rate?: number;
  cleaning_fee?: number;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getCalendarWeeks(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(last);
  end.setDate(end.getDate() + (6 - end.getDay()));
  const weeks: Date[][] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    weeks.push(week);
  }
  return weeks;
}

function dateDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDay(d: Date, n = 1): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default function BookingCalendarPage() {
  const { isPro, isLoaded: subLoaded } = useSubscription();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'channels'>('calendar');

  // Modal state
  const [modalMode, setModalMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [guestsList, setGuestsList] = useState<GuestItem[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([{ ...EMPTY_PAYMENT }]);
  const [paymentIntent, setPaymentIntent] = useState<'none' | 'partial' | 'full'>('none');
  const [depositStatus, setDepositStatus] = useState<'not_collected' | 'collected' | 'waived'>('not_collected');

  useEffect(() => {
    const h = (e: Event) => setSidebarCollapsed((e as CustomEvent<{ collapsed: boolean }>).detail.collapsed);
    window.addEventListener('sidebarToggle', h);
    return () => window.removeEventListener('sidebarToggle', h);
  }, []);


  useEffect(() => {
    if (modalMode !== 'closed') {
      fetch('/api/guests').then(r => r.json()).then(d => setGuestsList(d.guests ?? [])).catch(() => {});
    }
  }, [modalMode]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/calendar?year=${year}&month=${month}`);
      const data = await res.json();
      if (!data.error) {
        setBookings(data.bookings ?? []);
        setProperties(data.properties ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
  };
  const goToday = () => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth()); };

  // Modal openers
  const openCreate = (date?: string) => {
    const defaultToday    = toDateStr(new Date());
    const defaultTomorrow = toDateStr(addDay(new Date()));
    const nextDay = date ? toDateStr(addDay(parseDate(date))) : defaultTomorrow;
    const defaultProp = properties[0];
    setForm({ ...EMPTY_FORM, property_id: defaultProp?.id ?? '', check_in: date ?? defaultToday, check_out: nextDay,
      nightly_rate: defaultProp?.nightly_rate ? String(defaultProp.nightly_rate) : '',
      cleaning_fee: defaultProp?.cleaning_fee ? String(defaultProp.cleaning_fee) : '',
    });
    setStep(1); setEditBooking(null); setFormError('');
    setPayments([{ ...EMPTY_PAYMENT }]); setPaymentIntent('none'); setDepositStatus('not_collected');
    setModalMode('create');
  };

  const openEdit = (b: Booking) => {
    setForm({
      ...EMPTY_FORM,
      is_blocked: b.status === 'blocked',
      guest_name: b.status === 'blocked' ? '' : b.guest_name,
      guest_phone: b.guest_phone ?? '',
      guest_email: b.guest_email ?? '',
      property_id: b.property_id,
      check_in: b.check_in,
      check_out: b.check_out,
      nightly_rate: b.nightly_rate ? String(b.nightly_rate) : '',
      booking_source: b.booking_source ?? 'Direct',
      notes: b.notes ?? '',
      block_reason: b.status === 'blocked' ? b.guest_name : '',
    });
    setStep(1); setEditBooking(b); setFormError('');
    setPayments([{ ...EMPTY_PAYMENT }]); setPaymentIntent('none'); setDepositStatus('not_collected');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('closed'); setEditBooking(null); setFormError(''); setStep(1);
    setPayments([{ ...EMPTY_PAYMENT }]); setPaymentIntent('none'); setDepositStatus('not_collected');
  };

  const setF = (k: string, v: string | boolean) => setForm(prev => ({ ...prev, [k]: v }));

  const handleGuestSelect = (guestId: string) => {
    if (guestId) {
      const g = guestsList.find(x => x.id === guestId);
      if (g) setForm(prev => ({ ...prev, selected_guest_id: guestId, guest_name: g.name, guest_phone: g.phone ?? '', guest_email: g.email ?? '' }));
    } else {
      setF('selected_guest_id', '');
    }
  };

  const updatePayment = (idx: number, field: keyof PaymentEntry, value: string) =>
    setPayments(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));

  const addPayment = () => { if (payments.length < 5) setPayments(prev => [...prev, { ...EMPTY_PAYMENT }]); };

  const removePayment = (idx: number) => setPayments(prev => prev.filter((_, i) => i !== idx));

  const handlePaymentIntentChange = (intent: 'none' | 'partial' | 'full') => {
    setPaymentIntent(intent);
    if (intent === 'full') {
      const ni = (form.check_in && form.check_out && form.check_out > form.check_in)
        ? Math.round((parseDate(form.check_out).getTime() - parseDate(form.check_in).getTime()) / 86400000) : 0;
      const tot = (parseFloat(form.nightly_rate) || 0) * ni
        + (parseFloat(form.cleaning_fee) || 0) + (parseFloat(form.extra_fees) || 0);
      setPayments([{ ...EMPTY_PAYMENT, amount: tot > 0 ? String(tot) : '' }]);
    } else if (intent === 'partial') {
      setPayments([{ ...EMPTY_PAYMENT }]);
    }
  };

  const handleSave = async () => {
    const _rate = parseFloat(form.nightly_rate) || 0;
    const _clean = parseFloat(form.cleaning_fee) || 0;
    const _extra = parseFloat(form.extra_fees) || 0;
    const _discount = parseFloat(form.discount) || 0;
    const _paid = paymentIntent !== 'none'
      ? payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) : 0;
    if (paymentIntent !== 'none' && _paid <= 0) {
      setFormError('Please enter a payment amount for at least one payment.'); return;
    }
    if (paymentIntent !== 'none') {
      for (let i = 0; i < payments.length; i++) {
        if ((parseFloat(payments[i].amount) || 0) <= 0) {
          setFormError(`Payment ${i + 1}: amount is required.`); return;
        }
      }
    }
    const _pmts = paymentIntent !== 'none' ? payments.map(p => ({
      amount: parseFloat(p.amount) || 0,
      method: p.method,
      reference: p.method === 'mpesa' ? p.mpesa_code
        : p.method === 'airtel' ? p.airtel_txn_id
        : p.method === 'bank' ? p.bank_confirmation
        : p.method === 'paypal' ? p.paypal_txn_id
        : p.method === 'platform' ? p.platform_reservation : p.other_reference,
      phone: p.method === 'mpesa' ? p.mpesa_phone : p.method === 'airtel' ? p.airtel_phone : '',
      date_type: p.date_type, date: p.date || null, notes: p.notes,
      extra: p,
    })) : [];
    setSaving(true); setFormError('');
    try {
      const body = {
        ...(form.is_blocked
          ? { is_blocked: true, block_reason: form.block_reason }
          : { guest_name: form.guest_name.trim(), guest_phone: form.guest_phone, guest_email: form.guest_email, booking_source: form.booking_source, status: form.status }),
        property_id: form.property_id,
        check_in: form.check_in,
        check_out: form.check_out,
        nightly_rate: _rate,
        cleaning_fee: _clean,
        extra_fees: _extra,
        discount: _discount,
        security_deposit: parseFloat(form.security_deposit) || 0,
        notes: form.notes,
        payment_intent: paymentIntent,
        payment_amount: _paid,
        payments: _pmts,
      };
      const url = modalMode === 'edit' ? `/api/bookings/${editBooking!.id}` : '/api/bookings';
      const method = modalMode === 'edit' ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) { setFormError(data.error); return; }
      closeModal(); fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    setFormError('');
    if (step === 1) {
      if (!form.property_id) { setFormError('Please select a property.'); return; }
      if (!form.check_in || !form.check_out) { setFormError('Check-in and check-out are required.'); return; }
      if (form.check_out <= form.check_in) { setFormError('Check-out must be after check-in.'); return; }
      if (form.check_in < todayStr) { setFormError('Cannot create a booking for a past date.'); return; }
    }
    if (step === 2) {
      if (!form.guest_name.trim()) { setFormError('Guest name is required.'); return; }
      if (!form.guest_phone.trim()) { setFormError('Guest phone is required.'); return; }
      if (!validatePhone(form.guest_phone).valid) { setFormError('Please enter a valid Kenyan phone number (e.g. 0712 345 678).'); return; }
    }
    if (step === 3 && !form.is_blocked) {
      if (!form.nightly_rate || parseFloat(form.nightly_rate) <= 0) { setFormError('Nightly rate is required to calculate the total.'); return; }
    }
    setStep(s => s + 1);
  };

  const handleDelete = async () => {
    if (!editBooking) return;
    if (!window.confirm('Permanently delete this booking? This cannot be undone.')) return;
    setDeleting(true); setFormError('');
    try {
      const res = await fetch(`/api/bookings/${editBooking.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) { setFormError(data.error); return; }
      closeModal(); fetchData();
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!editBooking) return;
    if (!window.confirm('Cancel this booking? The booking will be marked as cancelled but kept for records.')) return;
    setDeleting(true); setFormError('');
    try {
      const res = await fetch(`/api/bookings/${editBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await res.json();
      if (data.error) { setFormError(data.error); return; }
      closeModal(); fetchData();
    } finally {
      setDeleting(false);
    }
  };

  const colorMap: Record<string, string> = {};
  properties.forEach((p, i) => { colorMap[p.id] = PILL_COLORS[i % PILL_COLORS.length]; });

  const filtered = selectedProperty === 'all' ? bookings : bookings.filter(b => b.property_id === selectedProperty);
  const weeks = getCalendarWeeks(year, month);
  const todayStr = toDateStr(new Date());

  // Computed booking form values (for display in steps 3 & 4)
  const nights = (form.check_in && form.check_out && form.check_out > form.check_in)
    ? Math.round((parseDate(form.check_out).getTime() - parseDate(form.check_in).getTime()) / 86400000) : 0;
  const rate = parseFloat(form.nightly_rate) || 0;
  const cleaningFeeAmt = parseFloat(form.cleaning_fee) || 0;
  const extraFeesAmt = parseFloat(form.extra_fees) || 0;
  const discountAmt = parseFloat(form.discount) || 0;
  const securityDeposit = parseFloat(form.security_deposit) || 0;
  const totalAmount = Math.max(0, rate * nights + cleaningFeeAmt + extraFeesAmt - discountAmt);
  const totalPaid = paymentIntent !== 'none'
    ? payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) : 0;
  const balanceDue = Math.max(0, totalAmount - totalPaid);
  const paymentStatus = totalPaid === 0 ? 'unpaid'
    : totalPaid > totalAmount ? 'overpaid'
    : totalPaid >= totalAmount ? 'paid' : 'partial';
  const isLastStep = form.is_blocked ? step === 1 : step === STEPS.length;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
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
            <h1 className="text-lg font-bold text-gray-900">Booking Calendar</h1>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[280px] lg:pr-[200px]' : 'lg:pl-[456px] lg:pr-[200px]'}`}>
      <div className="px-2 py-4 sm:p-6 space-y-4 max-w-[1400px]">

        {/* Tab strip */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('channels')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'channels' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Channels
            </button>
          </div>
          {activeTab === 'calendar' && (
            <button onClick={() => openCreate()} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Booking
            </button>
          )}
        </div>

        {activeTab === 'channels' && (
          <ProGate feature="iCal Channel Sync">
            <ChannelManagerTab properties={properties} />
          </ProGate>
        )}

        {activeTab === 'calendar' && (
          <>
        {/* Calendar Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Nav row */}
          <div className="flex items-center justify-center sm:justify-between px-4 py-3 border-b border-gray-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-base font-bold text-gray-900 w-36 text-center">{MONTH_NAMES[month]} {year}</span>
              <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button onClick={goToday} className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors ml-1">
                Today
              </button>
            </div>
            <div className="relative">
              <select
                value={selectedProperty}
                onChange={e => setSelectedProperty(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value="all">All properties</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Property legend */}
          {properties.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 px-4 py-2 border-b border-gray-100">
              {properties.map(p => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorMap[p.id] }} />
                  <span className="text-xs text-gray-700">{p.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">
                {d}
              </div>
            ))}
          </div>

          {/* Week rows */}
          {loading ? (
            <div className="py-20 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <div className="bg-gray-100 pb-1">
              {weeks.map((week, wi) => {
                const weekBookings = filtered.filter(b => {
                  const ci = parseDate(b.check_in);
                  const co = parseDate(b.check_out);
                  return ci <= week[6] && co > week[0];
                });

                return (
                  <div key={wi}>
                    <div className="relative grid grid-cols-7 gap-1 px-1 pt-1">
                      {/* Day cells */}
                      {week.map((date, di) => {
                        const inMonth = date.getMonth() === month;
                        const isToday = toDateStr(date) === todayStr;
                        const isPast = toDateStr(date) < todayStr;
                        return (
                          <div
                            key={di}
                            onClick={isPast ? undefined : () => openCreate(toDateStr(date))}
                            className={`min-h-[90px] rounded-[5px] p-1.5 transition-colors border
                              ${isPast
                                ? 'bg-gray-50 border-gray-100 cursor-not-allowed'
                                : inMonth
                                  ? 'bg-white border-gray-200 cursor-pointer hover:bg-gray-50'
                                  : 'bg-gray-50/80 border-gray-100 cursor-default'}
                              ${isToday ? 'ring-2 ring-teal-500 ring-inset bg-white border-transparent' : ''}`}
                          >
                            <span className={`text-xs font-medium
                              ${isPast ? 'text-gray-300' : !inMonth ? 'text-gray-400' : isToday ? 'text-teal-600 font-bold' : 'text-gray-600'}`}>
                              {date.getDate()}
                            </span>
                          </div>
                        );
                      })}

                      {/* Booking pills overlay */}
                      {weekBookings.map((b, bi) => {
                        const ci = parseDate(b.check_in);
                        const co = parseDate(b.check_out);
                        const startCol = Math.max(0, dateDiff(week[0], ci));
                        const endCol = Math.min(6, dateDiff(week[0], co) - 1);
                        if (startCol > endCol) return null;
                        const isBlocked = b.status === 'blocked';
                        const channel = b.source_channel ? CHANNEL_BADGES[b.source_channel] : null;
                        const stripeColor = b.source_channel ? CHANNEL_STRIPES[b.source_channel] : undefined;
                        const color = isBlocked ? '#6b7280' : (colorMap[b.property_id] ?? '#9ca3af');
                        return (
                          <div
                            key={b.id}
                            onClick={(e) => { e.stopPropagation(); openEdit(b); }}
                            className={`absolute text-white text-xs font-semibold pl-2 pr-2.5 rounded-full truncate cursor-pointer hover:opacity-90 transition-opacity z-10 select-none flex items-center gap-1 ${isBlocked ? 'opacity-70' : ''}`}
                            style={{
                              backgroundColor: color,
                              top: `${32 + bi * 26}px`,
                              left: `calc(${(startCol / 7) * 100}% + 5px)`,
                              width: `calc(${((endCol - startCol + 1) / 7) * 100}% - 10px)`,
                              height: '22px',
                              lineHeight: '22px',
                              borderLeft: stripeColor ? `4px solid ${stripeColor}` : undefined,
                            }}
                          >
                            {channel ? <span>{channel}</span> : isBlocked ? <span>🔒</span> : null}
                            <span className="truncate">{b.guest_name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bookings this month (exclude blocked) */}
        {!loading && filtered.filter(b => b.status !== 'blocked').length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Bookings this month</h3>
            <div className="space-y-4">
              {filtered.filter(b => b.status !== 'blocked').map(b => {
                const prop = properties.find(p => p.id === b.property_id);
                const color = colorMap[b.property_id] ?? '#9ca3af';
                return (
                  <div key={b.id} className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: color }} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {b.guest_name} — {prop?.name ?? '—'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {b.check_in} → {b.check_out} · {b.nights} nights{b.booking_source && b.booking_source !== 'blocked' ? ` · ${b.booking_source}` : ''}
                        </p>
                      </div>
                    </div>
                    {b.total_amount ? (
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        Ksh {Number(b.total_amount).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && filtered.filter(b => b.status !== 'blocked').length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-sm text-gray-400">
            No bookings for {MONTH_NAMES[month]} {year}
          </div>
        )}

          </>
        )}

      </div>

      {/* ── MODAL ── */}
      {modalMode !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
            style={{ maxHeight: '92vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                {modalMode === 'edit' ? (editBooking?.status === 'blocked' ? 'Edit Block' : 'Edit Booking') : (form.is_blocked ? 'Block Dates' : 'New Booking')}
              </h2>
              <div className="flex items-center gap-3">
                {modalMode === 'edit' && editBooking?.status !== 'blocked' && (
                  <button onClick={handleCancelBooking} disabled={deleting} className="text-xs font-semibold text-orange-500 hover:text-orange-700 disabled:opacity-40">
                    Cancel Booking
                  </button>
                )}
                {modalMode === 'edit' && (
                  <button onClick={handleDelete} disabled={deleting} className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40">
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                )}
                <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Stepper (guest bookings only) ── */}
            {!form.is_blocked && (
              <div className="flex items-start px-3 sm:px-6 py-4 bg-gray-50 border-b border-gray-100 flex-shrink-0 w-full overflow-hidden">
                {STEPS.map((label, i) => {
                  const n = i + 1;
                  const done = step > n;
                  const active = step === n;
                  return [
                    <div key={`s${i}`} className="flex flex-col items-center gap-1 min-w-0 shrink">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done || active ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {done ? '✓' : n}
                      </div>
                      <span className={`text-[9px] font-semibold text-center leading-tight ${active ? 'text-teal-600' : done ? 'text-teal-500' : 'text-gray-400'}`}>
                        {label}
                      </span>
                    </div>,
                    i < STEPS.length - 1 && (
                      <div key={`c${i}`} className={`flex-1 h-0.5 mt-3.5 mx-1 min-w-0 ${step > n ? 'bg-teal-600' : 'bg-gray-200'}`} />
                    ),
                  ];
                })}
              </div>
            )}

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* STEP 1 — Property & Dates */}
              {step === 1 && (
                <>
                  {/* Booking type toggle */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button onClick={() => setF('is_blocked', false)} className={`flex-1 py-2 text-sm font-medium transition-colors ${!form.is_blocked ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                      Guest Booking
                    </button>
                    <button onClick={() => setF('is_blocked', true)} className={`flex-1 py-2 text-sm font-medium transition-colors ${form.is_blocked ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                      Block Dates
                    </button>
                  </div>

                  <div>
                    <label className={LBL}>Property <span className="text-red-500">*</span></label>
                    <select value={form.property_id} onChange={e => {
                      const pid = e.target.value;
                      const prop = properties.find(p => p.id === pid);
                      setForm(f => ({
                        ...f,
                        property_id: pid,
                        nightly_rate: prop?.nightly_rate ? String(prop.nightly_rate) : f.nightly_rate,
                        cleaning_fee: prop?.cleaning_fee ? String(prop.cleaning_fee) : f.cleaning_fee,
                      }));
                    }} className={INP}>
                      <option value="">Select property…</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LBL}>Check-in <span className="text-red-500">*</span></label>
                      <input type="date" value={form.check_in} min={todayStr} onChange={e => setF('check_in', e.target.value)} className={INP} />
                    </div>
                    <div>
                      <label className={LBL}>Check-out <span className="text-red-500">*</span></label>
                      <input type="date" value={form.check_out} min={form.check_in || todayStr} onChange={e => setF('check_out', e.target.value)} className={INP} />
                    </div>
                  </div>

                  {nights > 0 && (
                    <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 px-3 py-2 rounded-lg font-medium">
                      {nights} night{nights !== 1 ? 's' : ''}
                    </div>
                  )}

                  {form.is_blocked && (
                    <div>
                      <label className={LBL}>Reason (optional)</label>
                      <input type="text" value={form.block_reason} onChange={e => setF('block_reason', e.target.value)} placeholder="e.g. Maintenance, Owner use" className={INP} />
                    </div>
                  )}
                </>
              )}

              {/* STEP 2 — Guest Details */}
              {step === 2 && !form.is_blocked && (
                <>
                  <div>
                    <label className={LBL}>Existing guest (optional)</label>
                    <select value={form.selected_guest_id} onChange={e => handleGuestSelect(e.target.value)} className={INP}>
                      <option value="">+ New guest (enter below)</option>
                      {guestsList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LBL}>Guest name <span className="text-red-500">*</span></label>
                      <input type="text" value={form.guest_name} onChange={e => setF('guest_name', e.target.value)} className={INP} />
                    </div>
                    <div>
                      <label className={LBL}>Guest phone <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        value={form.guest_phone}
                        onChange={e => setF('guest_phone', e.target.value)}
                        placeholder="0712 345 678"
                        className={`${INP} ${form.guest_phone && !validatePhone(form.guest_phone).valid ? 'border-red-400 focus:ring-red-400' : form.guest_phone && validatePhone(form.guest_phone).valid ? 'border-green-400 focus:ring-green-400' : ''}`}
                      />
                      {form.guest_phone && (
                        <p className={`text-xs mt-1 ${validatePhone(form.guest_phone).valid ? 'text-green-600' : 'text-red-500'}`}>
                          {validatePhone(form.guest_phone).hint}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={LBL}>Email</label>
                    <input type="email" value={form.guest_email} onChange={e => setF('guest_email', e.target.value)} placeholder="guest@email.com" className={INP} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LBL}>Source <span className="text-red-500">*</span></label>
                      <select value={form.booking_source} onChange={e => setF('booking_source', e.target.value)} className={INP}>
                        {SOURCES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LBL}>Status <span className="text-red-500">*</span></label>
                      <select value={form.status} onChange={e => setF('status', e.target.value)} className={INP}>
                        <option value="confirmed">Confirmed</option>
                        <option value="pending">Pending</option>
                        <option value="tentative">Tentative</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 3 — Pricing & Notes */}
              {step === 3 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LBL}>Nightly rate (KES)</label>
                      <input type="number" value={form.nightly_rate} onChange={e => setF('nightly_rate', e.target.value)} placeholder="0" className={INP} />
                    </div>
                    <div>
                      <label className={LBL}>Cleaning fee (KES)</label>
                      <input type="number" value={form.cleaning_fee} onChange={e => setF('cleaning_fee', e.target.value)} placeholder="0" className={INP} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LBL}>Extra fees (KES)</label>
                      <input type="number" value={form.extra_fees} onChange={e => setF('extra_fees', e.target.value)} placeholder="0" className={INP} />
                    </div>
                    <div>
                      <label className={LBL}>Discount (KES)</label>
                      <input type="number" value={form.discount} onChange={e => setF('discount', e.target.value)} placeholder="0" className={INP} />
                    </div>
                  </div>

                  <div className="w-1/2">
                    <label className={LBL}>Total (KES) <span className="text-red-500">*</span></label>
                    <input type="number" value={totalAmount || ''} readOnly placeholder="0" className={`${INP} bg-gray-50 cursor-default`} />
                  </div>

                  <div className="w-1/2">
                    <label className={LBL}>Security deposit (KES)</label>
                    <input type="number" value={form.security_deposit} onChange={e => setF('security_deposit', e.target.value)} placeholder="0" className={INP} />
                  </div>

                  <div>
                    <label className={LBL}>Notes</label>
                    <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={3} placeholder="Special requests, access codes…" className={`${INP} resize-none`} />
                  </div>

                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500 leading-relaxed">
                    Saving will automatically create a matching Income entry under <strong className="text-gray-700">Short Stay Rental</strong>.
                  </div>
                </>
              )}

              {/* STEP 4 — Payment */}
              {step === 4 && (
                <>
                  {/* ── Booking Summary ── */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span>💰</span>
                      <span className="font-bold text-sm text-amber-900 uppercase tracking-wide">Booking Summary</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-gray-700">
                        <span>{nights} night{nights !== 1 ? 's' : ''} × KSH {rate.toLocaleString()}</span>
                        <span>KSH {(rate * nights).toLocaleString()}</span>
                      </div>
                      {cleaningFeeAmt > 0 && <div className="flex justify-between text-gray-700"><span>Cleaning fee</span><span>KSH {cleaningFeeAmt.toLocaleString()}</span></div>}
                      {extraFeesAmt > 0 && <div className="flex justify-between text-gray-700"><span>Extra fees</span><span>KSH {extraFeesAmt.toLocaleString()}</span></div>}
                      {discountAmt > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>− KSH {discountAmt.toLocaleString()}</span></div>}
                      <div className="flex justify-between font-bold border-t border-amber-200 pt-2 mt-1 uppercase text-amber-900">
                        <span>Total Booking Value</span><span>KSH {totalAmount.toLocaleString()}</span>
                      </div>
                      {securityDeposit > 0 && (
                        <>
                          <div className="flex justify-between text-gray-600">
                            <span>Security Deposit (refundable)</span><span>KSH {securityDeposit.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-extrabold border-t border-amber-300 pt-2 mt-1 text-amber-900 uppercase">
                            <span>Total Due from Guest</span><span>KSH {(totalAmount + securityDeposit).toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Has guest paid? ── */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                    <p className="text-sm font-bold text-gray-800">Has the guest paid yet?</p>
                    {([['none','Not yet — save booking as unpaid'],['partial','Partial payment received'],['full','Paid in full']] as [typeof paymentIntent, string][]).map(([v, label]) => (
                      <label key={v} className="flex items-center gap-2.5 text-sm cursor-pointer text-gray-700">
                        <input type="radio" checked={paymentIntent === v} onChange={() => handlePaymentIntentChange(v)} className="accent-teal-600 w-4 h-4" />
                        {label}
                      </label>
                    ))}
                  </div>

                  {/* ── Payment blocks ── */}
                  {paymentIntent !== 'none' && (
                    <div className="space-y-3">
                      {payments.map((pmt, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                            <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                              Payment {idx + 1}{idx === 0 ? '  (required)' : ''}
                            </span>
                            {payments.length > 1 && (
                              <button onClick={() => removePayment(idx)} className="text-xs font-semibold text-red-500 hover:text-red-700">Remove</button>
                            )}
                          </div>
                          <div className="p-4 space-y-4">
                            {/* Amount */}
                            <div>
                              <label className={LBL}>Amount Paid</label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-500 shrink-0">KSH</span>
                                <input type="number" value={pmt.amount} onChange={e => updatePayment(idx, 'amount', e.target.value)} placeholder="0" className={INP} />
                              </div>
                            </div>
                            {/* Method grid */}
                            <div>
                              <label className={LBL}>Payment Method</label>
                              <div className="grid grid-cols-4 gap-2 mt-1">
                                {PAYMENT_METHODS.map(m => (
                                  <button key={m.value} onClick={() => updatePayment(idx, 'method', m.value)}
                                    className={`flex flex-col items-center gap-0.5 p-2 border rounded-lg text-xs font-medium transition-colors ${
                                      pmt.method === m.value ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}>
                                    <span className="text-xl">{m.icon}</span>
                                    <span className="text-center leading-tight">{m.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            {/* M-Pesa fields */}
                            {pmt.method === 'mpesa' && (
                              <div className="space-y-3 border-t pt-3">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">M-Pesa Selected</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className={LBL}>Phone Number</label>
                                    <input
                                      type="tel"
                                      value={pmt.mpesa_phone}
                                      onChange={e => updatePayment(idx, 'mpesa_phone', e.target.value)}
                                      placeholder="0712 345 678"
                                      className={`${INP} ${pmt.mpesa_phone && !validatePhone(pmt.mpesa_phone).valid ? 'border-red-400' : pmt.mpesa_phone && validatePhone(pmt.mpesa_phone).valid ? 'border-green-400' : ''}`}
                                    />
                                    {pmt.mpesa_phone && (
                                      <p className={`text-xs mt-1 ${validatePhone(pmt.mpesa_phone).valid ? 'text-green-600' : 'text-red-500'}`}>
                                        {validatePhone(pmt.mpesa_phone).hint}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <label className={LBL}>Paybill/Till (optional)</label>
                                    <input type="text" value={pmt.mpesa_paybill} onChange={e => updatePayment(idx, 'mpesa_paybill', e.target.value)} placeholder="522522" className={INP} />
                                  </div>
                                </div>
                                <div>
                                  <label className={LBL}>Transaction Code</label>
                                  <input type="text" value={pmt.mpesa_code} onChange={e => updatePayment(idx, 'mpesa_code', e.target.value.toUpperCase())} placeholder="e.g. QGH7829KL" maxLength={10} className={`${INP} uppercase font-mono`} />
                                  {pmt.mpesa_code.length > 0 && (
                                    <p className={`text-xs mt-1 ${/^[A-Z0-9]{10}$/.test(pmt.mpesa_code) ? 'text-green-600' : 'text-gray-400'}`}>
                                      {/^[A-Z0-9]{10}$/.test(pmt.mpesa_code) ? '✅ Valid format' : `Format: 10 chars — ${pmt.mpesa_code.length}/10`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            {/* Airtel fields */}
                            {pmt.method === 'airtel' && (
                              <div className="space-y-3 border-t pt-3">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Airtel Money</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className={LBL}>Phone Number</label>
                                    <input
                                      type="tel"
                                      value={pmt.airtel_phone}
                                      onChange={e => updatePayment(idx, 'airtel_phone', e.target.value)}
                                      placeholder="0733 456 789"
                                      className={`${INP} ${pmt.airtel_phone && !validatePhone(pmt.airtel_phone).valid ? 'border-red-400' : pmt.airtel_phone && validatePhone(pmt.airtel_phone).valid ? 'border-green-400' : ''}`}
                                    />
                                    {pmt.airtel_phone && (
                                      <p className={`text-xs mt-1 ${validatePhone(pmt.airtel_phone).valid ? 'text-green-600' : 'text-red-500'}`}>
                                        {validatePhone(pmt.airtel_phone).hint}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <label className={LBL}>Transaction ID</label>
                                    <input type="text" value={pmt.airtel_txn_id} onChange={e => updatePayment(idx, 'airtel_txn_id', e.target.value)} placeholder="AT1234567890" className={INP} />
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Cash fields */}
                            {pmt.method === 'cash' && (
                              <div className="space-y-3 border-t pt-3">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Cash</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className={LBL}>Received by</label>
                                    <input type="text" value={pmt.cash_received_by} onChange={e => updatePayment(idx, 'cash_received_by', e.target.value)} placeholder="Host / caretaker" className={INP} />
                                  </div>
                                  <div>
                                    <label className={LBL}>Receipt no. (optional)</label>
                                    <input type="text" value={pmt.cash_receipt} onChange={e => updatePayment(idx, 'cash_receipt', e.target.value)} placeholder="Optional" className={INP} />
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Card fields */}
                            {pmt.method === 'card' && (
                              <div className="space-y-3 border-t pt-3">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Credit / Debit Card</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className={LBL}>Card Type</label>
                                    <select value={pmt.card_type} onChange={e => updatePayment(idx, 'card_type', e.target.value)} className={INP}>
                                      {['visa','mastercard','amex','other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className={LBL}>Last 4 digits</label>
                                    <input type="text" value={pmt.card_last4} onChange={e => updatePayment(idx, 'card_last4', e.target.value)} placeholder="4521" maxLength={4} className={INP} />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className={LBL}>Processor</label>
                                    <select value={pmt.card_processor} onChange={e => updatePayment(idx, 'card_processor', e.target.value)} className={INP}>
                                      {['pesapal','stripe','dpo','other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className={LBL}>Auth code</label>
                                    <input type="text" value={pmt.card_auth} onChange={e => updatePayment(idx, 'card_auth', e.target.value)} placeholder="AUTH789123" className={INP} />
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Bank fields */}
                            {pmt.method === 'bank' && (
                              <div className="space-y-3 border-t pt-3">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Bank Transfer</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div><label className={LBL}>Bank Name</label><input type="text" value={pmt.bank_name} onChange={e => updatePayment(idx,'bank_name',e.target.value)} placeholder="Equity Bank" className={INP}/></div>
                                  <div><label className={LBL}>Account Name</label><input type="text" value={pmt.bank_account_name} onChange={e => updatePayment(idx,'bank_account_name',e.target.value)} placeholder="Jane Wanjiku" className={INP}/></div>
                                </div>
                                <div><label className={LBL}>Reference / Narration</label><input type="text" value={pmt.bank_reference} onChange={e => updatePayment(idx,'bank_reference',e.target.value)} placeholder="Booking Apr 29" className={INP}/></div>
                                <div><label className={LBL}>Confirmation No.</label><input type="text" value={pmt.bank_confirmation} onChange={e => updatePayment(idx,'bank_confirmation',e.target.value)} placeholder="TXN2024042912345" className={INP}/></div>
                              </div>
                            )}
                            {/* PayPal fields */}
                            {pmt.method === 'paypal' && (
                              <div className="space-y-3 border-t pt-3">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">PayPal</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div><label className={LBL}>PayPal Email</label><input type="email" value={pmt.paypal_email} onChange={e => updatePayment(idx,'paypal_email',e.target.value)} placeholder="guest@email.com" className={INP}/></div>
                                  <div><label className={LBL}>Transaction ID</label><input type="text" value={pmt.paypal_txn_id} onChange={e => updatePayment(idx,'paypal_txn_id',e.target.value)} placeholder="8MH12345AB" className={INP}/></div>
                                </div>
                              </div>
                            )}
                            {/* Platform payout fields */}
                            {pmt.method === 'platform' && (
                              <div className="space-y-3 border-t pt-3">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Platform Payout</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className={LBL}>Platform</label>
                                    <select value={pmt.platform_name} onChange={e => updatePayment(idx,'platform_name',e.target.value)} className={INP}>
                                      {['airbnb','booking.com','expedia','vrbo'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                                    </select>
                                  </div>
                                  <div><label className={LBL}>Reservation No.</label><input type="text" value={pmt.platform_reservation} onChange={e => updatePayment(idx,'platform_reservation',e.target.value)} placeholder="HMABCD1234" className={INP}/></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div><label className={LBL}>Payout Date</label><input type="date" value={pmt.platform_payout_date} onChange={e => updatePayment(idx,'platform_payout_date',e.target.value)} className={INP}/></div>
                                  <div>
                                    <label className={LBL}>Commission %</label>
                                    <input type="number" value={pmt.platform_commission_pct} onChange={e => updatePayment(idx,'platform_commission_pct',e.target.value)} placeholder="15" className={INP}/>
                                  </div>
                                </div>
                                <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                                  <span className="text-gray-500">Net payout to host:</span>
                                  <span className="font-semibold">KSH {Math.round((parseFloat(pmt.amount)||0)*(1-(parseFloat(pmt.platform_commission_pct)||0)/100)).toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                            {/* Other fields */}
                            {pmt.method === 'other' && (
                              <div className="space-y-3 border-t pt-3">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Other</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div><label className={LBL}>Method Name</label><input type="text" value={pmt.other_method_name} onChange={e => updatePayment(idx,'other_method_name',e.target.value)} placeholder="Cheque" className={INP}/></div>
                                  <div><label className={LBL}>Reference</label><input type="text" value={pmt.other_reference} onChange={e => updatePayment(idx,'other_reference',e.target.value)} placeholder="CHQ-0042" className={INP}/></div>
                                </div>
                              </div>
                            )}
                            {/* Date & time */}
                            <div>
                              <label className={LBL}>Payment Date & Time</label>
                              <div className="flex flex-wrap gap-4 mt-1">
                                {([['now','Now'],['earlier','Earlier today'],['pick','Pick date/time']] as [string,string][]).map(([v,l]) => (
                                  <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-700">
                                    <input type="radio" checked={pmt.date_type === v} onChange={() => updatePayment(idx,'date_type',v)} className="accent-teal-600" />{l}
                                  </label>
                                ))}
                              </div>
                              {pmt.date_type === 'pick' && (
                                <input type="datetime-local" value={pmt.date} onChange={e => updatePayment(idx,'date',e.target.value)} className={`${INP} mt-2`} />
                              )}
                            </div>
                            {/* Notes */}
                            <div>
                              <label className={LBL}>Notes (optional)</label>
                              <textarea value={pmt.notes} onChange={e => updatePayment(idx,'notes',e.target.value)} rows={2} placeholder="e.g. Deposit payment — balance on check-in" className={`${INP} resize-none`} />
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Add another payment */}
                      {payments.length < 5 && (
                        <button onClick={addPayment} className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-semibold text-gray-500 hover:border-teal-400 hover:text-teal-600 transition-colors">
                          + Add Another Payment
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Totals ── */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Paid:</span>
                        <span className="font-semibold">KSH {totalPaid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Balance Due:</span>
                        <span className={`font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          KSH {balanceDue.toLocaleString()} {balanceDue > 0 ? '⚠️' : ''}
                        </span>
                      </div>
                      {securityDeposit > 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>Deposit Due:</span>
                          <span>KSH {securityDeposit.toLocaleString()} (at check-in)</span>
                        </div>
                      )}
                    </div>
                    <div className={`px-4 py-3 border-t flex items-center gap-2 text-sm font-bold ${
                      paymentStatus === 'paid' ? 'bg-green-50 border-green-200' :
                      paymentStatus === 'partial' ? 'bg-yellow-50 border-yellow-200' :
                      paymentStatus === 'overpaid' ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <span>Payment Status:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs ${PAYMENT_STATUS_CONFIG[paymentStatus]?.bg}`}>
                        {PAYMENT_STATUS_CONFIG[paymentStatus]?.icon} {PAYMENT_STATUS_CONFIG[paymentStatus]?.label}
                      </span>
                    </div>
                  </div>

                  {/* ── Deposit status ── */}
                  {securityDeposit > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <p className="text-sm font-bold text-gray-800">Deposit Status</p>
                      {([['not_collected','Not collected yet'],['collected','Collected (add details)'],['waived','Waived']] as [typeof depositStatus, string][]).map(([v, label]) => (
                        <label key={v} className="flex items-center gap-2.5 text-sm cursor-pointer text-gray-700">
                          <input type="radio" checked={depositStatus === v} onChange={() => setDepositStatus(v)} className="accent-teal-600 w-4 h-4" />
                          {label}
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Error */}
              {formError && <p className="text-xs text-red-500 font-semibold mt-1">{formError}</p>}

            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
              <button
                onClick={step === 1 ? closeModal : () => { setFormError(''); setStep(s => Math.max(1, s - 1)); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {step === 1 ? 'Cancel' : '← Back'}
              </button>

              {!form.is_blocked && (
                <span className="text-xs text-gray-400 font-medium">Step {step} of {STEPS.length}</span>
              )}

              <button
                onClick={isLastStep ? handleSave : handleNext}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : isLastStep
                  ? (modalMode === 'edit' ? 'Save Changes' : (form.is_blocked ? 'Block Dates' : 'Create Booking'))
                  : 'Next →'}
              </button>
            </div>

          </div>
        </div>
      )}

      </div>
    </div>
  );
}

