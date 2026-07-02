// Pure iCal parser/generator (no extra deps)
// Supports the VEVENT-only dialect emitted by Airbnb, Booking.com, Google Calendar, VRBO, etc.

export interface ParsedEvent {
  uid: string;
  summary: string;
  dtstart: string; // YYYY-MM-DD or ISO
  dtend: string;   // YYYY-MM-DD or ISO
  description?: string;
}

export interface CalendarEventInput {
  uid: string;
  summary: string;
  start: string;   // YYYY-MM-DD
  end: string;     // YYYY-MM-DD (exclusive checkout date)
  description?: string;
  timestamp?: string; // ISO
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let result = '';
  let i = 0;
  while (i < line.length) {
    if (i === 0) {
      result += line.slice(i, i + 75);
      i += 75;
    } else {
      result += '\r\n ' + line.slice(i, i + 74);
      i += 74;
    }
  }
  return result;
}

function escapeICalValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function toDateValue(dt: string): string {
  // Return YYYY-MM-DD whether input is ISO or already date
  return dt.split('T')[0];
}

function parseDateValue(dt: string): string {
  // Convert ical date params: VALUE=DATE:20250130 or 2025-01-30
  const cleaned = dt.replace(/^VALUE=DATE:/, '').replace(/Z$/, '');
  if (/^\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  }
  return toDateValue(cleaned);
}

export function parseICal(text: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const lines = text
    .replace(/\r\n\s+/g, '') // unfold lines
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  let current: Partial<ParsedEvent> & Record<string, string> = {};
  let inEvent = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current.uid && current.dtstart && current.dtend) {
        events.push({
          uid: current.uid,
          summary: current.summary || 'Blocked',
          dtstart: parseDateValue(current.dtstart),
          dtend: parseDateValue(current.dtend),
          description: current.description,
        });
      }
      inEvent = false;
      current = {};
      continue;
    }
    if (!inEvent) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const namePart = line.slice(0, colonIdx);
    const name = namePart.split(';')[0].toUpperCase();
    const value = line.slice(colonIdx + 1);

    if (name === 'UID') current.uid = value;
    else if (name === 'SUMMARY') current.summary = value;
    else if (name === 'DTSTART') current.dtstart = value;
    else if (name === 'DTEND') current.dtend = value;
    else if (name === 'DESCRIPTION') current.description = value;
  }

  return events;
}

export function generateICal(events: CalendarEventInput[], calName = 'HostBooks Calendar'): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HostBooks//HostBooks Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICalValue(calName)}`,
    `X-WR-TIMEZONE:Africa/Nairobi`,
  ];

  for (const ev of events) {
    const startDate = toDateValue(ev.start).replace(/-/g, '');
    const endDate = toDateValue(ev.end).replace(/-/g, '');
    const uid = ev.uid || `${now}-${Math.random().toString(36).slice(2)}@hostbooks.ke`;
    const stamp = ev.timestamp
      ? ev.timestamp.replace(/[-:]/g, '').split('.')[0] + 'Z'
      : now;

    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${uid}`));
    lines.push(foldLine(`SUMMARY:${escapeICalValue(ev.summary || 'Blocked')}`));
    if (ev.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeICalValue(ev.description)}`));
    }
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${startDate}`);
    lines.push(`DTEND;VALUE=DATE:${endDate}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
