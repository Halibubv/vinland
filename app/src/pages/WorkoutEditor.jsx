import React, { useEffect, useState } from 'react';
import { api, localDate } from '../lib/api.js';
import { go as navigate } from '../lib/router.js';
import { A } from '../lib/constants.js';
import { Shell, Notice, CatalogDialog } from '../components/ui.jsx';
import { dayMonth } from '../lib/dates.js';

const newExercise = () => ({ key: crypto.randomUUID(), exercise_id: '', notes: '', sets: [] });

const newSet = () => ({ key: crypto.randomUUID(), repetitions: '8', weight_kg: '0', notes: '' });

export function WorkoutEditor({ id, user }) {
  const draftKey = `vinland-workout-${user.id}-${id || 'new'}`;
  const [form, setForm] = useState({ workout_date: localDate(), notes: '', exercises: [] });
  const [catalog, setCatalog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [pickerIndex, setPickerIndex] = useState(null);
  useEffect(() => {
    setLoading(true);
    setLoadError('');
    Promise.all([api('/exercises'), id ? api(`/workouts/${id}`) : Promise.resolve(null)])
      .then(([exercises, existing]) => {
        setCatalog(exercises.exercises);
        const source = existing?.workout || { workout_date: localDate(), notes: '', exercises: [] };
        const base = {
          workout_date: source.workout_date,
          notes: source.notes || '',
          exercises: source.exercises.map((exercise) => ({
            key: crypto.randomUUID(),
            exercise_id: String(exercise.exercise_id),
            exercise_name: exercise.exercise_name,
            notes: exercise.notes || '',
            sets: exercise.sets.map((set) => ({
              key: crypto.randomUUID(),
              repetitions: String(set.repetitions),
              weight_kg: String(set.weight_kg),
              notes: set.notes || '',
            })),
          })),
        };
        try {
          setForm(JSON.parse(sessionStorage.getItem(draftKey) || 'null') || base);
        } catch {
          setForm(base);
        }
      })
      .catch((problem) => setLoadError(problem.message))
      .finally(() => setLoading(false));
  }, [id, loadAttempt]);
  function change(next) {
    setForm(next);
    sessionStorage.setItem(draftKey, JSON.stringify(next));
    setFields({});
  }
  function editExercise(index, patch) {
    change({
      ...form,
      exercises: form.exercises.map((entry, itemIndex) =>
        itemIndex === index ? { ...entry, ...patch } : entry,
      ),
    });
  }
  function editSet(index, setIndex, patch) {
    editExercise(index, {
      sets: form.exercises[index].sets.map((entry, itemIndex) =>
        itemIndex === setIndex ? { ...entry, ...patch } : entry,
      ),
    });
  }
  function move(index, direction) {
    const items = [...form.exercises];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    change({ ...form, exercises: items });
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      const body = {
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
      if (form.exercises.some((exercise) => !exercise.exercise_id)) {
        setFields({ exercises: 'Выберите упражнение для каждой записи.' });
        return;
      }
      const result = await api(id ? `/workouts/${id}` : '/workouts', {
        method: id ? 'PUT' : 'POST',
        body,
      });
      sessionStorage.removeItem(draftKey);
      navigate(`/workouts/${result.workout.id}`);
    } catch (problem) {
      setError(Object.values(problem.fields || {}).join(' ') || problem.message);
      setFields(problem.fields || {});
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!window.confirm('Удалить тренировку? Это действие нельзя отменить.')) return;
    setBusy(true);
    setError('');
    try {
      await api(`/workouts/${id}`, { method: 'DELETE' });
      sessionStorage.removeItem(draftKey);
      navigate('/workouts');
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
    }
  }
  const addExercise = () => {
    const index = form.exercises.length;
    change({ ...form, exercises: [...form.exercises, newExercise()] });
    setPickerIndex({ index, created: true });
  };
  const cancelPicker = () => {
    if (pickerIndex?.created)
      change({
        ...form,
        exercises: form.exercises.filter((_, index) => index !== pickerIndex.index),
      });
    setPickerIndex(null);
  };
  return (
    <Shell
      title={id ? 'Тренировка' : 'Новая тренировка'}
      subtitle={dayMonth(form.workout_date)}
      action={
        <a className="button button--outline" href="/workouts">
          ← К тренировкам
        </a>
      }
      className="workout-editor-page"
    >
      {loading ? (
        <p className="muted">Загружаем форму…</p>
      ) : loadError ? (
        <Notice message={loadError} retry={() => setLoadAttempt((value) => value + 1)} />
      ) : (
        <form className="editor-form workout-form" onSubmit={save} noValidate>
          <div className="form-intro">
            <label>
              Дата тренировки
              <input
                type="date"
                value={form.workout_date}
                onChange={(event) => change({ ...form, workout_date: event.target.value })}
                required
              />
            </label>
            <label>
              Заметка (необязательно)
              <input
                value={form.notes}
                onChange={(event) => change({ ...form, notes: event.target.value })}
                maxLength={4000}
                placeholder="Например: Ноги и грудь"
                aria-label="Название или заметка"
              />
            </label>
          </div>
          <div className="section-subtitle editor-section-title">
            <h2>Упражнения</h2>
          </div>
          {fields.exercises && <p className="field-error">{fields.exercises}</p>}
          {!catalog.length && (
            <p className="muted">
              В справочнике пока нет активных упражнений. Тренировку можно сохранить без них или
              попросить администратора заполнить справочник.
            </p>
          )}
          {form.exercises.map((exercise, index) => {
            const selected = catalog.find((item) => String(item.id) === exercise.exercise_id);
            const name = selected?.name || exercise.exercise_name;
            return (
              <section className="panel exercise-editor" key={exercise.key}>
                <div className="exercise-editor-head">
                  <strong>
                    ⠿ &nbsp; {index + 1}. {name || 'Выберите упражнение'}
                  </strong>
                </div>
                <div className="exercise-order">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Поднять упражнение"
                  >
                    Выше
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === form.exercises.length - 1}
                    aria-label="Опустить упражнение"
                  >
                    Ниже
                  </button>
                </div>
                <button
                  className="exercise-delete"
                  type="button"
                  onClick={() =>
                    change({
                      ...form,
                      exercises: form.exercises.filter((_, itemIndex) => itemIndex !== index),
                    })
                  }
                >
                  <img src={`${A}icon-trash.svg`} alt="" />
                  Удалить упражнение
                </button>
                <button
                  className="exercise-choice"
                  type="button"
                  onClick={() => setPickerIndex({ index, created: false })}
                >
                  {name
                    ? `Изменить упражнение${selected ? '' : ' (в архиве)'}`
                    : 'Выбрать упражнение'}
                </button>
                <div className="set-row-labels">
                  <span>Подход</span>
                  <span>Повторения</span>
                  <span>Вес, кг</span>
                  <span />
                </div>
                {exercise.sets.map((set, setIndex) => (
                  <div className="set-row" key={set.key}>
                    <span>{setIndex + 1}</span>
                    <label>
                      <span className="sr-only">Повторения, подход {setIndex + 1}</span>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        step="1"
                        value={set.repetitions}
                        onChange={(event) =>
                          editSet(index, setIndex, { repetitions: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span className="sr-only">Вес, кг, подход {setIndex + 1}</span>
                      <input
                        type="number"
                        min="0"
                        max="10000"
                        step="0.01"
                        value={set.weight_kg}
                        onChange={(event) =>
                          editSet(index, setIndex, { weight_kg: event.target.value })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        editExercise(index, {
                          sets: exercise.sets.filter((_, itemIndex) => itemIndex !== setIndex),
                        })
                      }
                      aria-label={`Удалить подход ${setIndex + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {!exercise.sets.length && (
                  <p className="muted">Подходов пока нет — упражнение можно сохранить без них.</p>
                )}
                <button
                  className="add-set"
                  type="button"
                  onClick={() => editExercise(index, { sets: [...exercise.sets, newSet()] })}
                >
                  <img src={`${A}icon-plus.svg`} alt="" />
                  Добавить подход
                </button>
                <details className="exercise-notes">
                  <summary>
                    <img src={`${A}icon-pencil.svg`} alt="" />
                    Заметки к упражнению и подходам
                  </summary>
                  <label>
                    Заметка к упражнению
                    <textarea
                      value={exercise.notes}
                      onChange={(event) => editExercise(index, { notes: event.target.value })}
                      maxLength={2000}
                      placeholder="Необязательно"
                    />
                  </label>
                  {exercise.sets.map((set, setIndex) => (
                    <label key={set.key}>
                      Заметка к подходу {setIndex + 1}
                      <input
                        value={set.notes}
                        onChange={(event) =>
                          editSet(index, setIndex, { notes: event.target.value })
                        }
                        maxLength={500}
                      />
                    </label>
                  ))}
                </details>
              </section>
            );
          })}
          <button
            className="button button--outline add-exercise"
            type="button"
            onClick={addExercise}
          >
            ＋ &nbsp; Добавить упражнение
          </button>
          {error && <Notice message={error} />}
          <div className="form-actions">
            <button className="button button--primary" type="submit" disabled={busy}>
              {busy ? 'Сохраняем…' : 'Сохранить тренировку'}
            </button>
            <a className="button button--outline" href="/workouts">
              Отмена
            </a>
            {id && (
              <button
                className="button button--danger"
                type="button"
                onClick={remove}
                disabled={busy}
              >
                Удалить тренировку
              </button>
            )}
          </div>
        </form>
      )}
      {pickerIndex !== null && (
        <CatalogDialog
          title="Выберите упражнение"
          items={catalog}
          onChoose={(item) => {
            editExercise(pickerIndex.index, {
              exercise_id: String(item.id),
              exercise_name: item.name,
            });
            setPickerIndex(null);
          }}
          onClose={cancelPicker}
        />
      )}
    </Shell>
  );
}
