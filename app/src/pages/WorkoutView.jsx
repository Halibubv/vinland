// Просмотр одной сохранённой тренировки (только чтение). Редактирование — на /workouts/:id/edit.
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { dateLabel } from '../lib/dates.js';
import { formatWeight } from '../lib/format.js';
import { go as navigate } from '../lib/router.js';
import { ASSETS } from '../lib/constants.js';
import { Shell, Notice, BackLink } from '../components/ui.jsx';
import { ConfirmDialog } from '../components/Dialogs.jsx';
import './WorkoutView.css';

// Таблица подходов одного упражнения; заметка к подходу — отдельной строкой под ним.
function SetsTable({ sets }) {
  if (!sets.length) return <p className="muted workout-view-empty">Подходы не записаны.</p>;
  return (
    <table className="workout-sets">
      <thead>
        <tr>
          <th scope="col">Подход</th>
          <th scope="col">Повторения</th>
          <th scope="col">Вес, кг</th>
        </tr>
      </thead>
      <tbody>
        {sets.map((set) => (
          <React.Fragment key={set.id}>
            <tr>
              <td>{set.set_number}</td>
              <td>{set.repetitions}</td>
              <td>{formatWeight(set.weight_kg)}</td>
            </tr>
            {set.notes && (
              <tr className="workout-set-note">
                <td colSpan="3">{set.notes}</td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}

// Список упражнений тренировки и её заметка.
function WorkoutDetails({ workout }) {
  return (
    <>
      {workout.notes && <p className="workout-view-note">Заметка: {workout.notes}</p>}
      <h2 className="workout-view-heading wide-only">Упражнения</h2>
      {!workout.exercises.length && (
        <p className="muted workout-view-empty">В этой тренировке нет упражнений.</p>
      )}
      <ol className="workout-view-exercises">
        {workout.exercises.map((exercise, index) => (
          <li className="workout-view-exercise" key={exercise.id}>
            <h3>
              <span>{index + 1}.</span>
              {exercise.exercise_name}
            </h3>
            {exercise.notes && <p className="workout-view-exercise-note">{exercise.notes}</p>}
            <SetsTable sets={exercise.sets} />
          </li>
        ))}
      </ol>
    </>
  );
}

export function WorkoutView({ id }) {
  const [workout, setWorkout] = useState(null);
  const [error, setError] = useState('');
  // Тренировки нет (или она чужая): кнопка «Повторить» тут не поможет.
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    setError('');
    api(`/workouts/${id}`)
      .then((data) => setWorkout(data.workout))
      .catch((problem) => {
        setError(problem.message);
        setNotFound(problem.status === 404);
      });
  }
  useEffect(load, [id]);

  async function remove() {
    setBusy(true);
    try {
      await api(`/workouts/${id}`, { method: 'DELETE' });
      // Удалённой тренировки больше нет — убираем её страницу из истории.
      navigate('/workouts', { replace: true });
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
      setConfirming(false);
    }
  }

  const date = workout ? dateLabel(workout.workout_date) : '';
  // Кнопки показываются справа от заголовка на широком экране и под списком на узком.
  const actions = (
    <div className="workout-view-actions">
      <a className="button button--outline" href={`/workouts/${id}/edit`}>
        <img src={`${ASSETS}icon-pencil.svg`} alt="" />
        Редактировать
      </a>
      <button className="workout-view-delete" type="button" onClick={() => setConfirming(true)}>
        <img src={`${ASSETS}icon-trash.svg`} alt="" />
        <span>
          Удалить<span className="narrow-only"> тренировку</span>
        </span>
      </button>
    </div>
  );

  return (
    <Shell
      title={<>Тренировка{date && <span className="wide-only"> · {date}</span>}</>}
      subtitle={<span className="narrow-only">{date}</span>}
      back={<BackLink to="/workouts" label="Тренировки" current={date} />}
      action={workout && <div className="wide-only">{actions}</div>}
      className="workout-view-page"
    >
      {error && <Notice message={error} retry={notFound ? null : load} />}
      {!error && !workout && <p className="muted">Загружаем тренировку…</p>}
      {!error && workout && (
        <>
          <WorkoutDetails workout={workout} />
          <div className="narrow-only">{actions}</div>
        </>
      )}
      {confirming && (
        <ConfirmDialog
          title="Удалить тренировку?"
          busy={busy}
          onConfirm={remove}
          onClose={() => setConfirming(false)}
        >
          Тренировка за {date} и все её подходы будут удалены. Это действие нельзя отменить.
        </ConfirmDialog>
      )}
    </Shell>
  );
}
