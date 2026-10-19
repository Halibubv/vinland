import React from 'react';
import { A } from '../lib/constants.js';
import { formatInt, percentOf } from '../lib/format.js';

const macros = [
  ['Белки', 'protein', 'icon-muscle.svg'],
  ['Жиры', 'fat', 'icon-drop.svg'],
  ['Углеводы', 'carbs', 'icon-wheat.svg'],
];

function Bar({ value, target }) {
  return (
    <div className="bar" role="presentation">
      <span style={{ width: `${percentOf(value, target)}%` }} />
    </div>
  );
}

// Calories and macros for one day against the user's goals.
export function DaySummary({ title, day, goals, className = '' }) {
  return (
    <section className={`panel day-summary ${className}`}>
      <div className="day-summary-calories">
        <img src={`${A}icon-flame.svg`} alt="" />
        <div>
          <span>{title}</span>
          <strong>
            {formatInt(day.calories)} / {goals.calories ? formatInt(goals.calories) : '—'} ккал
          </strong>
        </div>
      </div>
      <div className="day-summary-bar">
        <Bar value={day.calories} target={goals.calories} />
        <b>{goals.calories ? `${percentOf(day.calories, goals.calories)}%` : 'Цель не задана'}</b>
      </div>
      <div className="day-summary-macros">
        {macros.map(([label, key, icon]) => (
          <div key={key}>
            <span>
              <img src={`${A}${icon}`} alt="" />
              {label}
            </span>
            <strong>
              {formatInt(day[key])} / {goals[key] ? formatInt(goals[key]) : '—'} г
            </strong>
            <div className="day-summary-macro-bar">
              <Bar value={day[key]} target={goals[key]} />
              <small>{goals[key] ? `${percentOf(day[key], goals[key])}%` : '—'}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
