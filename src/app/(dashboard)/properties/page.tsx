'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { AirbnbPropertyWizard, WizardFormData } from '@/components/properties/AirbnbPropertyWizard';
import { createClient } from '@/lib/supabase/client';

type PropStatus = 'active' | 'inactive' | 'maintenance' | 'draft' | 'blocked';

interface Property {
  id: string;
  name: string;
  type: string;
  category: string;
  bedrooms: string;
  bathrooms: number;
  maxGuests: number;
  location: string;
  city: string;
  pricePerNight: number;
  weekendRate: number;
  monthlyRate: number;
  cleaningFee: number;
  deposit: number;
  minStay: string;
  maxStayNights: number;
  description: string;
  amenities: string[];
  status: PropStatus;
  setupStep?: number;
  coverPhoto: string;
  checkInTime: string;
  checkOutTime: string;
  checkInMethod: string;
  checkInInstructions: string;
  caretakerName: string;
  caretakerPhone: string;
  houseRules: Record<string, boolean>;
  additionalRules: string;
  cancellationPolicy: string;
}

const VALID_PROPERTY_TYPES = ['apartment', 'villa', 'studio', 'house', 'cottage', 'room', 'bungalow', 'townhouse', 'penthouse', 'cabin'];

function dbRowToProperty(row: any): Property {
  const beds = row.bedrooms ?? 1;
  const bedsLabel = beds === 0 ? 'Studio' : `${beds}BR`;
  const rawType = (row.type || '').toLowerCase();
  const safeCategory = VALID_PROPERTY_TYPES.includes(rawType)
    ? rawType.charAt(0).toUpperCase() + rawType.slice(1)
    : 'Apartment';
  return {
    id: row.id,
    name: row.name || row.title || 'Untitled',
    type: bedsLabel,
    category: safeCategory,
    bedrooms: bedsLabel,
    bathrooms: row.bathrooms ?? 1,
    maxGuests: row.max_guests ?? 2,
    location: [row.location, row.county].filter(Boolean).join(', '),
    city: row.city || '',
    pricePerNight: parseFloat(row.nightly_rate) || 0,
    weekendRate: parseFloat(row.weekend_rate) || 0,
    monthlyRate: parseFloat(row.monthly_rate) || 0,
    cleaningFee: parseFloat(row.cleaning_fee) || 0,
    deposit: parseFloat(row.security_deposit) || 0,
    minStay: row.min_stay_nights ? `${row.min_stay_nights} night${row.min_stay_nights === 1 ? '' : 's'}` : '1 night',
    maxStayNights: row.max_stay_nights || 0,
    description: row.description || '',
    amenities: [],
    status: (['active', 'inactive', 'maintenance', 'draft'].includes(row.status) ? row.status : 'active') as PropStatus,
    setupStep: row.setup_step ?? row.setupStep ?? 1,
    coverPhoto: row.cover_photo || '',
    checkInTime: row.check_in_time || '',
    checkOutTime: row.check_out_time || '',
    checkInMethod: row.check_in_method || '',
    checkInInstructions: row.check_in_instructions || '',
    caretakerName: row.caretaker_name || '',
    caretakerPhone: row.caretaker_phone || '',
    houseRules: row.house_rules || {},
    additionalRules: row.additional_rules || '',
    cancellationPolicy: row.cancellation_policy || '',
  };
}

const HOUSE_RULE_LABELS: { key: string; label: string }[] = [
  { key: 'noSmoking',       label: 'No smoking' },
  { key: 'noParties',       label: 'No parties' },
  { key: 'noPets',          label: 'No pets' },
  { key: 'quietHours',      label: 'Quiet hours 10pm–7am' },
  { key: 'noAlcohol',       label: 'No alcohol' },
  { key: 'couplesOnly',     label: 'Couples only' },
  { key: 'adultsOnly',      label: 'Adults only' },
  { key: 'removeShoes',     label: 'Remove shoes' },
  { key: 'sortRubbish',     label: 'Sort rubbish' },
  { key: 'childrenAllowed', label: 'Children welcome' },
];

const STATUS_DOT: Record<PropStatus, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-400',
  maintenance: 'bg-yellow-400',
  draft: 'bg-amber-400',
  blocked: 'bg-orange-500',
};

const STEP_LABELS = ['','Property Type','Location','Basics','Amenities','Photos','Title & Description','Pricing','Rules & Check-in','Review & Publish'];

const TYPES = ['All types', 'Studio', '1BR', '2BR', '3BR', 'Villa'];
const STATUSES = ['All statuses', 'active', 'inactive', 'maintenance', 'draft'];

type ViewMode = 'grid' | 'list';

function propertyToWizardData(p: Property): Partial<WizardFormData> {
  return {
    propertyType: p.category.toLowerCase() === 'villa' ? 'villa' : p.category.toLowerCase() === 'studio' ? 'studio' : 'apartment',
    title: p.name,
    location: {
      building: '', unit: '', floor: '',
      neighbourhood: p.location.split(',')[0]?.trim() || '',
      city: p.location.split(',').slice(-2, -1)[0]?.trim() || 'Nairobi',
      county: p.location.split(',').pop()?.trim() || 'Nairobi',
      address: p.location, lat: null, lng: null,
    },
    basics: {
      bedrooms: parseInt(p.bedrooms) || 1,
      bathrooms: 1, maxGuests: 2,
      size: '', sizeUnit: 'sq m',
      beds: [{ type: 'Double Bed', count: parseInt(p.bedrooms) || 1 }],
    },
    pricing: {
      nightly: p.pricePerNight.toString(),
      weekend: '', monthly: '', cleaning: '', deposit: '', extraGuest: '',
      baseGuests: 2, minStay: '1 night', maxStay: 'No maximum', seasonal: [],
    },
  };
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [continuingProperty, setContinuingProperty] = useState<Property | null>(null);
  const [editWizardData, setEditWizardData] = useState<Partial<WizardFormData> | null>(null);
  const [continueWizardData, setContinueWizardData] = useState<Partial<WizardFormData> | null>(null);
  const [editLoading, setEditLoading] = useState<string | null>(null);
  const [viewingPropertyDetails, setViewingPropertyDetails] = useState<{ amenities: string[]; photos: { url: string; isCover: boolean }[] } | null>(null);
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All types');
  const [filterStatus, setFilterStatus] = useState('All statuses');
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvError, setCsvError] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvDone, setCsvDone] = useState(0);
  const csvFileRef = useRef<HTMLInputElement>(null);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];
    const [{ data, error }, { data: blockedData }] = await Promise.all([
      supabase.from('properties').select('*').order('created_at', { ascending: false }),
      supabase.from('bookings').select('property_id')
        .eq('status', 'blocked').lte('check_in', today).gt('check_out', today),
    ]);
    if (!error && data) {
      const blockedIds = new Set((blockedData ?? []).map((b: any) => b.property_id));
      setProperties(data.map(row => {
        const p = dbRowToProperty(row);
        if (blockedIds.has(p.id)) p.status = 'blocked';
        return p;
      }));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadProperties(); }, [loadProperties]);

  useEffect(() => {
    if (!viewingProperty) { setViewingPropertyDetails(null); return; }
    fetch(`/api/properties/wizard?id=${viewingProperty.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => json && setViewingPropertyDetails({ amenities: json.amenities ?? [], photos: json.photos ?? [] }))
      .catch(() => {});
  }, [viewingProperty?.id]);

  const fetchPropertyForEdit = useCallback(async (id: string): Promise<Partial<WizardFormData> | null> => {
    const res = await fetch(`/api/properties/wizard?id=${id}`);
    if (!res.ok) return null;
    const { property: p, amenities, photos } = await res.json();
    if (!p) return null;
    const hr = p.house_rules || {};
    return {
      propertyType: p.type || 'apartment',
      title: p.title || p.name || '',
      description: p.description || '',
      location: { building: p.building_name || '', unit: p.unit_number || '', floor: p.floor_level || '', neighbourhood: p.address || p.location || '', city: p.city || 'Nairobi', county: p.county || 'Nairobi', address: p.address || p.location || '', lat: p.latitude ?? null, lng: p.longitude ?? null },
      basics: { bedrooms: p.bedrooms ?? 1, bathrooms: p.bathrooms ?? 1, maxGuests: p.max_guests ?? 2, size: '', sizeUnit: 'sq m', beds: [{ type: 'Double Bed', count: p.bedrooms ?? 1 }] },
      amenities,
      photos,
      pricing: { nightly: p.nightly_rate ? String(parseFloat(p.nightly_rate)) : '', weekend: p.weekend_rate ? String(parseFloat(p.weekend_rate)) : '', monthly: p.monthly_rate ? String(parseFloat(p.monthly_rate)) : '', cleaning: p.cleaning_fee ? String(parseFloat(p.cleaning_fee)) : '', deposit: p.security_deposit ? String(parseFloat(p.security_deposit)) : '', extraGuest: '', baseGuests: 2, minStay: p.min_stay_nights?.toString() || '1', maxStay: p.max_stay_nights?.toString() || '', seasonal: [] },
      rules: { checkIn: p.check_in_time || '14:00', checkOut: p.check_out_time || '11:00', checkInMethod: p.check_in_method || 'caretaker', instructions: p.check_in_instructions || '', caretakerName: p.caretaker_name || '', caretakerPhone: p.caretaker_phone || '', noSmoking: hr.noSmoking ?? true, noParties: hr.noParties ?? true, noPets: hr.noPets ?? true, quietHours: hr.quietHours ?? true, childrenAllowed: hr.childrenAllowed ?? false, couplesOnly: hr.couplesOnly ?? false, noAlcohol: hr.noAlcohol ?? false, adultsOnly: hr.adultsOnly ?? false, additionalRules: p.additional_rules || '', cancellation: p.cancellation_policy || 'moderate', nonRefundableDiscount: '10', removeShoes: hr.removeShoes ?? false, sortRubbish: hr.sortRubbish ?? false },
    };
  }, []);

  const handleEditProperty = useCallback(async (p: Property) => {
    setEditLoading(p.id);
    const d = await fetchPropertyForEdit(p.id);
    setEditWizardData(d);
    setEditingProperty(p);
    setEditLoading(null);
    setViewingProperty(null);
  }, [fetchPropertyForEdit]);

  const handleContinueProperty = useCallback(async (p: Property) => {
    setEditLoading(p.id);
    const d = await fetchPropertyForEdit(p.id);
    setContinueWizardData(d);
    setContinuingProperty(p);
    setEditLoading(null);
    setViewingProperty(null);
  }, [fetchPropertyForEdit]);

  useEffect(() => {
    const h = (e: CustomEvent) => setSidebarCollapsed(e.detail.collapsed);
    window.addEventListener('sidebarToggle', h as EventListener);
    return () => window.removeEventListener('sidebarToggle', h as EventListener);
  }, []);

  useEffect(() => {
    const email = localStorage.getItem('user_email') || 'admin@hostdash.app';
    setUserEmail(email);
  }, []);

  const filtered = useMemo(() => properties.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.location.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'All types' && p.type !== filterType) return false;
    if (filterStatus !== 'All statuses' && p.status !== filterStatus) return false;
    return true;
  }), [properties, search, filterType, filterStatus]);

  const activeCount = properties.filter(p => p.status === 'active').length;

  const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    return lines.slice(1).map(line => {
      const vals = line.match(/(?:"([^"]*)"|([^,]*))/g)?.map(v => v.replace(/^"|"$/g, '').trim()) ?? line.split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
      return row;
    }).filter(r => r.name);
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      if (!rows.length) { setCsvError('No valid rows found. Make sure your CSV has a header row and a "name" column.'); setShowCsvModal(true); return; }
      setCsvError('');
      setCsvRows(rows);
      setCsvDone(0);
      setShowCsvModal(true);
    };
    reader.readAsText(file);
  };

  const confirmCsvImport = async () => {
    setCsvImporting(true);
    let done = 0;
    for (const row of csvRows) {
      const payload = {
        title: row.name || row.property_name || 'Untitled',
        propertyType: row.type || row.property_type || 'apartment',
        location: { neighbourhood: row.location || row.neighbourhood || 'Nairobi', address: row.address || '', city: row.city || 'Nairobi', county: row.county || 'Nairobi', building: '', unit: '', floor: '', lat: null, lng: null },
        basics: { bedrooms: parseInt(row.bedrooms) || 1, bathrooms: parseInt(row.bathrooms) || 1, maxGuests: parseInt(row.max_guests || row.maxguests) || 2, size: '', sizeUnit: 'sq m', beds: [] },
        pricing: { nightly: row.nightly_rate || row.price || row.price_per_night || '0', weekend: '', monthly: '', cleaning: row.cleaning_fee || '0', deposit: row.deposit || '0', extraGuest: '', baseGuests: 2, minStay: row.min_stay || '1 night', maxStay: '', seasonal: [] },
        rules: { checkIn: '14:00', checkOut: '11:00', checkInMethod: '', instructions: '', caretakerName: '', caretakerPhone: '', noSmoking: true, noParties: true, noPets: true, childrenAllowed: false, quietHours: true, couplesOnly: false, noAlcohol: false, adultsOnly: false, additionalRules: '', cancellation: 'moderate', nonRefundableDiscount: '10' },
        description: row.description || '',
        status: (['active','inactive','maintenance','draft'].includes(row.status) ? row.status : 'active'),
        photos: [],
        amenities: [],
      };
      await fetch('/api/properties/wizard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
      done++;
      setCsvDone(done);
    }
    setCsvImporting(false);
    setShowCsvModal(false);
    setCsvRows([]);
    loadProperties();
  };

  const STATUS_LABEL: Record<PropStatus, string> = { active: 'Active', inactive: 'Inactive', maintenance: 'Maintenance', draft: 'Incomplete', blocked: 'Blocked' };
  const STATUS_BG: Record<PropStatus, string> = { active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-600', maintenance: 'bg-yellow-100 text-yellow-700', draft: 'bg-amber-100 text-amber-700', blocked: 'bg-orange-100 text-orange-700' };

  return (
    <>
      {/* ── Property Details Slide-over ── */}
      {viewingProperty && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" onClick={() => setViewingProperty(null)} />
          {/* Panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[viewingProperty.status]}`} />
                <h2 className="text-base font-bold text-gray-900 leading-tight truncate">{viewingProperty.name}</h2>
              </div>
              <button onClick={() => setViewingProperty(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0 ml-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">

              {/* Cover photo */}
              {(() => {
                const coverUrl = viewingPropertyDetails?.photos?.find(p => p.isCover)?.url
                  || viewingPropertyDetails?.photos?.[0]?.url
                  || viewingProperty.coverPhoto;
                return coverUrl ? (
                  <div className="w-full h-44 bg-gray-200 overflow-hidden flex-shrink-0">
                    <img src={coverUrl} alt={viewingProperty.name} className="w-full h-full object-cover" />
                  </div>
                ) : null;
              })()}

              <div className="px-6 py-5 space-y-5">

                {/* Status + Type */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BG[viewingProperty.status]}`}>{STATUS_LABEL[viewingProperty.status]}</span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{viewingProperty.category}</span>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Bedrooms',   value: viewingProperty.bedrooms },
                    { label: 'Bathrooms',  value: viewingProperty.bathrooms },
                    { label: 'Max Guests', value: `${viewingProperty.maxGuests} guests` },
                    { label: 'Min Stay',   value: viewingProperty.minStay },
                    ...(viewingProperty.maxStayNights > 0 ? [{ label: 'Max Stay', value: `${viewingProperty.maxStayNights} nights` }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-lg px-3 py-2.5">
                      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
                      <p className="text-sm font-bold text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Location */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Location</p>
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>{viewingProperty.location || 'Location not set'}</span>
                  </div>
                </div>

                {/* Pricing */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Pricing</p>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Nightly rate</span>
                      <span className="text-sm font-bold text-gray-900">Ksh {viewingProperty.pricePerNight.toLocaleString()}</span>
                    </div>
                    {viewingProperty.weekendRate > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Weekend rate</span>
                        <span className="text-sm font-semibold text-gray-700">Ksh {viewingProperty.weekendRate.toLocaleString()}</span>
                      </div>
                    )}
                    {viewingProperty.monthlyRate > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Monthly rate</span>
                        <span className="text-sm font-semibold text-gray-700">Ksh {viewingProperty.monthlyRate.toLocaleString()}</span>
                      </div>
                    )}
                    {viewingProperty.cleaningFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Cleaning fee</span>
                        <span className="text-sm font-semibold text-gray-700">Ksh {viewingProperty.cleaningFee.toLocaleString()}</span>
                      </div>
                    )}
                    {viewingProperty.deposit > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Security deposit</span>
                        <span className="text-sm font-semibold text-gray-700">Ksh {viewingProperty.deposit.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Check-in & Check-out */}
                {(viewingProperty.checkInTime || viewingProperty.checkOutTime || viewingProperty.checkInMethod) && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Check-in & Check-out</p>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      {viewingProperty.checkInTime && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Check-in from</span>
                          <span className="text-sm font-semibold text-gray-900">{viewingProperty.checkInTime}</span>
                        </div>
                      )}
                      {viewingProperty.checkOutTime && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Check-out by</span>
                          <span className="text-sm font-semibold text-gray-900">{viewingProperty.checkOutTime}</span>
                        </div>
                      )}
                      {viewingProperty.checkInMethod && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Check-in method</span>
                          <span className="text-sm font-semibold text-gray-900 capitalize">{viewingProperty.checkInMethod.replace(/_/g,' ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Check-in instructions */}
                {viewingProperty.checkInInstructions && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Check-in Instructions</p>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3 whitespace-pre-line">{viewingProperty.checkInInstructions}</p>
                  </div>
                )}

                {/* Caretaker */}
                {(viewingProperty.caretakerName || viewingProperty.caretakerPhone) && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Caretaker</p>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      {viewingProperty.caretakerName && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          <span className="text-sm font-medium text-gray-800">{viewingProperty.caretakerName}</span>
                        </div>
                      )}
                      {viewingProperty.caretakerPhone && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.82 19.79 19.79 0 01.1 2.2 2 2 0 012.1 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/></svg>
                          <span className="text-sm text-gray-700">{viewingProperty.caretakerPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* House rules */}
                {(() => {
                  const activeRules = HOUSE_RULE_LABELS.filter(r => viewingProperty.houseRules[r.key]);
                  return activeRules.length > 0 ? (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">House Rules</p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeRules.map(r => (
                          <span key={r.key} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${r.key === 'childrenAllowed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{r.label}</span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Additional rules */}
                {viewingProperty.additionalRules && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Additional Rules</p>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3 whitespace-pre-line">{viewingProperty.additionalRules}</p>
                  </div>
                )}

                {/* Cancellation policy */}
                {viewingProperty.cancellationPolicy && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Cancellation Policy</p>
                    <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 capitalize">{viewingProperty.cancellationPolicy}</span>
                  </div>
                )}

                {/* Amenities */}
                {(viewingPropertyDetails?.amenities ?? viewingProperty.amenities).length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Amenities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(viewingPropertyDetails?.amenities ?? viewingProperty.amenities).map((a: string) => (
                        <span key={a} className="text-xs px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full border border-teal-100 font-medium">{a}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos strip */}
                {viewingPropertyDetails && viewingPropertyDetails.photos.length > 1 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Photos ({viewingPropertyDetails.photos.length})</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {viewingPropertyDetails.photos.map((ph, i) => (
                        <div key={i} className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 relative">
                          <img src={ph.url} alt="" className="w-full h-full object-cover" />
                          {ph.isCover && <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold bg-green-600 text-white py-0.5">Cover</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {viewingProperty.description && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Description</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{viewingProperty.description}</p>
                  </div>
                )}

              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
              {viewingProperty.status === 'draft' ? (
                <button
                  onClick={() => handleContinueProperty(viewingProperty)}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors">
                  Continue Setup
                </button>
              ) : (
                <button
                  onClick={() => handleEditProperty(viewingProperty)}
                  className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-colors">
                  Edit Property
                </button>
              )}
              <button
                onClick={() => setViewingProperty(null)}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showWizard && <AirbnbPropertyWizard onClose={() => { setShowWizard(false); loadProperties(); }} />}
      {editingProperty && editWizardData && (
        <AirbnbPropertyWizard
          mode="edit"
          initialData={editWizardData}
          propertyId={editingProperty.id}
          onClose={() => { setEditingProperty(null); setEditWizardData(null); loadProperties(); }}
        />
      )}
      {continuingProperty && continueWizardData && (
        <AirbnbPropertyWizard
          mode="continue"
          initialData={continueWizardData}
          propertyId={continuingProperty.id}
          initialStep={continuingProperty.setupStep ?? 1}
          onClose={() => { setContinuingProperty(null); setContinueWizardData(null); loadProperties(); }}
        />
      )}
      {editLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl px-6 py-4 shadow-lg flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-gray-700">Loading property data…</span>
          </div>
        </div>
      )}

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
                <h1 className="text-lg font-bold text-gray-900">My Properties</h1>
                <p className="text-xs text-gray-400">{activeCount} active units</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`px-2 py-4 sm:px-6 sm:py-8 space-y-5 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[280px] lg:pr-[200px]' : 'lg:pl-[456px] lg:pr-[200px]'}`}>

          {/* ── Header ── */}
          <div className="flex items-start justify-between">
            <div />
            <div className="flex items-center gap-2">
              <input ref={csvFileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
              <button onClick={() => csvFileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-green-50 hover:border-green-500 hover:text-green-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Import CSV
              </button>
              <button
                onClick={() => setShowWizard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Property
              </button>
            </div>
          </div>

          {/* ── Filter bar ── */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search units..."
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent w-44"
              />
            </div>

            {/* Type filter */}
            <div className="relative">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer"
              >
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
            </div>


            {/* Spacer */}
            <div className="flex-1" />

            {/* View toggle */}
            <div className="hidden sm:flex border border-gray-300 rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => setView('grid')}
                className={`p-2 transition-colors ${view === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 transition-colors ${view === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* ── Loading state ── */}
          {loading && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              <span className="text-sm">Loading properties…</span>
            </div>
          )}

          {/* ── Grid View ── always on mobile, conditional on desktop */}
          {!loading && (view === 'grid' || true) && (
            <div className={view !== 'grid' ? 'sm:hidden' : ''}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(p => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  {/* Title row */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[p.status]}`} />
                    <span className="font-semibold text-gray-900 text-sm">{p.name}</span>
                    {p.status === 'draft' ? (
                      <span className="ml-auto text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Setup Incomplete</span>
                    ) : p.status === 'blocked' ? (
                      <span className="ml-auto text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">Blocked</span>
                    ) : (
                      <span className={`ml-auto text-xs font-medium ${p.status === 'active' ? 'text-green-600' : p.status === 'maintenance' ? 'text-yellow-600' : 'text-gray-500'}`}>{p.status}</span>
                    )}
                  </div>

                  {/* Details row */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3 ml-4">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 010 4H2"/><path d="M2 16h14a2 2 0 010 4H2"/></svg>
                    <span className="font-medium text-gray-700">{p.bedrooms}</span>
                    {p.category !== 'Apartment' && <span>{p.category}</span>}
                    <span className="truncate max-w-[120px]">{p.location}</span>
                  </div>

                  {/* Price */}
                  {p.status === 'draft' ? (
                    <p className="text-sm text-amber-600 ml-4 mb-2 font-medium">
                      Left off at: <strong>{STEP_LABELS[p.setupStep ?? 1]}</strong>
                    </p>
                  ) : (
                    <p className="text-base font-bold text-gray-900 ml-4 mb-4">
                      Ksh {p.pricePerNight.toLocaleString()}<span className="text-xs font-normal text-gray-500">/night</span>
                    </p>
                  )}

                  {/* Continue banner for draft */}
                  {p.status === 'draft' && (
                    <button
                      onClick={() => handleContinueProperty(p)}
                      className="w-full mb-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                      Continue Setup
                    </button>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                    <button onClick={() => setViewingProperty(p)} className="flex items-center gap-1.5 flex-1 justify-center py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      Details
                    </button>
                    <button onClick={() => handleEditProperty(p)} className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button className="p-1.5 border border-red-100 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}

          {/* ── List View ── desktop only */}
          {!loading && view === 'list' && (
            <div className="hidden sm:block">
            <>
              {/* ── Mobile: card stack ── */}
              <div className="sm:hidden space-y-3">
                {filtered.map(p => (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    {/* Name + status badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${STATUS_DOT[p.status]}`} />
                        <span className="font-semibold text-gray-900 text-sm leading-tight">{p.name}</span>
                      </div>
                      {p.status === 'draft' ? (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 whitespace-nowrap flex-shrink-0">Incomplete</span>
                      ) : p.status === 'blocked' ? (
                        <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200 whitespace-nowrap flex-shrink-0">Blocked</span>
                      ) : (
                        <span className={`text-xs font-medium whitespace-nowrap flex-shrink-0 ${p.status === 'active' ? 'text-green-600' : p.status === 'maintenance' ? 'text-yellow-600' : 'text-gray-500'}`}>{p.status}</span>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1 ml-4">
                      <span className="font-medium text-gray-700">{p.bedrooms} bd</span>
                      <span>·</span>
                      <span>{p.category}</span>
                    </div>
                    {p.location && (
                      <p className="text-xs text-gray-400 ml-4 mb-2 truncate">{p.location}</p>
                    )}

                    {/* Price / draft info */}
                    {p.status === 'draft' ? (
                      <p className="text-xs text-amber-600 ml-4 mb-3 font-medium">
                        Left off at: <strong>{STEP_LABELS[p.setupStep ?? 1]}</strong>
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-gray-900 ml-4 mb-3">
                        Ksh {p.pricePerNight.toLocaleString()}<span className="text-xs font-normal text-gray-500">/night</span>
                      </p>
                    )}

                    {/* Continue banner */}
                    {p.status === 'draft' && (
                      <button onClick={() => handleContinueProperty(p)}
                        className="w-full mb-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        Continue Setup
                      </button>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                      <button onClick={() => setViewingProperty(p)}
                        className="flex items-center gap-1.5 flex-1 justify-center py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        Details
                      </button>
                      {p.status !== 'draft' && (
                        <button onClick={() => handleEditProperty(p)}
                          className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                      )}
                      <button className="p-1.5 border border-red-100 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Desktop: table (unchanged) ── */}
              <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Property</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Price/night</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[p.status]}`} />
                            <span className="font-semibold text-gray-900">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{p.bedrooms} · {p.category}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell truncate max-w-[180px]">{p.location}</td>
                        <td className="px-4 py-3">
                          {p.status === 'draft' ? (
                            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Incomplete</span>
                          ) : (
                            <span className={`text-xs font-medium ${p.status === 'active' ? 'text-green-600' : p.status === 'maintenance' ? 'text-yellow-600' : 'text-gray-500'}`}>
                              {p.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 hidden sm:table-cell">Ksh {p.pricePerNight.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setViewingProperty(p)} className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 font-medium">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                              Details
                            </button>
                            {p.status === 'draft' ? (
                              <button onClick={() => handleContinueProperty(p)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-colors">
                                Continue
                              </button>
                            ) : (
                              <button onClick={() => handleEditProperty(p)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                              </button>
                            )}
                            <button className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <p className="font-medium text-gray-500">No properties match your filters</p>
              <button onClick={() => { setSearch(''); setFilterType('All types'); setFilterStatus('All statuses'); }}
                className="mt-2 text-sm text-gray-900 hover:underline">Clear filters</button>
            </div>
          )}

        </div>
      </div>

      {/* ── CSV Import Modal ── */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Import Properties from CSV</h2>
                {!csvError && <p className="text-sm text-gray-500 mt-0.5">{csvRows.length} propert{csvRows.length === 1 ? 'y' : 'ies'} ready to import</p>}
              </div>
              <button onClick={() => { setShowCsvModal(false); setCsvRows([]); setCsvError(''); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {csvError ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p className="text-sm text-red-600 font-medium">{csvError}</p>
                <p className="text-xs text-gray-500">Expected columns: <code className="bg-gray-100 px-1 rounded">name, type, location, county, bedrooms, bathrooms, nightly_rate, status</code></p>
                <a href="data:text/csv;charset=utf-8,name,type,location,county,bedrooms,bathrooms,max_guests,nightly_rate,status%0AExample Studio,studio,Westlands,Nairobi,0,1,2,4500,active" download="properties_template.csv"
                  className="mt-2 text-sm text-gray-900 underline">Download template CSV</a>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto px-6 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 font-semibold text-gray-600 text-xs uppercase">Name</th>
                        <th className="text-left py-2 font-semibold text-gray-600 text-xs uppercase">Type</th>
                        <th className="text-left py-2 font-semibold text-gray-600 text-xs uppercase">Location</th>
                        <th className="text-left py-2 font-semibold text-gray-600 text-xs uppercase">Beds</th>
                        <th className="text-left py-2 font-semibold text-gray-600 text-xs uppercase">Rate/night</th>
                        <th className="text-left py-2 font-semibold text-gray-600 text-xs uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {csvRows.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="py-2 font-medium text-gray-900">{r.name || r.property_name}</td>
                          <td className="py-2 text-gray-600 capitalize">{r.type || r.property_type || 'apartment'}</td>
                          <td className="py-2 text-gray-600">{r.location || r.neighbourhood || '—'}{r.county ? `, ${r.county}` : ''}</td>
                          <td className="py-2 text-gray-600">{r.bedrooms || '1'}</td>
                          <td className="py-2 text-gray-600">Ksh {parseInt(r.nightly_rate || r.price || r.price_per_night || '0').toLocaleString()}</td>
                          <td className="py-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'active' || !r.status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{r.status || 'active'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
                  <a href="data:text/csv;charset=utf-8,name,type,location,county,bedrooms,bathrooms,max_guests,nightly_rate,status%0AExample Studio,studio,Westlands,Nairobi,0,1,2,4500,active" download="properties_template.csv"
                    className="text-xs text-gray-400 hover:text-gray-600 underline">Download template</a>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setShowCsvModal(false); setCsvRows([]); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                    <button onClick={confirmCsvImport} disabled={csvImporting} className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center gap-2">
                      {csvImporting ? (
                        <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Importing {csvDone}/{csvRows.length}…</>
                      ) : (
                        <>Import {csvRows.length} propert{csvRows.length === 1 ? 'y' : 'ies'}</>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
