// Экран «История питания»: открывает дневник на последнем дне до сегодняшнего,
// в котором есть записи. Сам дневник рисует NutritionPage.
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState('');
  // Если дата уже есть в адресе (?date=...), сразу показываем этот день.
  const hasDate = Boolean(parseDate(searchParams.get('date')));

  function findLastDay() {
    setError('');
    const today = localDate();
    api('/meals')
      .then((data) => {
        // Записей в прошлом нет — показываем вчерашний день.
        const day = lastDayBefore(data.meals, today) || offsetDate(today, -1);
        setSearchParams({ date: day }, { replace: true });
      })
      .catch((problem) => setError(problem.message));
  }

  useEffect(() => {
    if (!hasDate) findLastDay();
  }, []);

  if (hasDate) return <NutritionPage history />;

  return (
    <Shell title="История питания">
      {error && <Notice message={error} retry={findLastDay} />}
      {!error && <p className="muted">Ищем последнюю запись…</p>}
    </Shell>
  );
}
