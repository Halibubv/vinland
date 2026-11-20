// Итоги одного дня по питанию: калории и БЖУ в сравнении с целями пользователя.
// Используется в дневнике питания, профиле и статистике.
import React from 'react';
import { ASSETS } from '../lib/constants.js';
import { formatInt, percentOf } from '../lib/format.js';

const macros = [
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
export function DaySummary({ title, day, goals, className = '' }) {
  let caloriesPercent = 'Цель не задана';
  if (goals.calories) caloriesPercent = `${percentOf(day.calories, goals.calories)}%`;

  return (
    <section className={`panel day-summary ${className}`}>
      <div className="day-summary-calories">
        <img src={`${ASSETS}icon-flame.svg`} alt="" />
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
        {macros.map((macro) => {
          const eaten = day[macro.key];
          const goal = goals[macro.key];
          return (
            <div key={macro.key}>
              <span>
                <img src={`${ASSETS}${macro.icon}`} alt="" />
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
