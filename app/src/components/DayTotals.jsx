// Итоги дня по питанию в новом виде: кольцо калорий и полоски белков, жиров и углеводов.
// Используется в дневнике питания и в профиле.
import React from 'react';
import { formatInt, percentOf } from '../lib/format.js';
import '../styles/day-totals.css';

const macros = [
  { label: 'Белки', key: 'protein' },
  { label: 'Жиры', key: 'fat' },
  { label: 'Углеводы', key: 'carbs' },
];

// Длина окружности кольца: по ней считаем, какую часть закрасить.
const RADIUS = 54;
const CIRCLE = 2 * Math.PI * RADIUS;

// Кольцо «съедено из цели». Без цели кольцо пустое, под числом просто «ккал».
export function CalorieRing({ eaten, goal }) {
  const filled = (CIRCLE * percentOf(eaten, goal)) / 100;
  const goalText = goal ? `из ${formatInt(goal)} ккал` : 'ккал';
  return (
    <div className="calorie-ring" role="img" aria-label={`Съедено ${formatInt(eaten)} ${goalText}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="calorie-ring-track" cx="60" cy="60" r={RADIUS} />
        {filled > 0 && (
          <circle
            className="calorie-ring-value"
            cx="60"
            cy="60"
            r={RADIUS}
            strokeDasharray={`${filled} ${CIRCLE}`}
            transform="rotate(-90 60 60)"
          />
        )}
      </svg>
      <div>
        <strong>{formatInt(eaten)}</strong>
        <span>{goalText}</span>
      </div>
    </div>
  );
}

// day — съеденное за день, goals — цели; у обоих поля calories, protein, fat, carbs.
export function DayTotals({ day, goals }) {
  return (
    <div className="day-totals">
      <CalorieRing eaten={day.calories} goal={goals.calories} />
      <div className="macro-bars">
        {macros.map((macro) => {
          const eaten = day[macro.key];
          const goal = goals[macro.key];
          return (
            <div key={macro.key}>
              <div className="macro-bar-label">
                <span>{macro.label}</span>
                <strong>
                  {formatInt(eaten)} / {goal ? formatInt(goal) : '—'} г
                </strong>
              </div>
              <div className="macro-bar" role="presentation">
                <span style={{ width: `${percentOf(eaten, goal)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
