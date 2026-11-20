// Экран «История питания»: ищет последний день до сегодняшнего, в котором есть записи.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { localDate, offsetDate } from '../format.js';
import { Shell, Notice } from '../components/ui.jsx';

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

// Открывается по адресу /nutrition/history. Находит нужный день и переходит
// на /nutrition/history/ДАТА — там App.jsx показывает <NutritionPage history />.
export function NutritionHistory() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  function findLastDay() {
    setError('');
    const today = localDate();
    api('/meals')
      .then((data) => {
        // Записей в прошлом нет — показываем вчерашний день.
        const day = lastDayBefore(data.meals, today) || offsetDate(today, -1);
        navigate(`/nutrition/history/${day}`, { replace: true });
      })
      .catch((problem) => setError(problem.message));
  }

  useEffect(findLastDay, []);

  return (
    <Shell title="История питания">
      {error && <Notice message={error} retry={findLastDay} />}
      {!error && <p className="muted">Ищем последнюю запись…</p>}
    </Shell>
  );
}
