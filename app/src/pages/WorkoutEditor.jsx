import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { dateLabel, localDate } from '../lib/dates.js';
import { go as navigate } from '../lib/router.js';
import { A } from '../lib/constants.js';
import { Shell, Notice, BackLink } from '../components/ui.jsx';
import { DateStepper } from '../components/DateStepper.jsx';
import { CatalogDialog } from '../components/Dialogs.jsx';
import './WorkoutEditor.css';

const newExercise = () => ({ key: crypto.randomUUID(), exercise_id: '', notes: '', sets: [] });

// A new set repeats the previous one: people usually do several identical sets.
const newSet = (previous) => ({
  key: crypto.randomUUID(),
  repetitions: previous?.repetitions ?? '8',
  weight_kg: previous?.weight_kg ?? '0',
  notes: '',
});

function formFromWorkout(workout) {
  return {
    workout_date: workout.workout_date,
    notes: workout.notes || '',
    exercises: workout.exercises.map((exercise) => ({
      key: crypto.randomUUID(),
      exercise_id: String(exercise.exercise_id),
      exercise_name: exercise.exercise_name,
      notes: exercise.notes || '',
      sets: exercise.sets.map((set) => ({
        key: crypto.randomUUID(),
        repetitions: String(set.repetitions),
        weight_kg: String(Number(set.weight_kg)),
        notes: set.notes || '',
      })),
    })),
  };
}

function requestBody(form) {
  return {
    workout_date: form.workout_date,
    notes: form.notes,
    exercises: form.exercises.map((exercise) => ({
      exercise_id: Number(exercise.exercise_id),
      notes: exercise.notes,
      sets: exercise.sets.map(({ repetitions, weight_kg, notes }) => ({
        repetitions,
        weight_kg,
        notes,
      })),
    })),
  };
}

function SetRows({ sets, onEdit, onRemove }) {
  return (
    <div className="workout-sets-edit" role="group" aria-label="Подходы">
      <div className="workout-sets-edit-head" aria-hidden="true">
        <span>Подход</span>
        <span>Повторения</span>
        <span>Вес, кг</span>
      </div>
      {sets.map((set, index) => (
        <div className="workout-set-row" key={set.key}>
          <span>{index + 1}</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="1000"
            step="1"
            value={set.repetitions}
            onChange={(event) => onEdit(index, { repetitions: event.target.value })}
            aria-label={`Повторения, подход ${index + 1}`}
          />
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="10000"
            step="0.01"
            value={set.weight_kg}
            onChange={(event) => onEdit(index, { weight_kg: event.target.value })}
            aria-label={`Вес, кг, подход ${index + 1}`}
          />
          <button
            type="button"
            className="workout-set-remove"
            onClick={() => onRemove(index)}
            aria-label={`Удалить подход ${index + 1}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function ExerciseEditor({ exercise, index, count, catalog, onChange, onMove, onRemove, onPick }) {
  const selected = catalog.find((item) => String(item.id) === exercise.exercise_id);
  const name = selected?.name || exercise.exercise_name;
  const editSet = (setIndex, patch) =>
    onChange({
      sets: exercise.sets.map((set, itemIndex) =>
        itemIndex === setIndex ? { ...set, ...patch } : set,
      ),
    });
  return (
    <li className="workout-exercise">
      <div className="workout-exercise-head">
        <span className="workout-exercise-handle" aria-hidden="true">
          ⠿
        </span>
        <h3>
          <button
            type="button"
            onClick={onPick}
            title={selected || !name ? 'Выбрать другое упражнение' : 'Упражнение в архиве'}
          >
            {index + 1}. {name || 'Выберите упражнение'}
          </button>
        </h3>
        <div className="workout-exercise-order">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0}>
            Выше
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1}>
            Ниже
          </button>
        </div>
        <button type="button" className="workout-exercise-remove" onClick={onRemove}>
          <img src={`${A}icon-trash.svg`} alt="" />
          <span>
            Удалить<span className="narrow-only"> упражнение</span>
          </span>
        </button>
      </div>
      {exercise.sets.length ? (
        <SetRows
          sets={exercise.sets}
          onEdit={editSet}
          onRemove={(setIndex) =>
            onChange({ sets: exercise.sets.filter((_, itemIndex) => itemIndex !== setIndex) })
          }
        />
      ) : (
        <p className="muted workout-exercise-empty">
          Подходов пока нет — упражнение можно сохранить и без них.
        </p>
      )}
      <button
        type="button"
        className="workout-add-set"
        onClick={() => onChange({ sets: [...exercise.sets, newSet(exercise.sets.at(-1))] })}
      >
        <img src={`${A}icon-plus.svg`} alt="" />
        Добавить подход
      </button>
      <details className="workout-exercise-notes">
        <summary>
          <img src={`${A}icon-pencil.svg`} alt="" />
          Заметки к упражнению и подходам
        </summary>
        <label>
          Заметка к упражнению
          <textarea
            value={exercise.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            maxLength={2000}
            placeholder="Необязательно"
          />
        </label>
        {exercise.sets.map((set, setIndex) => (
          <label key={set.key}>
            Заметка к подходу {setIndex + 1}
            <input
              value={set.notes}
              onChange={(event) => editSet(setIndex, { notes: event.target.value })}
              maxLength={500}
            />
          </label>
        ))}
      </details>
    </li>
  );
}

export function WorkoutEditor({ id }) {
  const [form, setForm] = useState({ workout_date: localDate(), notes: '', exercises: [] });
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState(null);
  const backHref = id ? `/workouts/${id}` : '/workouts';

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    Promise.all([api('/exercises'), id ? api(`/workouts/${id}`) : null])
      .then(([exercises, existing]) => {
        setCatalog(exercises.exercises);
        if (existing) setForm(formFromWorkout(existing.workout));
      })
      .catch((problem) => setLoadError(problem.message))
      .finally(() => setLoading(false));
  }, [id, loadAttempt]);

  function change(patch) {
    setForm((previous) => ({ ...previous, ...patch }));
    setError('');
  }
  function setExercises(update) {
    setForm((previous) => ({ ...previous, exercises: update(previous.exercises) }));
    setError('');
  }
  const editExercise = (index, patch) =>
    setExercises((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  const removeExercise = (index) =>
    setExercises((items) => items.filter((_, itemIndex) => itemIndex !== index));
  function moveExercise(index, direction) {
    setExercises((items) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function addExercise() {
    setExercises((items) => [...items, newExercise()]);
    setPicker({ index: form.exercises.length, created: true });
  }
  function closePicker() {
    if (picker?.created) removeExercise(picker.index);
    setPicker(null);
  }

  async function save(event) {
    event.preventDefault();
    if (form.exercises.some((exercise) => !exercise.exercise_id)) {
      setError('Выберите упражнение для каждой записи.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api(id ? `/workouts/${id}` : '/workouts', {
        method: id ? 'PUT' : 'POST',
        body: requestBody(form),
      });
      navigate(`/workouts/${result.workout.id}`);
    } catch (problem) {
      setError(Object.values(problem.fields || {}).join(' ') || problem.message);
      setBusy(false);
    }
  }

  return (
    <Shell
      title={id ? 'Редактирование тренировки' : 'Новая тренировка'}
      subtitle={<span className="narrow-only">{dateLabel(form.workout_date)}</span>}
      back={<BackLink to={backHref} label={id ? 'К тренировке' : 'К тренировкам'} />}
      className="workout-editor-page"
    >
      {loading ? (
        <p className="muted">Загружаем форму…</p>
      ) : loadError ? (
        <Notice message={loadError} retry={() => setLoadAttempt((value) => value + 1)} />
      ) : (
        <form className="workout-form" onSubmit={save} noValidate>
          <div className="workout-form-intro">
            <div>
              <span className="workout-form-label">Дата</span>
              <DateStepper
                value={form.workout_date}
                onChange={(workout_date) => change({ workout_date })}
                label="Дата тренировки"
              />
            </div>
            <label>
              <span className="workout-form-label">Заметка (необязательно)</span>
              <input
                value={form.notes}
                onChange={(event) => change({ notes: event.target.value })}
                maxLength={4000}
                placeholder="Например: Ноги и грудь"
              />
            </label>
          </div>

          {!catalog.length && (
            <p className="muted">
              В справочнике пока нет активных упражнений. Тренировку можно сохранить без них или
              попросить администратора заполнить справочник.
            </p>
          )}
          <ol className="workout-exercises">
            {form.exercises.map((exercise, index) => (
              <ExerciseEditor
                key={exercise.key}
                exercise={exercise}
                index={index}
                count={form.exercises.length}
                catalog={catalog}
                onChange={(patch) => editExercise(index, patch)}
                onMove={(direction) => moveExercise(index, direction)}
                onRemove={() => removeExercise(index)}
                onPick={() => setPicker({ index, created: false })}
              />
            ))}
          </ol>

          {error && <Notice message={error} />}
          <div className="workout-form-footer">
            <button className="button button--primary" type="submit" disabled={busy}>
              {busy ? 'Сохраняем…' : 'Сохранить тренировку'}
            </button>
            <a className="button button--outline" href={backHref}>
              Отмена
            </a>
            <button
              className="button button--outline workout-add-exercise"
              type="button"
              onClick={addExercise}
            >
              <img src={`${A}icon-plus.svg`} alt="" />
              Добавить упражнение
            </button>
          </div>
        </form>
      )}
      {picker && (
        <CatalogDialog
          title="Выберите упражнение"
          items={catalog}
          describe={(item) => item.muscle_group}
          onChoose={(item) => {
            editExercise(picker.index, { exercise_id: String(item.id), exercise_name: item.name });
            setPicker(null);
          }}
          onClose={closePicker}
        />
      )}
    </Shell>
  );
}
