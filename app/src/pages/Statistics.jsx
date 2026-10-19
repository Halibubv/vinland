import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { A } from '../lib/constants.js';
import { dateLabel, dayMonth, localDate, offsetDate, relativeDay, weekday } from '../lib/dates.js';
import { formatInt, plural } from '../lib/format.js';
import { Shell, Notice, Empty } from '../components/ui.jsx';
import { DaySummary } from '../components/DaySummary.jsx';
import './Statistics.css';

const periods = [
  [7, 'Последние 7 дней'],
  [14, 'Последние 14 дней'],
  [30, 'Последние 30 дней'],
];

function workoutLine(day) {
  return `${plural(day.exercises, 'упражнение', 'упражнения', 'упражнений')} / ${plural(
    day.sets,
    'подход',
    'подхода',
    'подходов',
  )}`;
}

function CaloriesChart({ days, goal }) {
  const top = Math.max(goal || 0, ...days.map((day) => Number(day.calories))) * 1.1 || 1;
  const height = (value) => `${(Number(value) / top) * 100}%`;
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
          <div className="stats-chart-goal" style={{ bottom: height(goal) }}>
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
              <div className="stats-chart-bar" style={{ height: height(day.calories) }}>
                <span>{formatInt(day.calories)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="stats-chart-axis">
        {days.map((day, index) => (
          <span key={day.date} className={dense && index % 5 ? 'is-minor' : ''}>
            <b className="wide-only">{dateLabel(day.date, { day: 'numeric', month: 'short' })}</b>
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

export function StatisticsPage() {
  const [length, setLength] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const to = localDate();
  const from = offsetDate(to, 1 - length);
  function reload() {
    setError('');
    setData(null);
    api(`/statistics?from=${from}&to=${to}`)
      .then(setData)
      .catch((problem) => setError(problem.fields?.period || problem.message));
  }
  useEffect(reload, [length]);
  const today = data?.days.at(-1);
  const trained = data?.days.filter((day) => day.workouts) || [];
  const empty = data && !data.days.some((day) => day.workouts || Number(day.calories));
  return (
    <Shell
      title="Статистика"
      subtitle={
        <span className="breadcrumbs">
          <a href="/profile">Профиль</a> / Статистика
        </span>
      }
      action={
        <label className="period-select">
          <img src={`${A}icon-calendar.svg`} alt="" />
          <span className="sr-only">Период</span>
          <select value={length} onChange={(event) => setLength(Number(event.target.value))}>
            {periods.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      }
      className="stats-page"
    >
      {error ? (
        <Notice message={error} retry={reload} />
      ) : !data ? (
        <p className="muted">Загружаем статистику…</p>
      ) : empty ? (
        <Empty
          title="За этот период данных нет"
          detail="Запишите тренировку или приём пищи, и здесь появится динамика."
          action="Открыть дневник питания"
          to="/nutrition"
        />
      ) : (
        <>
          <div className="stats-overview">
            <section className="panel stats-calories">
              <h2>
                <img src={`${A}nav-food.svg`} alt="" />
                Калории и КБЖУ
              </h2>
              <CaloriesChart days={data.days} goal={data.goals.calories} />
            </section>
            <DaySummary
              className="stats-today"
              title={
                relativeDay(today.date) === 'Сегодня' ? 'Сегодня в рационе' : dayMonth(today.date)
              }
              day={today}
              goals={data.goals}
            />
          </div>
          <section className="panel stats-workouts">
            <div className="stats-workouts-head">
              <h2>
                <img src={`${A}nav-workouts.svg`} alt="" />
                Тренировки
              </h2>
              <a href="/workouts" className="wide-only">
                → &nbsp;Открыть историю тренировок
              </a>
            </div>
            {length === 7 && (
              <ol className="stats-week wide-only">
                {data.days.map((day) => (
                  <li key={day.date} className={day.workouts ? 'is-active' : ''}>
                    <strong>{dayMonth(day.date)}</strong>
                    <small>{weekday(day.date)}</small>
                    {day.workouts ? <img src={`${A}nav-workouts.svg`} alt="" /> : <b>—</b>}
                    <span>
                      {day.workouts ? (
                        <>
                          {plural(day.exercises, 'упражнение', 'упражнения', 'упражнений')}
                          <br />
                          {plural(day.sets, 'подход', 'подхода', 'подходов')}
                        </>
                      ) : (
                        'Нет тренировок'
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <ul className={`stats-workout-list ${length === 7 ? 'narrow-only' : ''}`}>
              {trained.length ? (
                trained.map((day) => (
                  <li key={day.date}>
                    {dayMonth(day.date)} · {workoutLine(day)}
                  </li>
                ))
              ) : (
                <li>За этот период тренировок нет</li>
              )}
            </ul>
            <a href="/workouts" className="stats-workouts-link narrow-only">
              → &nbsp;Сохранённые тренировки
            </a>
          </section>
        </>
      )}
    </Shell>
  );
}
