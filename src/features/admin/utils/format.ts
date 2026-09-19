import { dateLocale, strings } from '@/i18n/strings';

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) {
    return '—';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function formatMoney(cents: number, currency: string): string {
  const amount = cents / 100;
  const formatted = Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2);
  return `${currency} ${formatted}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(dateLocale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelative(value: string | null | undefined): string {
  const s = strings().admin.format;
  if (!value) return s.never;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return s.never;

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return s.justNow;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return s.minutesAgo(minutes);

  const hours = Math.round(minutes / 60);
  if (hours < 24) return s.hoursAgo(hours);

  const days = Math.round(hours / 24);
  if (days < 30) return s.daysAgo(days);

  return formatDate(value);
}

export function formatReadTime(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '—';
  const s = strings().admin.format;
  if (minutes < 60) return s.min(minutes);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return s.hoursMinutes(hours, rest);
}

export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

/** ISO date for an entitlement that should expire `months` from today. */
export function monthsFromNow(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

/** ISO date for a short support grant, measured in days rather than months. */
export function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/** "in 3 days", "today", "6 days ago" — how long is left on an entitlement. */
export function formatCountdown(value: string | null | undefined): string {
  const s = strings().admin.format;
  if (!value) return s.noEndDate;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return s.noEndDate;

  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (days === 0) return s.today;
  if (days === 1) return s.tomorrow;
  if (days > 0) return s.inDays(days);
  if (days === -1) return s.yesterday;
  return s.daysAgoLong(Math.abs(days));
}
