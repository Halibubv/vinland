// Создание и редактирование тренировки: дата, заметка, упражнения и их подходы.
import React, { useEffect, useState } from 'react';
import { api, errorText } from '../lib/api.js';
import { dateLabel, localDate } from '../lib/dates.js';
import { go as navigate } from '../lib/router.js';
import { ASSETS } from '../lib/constants.js';
import { Shell, Notice, BackLink } from '../components/ui.jsx';
import { DateStepper } from '../components/DateStepper.jsx';
import { CatalogDialog } from '../components/Dialogs.jsx';
import './WorkoutEditor.css';

// key у упражнений и подходов — уникальный ключ строки для React,
// на сервер он не отправляется. Числа в полях ввода храним строками.

function newExercise() {
  return { key: crypto.randomUUID(), exercise_id: '', notes: '', sets: [] };
}

// Новый подход повторяет предыдущий: обычно делают несколько одинаковых подходов.
function newSet(previous) {
  if (!previous) {
    return { key: crypto.randomUUID(), repetitions: '8', weight_kg: '0', notes: '' };
  }
  return {
    key: crypto.randomUUID(),
    repetitions: previous.repetitions,
    weight_kg: previous.weight_kg,
    notes: '',
  };
}

// Сохранённая тренировка с сервера → состояние формы.
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

// Состояние формы → тело запроса к серверу (без служебных key).
function requestBody(form) {
  return {
    workout_date: form.workout_date,
    notes: form.notes,
    exercises: form.exercises.map((exercise) => ({
      exercise_id: Number(exercise.exercise_id),
      notes: exercise.notes,
      sets: exercise.sets.map((set) => ({
        repetitions: set.repetitions,
        weight_kg: set.weight_kg,
        notes: set.notes,
      })),
    })),
  };
}

// Таблица подходов: номер, повторения, вес и кнопка удаления.
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

// Карточка одного упражнения в форме. index — его номер в списке, count — всего упражнений.
function ExerciseEditor({ exercise, index, count, catalog, onChange, onMove, onRemove, onPick }) {
  // В справочнике только активные упражнения. Если упражнение отключено (в архиве),
  // его там нет, и название берём из сохранённой тренировки.
  const selected = catalog.find((item) => String(item.id) === exercise.exercise_id);
  let name = exercise.exercise_name;
  if (selected) name = selected.name;

  function editSet(setIndex, patch) {
    const sets = exercise.sets.map((set, itemIndex) => {
      if (itemIndex === setIndex) return { ...set, ...patch };
      return set;
    });
    onChange({ sets });
  }

  function removeSet(setIndex) {
    onChange({ sets: exercise.sets.filter((set, itemIndex) => itemIndex !== setIndex) });
  }

  function addSet() {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    onChange({ sets: [...exercise.sets, newSet(lastSet)] });
  }

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
          <img src={`${ASSETS}icon-trash.svg`} alt="" />
          <span>
            Удалить<span className="narrow-only"> упражнение</span>
          </span>
        </button>
      </div>
      {exercise.sets.length > 0 && (
        <SetRows sets={exercise.sets} onEdit={editSet} onRemove={removeSet} />
      )}
      {exercise.sets.length === 0 && (
        <p className="muted workout-exercise-empty">
          Подходов пока нет — упражнение можно сохранить и без них.
        </p>
      )}
      <button type="button" className="workout-add-set" onClick={addSet}>
        <img src={`${ASSETS}icon-plus.svg`} alt="" />
        Добавить подход
      </button>
      <details className="workout-exercise-notes">
        <summary>
          <img src={`${ASSETS}icon-pencil.svg`} alt="" />
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

// id есть — редактируем сохранённую тренировку, нет — создаём новую.
export function WorkoutEditor({ id }) {
  const [form, setForm] = useState({ workout_date: localDate(), notes: '', exercises: [] });
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // Запись не найдена (или чужая): кнопка «Повторить» тут не поможет.
  const [notFound, setNotFound] = useState(false);
  // Увеличение счётчика заново запускает загрузку (кнопка «Повторить»).
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Открытое окно выбора упражнения: { index — для какой карточки,
  // created — карточка только что добавлена }. null — окно закрыто.
  const [picker, setPicker] = useState(null);
  const backHref = id ? `/workouts/${id}` : '/workouts';

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    let workoutRequest = null;
    if (id) workoutRequest = api(`/workouts/${id}`);
    Promise.all([api('/exercises'), workoutRequest])
      .then(([exercises, existing]) => {
        setCatalog(exercises.exercises);
        if (existing) setForm(formFromWorkout(existing.workout));
      })
      .catch((problem) => {
        setLoadError(problem.message);
        setNotFound(problem.status === 404);
      })
      .finally(() => setLoading(false));
  }, [id, loadAttempt]);

  function change(patch) {
    setForm((previous) => ({ ...previous, ...patch }));
    setError('');
  }

  // Все изменения списка упражнений идут через эту функцию. update получает
  // текущий список и возвращает новый (берём свежее состояние через previous).
  function setExercises(update) {
    setForm((previous) => ({ ...previous, exercises: update(previous.exercises) }));
    setError('');
  }

  function editExercise(index, patch) {
    setExercises((items) =>
      items.map((item, itemIndex) => {
        if (itemIndex === index) return { ...item, ...patch };
        return item;
      }),
    );
  }

  function removeExercise(index) {
    setExercises((items) => items.filter((item, itemIndex) => itemIndex !== index));
  }

  // direction: -1 — выше, 1 — ниже. Меняем упражнение местами с соседним.
  function moveExercise(index, direction) {
    setExercises((items) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return items;
      const next = [...items];
      const moved = next[index];
      next[index] = next[target];
      next[target] = moved;
      return next;
    });
  }

  // Новая карточка сразу открывает выбор упражнения.
  function addExercise() {
    setExercises((items) => [...items, newExercise()]);
    setPicker({ index: form.exercises.length, created: true });
  }

  // Если выбор отменили у только что добавленной карточки, пустую карточку убираем.
  function closePicker() {
    if (picker && picker.created) removeExercise(picker.index);
    setPicker(null);
  }

  function chooseExercise(item) {
    editExercise(picker.index, { exercise_id: String(item.id), exercise_name: item.name });
    setPicker(null);
  }

  async function save(event) {
    event.preventDefault();
    if (!form.exercises.length) {
      setError('Добавьте хотя бы одно упражнение.');
      return;
    }
    if (form.exercises.some((exercise) => !exercise.exercise_id)) {
      setError('Выберите упражнение для каждой записи.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const body = requestBody(form);
      let result;
      if (id) result = await api(`/workouts/${id}`, { method: 'PUT', body });
      else result = await api('/workouts', { method: 'POST', body });
      // replace: «Назад» со страницы тренировки не вернёт к уже сохранённой форме.
      navigate(`/workouts/${result.workout.id}`, { replace: true });
    } catch (problem) {
      setError(errorText(problem));
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
      {loading && <p className="muted">Загружаем форму…</p>}
      {!loading && loadError && (
        <Notice
          message={loadError}
          retry={notFound ? null : () => setLoadAttempt(loadAttempt + 1)}
        />
      )}
      {!loading && !loadError && (
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
              В справочнике пока нет активных упражнений. Чтобы записать тренировку, попросите
              администратора заполнить справочник.
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
              <img src={`${ASSETS}icon-plus.svg`} alt="" />
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
          onChoose={chooseExercise}
          onClose={closePicker}
        />
      )}
    </Shell>
  );
}
