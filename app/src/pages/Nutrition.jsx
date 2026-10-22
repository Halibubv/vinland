// Дневник питания за один день: итоги КБЖУ и четыре приёма пищи.
// Этот же компонент показывает «Историю питания» (см. NutritionHistory.jsx).
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { localDate, parseDate, relativeDay } from '../lib/dates.js';
import { formatInt, formatNumber, plural } from '../lib/format.js';
import { ASSETS, mealTypes } from '../lib/constants.js';
import { Shell, Notice } from '../components/ui.jsx';
import { DateStepper } from '../components/DateStepper.jsx';
import { DaySummary } from '../components/DaySummary.jsx';
import { EntryIcon, EntryPhoto } from '../components/EntryIcon.jsx';
import './Nutrition.css';

// "3 продукта · 450 г"
function productCount(items) {
  let grams = 0;
  for (const item of items) grams += Number(item.quantity_g);
  return `${plural(items.length, 'продукт', 'продукта', 'продуктов')} · ${formatNumber(grams)} г`;
}

// "Овсянка, Банан"
function productNames(meal) {
  return meal.items.map((item) => item.product_name_snapshot).join(', ');
}

// "Овсянка 60 г · Банан 120 г"
function productNamesWithGrams(meal) {
  return meal.items
    .map((item) => `${item.product_name_snapshot} ${formatNumber(item.quantity_g)} г`)
    .join(' · ');
}

// Один приём пищи (например, «Обед») со всеми записями этого типа за день.
function MealSlot({ type, label, meals, date }) {
  // Все продукты и калории всех записей этого приёма пищи.
  const items = [];
  let calories = 0;
  for (const meal of meals) {
    items.push(...meal.items);
    calories += Number(meal.totals.calories);
  }

  // «Добавить продукт» дописывает в последнюю запись, а если её нет — создаёт новую.
  let addHref = `/nutrition/new?date=${date}&type=${type}&add=1`;
  if (meals.length > 0) {
    const lastMeal = meals[meals.length - 1];
    addHref = `/nutrition/${lastMeal.id}?add=1`;
  }
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
            <EntryPhoto meal={type} />
            <span className="meal-entry-text">
              {productNames(meal) || 'Без продуктов'}
              <small className="wide-only">{productNamesWithGrams(meal)}</small>
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

// Начальная дата: из адреса (?date=...), иначе initialDate, иначе сегодня.
function startDate(initialDate) {
  const fromAddress = new URLSearchParams(window.location.search).get('date');
  if (parseDate(fromAddress)) return fromAddress;
  return initialDate || localDate();
}

// history = true — экран «История питания»: тот же дневник, но открыт на прошлой
// дате и со ссылкой назад к сегодняшнему дню.
export function NutritionPage({ history = false, initialDate }) {
  const path = history ? '/nutrition/history' : '/nutrition';
  const [date, setDate] = useState(() => startDate(initialDate));
  const [meals, setMeals] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState('');
  function reload() {
    setError('');
    setMeals(null);
    // Записи дня и итоги дня с целями пользователя загружаем одновременно.
    Promise.all([api(`/meals?date=${date}`), api(`/statistics?from=${date}&to=${date}`)])
      .then(([mealsData, statisticsData]) => {
        setMeals(mealsData.meals);
        setStatistics(statisticsData);
      })
      .catch((problem) => setError(problem.message));
  }
  useEffect(() => {
    // Запоминаем выбранный день в адресе, чтобы обновление страницы и «Назад» вернули к нему.
    const search = !history && date === localDate() ? '' : `?date=${date}`;
    window.history.replaceState(window.history.state, '', `${path}${search}`);
    reload();
  }, [date]);

  let summaryTitle;
  const dayName = relativeDay(date);
  if (history) summaryTitle = 'За выбранный день';
  else if (dayName === 'Сегодня') summaryTitle = 'Сегодня в рационе';
  else summaryTitle = `${dayName} в рационе`;

  return (
    <Shell
      title={history ? 'История питания' : 'Дневник питания'}
      action={
        <>
          <DateStepper value={date} onChange={setDate} label="Дата дневника" />
          <a
            className="button button--primary diary-create"
            href={`/nutrition/new?date=${date}&add=1`}
          >
            <img src={`${ASSETS}icon-plus.svg`} alt="" />
            <span className="wide-only">Добавить продукт</span>
            <span className="narrow-only">Создать приём пищи</span>
          </a>
        </>
      }
      className="diary-page"
    >
      {error && <Notice message={error} retry={reload} />}
      {!error && (!meals || !statistics) && <p className="muted">Загружаем дневник…</p>}
      {!error && meals && statistics && (
        <>
          <DaySummary title={summaryTitle} day={statistics.days[0]} goals={statistics.goals} />
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
          {history && (
            <>
              <a className="history-link" href="/nutrition">
                <img src={`${ASSETS}icon-calendar.svg`} alt="" />
                <span>
                  <strong>К сегодняшнему дню</strong>
                </span>
              </a>
              <p className="diary-note">
                Прошлые итоги сохраняются при изменении справочника продуктов.
              </p>
            </>
          )}
          {!history && (
            <a className="history-link" href="/nutrition/history">
              <img src={`${ASSETS}icon-calendar.svg`} alt="" />
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
          )}
        </>
      )}
    </Shell>
  );
}
