// Работа с датами. Внутри приложения дата — это строка "ГГГГ-ММ-ДД"
// в местном времени пользователя (так же она хранится в базе).

// Date → "2026-10-16". Без аргумента — сегодняшний день.
export function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// "2026-10-16" → Date. Для неверной строки (например, "2026-02-31") возвращает null.
export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const parts = value.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const date = new Date(year, month - 1, day);
  // Несуществующий день JavaScript переносит на следующий месяц — ловим это.
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

// По умолчанию "16 октября 2026"; через options можно выбрать другие части даты.
export function dateLabel(value, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const date = parseDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('ru-RU', options).format(date).replace(/ г\.$/, '');
}

// "16 октября"
export function dayMonth(value) {
  return dateLabel(value, { day: 'numeric', month: 'long' }) || 'Дата не указана';
}

// "пт"
export function weekday(value) {
  return dateLabel(value, { weekday: 'short' });
}

// "Сегодня", "Вчера" или "14 октября" — для заголовков про один день.
export function relativeDay(value) {
  if (value === localDate()) return 'Сегодня';
  if (value === offsetDate(localDate(), -1)) return 'Вчера';
  return dayMonth(value);
}

// "Октябрь 2026"
export function monthTitle(date) {
  const text = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
    .format(date)
    .replace(/ г\.$/, '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Первое число месяца, сдвинутого на offset месяцев.
export function monthShift(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

// Дата, сдвинутая на offset дней: offsetDate("2026-10-16", -1) → "2026-10-15".
export function offsetDate(value, offset) {
  const next = parseDate(value) || new Date();
  next.setDate(next.getDate() + offset);
  return localDate(next);
}
