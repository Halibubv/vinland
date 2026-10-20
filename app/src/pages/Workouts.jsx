// Экран «Тренировки»: список сохранённых тренировок за месяц с фильтром по дню.
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { ASSETS } from '../lib/constants.js';
import { dateLabel, dayMonth, monthShift, monthTitle } from '../lib/dates.js';
import { plural, setsSummary } from '../lib/format.js';
import { Shell, Notice, Empty } from '../components/ui.jsx';
import { EntryIcon } from '../components/EntryIcon.jsx';
import './Workouts.css';

// Сколько упражнений показывать в карточке, остальные видны на странице тренировки.
const SHOWN_EXERCISES = 2;

// День месяца из даты "2026-10-16" → 16.
function dayOfMonth(date) {
  return Number(date.slice(8));
}

// Карточка одной тренировки в списке.
function WorkoutCard({ workout }) {
  const exercises = workout.exercises;
  let setCount = 0;
  for (const exercise of exercises) setCount += exercise.sets.length;

  // Строка вида "3 упражнения · 9 подходов · показано 2 из 3".
  const counts = [
    plural(exercises.length, 'упражнение', 'упражнения', 'упражнений'),
    plural(setCount, 'подход', 'подхода', 'подходов'),
  ];
  if (exercises.length > SHOWN_EXERCISES) {
    // \u00a0 — неразрывный пробел: «2 из 4» не разрывается на две строки.
    counts.push(`показано ${SHOWN_EXERCISES}\u00a0из\u00a0${exercises.length}`);
  }

  // Заголовок карточки — заметка к тренировке, если она есть.
  let title = 'Тренировка';
  if (workout.notes && workout.notes.trim()) title = workout.notes.trim();

  return (
    <li className="workout-card">
      <span className="workout-card-dot" aria-hidden="true" />
      <div className="workout-card-date">
        <span className="wide-only">
          {dayMonth(workout.workout_date)}
          <small>{workout.workout_date.slice(0, 4)}</small>
        </span>
        <span className="narrow-only">{dateLabel(workout.workout_date)}</span>
      </div>
      <div className="workout-card-body">
        <h3>
          <a href={`/workouts/${workout.id}`}>{title}</a>
        </h3>
        <p>{counts.join(' · ')}</p>
        {exercises.length > 0 && (
          <ul className="workout-card-exercises">
            {exercises.slice(0, SHOWN_EXERCISES).map((exercise) => (
              <li key={exercise.id}>
                <EntryIcon label={exercise.muscle_group} />
                <span>
                  {exercise.exercise_name}
                  <small>{setsSummary(exercise.sets)}</small>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <span className="workout-card-open" aria-hidden="true">
        › &nbsp; Открыть тренировку
      </span>
    </li>
  );
}

export function WorkoutsPage() {
  const [workouts, setWorkouts] = useState(null);
  const [error, setError] = useState('');
  // Выбранный месяц (Date на первое число) и выбранный день (число или null — «Все»).
  const [month, setMonth] = useState(() => monthShift(new Date(), 0));
  const [day, setDay] = useState(null);
  function reload() {
    setError('');
    api('/workouts')
      .then((data) => setWorkouts(data.workouts))
      .catch((problem) => setError(problem.message));
  }
  useEffect(reload, []);

  // Тренировки выбранного месяца: дата начинается с "ГГГГ-ММ-".
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-`;
  const inMonth = (workouts || []).filter((item) => item.workout_date.startsWith(monthPrefix));

  // Дни, в которые были тренировки: только их можно выбрать в фильтре.
  const activeDays = new Set();
  for (const item of inMonth) activeDays.add(dayOfMonth(item.workout_date));

  let shown = inMonth;
  if (day) shown = inMonth.filter((item) => dayOfMonth(item.workout_date) === day);

  // Нулевое число следующего месяца — это последний день текущего.
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const dayNumbers = [];
  for (let number = 1; number <= daysInMonth; number++) dayNumbers.push(number);

  function changeMonth(offset) {
    setMonth(monthShift(month, offset));
    setDay(null);
  }

  return (
    <Shell
      title="Тренировки"
      subtitle="История и записи тренировок"
      action={
        <a className="button button--primary workouts-add" href="/workouts/new">
          <img src={`${ASSETS}icon-plus.svg`} alt="" />
          Добавить тренировку
        </a>
      }
      className="workouts-page"
    >
      <div className="workouts-filter">
        <div className="workouts-month">
          <img src={`${ASSETS}icon-calendar.svg`} alt="" className="narrow-only" />
          <button type="button" aria-label="Предыдущий месяц" onClick={() => changeMonth(-1)}>
            ‹
          </button>
          <strong>
            {monthTitle(month)}
            <span className="narrow-only"> · сохранённые записи</span>
          </strong>
          <button type="button" aria-label="Следующий месяц" onClick={() => changeMonth(1)}>
            ›
          </button>
        </div>
        <div className="workouts-days" role="group" aria-label="День месяца">
          <button type="button" className={!day ? 'selected' : ''} onClick={() => setDay(null)}>
            Все
          </button>
          {dayNumbers.map((number) => (
            <button
              type="button"
              key={number}
              className={`${day === number ? 'selected' : ''} ${activeDays.has(number) ? 'has-workout' : ''}`}
              disabled={!activeDays.has(number)}
              onClick={() => setDay(number)}
              aria-pressed={day === number}
            >
              {number}
            </button>
          ))}
        </div>
      </div>
      <div className="workouts-heading wide-only">
        <h2>Сохранённые тренировки</h2>
        <span>
          <img src={`${ASSETS}icon-book.svg`} alt="" />
          Упражнения добавляются из справочника
        </span>
      </div>
      {error && <Notice message={error} retry={reload} />}
      {!error && !workouts && <p className="muted">Загружаем тренировки…</p>}
      {!error && workouts && shown.length === 0 && (
        <Empty
          title="В этом месяце пока нет тренировок"
          detail="Добавьте первую запись: упражнения и подходы сохранятся в вашей истории."
          action="Добавить тренировку"
          to="/workouts/new"
        />
      )}
      {!error && workouts && shown.length > 0 && (
        <ol className="workout-list">
          {shown.map((workout) => (
            <WorkoutCard workout={workout} key={workout.id} />
          ))}
        </ol>
      )}
    </Shell>
  );
}
