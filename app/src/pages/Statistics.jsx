import React, { useEffect, useState } from 'react';
import { api, dateLabel, formatNumber, localDate } from '../lib/api.js';
import { A } from '../lib/constants.js';
import { Shell, Notice, DailyGoals } from '../components/ui.jsx';
import { offsetDate } from '../lib/dates.js';

export function StatisticsPage() {
  const [to, setTo] = useState(localDate());
  const [from, setFrom] = useState(offsetDate(localDate(), -6));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  function reload() {
    setError('');
    setData(null);
    api(`/statistics?from=${from}&to=${to}`)
      .then(setData)
      .catch((problem) => setError(problem.fields?.period || problem.message));
  }
  useEffect(reload, [from, to]);
  const maxCalories = data
    ? Math.max(data.goals.calories || 0, ...data.days.map((day) => Number(day.calories)), 1)
    : 1;
  return (
    <Shell
      title="Статистика"
      subtitle="Профиль  /  Статистика"
      action={
        <div className="date-control">
          <input
            type="date"
            aria-label="Начало периода"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <span>—</span>
          <input
            type="date"
            aria-label="Конец периода"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      }
    >
      {error ? (
        <Notice message={error} retry={reload} />
      ) : !data ? (
        <p className="muted">Загружаем статистику…</p>
      ) : (
        <>
          <section className="panel statistics-panel">
            <div className="chart-side">
              <h2>
                <img src={`${A}nav-food.svg`} alt="" />
                Калории и КБЖУ
              </h2>
              <div className="bar-chart">
                {data.days.map((day) => (
                  <div key={day.date} className="chart-column">
                    <span>{formatNumber(day.calories)}</span>
                    <div className="chart-bar-track">
                      <div
                        style={{
                          height: `${Math.max(1, (Number(day.calories) / maxCalories) * 100)}%`,
                        }}
                      />
                    </div>
                    <small>{dateLabel(day.date, { day: 'numeric', month: 'short' })}</small>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                <span>● Фактические калории</span>
                <span>
                  — Цель ({data.goals.calories ? formatNumber(data.goals.calories) : 'не задана'}{' '}
                  ккал)
                </span>
              </div>
            </div>
            <div className="chart-summary">
              <span>{dateLabel(data.to)}</span>
              <p>В рационе</p>
              <strong>
                {formatNumber(data.days.at(-1).calories)} /{' '}
                {data.goals.calories ? formatNumber(data.goals.calories) : '—'} ккал
              </strong>
              <DailyGoals day={data.days.at(-1)} goals={data.goals} />
            </div>
          </section>
          <section className="panel statistics-workouts">
            <div className="section-subtitle">
              <h2>
                <img src={`${A}nav-workouts.svg`} alt="" />
                Тренировки
              </h2>
              <a href="/workouts">Открыть историю тренировок →</a>
            </div>
            <div className="workout-days">
              {data.days.map((day) => (
                <div key={day.date}>
                  <strong>{dateLabel(day.date, { day: 'numeric', month: 'long' })}</strong>
                  <small>
                    {new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(
                      new Date(`${day.date}T12:00:00`),
                    )}
                  </small>
                  <b>{day.workouts ? '⌁' : '—'}</b>
                  <span>
                    {day.workouts
                      ? `${day.workouts} тренировок · ${day.sets} подходов`
                      : 'Нет тренировок'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </Shell>
  );
}
