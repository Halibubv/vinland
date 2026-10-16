import React, { useEffect, useState } from 'react';
import { api, formatNumber } from '../lib/api.js';
import { A } from '../lib/constants.js';
import { Shell, Notice, Empty } from '../components/ui.jsx';
import { monthTitle, monthShift, dayMonth } from '../lib/dates.js';

function exercisePhoto(name) {
  return (
    { 'Приседания со штангой': 'squat-photo.png', 'Жим лёжа': 'exercise-photo.png' }[name] || null
  );
}

function setText(exercise) {
  if (!exercise.sets?.length) return 'Без подходов';
  const first = exercise.sets[0];
  return `${exercise.sets.length} × ${formatNumber(first.repetitions)} · ${formatNumber(first.weight_kg)} кг`;
}

export function WorkoutsPage() {
  const [workouts, setWorkouts] = useState(null);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [day, setDay] = useState(null);
  function reload() {
    setError('');
    api('/workouts')
      .then((data) => setWorkouts(data.workouts))
      .catch((error) => setError(error.message));
  }
  useEffect(reload, []);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const rows = (workouts || []).filter((item) => {
    const [year, number, date] = item.workout_date.split('-').map(Number);
    return (
      year === month.getFullYear() && number === month.getMonth() + 1 && (!day || day === date)
    );
  });
  return (
    <Shell
      title="Тренировки"
      subtitle="История и записи тренировок"
      action={
        <a className="button button--primary" href="/workouts/new">
          ＋ Добавить тренировку
        </a>
      }
    >
      <div className="month-picker">
        <button
          aria-label="Предыдущий месяц"
          onClick={() => {
            setMonth(monthShift(month, -1));
            setDay(null);
          }}
        >
          ‹
        </button>
        <strong>{monthTitle(month)}</strong>
        <button
          aria-label="Следующий месяц"
          onClick={() => {
            setMonth(monthShift(month, 1));
            setDay(null);
          }}
        >
          ›
        </button>
        <div className="date-pills">
          <button className={!day ? 'selected' : ''} onClick={() => setDay(null)}>
            Все
          </button>
          {Array.from({ length: count }, (_, index) => index + 1).map((value) => (
            <button
              key={value}
              className={day === value ? 'selected' : ''}
              onClick={() => setDay(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="section-subtitle">
        <h2>Сохранённые тренировки</h2>
        <span>Упражнения добавляются из справочника</span>
      </div>
      {error ? (
        <Notice message={error} retry={reload} />
      ) : !workouts ? (
        <p className="muted">Загружаем тренировки…</p>
      ) : !rows.length ? (
        <Empty
          title="В этом периоде пока нет тренировок"
          detail="Добавь первую запись — упражнения и подходы сохранятся в твоей истории."
          action="Добавить тренировку"
          to="/workouts/new"
        />
      ) : (
        <div className="workout-timeline">
          {rows.map((workout) => (
            <a className="workout-record" href={`/workouts/${workout.id}`} key={workout.id}>
              <span className="timeline-dot" />
              <div className="record-date">
                {dayMonth(workout.workout_date)}
                <small>{workout.workout_date.slice(0, 4)}</small>
              </div>
              <div className="record-body">
                <h3>{workout.notes?.trim() || 'Тренировка'}</h3>
                <p>
                  {workout.exercises.length} упражнений ·{' '}
                  {workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)}{' '}
                  подходов
                </p>
                <div className="record-exercises">
                  {workout.exercises.slice(0, 2).map((exercise) => (
                    <div key={exercise.id}>
                      {exercisePhoto(exercise.exercise_name) ? (
                        <img src={`${A}${exercisePhoto(exercise.exercise_name)}`} alt="" />
                      ) : (
                        <span className="record-placeholder">
                          <img src={`${A}nav-workouts.svg`} alt="" />
                        </span>
                      )}
                      <span>
                        {exercise.exercise_name}
                        <small>{setText(exercise)}</small>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <span className="record-open">› &nbsp; Открыть тренировку</span>
            </a>
          ))}
        </div>
      )}
    </Shell>
  );
}
