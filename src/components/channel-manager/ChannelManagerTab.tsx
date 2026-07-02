'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export const CHANNEL_OPTIONS = [
  { value: 'Airbnb', label: 'Airbnb', icon: '✈️' },
  { value: 'Booking.com', label: 'Booking.com', icon: '📅' },
  { value: 'Google Calendar', label: 'Google Calendar', icon: '📆' },
  { value: 'Jiji', label: 'Jiji Kenya', icon: '🛒' },
  { value: 'VRBO', label: 'VRBO', icon: '🏠' },
  { value: 'Other', label: 'Other', icon: '🔗' },
];

interface Property {
  id: string;
  name: string;
}

interface ChannelConnection {
  id: string;
  property_id: string;
  channel: string;
  display_name: string;
  ical_import_url: string;
  export_token: string;
  last_synced_at: string | null;
  sync_status: string | null;
  sync_error: string | null;
  events_imported: number;
  is_active: boolean;
  created_at: string;
  properties?: { id: string; name: string } | null;
}

interface ChannelManagerTabProps {
  properties: Property[];
}

export default function ChannelManagerTab({ properties }: ChannelManagerTabProps) {
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ property_id: '', channel: 'Airbnb', display_name: '', ical_import_url: '' });
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/channel-manager');
      const data = await res.json();
      if (!data.error) setConnections(data.connections ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { fetchConnections(); }, []);

  const grouped = properties.map(prop => ({
    property: prop,
    channels: connections.filter(c => c.property_id === prop.id),
  }));

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleAdd = async () => {
    if (!form.property_id || !form.channel || !form.ical_import_url) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/channel-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setConnections(prev => [data.connection, ...prev]);
      setShowAdd(false);
      setForm({ property_id: '', channel: 'Airbnb', display_name: '', ical_import_url: '' });
      toast.success('Channel connected. Starting first sync...');
      // Auto-sync the new channel
      await handleSync(data.connection.id, false);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (id: string, showToast = true) => {
    setSyncingId(id);
    try {
      const res = await fetch(`/api/channel-manager/${id}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        if (showToast) toast.error(data.error);
      } else {
        setConnections(prev => prev.map(c => c.id === id ? data.connection : c));
        if (showToast) toast.success(`Synced ${data.events_imported ?? 0} events`);
      }
    } finally {
      setSyncingId(null);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/channel-manager/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    });
    const data = await res.json();
    if (data.error) {
      toast.error(data.error);
      return;
    }
    setConnections(prev => prev.map(c => c.id === id ? data.connection : c));
    toast.success(data.connection.is_active ? 'Channel enabled' : 'Channel disabled');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this channel connection and all imported blocked dates?')) return;
    const res = await fetch(`/api/channel-manager/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) {
      toast.error(data.error);
      return;
    }
    setConnections(prev => prev.filter(c => c.id !== id));
    toast.success('Channel removed');
  };

  const copyExportUrl = (token: string) => {
    const url = `${baseUrl}/api/calendar/export/${token}.ics`;
    navigator.clipboard.writeText(url).then(() => toast.success('Export URL copied'));
  };

  const maskUrl = (url: string) => {
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.hostname}${u.pathname.slice(0, 12)}…`;
    } catch {
      return url.slice(0, 30) + (url.length > 30 ? '…' : '');
    }
  };

  const formatLastSync = (at: string | null) => {
    if (!at) return 'Never synced';
    const d = new Date(at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString();
  };

  const statusBadge = (status: string | null) => {
    if (status === 'ok') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Synced</span>;
    if (status === 'error') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Error</span>;
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Pending</span>;
  };

  // Conflict detection: overlapping imported blocked dates from different channels on the same property
  const conflicts: { propertyName: string; count: number }[] = [];
  for (const { property, channels } of grouped) {
    for (const c of channels) {
      // We don't have individual blocked dates here; mark conflict if we can
      // but since we don't load blocked dates per channel in this view, we just
      // alert when a property has multiple active channels (manual overlap risk).
      if (c.is_active && channels.filter(x => x.is_active).length > 1) {
        const existing = conflicts.find(x => x.propertyName === property.name);
        if (existing) existing.count++;
        else conflicts.push({ propertyName: property.name, count: 1 });
        break;
      }
    }
  }

  return (
    <div className="space-y-4">
      {conflicts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          <p className="font-semibold mb-1">Potential overlap warnings</p>
          {conflicts.map(c => (
            <p key={c.propertyName}>{c.propertyName} has multiple active channels imported. Review the calendar for overlapping blocks.</p>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Channel
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-sm text-gray-400">Loading channels…</div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ property, channels }) => (
            <div key={property.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-900">{property.name}</h3>
                <button
                  onClick={() => {
                    const conn = channels[0];
                    if (conn) copyExportUrl(conn.export_token);
                  }}
                  disabled={channels.length === 0}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {channels.length === 0 ? 'Export disabled' : 'Copy export iCal URL'}
                </button>
              </div>

              {channels.length === 0 ? (
                <div className="p-4 text-sm text-gray-400">No channels connected yet.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {channels.map(c => {
                    const channel = CHANNEL_OPTIONS.find(o => o.value === c.channel) || CHANNEL_OPTIONS[5];
                    return (
                      <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{channel.icon}</span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{c.display_name || channel.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5" title={c.ical_import_url}>{maskUrl(c.ical_import_url)}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {statusBadge(c.sync_status)}
                              <span className="text-[10px] text-gray-400">{formatLastSync(c.last_synced_at)} · {c.events_imported ?? 0} events</span>
                            </div>
                            {c.sync_error && (
                              <p className="text-[10px] text-red-600 mt-1">{c.sync_error}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSync(c.id)}
                            disabled={syncingId === c.id}
                            className="text-xs font-semibold px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                          >
                            {syncingId === c.id ? 'Syncing…' : 'Sync Now'}
                          </button>
                          <button
                            onClick={() => handleToggle(c.id, c.is_active)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${c.is_active ? 'border-gray-300 hover:bg-gray-50' : 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700'}`}
                          >
                            {c.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1.5"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Channel Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Channel</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Property <span className="text-red-500">*</span></label>
                <select
                  value={form.property_id}
                  onChange={e => setForm({ ...form, property_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select property…</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Channel <span className="text-red-500">*</span></label>
                <select
                  value={form.channel}
                  onChange={e => setForm({ ...form, channel: e.target.value, display_name: CHANNEL_OPTIONS.find(o => o.value === e.target.value)?.label || '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {CHANNEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Display name (optional)</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={e => setForm({ ...form, display_name: e.target.value })}
                  placeholder={form.channel}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">iCal import URL <span className="text-red-500">*</span></label>
                <input
                  type="url"
                  value={form.ical_import_url}
                  onChange={e => setForm({ ...form, ical_import_url: e.target.value })}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">{saving ? 'Saving…' : 'Save & Sync'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
