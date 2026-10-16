// Dates travel through the app as local "YYYY-MM-DD" strings.

export function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

// "16 октября 2026" by default; pass Intl options to choose other parts.
export function dateLabel(value, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const date = parseDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('ru-RU', options).format(date).replace(/ г\.$/, '');
}

export function dayMonth(value) {
  return dateLabel(value, { day: 'numeric', month: 'long' }) || 'Дата не указана';
}

export function weekday(value) {
  return dateLabel(value, { weekday: 'short' });
}

// "Сегодня", "Вчера" or "14 октября" for headings that describe one day.
export function relativeDay(value) {
  if (value === localDate()) return 'Сегодня';
  if (value === offsetDate(localDate(), -1)) return 'Вчера';
  return dayMonth(value);
}

export function monthTitle(date) {
  return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
    .format(date)
    .replace(/ г\.$/, '')
    .replace(/^./, (first) => first.toUpperCase());
}

export function monthShift(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

export function offsetDate(value, offset) {
  const next = parseDate(value) || new Date();
  next.setDate(next.getDate() + offset);
  return localDate(next);
}
