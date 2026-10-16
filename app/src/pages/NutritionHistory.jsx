import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { dateLabel } from '../lib/dates.js';
import { formatInt, plural } from '../lib/format.js';
import { mealTypes } from '../lib/constants.js';
import { Shell, Notice, Empty } from '../components/ui.jsx';

export function NutritionHistory() {
  const [meals, setMeals] = useState(null);
  const [error, setError] = useState('');
  function reload() {
    api('/meals')
      .then((data) => setMeals(data.meals))
      .catch((problem) => setError(problem.message));
  }
  useEffect(reload, []);
  return (
    <Shell
      title="История питания"
      subtitle="Все сохранённые приёмы пищи"
      action={
        <a className="button button--outline" href="/nutrition">
          ← К дневнику
        </a>
      }
    >
      {error ? (
        <Notice message={error} retry={reload} />
      ) : !meals ? (
        <p className="muted">Загружаем историю…</p>
      ) : meals.length ? (
        <div className="history-list">
          {meals.map((meal) => (
            <a href={`/nutrition/${meal.id}`} key={meal.id}>
              <span>{dateLabel(meal.meal_date)}</span>
              <strong>{mealTypes[meal.meal_type]}</strong>
              <span>{plural(meal.items.length, 'продукт', 'продукта', 'продуктов')}</span>
              <b>{formatInt(meal.totals.calories)} ккал →</b>
            </a>
          ))}
        </div>
      ) : (
        <Empty
          title="История пока пустая"
          detail="Первый приём пищи появится здесь после сохранения."
          action="Добавить питание"
          to="/nutrition/new"
        />
      )}
    </Shell>
  );
}
