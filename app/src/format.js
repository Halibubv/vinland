// Как показывать данные на экране: даты, числа и подписи.
// Дата внутри приложения — строка "ГГГГ-ММ-ДД" (так же она хранится в базе).

// Типы приёмов пищи: слева ключ из базы, справа подпись для пользователя.
export const mealTypes = { breakfast: 'Завтрак', lunch: 'Обед', snack: 'Перекус', dinner: 'Ужин' };

// ---------- Даты ----------

// Date → "2026-10-16". Без аргумента — сегодня.
export function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Похожа ли строка на дату "ГГГГ-ММ-ДД" (например, дата из адреса страницы).
export function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
}

// "2026-10-16" → объект Date.
function toDate(value) {
  const [year, month, day] = value.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day));
}

// "2026-10-16" → "16 октября 2026"
export function dateLabel(value) {
  if (!isDate(value)) return '';
  return toDate(value)
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(' г.', '');
}

// "2026-10-16" → "16 октября"
export function dayMonth(value) {
  if (!isDate(value)) return 'Дата не указана';
  return toDate(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

// "2026-10-16" → "16 окт."
export function shortDate(value) {
  return toDate(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// "2026-10-16" → "пт", а weekday("2026-10-16", 'long') → "пятница".
export function weekday(value, length = 'short') {
  return toDate(value).toLocaleDateString('ru-RU', { weekday: length });
}

// "Сегодня", "Вчера" или "14 октября".
export function relativeDay(value) {
  if (value === localDate()) return 'Сегодня';
  if (value === offsetDate(localDate(), -1)) return 'Вчера';
  return dayMonth(value);
}

// Сдвиг даты на offset дней: offsetDate("2026-10-16", -1) → "2026-10-15".
export function offsetDate(value, offset) {
  const date = toDate(value);
  date.setDate(date.getDate() + offset);
  return localDate(date);
}

// ---------- Числа ----------

// Граммы — до одного знака после запятой: "94,2".
export function formatNumber(value) {
  return (Number(value) || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 });
}

// Вес штанги — до двух знаков: "61,25" (блины бывают по 1,25 кг).
export function formatWeight(value) {
  return (Number(value) || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

// Калории — целым числом: "2 400".
export function formatInt(value) {
  return Math.round(Number(value) || 0).toLocaleString('ru-RU');
}

// Слово в нужной форме: pluralWord(5, 'подход', 'подхода', 'подходов') → "подходов".
export function pluralWord(count, one, few, many) {
  const lastTwo = Math.abs(Number(count)) % 100;
  const last = lastTwo % 10;
  if (lastTwo > 10 && lastTwo < 20) return many; // 11–19: "11 подходов"
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

// Число со словом: plural(5, 'подход', 'подхода', 'подходов') → "5 подходов".
export function plural(count, one, few, many) {
  return formatInt(count) + ' ' + pluralWord(count, one, few, many);
}

// Процент выполнения цели (не больше 100). Если цели нет — 0.
export function percentOf(value, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((Number(value) / Number(target)) * 100));
}

// Подходы упражнения коротко: "3 × 8 · 100 кг", если все подходы одинаковые,
// иначе просто "4 подхода".
export function setsSummary(sets) {
  if (sets.length === 0) return 'Без подходов';
  const first = sets[0];
  // Сравниваем через Number: с сервера числа могут прийти строками ("8").
  const allSame = sets.every(
    (set) =>
      Number(set.repetitions) === Number(first.repetitions) &&
      Number(set.weight_kg) === Number(first.weight_kg),
  );
  if (!allSame) return plural(sets.length, 'подход', 'подхода', 'подходов');

  let weight = '';
  if (Number(first.weight_kg)) weight = ` · ${formatWeight(first.weight_kg)} кг`;
  return `${sets.length} × ${formatInt(first.repetitions)}${weight}`;
}
