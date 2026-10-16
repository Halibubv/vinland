import React, { useEffect, useState } from 'react';
import { api, formatNumber, localDate } from '../lib/api.js';
import { A, mealTypes } from '../lib/constants.js';
import { Shell, Notice, DailyGoals } from '../components/ui.jsx';

export function NutritionPage({ user }) {
  const [date, setDate] = useState(
    () => new URLSearchParams(window.location.search).get('date') || localDate(),
  );
  const [meals, setMeals] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState('');
  function reload() {
    setError('');
    setMeals(null);
    Promise.all([api(`/meals?date=${date}`), api(`/statistics?from=${date}&to=${date}`)])
      .then(([history, stats]) => {
        setMeals(history.meals);
        setStatistics(stats);
      })
      .catch((problem) => setError(problem.message));
  }
  useEffect(reload, [date]);
  const shift = (offset) => {
    const value = new Date(`${date}T12:00:00`);
    value.setDate(value.getDate() + offset);
    setDate(localDate(value));
  };
  return (
    <Shell
      title="Дневник питания"
      action={
        <div className="nutrition-toolbar">
          <div className="date-control">
            <img src={`${A}icon-calendar.svg`} alt="" />
            <button aria-label="Предыдущий день" onClick={() => shift(-1)}>
              ‹
            </button>
            <input
              type="date"
              aria-label="Дата дневника"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <button aria-label="Следующий день" onClick={() => shift(1)}>
              ›
            </button>
          </div>
          <a className="button button--primary" href={`/nutrition/new?date=${date}`}>
            ＋ Добавить продукт
          </a>
        </div>
      }
    >
      {error ? (
        <Notice message={error} retry={reload} />
      ) : !meals || !statistics ? (
        <p className="muted">Загружаем дневник…</p>
      ) : (
        <>
          <DailyGoals day={statistics.days[0]} goals={statistics.goals} />
          {Object.entries(mealTypes).map(([type, label]) => {
            const rows = meals.filter((meal) => meal.meal_type === type);
            const items = rows.flatMap((meal) => meal.items);
            const grams = items.reduce((sum, item) => sum + Number(item.quantity_g), 0);
            return (
              <div className="meal-group" key={type}>
                <div className="meal-group-head">
                  <img
                    src={`${A}${type === 'breakfast' || type === 'lunch' ? 'icon-sun.svg' : 'nav-food.svg'}`}
                    alt=""
                  />
                  <div>
                    <strong>{label}</strong>
                    <small>
                      {items.length
                        ? `${items.length} ${items.length === 1 ? 'продукт' : 'продукта'} · ${formatNumber(grams)} г`
                        : 'Нет добавленных продуктов'}
                    </small>
                  </div>
                </div>
                <div className="meal-group-body">
                  {rows.length ? (
                    rows.map((meal) => (
                      <a href={`/nutrition/${meal.id}`} className="meal-row" key={meal.id}>
                        <img src={`${A}food-photo.png`} alt="" />
                        <span>
                          {meal.items.map((item) => item.product_name_snapshot).join(', ') ||
                            'Без продуктов'}
                          <small>
                            {meal.items
                              .map(
                                (item) =>
                                  `${item.product_name_snapshot} ${formatNumber(item.quantity_g)} г`,
                              )
                              .join(' · ')}
                          </small>
                        </span>
                        <strong>{formatNumber(meal.totals.calories)} ккал</strong>
                        <b>···</b>
                      </a>
                    ))
                  ) : (
                    <div className="meal-empty">
                      <a
                        className="button button--outline"
                        href={`/nutrition/new?date=${date}&type=${type}`}
                      >
                        ＋ Добавить продукт
                      </a>
                      <span>Найдите продукт и укажите граммы</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <a className="history-link" href="/nutrition/history">
            <img src={`${A}icon-calendar.svg`} alt="" />
            <span>
              <strong>История питания</strong>
              <small>Прошлые дни доступны по дате</small>
            </span>
            <b aria-hidden="true">→</b>
          </a>
        </>
      )}
    </Shell>
  );
}
