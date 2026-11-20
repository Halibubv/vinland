// Дневник питания за один день: итоги КБЖУ и четыре приёма пищи.
// Этот же компонент показывает «Историю питания» (см. NutritionHistory.jsx).
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatInt, formatNumber, isDate, localDate, mealTypes, relativeDay } from '../format.js';
import { Notice, DateStepper } from '../components/ui.jsx';
import { DayTotals } from '../components/DayTotals.jsx';
import { PageHero } from '../components/PageHero.jsx';
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
  let addHref = `/nutrition/add/${date}/${type}`;
  if (meals.length > 0) {
    const lastMeal = meals[meals.length - 1];
    addHref = `/nutrition/${lastMeal.id}/add`;
  }

  return (
    <section className={`meal-card ${meals.length ? '' : 'is-empty'}`}>
      <div className="meal-card-photo">
        <img src={`/assets/entries/meal-${type}.jpg`} alt="" />
        <h2>{label}</h2>
        {meals.length > 0 && <span>{formatInt(calories)} ккал</span>}
      </div>
      <div className="meal-card-body">
        {meals.map((meal) => (
          <Link to={`/nutrition/${meal.id}`} className="meal-card-entry" key={meal.id}>
            {meal.items.map((item) => (
              <span key={item.id}>
                {item.product_name_snapshot}
                <small>{formatNumber(item.quantity_g)} г</small>
              </span>
            ))}
            {!meal.items.length && <span>Без продуктов</span>}
          </Link>
        ))}
        {!meals.length && <p className="meal-card-empty">Пока ничего не добавлено</p>}
        <Link className="meal-card-add" to={addHref}>
          <img src="/assets/icon-plus.svg" alt="" />
          Добавить продукт
        </Link>
      </div>
    </section>
  );
}

// history — экран «История питания» (его открывает NutritionHistory.jsx).
export function NutritionPage({ history = false }) {
  const navigate = useNavigate();
  // Выбранный день хранится в адресе: /nutrition/day/2026-11-10 (см. App.jsx).
  // Так его можно обновить (F5) или отправить ссылкой, а на /nutrition — это сегодня.
  const params = useParams();
  let date = params.date;
  if (!isDate(date)) date = localDate();
  const [meals, setMeals] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState('');
  function reload() {
    setError('');
    // Старые данные не стираем: пока грузится новый день, на экране остаётся прежний,
    // и страница не «прыгает».
    Promise.all([api(`/meals?date=${date}`), api(`/statistics?from=${date}&to=${date}`)])
      .then(([mealsData, statisticsData]) => {
        setMeals(mealsData.meals);
        setStatistics(statisticsData);
      })
      .catch((problem) => setError(problem.message));
  }
  // Загружаем дневник при открытии и каждый раз, когда меняется день.
  useEffect(reload, [date]);

  // Стрелки и календарь меняют дату в адресе. replace: не копим каждый день
  // в истории браузера, чтобы «Назад» сразу уводил со страницы.
  function changeDate(newDate) {
    if (history) navigate(`/nutrition/history/${newDate}`, { replace: true });
    else if (newDate === localDate()) navigate('/nutrition', { replace: true });
    else navigate(`/nutrition/day/${newDate}`, { replace: true });
  }

  const loaded = !error && meals && statistics;

  const top = (
    <>
      <DateStepper value={date} onChange={changeDate} label="Дата дневника" />
      <Link className="button button--primary diary-create" to={`/nutrition/add/${date}`}>
        <img src="/assets/icon-plus.svg" alt="" />
        Добавить продукт
      </Link>
    </>
  );

  return (
    <>
      <div className="section-banner" />
      <main className="content section-content diary-page">
        <PageHero
          image="/assets/hero-nutrition.jpg"
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
                <Link className="history-link" to="/nutrition">
                  <img src="/assets/icon-calendar.svg" alt="" />
                  <span>
                    <strong>К сегодняшнему дню</strong>
                  </span>
                  <b aria-hidden="true">→</b>
                </Link>
                <p className="diary-note">
                  Прошлые итоги сохраняются при изменении справочника продуктов.
                </p>
              </>
            )}
            {!history && (
              <Link className="history-link" to="/nutrition/history">
                <img src="/assets/icon-calendar.svg" alt="" />
                <span>
                  <strong>История питания</strong>
                  <small>Прошлые дни доступны по дате</small>
                </span>
                <b aria-hidden="true">→</b>
              </Link>
            )}
          </>
        )}
      </main>
    </>
  );
}
