import { localDate } from './api.js';

export function monthTitle(date) {
  return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
    .format(date)
    .replace(/^./, (first) => first.toUpperCase());
}

export function monthShift(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

export function dayMonth(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'Дата не указана';
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() + 1 !== month || parsed.getDate() !== day)
    return 'Дата не указана';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(parsed);
}

export function offsetDate(date, offset) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + offset);
  return localDate(next);
}
