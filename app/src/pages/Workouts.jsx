import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { A } from '../lib/constants.js';
import { dateLabel, dayMonth, monthShift, monthTitle } from '../lib/dates.js';
import { plural, setsSummary } from '../lib/format.js';
import { Shell, Notice, Empty } from '../components/ui.jsx';
import { EntryIcon } from '../components/EntryIcon.jsx';
import './Workouts.css';

const SHOWN_EXERCISES = 2;

function WorkoutCard({ workout }) {
  const { exercises } = workout;
  const sets = exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const counts = [
    plural(exercises.length, 'упражнение', 'упражнения', 'упражнений'),
    plural(sets, 'подход', 'подхода', 'подходов'),
  ];
  if (exercises.length > SHOWN_EXERCISES)
    counts.push(`показано ${SHOWN_EXERCISES} из ${exercises.length}`);
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
          <a href={`/workouts/${workout.id}`}>{workout.notes?.trim() || 'Тренировка'}</a>
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
  const [month, setMonth] = useState(() => monthShift(new Date(), 0));
  const [day, setDay] = useState(null);
  function reload() {
    setError('');
    api('/workouts')
      .then((data) => setWorkouts(data.workouts))
      .catch((problem) => setError(problem.message));
  }
  useEffect(reload, []);
  const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-`;
  const inMonth = (workouts || []).filter((item) => item.workout_date.startsWith(prefix));
  const activeDays = new Set(inMonth.map((item) => Number(item.workout_date.slice(8))));
  const rows = day ? inMonth.filter((item) => Number(item.workout_date.slice(8)) === day) : inMonth;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const changeMonth = (offset) => {
    setMonth(monthShift(month, offset));
    setDay(null);
  };
  return (
    <Shell
      title="Тренировки"
      subtitle="История и записи тренировок"
      action={
        <a className="button button--primary workouts-add" href="/workouts/new">
          <img src={`${A}icon-plus.svg`} alt="" />
          Добавить тренировку
        </a>
      }
      className="workouts-page"
    >
      <div className="workouts-filter">
        <div className="workouts-month">
          <img src={`${A}icon-calendar.svg`} alt="" className="narrow-only" />
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
          {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((value) => (
            <button
              type="button"
              key={value}
              className={`${day === value ? 'selected' : ''} ${activeDays.has(value) ? 'has-workout' : ''}`}
              disabled={!activeDays.has(value)}
              onClick={() => setDay(value)}
              aria-pressed={day === value}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="workouts-heading wide-only">
        <h2>Сохранённые тренировки</h2>
        <span>
          <img src={`${A}icon-book.svg`} alt="" />
          Упражнения добавляются из справочника
        </span>
      </div>
      {error ? (
        <Notice message={error} retry={reload} />
      ) : !workouts ? (
        <p className="muted">Загружаем тренировки…</p>
      ) : !rows.length ? (
        <Empty
          title="В этом месяце пока нет тренировок"
          detail="Добавьте первую запись: упражнения и подходы сохранятся в вашей истории."
          action="Добавить тренировку"
          to="/workouts/new"
        />
      ) : (
        <ol className="workout-list">
          {rows.map((workout) => (
            <WorkoutCard workout={workout} key={workout.id} />
          ))}
        </ol>
      )}
    </Shell>
  );
}
