// Форматирование чисел и коротких подписей для интерфейса.

const decimalFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const integerFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

// Граммы и килограммы — не больше одного знака после запятой: "94,2 г", "62,5 кг".
export function formatNumber(value) {
  return decimalFormat.format(Number(value) || 0);
}

// Калории и цели — целыми числами: "2 400 ккал".
export function formatInt(value) {
  return integerFormat.format(Math.round(Number(value) || 0));
}

// plural(5, 'подход', 'подхода', 'подходов') → "5 подходов"
export function plural(count, one, few, many) {
  const lastTwoDigits = Math.abs(Number(count)) % 100;
  const lastDigit = lastTwoDigits % 10;
  let word;
  if (lastTwoDigits > 10 && lastTwoDigits < 20) {
    word = many; // 11–19: "11 подходов"
  } else if (lastDigit === 1) {
    word = one;
  } else if (lastDigit >= 2 && lastDigit <= 4) {
    word = few;
  } else {
    word = many;
  }
  return `${formatInt(count)} ${word}`;
}

// Процент выполнения цели, не больше 100. Без цели — 0.
export function percentOf(value, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((Number(value) / Number(target)) * 100));
}

// "2 400 ккал · Б 160 / Ж 80 / У 260 г" или подсказка, если цели не заданы.
export function goalsSummary(user) {
  const calories = user.target_calories;
  const protein = user.target_protein_g;
  const fat = user.target_fat_g;
  const carbs = user.target_carbs_g;
  if (!calories && !protein && !fat && !carbs) return 'Цели не заданы';

  const caloriesText = calories ? formatInt(calories) : '—';
  return `${caloriesText} ккал · Б ${gramsOrDash(protein)} / Ж ${gramsOrDash(fat)} / У ${gramsOrDash(carbs)} г`;
}

function gramsOrDash(value) {
  return value ? formatNumber(value) : '—';
}

// Краткое описание подходов упражнения: "3 × 8 · 100 кг", если все подходы
// одинаковые, иначе просто "4 подхода".
export function setsSummary(sets = []) {
  if (!sets.length) return 'Без подходов';
  const first = sets[0];
  // == а не ===: с сервера числа могут прийти строками ("8" и 8).
  const allSame = sets.every(
    (set) => set.repetitions == first.repetitions && set.weight_kg == first.weight_kg,
  );
  if (!allSame) return plural(sets.length, 'подход', 'подхода', 'подходов');

  let weight = '';
  if (Number(first.weight_kg)) weight = ` · ${formatNumber(first.weight_kg)} кг`;
  return `${sets.length} × ${formatInt(first.repetitions)}${weight}`;
}
