// Просмотр одной сохранённой тренировки (только чтение). Редактирование — на /workouts/:id/edit.
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { dateLabel, dayMonth, formatInt, formatWeight, pluralWord, weekday } from '../format.js';
import { Notice, musclePhoto } from '../components/ui.jsx';
import { ConfirmDialog } from '../components/Dialogs.jsx';
import { PageHero } from '../components/PageHero.jsx';
import './WorkoutView.css';

// Итоги тренировки для крупных цифр в баннере.
function workoutStats(workout) {
  let sets = 0;
  let repetitions = 0;
  let lifted = 0; // сколько килограммов поднято всего: повторения × вес
  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      sets += 1;
      repetitions += Number(set.repetitions);
      lifted += Number(set.repetitions) * Number(set.weight_kg);
    }
  }
  const exercises = workout.exercises.length;
  return [
    { value: exercises, label: pluralWord(exercises, 'упражнение', 'упражнения', 'упражнений') },
    { value: sets, label: pluralWord(sets, 'подход', 'подхода', 'подходов') },
    {
      value: formatInt(repetitions),
      label: pluralWord(repetitions, 'повторение', 'повторения', 'повторений'),
    },
    { value: `${formatInt(lifted)} кг`, label: 'поднято всего' },
  ];
}

// Строка над датой: "Тренировка · четверг, 2026".
function heroEyebrow(workoutDate) {
  const weekdayName = weekday(workoutDate, 'long');
  const year = workoutDate.slice(0, 4);
  return `Тренировка · ${weekdayName}, ${year}`;
}

// Подходы упражнения: полоска показывает повторения относительно лучшего подхода.
function SetsList({ sets }) {
  if (!sets.length) return <p className="muted workout-view-empty">Подходы не записаны.</p>;
  let maxRepetitions = 1;
  for (const set of sets) maxRepetitions = Math.max(maxRepetitions, Number(set.repetitions));

  return (
    <ul className="workout-sets">
      {sets.map((set) => (
        <li key={set.id}>
          <div className="workout-set">
            <span className="workout-set-number">Подход {set.set_number}</span>
            <span className="workout-set-bar" role="presentation">
              <span style={{ width: `${(Number(set.repetitions) / maxRepetitions) * 100}%` }} />
            </span>
            <strong>
              {set.repetitions} × {formatWeight(set.weight_kg)} кг
            </strong>
          </div>
          {set.notes && <p className="workout-set-note">{set.notes}</p>}
        </li>
      ))}
    </ul>
  );
}

// Карточка упражнения: фото по группе мышц с номером, название и подходы.
function ExerciseCard({ exercise, number }) {
  const photo = musclePhoto(exercise.muscle_group);
  return (
    <li className="exercise-card">
      <div className="exercise-card-photo">
        {photo && <img src={photo} alt="" />}
        <span aria-hidden="true">{number}</span>
      </div>
      <div className="exercise-card-body">
        <h3>
          <span className="sr-only">{number}. </span>
          {exercise.exercise_name}
        </h3>
        {exercise.notes && <p className="exercise-card-note">{exercise.notes}</p>}
        <SetsList sets={exercise.sets} />
      </div>
    </li>
  );
}

export function WorkoutView() {
  // id тренировки берём из адреса /workouts/:id.
  const { id } = useParams();
  const navigate = useNavigate();
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
      await api(`/workouts/${id}`, 'DELETE');
      // Удалённой тренировки больше нет — убираем её страницу из истории.
      navigate('/workouts', { replace: true });
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
      setConfirming(false);
    }
  }

  const date = workout ? dateLabel(workout.workout_date) : '';

  // Ссылка назад и кнопки над заголовком баннера.
  const top = (
    <>
      <Link className="page-hero-link" to="/workouts">
        <img src="/assets/icon-arrow-left.svg" alt="" />
        Все тренировки
      </Link>
      <div className="page-hero-actions">
        <Link className="button button--primary" to={`/workouts/${id}/edit`}>
          <img src="/assets/icon-pencil-dark.svg" alt="" />
          Редактировать
        </Link>
        <button
          className="page-hero-icon-button"
          type="button"
          aria-label="Удалить тренировку"
          title="Удалить тренировку"
          onClick={() => setConfirming(true)}
        >
          <img src="/assets/icon-trash.svg" alt="" />
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="section-banner" />
      <main className="content section-content workout-view-page">
        {error && <Notice message={error} retry={notFound ? null : load} />}
        {!error && !workout && <p className="muted">Загружаем тренировку…</p>}
        {!error && workout && (
          <>
            <PageHero
              image={'/assets/hero-workout.jpg'}
              top={top}
              eyebrow={heroEyebrow(workout.workout_date)}
              title={dayMonth(workout.workout_date)}
              subtitle={workout.notes && `«${workout.notes}»`}
              stats={workoutStats(workout)}
            />
            <h2 className="section-heading">Упражнения</h2>
            {!workout.exercises.length && (
              <p className="muted workout-view-empty">В этой тренировке нет упражнений.</p>
            )}
            <ol className="exercise-cards">
              {workout.exercises.map((exercise, index) => (
                <ExerciseCard key={exercise.id} exercise={exercise} number={index + 1} />
              ))}
            </ol>
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
      </main>
    </>
  );
}
