// Дневник питания за один день: итоги КБЖУ и четыре приёма пищи.
// Этот же компонент показывает «Историю питания» (см. NutritionHistory.jsx).
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { localDate, parseDate, relativeDay } from '../lib/dates.js';
import { formatInt, formatNumber } from '../lib/format.js';
import { ASSETS, mealTypes } from '../lib/constants.js';
import { Notice } from '../components/ui.jsx';
import { DateStepper } from '../components/DateStepper.jsx';
import { DayTotals } from '../components/DayTotals.jsx';
import { PageHero } from '../components/PageHero.jsx';
import { entryPhotoUrl } from '../components/EntryIcon.jsx';
import './Nutrition.css';

// Подпись под датой: сколько калорий осталось до цели дня.
function caloriesLeftText(day, goals) {
  if (!goals.calories) return 'Цель по калориям не задана';
  const left = Number(goals.calories) - Number(day.calories);
  if (left <= 0) return 'Цель дня по калориям выполнена';
  return `Осталось ${formatInt(left)} ккал до цели дня`;
}

// Карточка одного приёма пищи: фото с названием, продукты и кнопка «Добавить».
function MealCard({ type, label, meals, date }) {
  let calories = 0;
  for (const meal of meals) calories += Number(meal.totals.calories);

  // Если приём пищи уже есть — добавляем продукт в последний, иначе создаём новый.
  let addHref = `/nutrition/new?date=${date}&type=${type}&add=1`;
  if (meals.length > 0) {
    const lastMeal = meals[meals.length - 1];
    addHref = `/nutrition/${lastMeal.id}?add=1`;
  }

  return (
    <section className={`meal-card ${meals.length ? '' : 'is-empty'}`}>
      <div className="meal-card-photo">
        <img src={entryPhotoUrl({ meal: type })} alt="" />
        <h2>{label}</h2>
        {meals.length > 0 && <span>{formatInt(calories)} ккал</span>}
      </div>
      <div className="meal-card-body">
        {meals.map((meal) => (
          <a href={`/nutrition/${meal.id}`} className="meal-card-entry" key={meal.id}>
            {meal.items.map((item) => (
              <span key={item.id}>
                {item.product_name_snapshot}
                <small>{formatNumber(item.quantity_g)} г</small>
              </span>
            ))}
            {!meal.items.length && <span>Без продуктов</span>}
          </a>
        ))}
        {!meals.length && <p className="meal-card-empty">Пока ничего не добавлено</p>}
        <a className="meal-card-add" href={addHref}>
          <img src={`${ASSETS}icon-plus.svg`} alt="" />
          Добавить продукт
        </a>
      </div>
    </section>
  );
}

function startDate(initialDate) {
  const fromAddress = new URLSearchParams(window.location.search).get('date');
  if (parseDate(fromAddress)) return fromAddress;
  return initialDate || localDate();
}

export function NutritionPage({ history = false, initialDate }) {
  const path = history ? '/nutrition/history' : '/nutrition';
  const [date, setDate] = useState(() => startDate(initialDate));
  const [meals, setMeals] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState('');
  function reload() {
    setError('');
    setMeals(null);
    Promise.all([api(`/meals?date=${date}`), api(`/statistics?from=${date}&to=${date}`)])
      .then(([mealsData, statisticsData]) => {
        setMeals(mealsData.meals);
        setStatistics(statisticsData);
      })
      .catch((problem) => setError(problem.message));
  }
  useEffect(() => {
    const search = !history && date === localDate() ? '' : `?date=${date}`;
    window.history.replaceState(window.history.state, '', `${path}${search}`);
    reload();
  }, [date]);

  const loaded = !error && meals && statistics;

  const top = (
    <>
      <DateStepper value={date} onChange={setDate} label="Дата дневника" />
      <a className="button button--primary diary-create" href={`/nutrition/new?date=${date}&add=1`}>
        <img src={`${ASSETS}icon-plus.svg`} alt="" />
        Добавить продукт
      </a>
    </>
  );

  return (
    <>
      <div className="section-banner" />
      <main className="content section-content diary-page">
        <PageHero
          image={`${ASSETS}hero-nutrition.jpg`}
          top={top}
          eyebrow={history ? 'История питания' : 'Дневник питания'}
          title={relativeDay(date)}
          subtitle={loaded && caloriesLeftText(statistics.days[0], statistics.goals)}
          aside={
            loaded && (
              <div className="diary-totals">
                <DayTotals day={statistics.days[0]} goals={statistics.goals} />
              </div>
            )
          }
        />
        {error && <Notice message={error} retry={reload} />}
        {!error && !loaded && <p className="muted">Загружаем дневник…</p>}
        {loaded && (
          <>
            <h2 className="section-heading">Приёмы пищи</h2>
            <div className="meal-cards">
              {Object.entries(mealTypes).map(([type, label]) => (
                <MealCard
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
                  <b aria-hidden="true">→</b>
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
                  <strong>История питания</strong>
                  <small>Прошлые дни доступны по дате</small>
                </span>
                <b aria-hidden="true">→</b>
              </a>
            )}
          </>
        )}
      </main>
    </>
  );
}
