const numbers = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const integers = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

// Grams and kilograms keep one decimal at most: "94,2 г", "62,5 кг".
export function formatNumber(value) {
  return numbers.format(Number(value) || 0);
}

// Calories and goals are shown as whole numbers: "2 400 ккал".
export function formatInt(value) {
  return integers.format(Math.round(Number(value) || 0));
}

// plural(5, 'подход', 'подхода', 'подходов') → "5 подходов"
export function plural(count, one, few, many) {
  const n = Math.abs(Number(count)) % 100;
  const last = n % 10;
  const word = n > 10 && n < 20 ? many : last === 1 ? one : last >= 2 && last <= 4 ? few : many;
  return `${formatInt(count)} ${word}`;
}

export function percentOf(value, target) {
  return target ? Math.min(100, Math.round((Number(value) / Number(target)) * 100)) : 0;
}

// "2 400 ккал · Б 160 / Ж 80 / У 260 г", or a hint when no goals are set.
export function goalsSummary(user) {
  const { target_calories: kcal, target_protein_g: p, target_fat_g: f, target_carbs_g: c } = user;
  if (!kcal && !p && !f && !c) return 'Цели не заданы';
  const grams = (value) => (value ? formatNumber(value) : '—');
  return `${kcal ? formatInt(kcal) : '—'} ккал · Б ${grams(p)} / Ж ${grams(f)} / У ${grams(c)} г`;
}

export function setsSummary(sets = []) {
  if (!sets.length) return 'Без подходов';
  const [first] = sets;
  const same = sets.every(
    (s) => s.repetitions == first.repetitions && s.weight_kg == first.weight_kg,
  );
  const weight = Number(first.weight_kg) ? ` · ${formatNumber(first.weight_kg)} кг` : '';
  return same
    ? `${sets.length} × ${formatInt(first.repetitions)}${weight}`
    : plural(sets.length, 'подход', 'подхода', 'подходов');
}
