'use client';

import { useState, useMemo } from 'react';

function isoDate(d: Date) { return d.toISOString().split('T')[0]; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmt(d: string) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }

const MONTHS_AHEAD = 12;
const DAY_NAMES   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildMonths(count: number) {
  const result = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return result;
}

export interface DatePickerModalProps {
  checkIn: string;
  checkOut: string;
  onConfirm: (checkIn: string, checkOut: string) => void;
  onClose?: () => void;
}

export function DatePickerModal({ checkIn, checkOut, onConfirm, onClose }: DatePickerModalProps) {
  const [tab, setTab]               = useState<'calendar' | 'flexible'>('calendar');
  const [start, setStart]           = useState(checkIn);
  const [end, setEnd]               = useState(checkOut);
  const [selecting, setSelecting]   = useState<'in' | 'out'>(checkIn ? 'out' : 'in');
  const [flexDuration, setFlexDuration] = useState('');
  const [flexMonths, setFlexMonths] = useState<string[]>([]);

  const today  = isoDate(new Date());
  const months = useMemo(() => buildMonths(MONTHS_AHEAD), []);
  const monthCards = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: SHORT_MONTHS[d.getMonth()], year: d.getFullYear() };
    });
  }, []);

  function handleDayClick(dateStr: string) {
    if (dateStr < today) return;
    if (selecting === 'in' || (start && end)) {
      setStart(dateStr); setEnd(''); setSelecting('out');
    } else {
      if (dateStr <= start) { setStart(dateStr); setEnd(''); setSelecting('out'); }
      else { setEnd(dateStr); setSelecting('in'); onConfirm(start, dateStr); }
    }
  }

  function isInRange(dateStr: string) {
    return !!(start && end && dateStr > start && dateStr < end);
  }

  const n = (start && end) ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) : 0;
  const canDone = tab === 'calendar' ? !!(start && end) : !!(flexDuration && flexMonths.length > 0);

  function handleDone() {
    if (tab === 'calendar') {
      if (start && end) onConfirm(start, end);
    } else {
      if (flexDuration && flexMonths.length > 0) {
        const [yr, mo] = flexMonths[0].split('-').map(Number);
        const s = new Date(yr, mo, 15);
        const daysMap: Record<string, number> = { weekend: 2, week: 7, month: 30, other: 14 };
        onConfirm(isoDate(s), isoDate(addDays(s, daysMap[flexDuration] ?? 7)));
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <div className="flex gap-6">
          {(['calendar', 'flexible'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors capitalize ${t === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
              {t === 'flexible' ? "I'm flexible" : 'Calendar'}
            </button>
          ))}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'calendar' ? (
          <div className="px-4 py-4">
            {months.map(({ year, month }) => {
              const firstDay = firstDayOfMonth(year, month);
              const days     = daysInMonth(year, month);
              return (
                <div key={`${year}-${month}`} className="mb-8">
                  <p className="font-bold text-gray-900 text-base mb-3">{MONTH_NAMES[month]} {year}</p>
                  <div className="grid grid-cols-7 mb-1">
                    {DAY_NAMES.map(d => <div key={d} className="text-center text-xs text-gray-400 font-semibold py-1">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: days }).map((_, i) => {
                      const day     = i + 1;
                      const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                      const isStart = dateStr === start;
                      const isEnd   = dateStr === end;
                      const inRange = isInRange(dateStr);
                      const isPast  = dateStr < today;
                      return (
                        <button key={day} disabled={isPast} onClick={() => handleDayClick(dateStr)}
                          className={`h-10 w-full text-sm font-medium transition-colors
                            ${isPast ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-50'}
                            ${(isStart || isEnd) ? 'bg-blue-600 text-white rounded-full font-bold' : ''}
                            ${inRange ? 'bg-blue-100 text-blue-800' : ''}
                            ${!isStart && !isEnd && !inRange && !isPast ? 'text-gray-900' : ''}
                          `}>
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-6">
            <p className="font-bold text-gray-900 text-base mb-4">How long do you want to stay?</p>
            {[
              { key: 'weekend', label: 'A weekend' },
              { key: 'week',    label: 'A week'    },
              { key: 'month',   label: 'A month'   },
              { key: 'other',   label: 'Other'     },
            ].map(opt => (
              <label key={opt.key} className="flex items-center gap-3 py-3 cursor-pointer select-none" onClick={() => setFlexDuration(opt.key)}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${flexDuration === opt.key ? 'border-blue-600' : 'border-gray-400'}`}>
                  {flexDuration === opt.key && <div className="w-2.5 h-2.5 rounded-full bg-blue-600"/>}
                </div>
                <span className="text-gray-900 text-base">{opt.label}</span>
              </label>
            ))}

            <p className="font-bold text-gray-900 text-base mt-6 mb-1">When do you want to go?</p>
            <p className="text-gray-400 text-sm mb-4">Select up to 3 months</p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {monthCards.map(mc => {
                const sel = flexMonths.includes(mc.key);
                return (
                  <button key={mc.key}
                    onClick={() => setFlexMonths(prev =>
                      sel ? prev.filter(m => m !== mc.key) : prev.length < 3 ? [...prev, mc.key] : prev
                    )}
                    className={`flex-shrink-0 w-24 rounded-xl border-2 p-3 text-center transition-colors ${sel ? 'border-blue-600 text-blue-600' : 'border-gray-200 text-gray-700'}`}>
                    <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <p className="font-bold text-sm">{mc.label}</p>
                    <p className="text-xs">{mc.year}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-gray-200 bg-white" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        {tab === 'calendar' && (
          <p className="text-sm text-gray-500 text-center mb-3">
            {start && end ? `${fmt(start)} – ${fmt(end)} (${n} night${n !== 1 ? 's' : ''})` : 'Select check-in and check-out dates'}
          </p>
        )}
        {tab === 'flexible' && flexDuration && flexMonths.length > 0 && (
          <p className="text-sm text-gray-500 text-center mb-3">
            {({ weekend:'A weekend', week:'A week', month:'A month', other:'Other' } as Record<string,string>)[flexDuration]} in {monthCards.find(m => m.key === flexMonths[0])?.label}
          </p>
        )}
        <button onClick={handleDone} disabled={!canDone}
          className={`w-full py-4 rounded-xl text-base font-bold text-white transition-colors ${canDone ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
          Done
        </button>
      </div>
    </div>
  );
}
