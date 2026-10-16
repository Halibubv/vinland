import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { localDate, parseDate, relativeDay } from '../lib/dates.js';
import { formatInt, formatNumber, plural } from '../lib/format.js';
import { A, mealTypes } from '../lib/constants.js';
import { Shell, Notice } from '../components/ui.jsx';
import { DateStepper } from '../components/DateStepper.jsx';
import { DaySummary } from '../components/DaySummary.jsx';
import { EntryIcon } from '../components/EntryIcon.jsx';
import './Nutrition.css';

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key]), 0);
}

function productCount(items) {
  return `${plural(items.length, 'продукт', 'продукта', 'продуктов')} · ${formatNumber(sum(items, 'quantity_g'))} г`;
}

function MealSlot({ type, label, meals, date }) {
  const items = meals.flatMap((meal) => meal.items);
  const calories = sum(meals, 'calories');
  const last = meals.at(-1);
  const addHref = last
    ? `/nutrition/${last.id}?add=1`
    : `/nutrition/new?date=${date}&type=${type}&add=1`;
  return (
    <section className={`meal-slot ${meals.length ? '' : 'is-empty'}`}>
      <header className="meal-slot-head">
        <EntryIcon meal={type} />
        <div>
          <h2>
            {label}
            {meals.length > 0 && <span className="narrow-only"> · {formatInt(calories)} ккал</span>}
          </h2>
          <small className={meals.length ? 'wide-only' : ''}>
            {items.length ? productCount(items) : 'Нет добавленных продуктов'}
          </small>
        </div>
      </header>
      <div className="meal-slot-body">
        {meals.map((meal) => (
          <a href={`/nutrition/${meal.id}`} className="meal-entry" key={meal.id}>
            <EntryIcon meal={type} />
            <span className="meal-entry-text">
              {meal.items.map((item) => item.product_name_snapshot).join(', ') || 'Без продуктов'}
              <small className="wide-only">
                {meal.items
                  .map((item) => `${item.product_name_snapshot} ${formatNumber(item.quantity_g)} г`)
                  .join(' · ')}
              </small>
              <small className="narrow-only">{productCount(meal.items)}</small>
            </span>
            <strong className="wide-only">{formatInt(meal.totals.calories)} ккал</strong>
            <b className="wide-only" aria-hidden="true">
              ···
            </b>
            <span className="meal-entry-open narrow-only">› &nbsp;Открыть состав приёма пищи</span>
          </a>
        ))}
        <a
          className={`button button--outline meal-slot-add ${meals.length ? 'narrow-only' : ''}`}
          href={addHref}
        >
          <span className="wide-only">⊕&nbsp;</span>Добавить продукт
        </a>
        {!meals.length && (
          <span className="meal-slot-hint wide-only">Найдите продукт и укажите граммы</span>
        )}
      </div>
    </section>
  );
}

export function NutritionPage() {
  const [date, setDate] = useState(() => {
    const value = new URLSearchParams(window.location.search).get('date');
    return parseDate(value) ? value : localDate();
  });
  const [meals, setMeals] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState('');
  function reload() {
    setError('');
    setMeals(null);
    Promise.all([api(`/meals?date=${date}`), api(`/statistics?from=${date}&to=${date}`)])
      .then(([history, stats]) => {
        setMeals(history.meals.map((meal) => ({ ...meal, calories: meal.totals.calories })));
        setStatistics(stats);
      })
      .catch((problem) => setError(problem.message));
  }
  useEffect(() => {
    // Keep the chosen day in the address, so reload and "back" return to it.
    const search = date === localDate() ? '' : `?date=${date}`;
    window.history.replaceState(window.history.state, '', `/nutrition${search}`);
    reload();
  }, [date]);
  const day = relativeDay(date);
  return (
    <Shell
      title="Дневник питания"
      action={
        <>
          <DateStepper value={date} onChange={setDate} label="Дата дневника" />
          <a
            className="button button--primary diary-create"
            href={`/nutrition/new?date=${date}&add=1`}
          >
            <img src={`${A}icon-plus.svg`} alt="" />
            <span className="wide-only">Добавить продукт</span>
            <span className="narrow-only">Создать приём пищи</span>
          </a>
        </>
      }
      className="diary-page"
    >
      {error ? (
        <Notice message={error} retry={reload} />
      ) : !meals || !statistics ? (
        <p className="muted">Загружаем дневник…</p>
      ) : (
        <>
          <DaySummary
            title={day === 'Сегодня' ? 'Сегодня в рационе' : `${day} в рационе`}
            day={statistics.days[0]}
            goals={statistics.goals}
          />
          <div className="meal-slots">
            {Object.entries(mealTypes).map(([type, label]) => (
              <MealSlot
                key={type}
                type={type}
                label={label}
                date={date}
                meals={meals.filter((meal) => meal.meal_type === type)}
              />
            ))}
          </div>
          <a className="history-link" href="/nutrition/history">
            <img src={`${A}icon-calendar.svg`} alt="" />
            <span>
              <strong>
                История питания<span className="narrow-only"> — выбрать дату</span>
              </strong>
              <small className="wide-only">Прошлые дни доступны по дате</small>
            </span>
            <b className="wide-only" aria-hidden="true">
              →
            </b>
          </a>
        </>
      )}
    </Shell>
  );
}
