// Экран «Статистика»: график калорий за период, итоги дня и тренировки по дням.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import {
  dayMonth,
  formatInt,
  localDate,
  offsetDate,
  percentOf,
  plural,
  relativeDay,
  shortDate,
  weekday,
} from '../format.js';
import { Shell, Notice, Empty } from '../components/ui.jsx';
import './Statistics.css';

// Итоги дня по питанию: калории и БЖУ в сравнении с целями.
const summaryMacros = [
  { label: 'Белки', key: 'protein', icon: 'icon-muscle.svg' },
  { label: 'Жиры', key: 'fat', icon: 'icon-drop.svg' },
  { label: 'Углеводы', key: 'carbs', icon: 'icon-wheat.svg' },
];

function Bar({ value, target }) {
  return (
    <div className="bar" role="presentation">
      <span style={{ width: `${percentOf(value, target)}%` }} />
    </div>
  );
}

// Цель числом или прочерк, если цель не задана.
function goalText(goal) {
  return goal ? formatInt(goal) : '—';
}

// day — съеденное за день, goals — цели; у обоих поля calories, protein, fat, carbs.
function DaySummary({ title, day, goals, className = '' }) {
  let caloriesPercent = 'Цель не задана';
  if (goals.calories) caloriesPercent = `${percentOf(day.calories, goals.calories)}%`;

  return (
    <section className={`panel day-summary ${className}`}>
      <div className="day-summary-calories">
        <img src="/assets/icon-flame.svg" alt="" />
        <div>
          <span>{title}</span>
          <strong>
            {formatInt(day.calories)} / {goalText(goals.calories)} ккал
          </strong>
        </div>
      </div>
      <div className="day-summary-bar">
        <Bar value={day.calories} target={goals.calories} />
        <b>{caloriesPercent}</b>
      </div>
      <div className="day-summary-macros">
        {summaryMacros.map((macro) => {
          const eaten = day[macro.key];
          const goal = goals[macro.key];
          return (
            <div key={macro.key}>
              <span>
                <img src={`/assets/${macro.icon}`} alt="" />
                {macro.label}
              </span>
              <strong>
                {formatInt(eaten)} / {goalText(goal)} г
              </strong>
              <div className="day-summary-macro-bar">
                <Bar value={eaten} target={goal} />
                <small>{goal ? `${percentOf(eaten, goal)}%` : '—'}</small>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Варианты периода в выпадающем списке: количество дней и подпись.
const periods = [
  { days: 7, label: 'Последние 7 дней' },
  { days: 14, label: 'Последние 14 дней' },
  { days: 30, label: 'Последние 30 дней' },
];

function exercisesText(day) {
  return plural(day.exercises, 'упражнение', 'упражнения', 'упражнений');
}

function setsText(day) {
  return plural(day.sets, 'подход', 'подхода', 'подходов');
}

// Столбчатая диаграмма калорий по дням с пунктирной линией цели.
function CaloriesChart({ days, goal }) {
  // Верх шкалы — самое большое значение (день или цель) плюс 10% запаса.
  let maxValue = goal || 0;
  for (const day of days) {
    if (Number(day.calories) > maxValue) maxValue = Number(day.calories);
  }
  const top = maxValue * 1.1 || 1; // || 1 — чтобы не делить на ноль

  // Высота столбика в процентах от высоты графика.
  function heightPercent(value) {
    return `${(Number(value) / top) * 100}%`;
  }

  // За 30 дней подписей слишком много: показываем каждую пятую (через CSS).
  const dense = days.length > 14;

  return (
    <figure className={`stats-chart ${dense ? 'stats-chart--dense' : ''}`}>
      <div className="stats-chart-plot">
        <div className="stats-chart-grid" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        {goal ? (
          <div className="stats-chart-goal" style={{ bottom: heightPercent(goal) }}>
            <span>
              Цель
              <br />
              {formatInt(goal)} ккал
            </span>
          </div>
        ) : null}
        {days.map((day) => (
          <div className="stats-chart-column" key={day.date}>
            {Number(day.calories) > 0 && (
              <div className="stats-chart-bar" style={{ height: heightPercent(day.calories) }}>
                <span>{formatInt(day.calories)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="stats-chart-axis">
        {days.map((day, index) => (
          <span key={day.date} className={dense && index % 5 ? 'is-minor' : ''}>
            <b className="wide-only">{shortDate(day.date)}</b>
            <b className="narrow-only">{Number(day.date.slice(8))}</b>
            <small className="wide-only">{weekday(day.date)}</small>
          </span>
        ))}
      </div>
      <figcaption className="stats-chart-legend">
        <span className="wide-only">● Фактические калории</span>
        <span>— — Цель {goal ? `${formatInt(goal)} ккал` : 'не задана'}</span>
      </figcaption>
    </figure>
  );
}

// Один день в недельной полосе тренировок (только для периода 7 дней).
function WeekDay({ day }) {
  if (!day.workouts) {
    return (
      <li>
        <strong>{dayMonth(day.date)}</strong>
        <small>{weekday(day.date)}</small>
        <b>—</b>
        <span>Нет тренировок</span>
      </li>
    );
  }
  return (
    <li className="is-active">
      <strong>{dayMonth(day.date)}</strong>
      <small>{weekday(day.date)}</small>
      <img src="/assets/nav-workouts.svg" alt="" />
      <span>
        {exercisesText(day)}
        <br />
        {setsText(day)}
      </span>
    </li>
  );
}

// Блок «Тренировки». За 7 дней на широком экране — полоса по дням недели,
// в остальных случаях — простой список дней с тренировками.
function WorkoutsPanel({ days, periodDays }) {
  const trainedDays = days.filter((day) => day.workouts);
  const isWeek = periodDays === 7;
  return (
    <section className="panel stats-workouts">
      <div className="stats-workouts-head">
        <h2>
          <img src="/assets/nav-workouts.svg" alt="" />
          Тренировки
        </h2>
        <Link to="/workouts" className="wide-only">
          → &nbsp;Открыть историю тренировок
        </Link>
      </div>
      {isWeek && (
        <ol className="stats-week wide-only">
          {days.map((day) => (
            <WeekDay day={day} key={day.date} />
          ))}
        </ol>
      )}
      <ul className={`stats-workout-list ${isWeek ? 'narrow-only' : ''}`}>
        {trainedDays.length === 0 && <li>За этот период тренировок нет</li>}
        {trainedDays.map((day) => (
          <li key={day.date}>
            {dayMonth(day.date)} · {exercisesText(day)} / {setsText(day)}
          </li>
        ))}
      </ul>
      <Link to="/workouts" className="stats-workouts-link narrow-only">
        → &nbsp;Сохранённые тренировки
      </Link>
    </section>
  );
}

// Есть ли за период хоть одна тренировка или съеденная калория.
function hasAnyData(days) {
  for (const day of days) {
    if (day.workouts || Number(day.calories)) return true;
  }
  return false;
}

export function StatisticsPage() {
  const [periodDays, setPeriodDays] = useState(7);
  // data: { days: [...по одному на каждый день периода], goals: {...} }
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const to = localDate();
  const from = offsetDate(to, 1 - periodDays);

  function reload() {
    setError('');
    setData(null);
    api(`/statistics?from=${from}&to=${to}`)
      .then(setData)
      .catch((problem) => {
        // Сервер может отдельно пожаловаться на неверный период.
        if (problem.fields && problem.fields.period) setError(problem.fields.period);
        else setError(problem.message);
      });
  }
  useEffect(reload, [periodDays]);

  let content;
  if (error) {
    content = <Notice message={error} retry={reload} />;
  } else if (!data) {
    content = <p className="muted">Загружаем статистику…</p>;
  } else if (!hasAnyData(data.days)) {
    content = (
      <Empty
        title="За этот период данных нет"
        detail="Запишите тренировку или приём пищи, и здесь появится динамика."
        action="Открыть дневник питания"
        to="/nutrition"
      />
    );
  } else {
    // Последний день периода — сегодня.
    const today = data.days[data.days.length - 1];
    let todayTitle = dayMonth(today.date);
    if (relativeDay(today.date) === 'Сегодня') todayTitle = 'Сегодня в рационе';
    content = (
      <>
        <div className="stats-overview">
          <section className="panel stats-calories">
            <h2>
              <img src="/assets/nav-food.svg" alt="" />
              Калории и КБЖУ
            </h2>
            <CaloriesChart days={data.days} goal={data.goals.calories} />
          </section>
          <DaySummary className="stats-today" title={todayTitle} day={today} goals={data.goals} />
        </div>
        <WorkoutsPanel days={data.days} periodDays={periodDays} />
      </>
    );
  }

  return (
    <Shell
      title="Статистика"
      subtitle={
        <span className="breadcrumbs">
          <Link to="/profile">Профиль</Link> / Статистика
        </span>
      }
      action={
        <label className="period-select">
          <img src="/assets/icon-calendar.svg" alt="" />
          <span className="sr-only">Период</span>
          <select
            value={periodDays}
            onChange={(event) => setPeriodDays(Number(event.target.value))}
          >
            {periods.map((period) => (
              <option key={period.days} value={period.days}>
                {period.label}
              </option>
            ))}
          </select>
        </label>
      }
      className="stats-page"
    >
      {content}
    </Shell>
  );
}
