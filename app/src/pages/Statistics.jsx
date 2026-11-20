// Экран «Статистика»: баннер с итогами периода, график калорий по дням
// (нажатие на столбик показывает КБЖУ этого дня) и календарь тренировок.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { ASSETS } from '../lib/constants.js';
import { dateLabel, dayMonth, localDate, offsetDate, relativeDay, weekday } from '../lib/dates.js';
import { formatInt, plural, pluralWord } from '../lib/format.js';
import { Notice, Empty } from '../components/ui.jsx';
import { DayTotals } from '../components/DayTotals.jsx';
import { PageHero } from '../components/PageHero.jsx';
import './Statistics.css';

// Варианты периода: количество дней и подпись на кнопке.
const periods = [
  { days: 7, label: '7 дней' },
  { days: 14, label: '14 дней' },
  { days: 30, label: '30 дней' },
];

// Кнопки выбора периода (как переключатель «Завтрак / Обед» в питании).
function PeriodTabs({ value, onChange }) {
  return (
    <div className="stats-period" role="radiogroup" aria-label="Период">
      {periods.map((period) => (
        <button
          type="button"
          role="radio"
          key={period.days}
          aria-checked={value === period.days}
          className={value === period.days ? 'selected' : ''}
          onClick={() => onChange(period.days)}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

// Крупные цифры в баннере: средние калории, тренировки и дни «в норме».
function periodStats(days, goal) {
  const daysWithFood = days.filter((day) => Number(day.calories) > 0);
  let eaten = 0;
  for (const day of daysWithFood) eaten += Number(day.calories);
  const average = daysWithFood.length ? eaten / daysWithFood.length : 0;

  let workouts = 0;
  for (const day of days) workouts += day.workouts;

  // «В норме» — съедено от 90% до 110% цели (считаем среди дней, когда что-то ели).
  const onTarget = goal
    ? daysWithFood.filter((day) => Math.abs(Number(day.calories) - goal) <= goal * 0.1).length
    : 0;

  return [
    { value: formatInt(average), label: 'ккал в среднем за день' },
    {
      value: formatInt(workouts),
      label: pluralWord(workouts, 'тренировка', 'тренировки', 'тренировок'),
    },
    { value: goal ? `${onTarget} из ${daysWithFood.length}` : '—', label: 'дней в норме калорий' },
  ];
}

// График калорий по дням. Столбик можно нажать — выбранный день подсвечивается.
function CaloriesChart({ days, goal, selected, onSelect }) {
  // Верх шкалы — самое большое значение (день или цель) плюс 15% запаса.
  let maxValue = goal || 0;
  for (const day of days) {
    if (Number(day.calories) > maxValue) maxValue = Number(day.calories);
  }
  const top = maxValue * 1.15 || 1; // || 1 — чтобы не делить на ноль

  // Высота в процентах от высоты графика.
  function heightPercent(value) {
    return `${(Number(value) / top) * 100}%`;
  }

  // За 14 и 30 дней все подписи не поместятся: оставляем каждую вторую или пятую.
  let labelEvery = 1;
  if (days.length > 7) labelEvery = 2;
  if (days.length > 14) labelEvery = 5;

  return (
    <div className={`stats-chart stats-chart--${days.length}`}>
      <div className="stats-chart-plot">
        {goal ? (
          <div className="stats-chart-goal" style={{ bottom: heightPercent(goal) }}>
            <span>цель {formatInt(goal)}</span>
          </div>
        ) : null}
        {days.map((day) => {
          let className = 'stats-chart-column';
          if (day.date === selected) className += ' is-selected';
          if (goal && Number(day.calories) > goal * 1.1) className += ' is-over';
          return (
            <button
              type="button"
              className={className}
              key={day.date}
              onClick={() => onSelect(day.date)}
              aria-label={`${dayMonth(day.date)}: ${formatInt(day.calories)} ккал`}
              aria-pressed={day.date === selected}
            >
              <span className="stats-chart-bar" style={{ height: heightPercent(day.calories) }} />
            </button>
          );
        })}
      </div>
      <div className="stats-chart-axis" aria-hidden="true">
        {days.map((day, index) => {
          // Подпись считаем с конца, чтобы сегодняшний (последний) день всегда был подписан.
          const fromEnd = days.length - 1 - index;
          let text = '';
          if (fromEnd % labelEvery === 0)
            text = days.length === 7 ? weekday(day.date) : Number(day.date.slice(8));
          return (
            <span key={day.date} className={day.date === selected ? 'is-selected' : ''}>
              {text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Карточка «Калории»: выбранный день крупно, график и под ним КБЖУ этого дня.
function CaloriesCard({ days, goals, selected, onSelect }) {
  const day = days.find((item) => item.date === selected) || days[days.length - 1];
  let difference = '';
  if (goals.calories && Number(day.calories) > 0) {
    const left = goals.calories - Number(day.calories);
    if (left >= 0) difference = `ещё ${formatInt(left)} ккал до цели`;
    else difference = `на ${formatInt(-left)} ккал больше цели`;
  }

  return (
    <section className="stats-card">
      <div className="stats-card-head">
        <h2>Калории</h2>
        <span>Нажмите на столбик</span>
      </div>
      <p className="stats-selected">
        <small>{relativeDay(day.date)}</small>
        <strong>
          {formatInt(day.calories)} <em>ккал</em>
        </strong>
        {difference && <span>{difference}</span>}
      </p>
      <CaloriesChart days={days} goal={goals.calories} selected={day.date} onSelect={onSelect} />
      <div className="stats-day-totals">
        <DayTotals day={day} goals={goals} />
      </div>
    </section>
  );
}

// Карточка «Тренировки»: клетка на каждый день периода (закрашена — была тренировка)
// и список дней с тренировками.
function WorkoutsCard({ days }) {
  const trainedDays = days.filter((day) => day.workouts);
  let sets = 0;
  for (const day of trainedDays) sets += day.sets;

  return (
    <section className="stats-card">
      <div className="stats-card-head">
        <h2>Тренировки</h2>
        <span>
          {plural(trainedDays.length, 'день', 'дня', 'дней')} ·{' '}
          {plural(sets, 'подход', 'подхода', 'подходов')}
        </span>
      </div>
      <ol className="stats-days">
        {days.map((day) => (
          <li
            key={day.date}
            className={day.workouts ? 'is-trained' : ''}
            title={`${dayMonth(day.date)}: ${day.workouts ? plural(day.sets, 'подход', 'подхода', 'подходов') : 'отдых'}`}
          >
            <small>{weekday(day.date)}</small>
            <b>{Number(day.date.slice(8))}</b>
          </li>
        ))}
      </ol>
      <ul className="stats-trained">
        {trainedDays.length === 0 && <li className="muted">За этот период тренировок нет.</li>}
        {/* Копируем массив и переворачиваем, чтобы свежие тренировки были сверху; показываем пять. */}
        {[...trainedDays]
          .reverse()
          .slice(0, 5)
          .map((day) => (
            <li key={day.date}>
              <span className="stats-trained-icon">
                <img src={`${ASSETS}nav-workouts.svg`} alt="" />
              </span>
              <span>
                <strong>{relativeDay(day.date)}</strong>
                <small>
                  {plural(day.exercises, 'упражнение', 'упражнения', 'упражнений')} ·{' '}
                  {plural(day.sets, 'подход', 'подхода', 'подходов')}
                </small>
              </span>
            </li>
          ))}
      </ul>
      <Link to="/workouts" className="stats-card-link">
        Все тренировки →
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
  // Выбранный на графике день (по умолчанию — сегодня).
  const [selected, setSelected] = useState(localDate());
  const to = localDate();
  const from = offsetDate(to, 1 - periodDays);

  function reload() {
    setError('');
    setData(null);
    setSelected(to);
    api(`/statistics?from=${from}&to=${to}`)
      .then(setData)
      .catch((problem) => {
        // Сервер может отдельно пожаловаться на неверный период.
        if (problem.fields && problem.fields.period) setError(problem.fields.period);
        else setError(problem.message);
      });
  }
  useEffect(reload, [periodDays]);

  // Ссылка назад и переключатель периода над заголовком.
  const top = (
    <>
      <Link to="/profile" className="stats-back">
        ← Профиль
      </Link>
      <PeriodTabs value={periodDays} onChange={setPeriodDays} />
    </>
  );
  const subtitle = `${dateLabel(from, { day: 'numeric', month: 'long' })} — ${dateLabel(to, { day: 'numeric', month: 'long' })}`;

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
    content = (
      <div className="stats-cards">
        <CaloriesCard
          days={data.days}
          goals={data.goals}
          selected={selected}
          onSelect={setSelected}
        />
        <WorkoutsCard days={data.days} />
      </div>
    );
  }

  return (
    <>
      <div className="section-banner" />
      <main className="content section-content stats-page">
        <PageHero
          image={`${ASSETS}hero-statistics.jpg`}
          top={top}
          eyebrow="Мой прогресс"
          title="Статистика"
          subtitle={subtitle}
          stats={data && hasAnyData(data.days) ? periodStats(data.days, data.goals.calories) : null}
        />
        {content}
      </main>
    </>
  );
}
