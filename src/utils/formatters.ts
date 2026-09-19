import { ExpiryStatus } from '../types';

export function getStatusBadgeInfo(status?: ExpiryStatus) {
  switch (status) {
    case 'VALID':
      return {
        label: 'Valid',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'EXPIRING_SOON':
      return {
        label: 'Expiring Soon',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'EXPIRED':
      return {
        label: 'Expired',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      };
    default:
      return {
        label: 'Unknown',
        bg: 'bg-slate-50 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
      };
  }
}

export function getConfidenceBadge(score?: number) {
  if (score === undefined || score === null) return { color: 'text-slate-400', label: 'N/A' };
  if (score >= 90) return { color: 'text-emerald-600 font-semibold', label: `${score}%` };
  if (score >= 75) return { color: 'text-teal-600 font-semibold', label: `${score}%` };
  if (score >= 50) return { color: 'text-amber-600 font-semibold', label: `${score}%` };
  return { color: 'text-rose-600 font-semibold', label: `${score}%` };
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr?: string | null): { date: string; time: string } {
  if (!dateStr) return { date: 'N/A', time: 'N/A' };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: dateStr, time: '' };
    return {
      date: d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  } catch {
    return { date: dateStr, time: '' };
  }
}
