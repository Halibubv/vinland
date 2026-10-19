// Экран «История питания»: открывает дневник на последнем дне до сегодняшнего,
// в котором есть записи. Сам дневник рисует NutritionPage.
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { localDate, offsetDate, parseDate } from '../lib/dates.js';
import { Shell, Notice } from '../components/ui.jsx';
import { NutritionPage } from './Nutrition.jsx';

// Самая поздняя дата приёма пищи раньше today или null, если таких нет.
// Даты в формате "ГГГГ-ММ-ДД" можно сравнивать как обычные строки.
function lastDayBefore(meals, today) {
  let lastDay = null;
  for (const meal of meals) {
    const day = meal.meal_date;
    if (day < today && (lastDay === null || day > lastDay)) lastDay = day;
  }
  return lastDay;
}

export function NutritionHistory() {
  // Если дата уже есть в адресе (?date=...), сразу открываем её.
  const requested = new URLSearchParams(window.location.search).get('date');
  const [date, setDate] = useState(parseDate(requested) ? requested : null);
  const [error, setError] = useState('');

  function findLastDay() {
    setError('');
    const today = localDate();
    api('/meals')
      .then((data) => {
        const lastDay = lastDayBefore(data.meals, today);
        // Записей в прошлом нет — показываем вчерашний день.
        setDate(lastDay || offsetDate(today, -1));
      })
      .catch((problem) => setError(problem.message));
  }

  useEffect(() => {
    if (!date) findLastDay();
  }, []);

  if (date) return <NutritionPage history initialDate={date} />;

  return (
    <Shell title="История питания">
      {error && <Notice message={error} retry={findLastDay} />}
      {!error && <p className="muted">Ищем последнюю запись…</p>}
    </Shell>
  );
}
