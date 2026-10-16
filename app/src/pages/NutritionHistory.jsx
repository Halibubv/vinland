import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { localDate, offsetDate, parseDate } from '../lib/dates.js';
import { Shell, Notice } from '../components/ui.jsx';
import { NutritionPage } from './Nutrition.jsx';

// Opens the diary on the last day before today that has meals ("предыдущая запись").
export function NutritionHistory() {
  const requested = new URLSearchParams(window.location.search).get('date');
  const [date, setDate] = useState(parseDate(requested) ? requested : null);
  const [error, setError] = useState('');
  function findLastDay() {
    setError('');
    const today = localDate();
    api('/meals')
      .then(({ meals }) => {
        const past = meals.map((meal) => meal.meal_date).filter((day) => day < today);
        setDate(past.length ? past.reduce((a, b) => (a > b ? a : b)) : offsetDate(today, -1));
      })
      .catch((problem) => setError(problem.message));
  }
  useEffect(() => {
    if (!date) findLastDay();
  }, []);
  if (date) return <NutritionPage history initialDate={date} />;
  return (
    <Shell title="История питания">
      {error ? (
        <Notice message={error} retry={findLastDay} />
      ) : (
        <p className="muted">Ищем последнюю запись…</p>
      )}
    </Shell>
  );
}
