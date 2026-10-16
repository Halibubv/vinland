import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, dateLabel, formatNumber, localDate } from './api';

const A = '/assets/';
const mealTypes = { breakfast: 'Завтрак', lunch: 'Обед', snack: 'Перекус', dinner: 'Ужин' };

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function Shell({ title, subtitle, action, children, className = '' }) {
  return (
    <>
      <div className="section-banner" />
      <main className={`content section-content ${className}`}>
        <div className="section-title-row">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </main>
    </>
  );
}

function Notice({ message, retry }) {
  return (
    <div className="section-notice" role="alert">
      <p>{message}</p>
      {retry && (
        <button className="button button--outline" onClick={retry}>
          Повторить
        </button>
      )}
    </div>
  );
}

function Empty({ title, detail, action, to }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{detail}</p>
      {to && (
        <a className="button button--primary" href={to}>
          {action}
        </a>
      )}
    </div>
  );
}

function CatalogDialog({ title, items, onChoose, onClose }) {
  const dialogRef = useRef(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    dialog.querySelector('input')?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);
  const filtered = items.filter((item) =>
    item.name.toLocaleLowerCase('ru-RU').includes(query.toLocaleLowerCase('ru-RU')),
  );
  function keepFocus(event) {
    if (event.key !== 'Tab') return;
    const controls = [...dialogRef.current.querySelectorAll('button, input')].filter(
      (node) => !node.disabled,
    );
    const first = controls[0];
    const last = controls.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first || !dialogRef.current.contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || !dialogRef.current.contains(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <dialog
      ref={dialogRef}
      className="catalog-dialog"
      onClose={onClose}
      onKeyDown={keepFocus}
      aria-label={title}
    >
      <div className="catalog-dialog-head">
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
      </div>
      <input
        autoFocus
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Поиск по справочнику"
        placeholder="Поиск по справочнику"
      />
      <div className="catalog-options">
        {filtered.length ? (
          filtered.map((item) => (
            <button type="button" key={item.id} onClick={() => onChoose(item)}>
              <strong>{item.name}</strong>
              {item.muscle_group && <small>{item.muscle_group}</small>}
              {item.calories_per_100g !== undefined && (
                <small>{formatNumber(item.calories_per_100g)} ккал / 100 г</small>
              )}
            </button>
          ))
        ) : (
          <p className="muted">Ничего не найдено.</p>
        )}
      </div>
    </dialog>
  );
}

function monthTitle(date) {
  return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
    .format(date)
    .replace(/^./, (first) => first.toUpperCase());
}

function monthShift(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function dayMonth(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'Дата не указана';
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() + 1 !== month || parsed.getDate() !== day)
    return 'Дата не указана';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(parsed);
}

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

function DailyGoals({ day, goals }) {
  const rows = [
    ['Белки', 'protein', 'г', 'icon-muscle.svg'],
    ['Жиры', 'fat', 'г', 'icon-drop.svg'],
    ['Углеводы', 'carbs', 'г', 'icon-wheat.svg'],
  ];
  const percent = goals.calories
    ? Math.min(100, Math.round((day.calories / goals.calories) * 100))
    : 0;
  return (
    <div className="panel daily-goals">
      <div className="daily-calories">
        <img src={`${A}icon-flame.svg`} alt="" />
        <span>
          Сегодня в рационе
          <strong>
            {formatNumber(day.calories)} / {goals.calories ? formatNumber(goals.calories) : '—'}{' '}
            ккал
          </strong>
        </span>
        <div className="bar-with-percent">
          <div className="progress-track">
            <span style={{ width: `${percent}%` }} />
          </div>
          <b>{goals.calories ? `${percent}%` : '—'}</b>
        </div>
      </div>
      <div className="daily-macros">
        {rows.map(([label, key, unit, icon]) => {
          const target = goals[key];
          const value = day[key];
          const progress = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
          return (
            <div key={key}>
              <span>
                <img src={`${A}${icon}`} alt="" />
                {label}
              </span>
              <strong>
                {formatNumber(value)} / {target ? formatNumber(target) : '—'} {unit}
              </strong>
              <div className="bar-with-percent">
                <div className="progress-track">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <small>{target ? `${progress}%` : '—'}</small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NutritionPage({ user }) {
  const [date, setDate] = useState(
    () => new URLSearchParams(window.location.search).get('date') || localDate(),
  );
  const [meals, setMeals] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState('');
  function reload() {
    setError('');
    setMeals(null);
    Promise.all([api(`/meals?date=${date}`), api(`/statistics?from=${date}&to=${date}`)])
      .then(([history, stats]) => {
        setMeals(history.meals);
        setStatistics(stats);
      })
      .catch((problem) => setError(problem.message));
  }
  useEffect(reload, [date]);
  const shift = (offset) => {
    const value = new Date(`${date}T12:00:00`);
    value.setDate(value.getDate() + offset);
    setDate(localDate(value));
  };
  return (
    <Shell
      title="Дневник питания"
      action={
        <div className="nutrition-toolbar">
          <div className="date-control">
            <img src={`${A}icon-calendar.svg`} alt="" />
            <button aria-label="Предыдущий день" onClick={() => shift(-1)}>
              ‹
            </button>
            <input
              type="date"
              aria-label="Дата дневника"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <button aria-label="Следующий день" onClick={() => shift(1)}>
              ›
            </button>
          </div>
          <a className="button button--primary" href={`/nutrition/new?date=${date}`}>
            ＋ Добавить продукт
          </a>
        </div>
      }
    >
      {error ? (
        <Notice message={error} retry={reload} />
      ) : !meals || !statistics ? (
        <p className="muted">Загружаем дневник…</p>
      ) : (
        <>
          <DailyGoals day={statistics.days[0]} goals={statistics.goals} />
          {Object.entries(mealTypes).map(([type, label]) => {
            const rows = meals.filter((meal) => meal.meal_type === type);
            const items = rows.flatMap((meal) => meal.items);
            const grams = items.reduce((sum, item) => sum + Number(item.quantity_g), 0);
            return (
              <div className="meal-group" key={type}>
                <div className="meal-group-head">
                  <img
                    src={`${A}${type === 'breakfast' || type === 'lunch' ? 'icon-sun.svg' : 'nav-food.svg'}`}
                    alt=""
                  />
                  <div>
                    <strong>{label}</strong>
                    <small>
                      {items.length
                        ? `${items.length} ${items.length === 1 ? 'продукт' : 'продукта'} · ${formatNumber(grams)} г`
                        : 'Нет добавленных продуктов'}
                    </small>
                  </div>
                </div>
                <div className="meal-group-body">
                  {rows.length ? (
                    rows.map((meal) => (
                      <a href={`/nutrition/${meal.id}`} className="meal-row" key={meal.id}>
                        <img src={`${A}food-photo.png`} alt="" />
                        <span>
                          {meal.items.map((item) => item.product_name_snapshot).join(', ') ||
                            'Без продуктов'}
                          <small>
                            {meal.items
                              .map(
                                (item) =>
                                  `${item.product_name_snapshot} ${formatNumber(item.quantity_g)} г`,
                              )
                              .join(' · ')}
                          </small>
                        </span>
                        <strong>{formatNumber(meal.totals.calories)} ккал</strong>
                        <b>···</b>
                      </a>
                    ))
                  ) : (
                    <div className="meal-empty">
                      <a
                        className="button button--outline"
                        href={`/nutrition/new?date=${date}&type=${type}`}
                      >
                        ＋ Добавить продукт
                      </a>
                      <span>Найдите продукт и укажите граммы</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <a className="history-link" href="/nutrition/history">
            <img src={`${A}icon-calendar.svg`} alt="" />
            <span>
              <strong>История питания</strong>
              <small>Прошлые дни доступны по дате</small>
            </span>
            <b aria-hidden="true">→</b>
          </a>
        </>
      )}
    </Shell>
  );
}

const blankItem = () => ({ key: crypto.randomUUID(), product_id: '', quantity_g: '100' });

export function MealEditor({ id, user }) {
  const query = new URLSearchParams(window.location.search);
  const draftKey = `vinland-meal-${user.id}-${id || 'new'}`;
  const [form, setForm] = useState({
    meal_date: query.get('date') || localDate(),
    meal_type: query.get('type') || 'breakfast',
    items: [blankItem()],
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  useEffect(() => {
    setLoading(true);
    setLoadError('');
    Promise.all([api('/products'), id ? api(`/meals/${id}`) : Promise.resolve(null)])
      .then(([catalog, existing]) => {
        setProducts(catalog.products);
        const meal = existing?.meal;
        const base = meal
          ? {
              meal_date: meal.meal_date,
              meal_type: meal.meal_type,
              items: meal.items.map((item) => ({
                key: crypto.randomUUID(),
                id: item.id,
                product_id: item.product_id,
                product_name_snapshot: item.product_name_snapshot,
                quantity_g: String(item.quantity_g),
                calories_snapshot: item.calories_snapshot,
                protein_snapshot: item.protein_snapshot,
                fat_snapshot: item.fat_snapshot,
                carbs_snapshot: item.carbs_snapshot,
              })),
            }
          : {
              meal_date: query.get('date') || localDate(),
              meal_type: query.get('type') || 'breakfast',
              items: [blankItem()],
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
  function editItem(index, patch) {
    change({
      ...form,
      items: form.items.map((item, itemIndex) =>
        index === itemIndex ? { ...item, ...patch } : item,
      ),
    });
  }
  const preview = useMemo(
    () =>
      form.items.reduce(
        (total, item) => {
          const product = item.id
            ? {
                calories_per_100g: item.calories_snapshot,
                protein_per_100g: item.protein_snapshot,
                fat_per_100g: item.fat_snapshot,
                carbs_per_100g: item.carbs_snapshot,
              }
            : products.find((entry) => String(entry.id) === String(item.product_id));
          if (!product) return total;
          for (const key of ['calories', 'protein', 'fat', 'carbs'])
            total[key] +=
              (Number(product[`${key}_per_100g`] || 0) * Number(item.quantity_g || 0)) / 100;
          return total;
        },
        { calories: 0, protein: 0, fat: 0, carbs: 0 },
      ),
    [form.items, products],
  );
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    if (form.items.some((item) => !item.id && !item.product_id)) {
      setFields({ product_id: 'Выберите продукт для каждой позиции.' });
      setBusy(false);
      return;
    }
    try {
      const body = {
        meal_date: form.meal_date,
        meal_type: form.meal_type,
        items: form.items.map((item) =>
          item.id
            ? { id: Number(item.id), quantity_g: item.quantity_g }
            : { product_id: Number(item.product_id), quantity_g: item.quantity_g },
        ),
      };
      await api(id ? `/meals/${id}` : '/meals', { method: id ? 'PUT' : 'POST', body });
      sessionStorage.removeItem(draftKey);
      navigate(`/nutrition?date=${form.meal_date}`);
    } catch (problem) {
      setError(Object.values(problem.fields || {}).join(' ') || problem.message);
      setFields(problem.fields || {});
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!window.confirm('Удалить приём пищи? Это действие нельзя отменить.')) return;
    setBusy(true);
    try {
      await api(`/meals/${id}`, { method: 'DELETE' });
      sessionStorage.removeItem(draftKey);
      navigate('/nutrition');
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
    }
  }
  return (
    <Shell
      title={id ? 'Приём пищи' : 'Добавить питание'}
      subtitle="Выберите продукты и укажите граммовку"
      action={
        <a className="button button--outline" href="/nutrition">
          ← К дневнику
        </a>
      }
    >
      {loading ? (
        <p className="muted">Загружаем продукты…</p>
      ) : loadError ? (
        <Notice message={loadError} retry={() => setLoadAttempt((value) => value + 1)} />
      ) : (
        <form className="editor-form" onSubmit={save} noValidate>
          <div className="panel form-intro two-fields">
            <label>
              Дата
              <input
                type="date"
                value={form.meal_date}
                onChange={(event) => change({ ...form, meal_date: event.target.value })}
                required
              />
            </label>
            <label>
              Приём пищи
              <select
                value={form.meal_type}
                onChange={(event) => change({ ...form, meal_type: event.target.value })}
              >
                {Object.entries(mealTypes).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="section-subtitle">
            <h2>Продукты</h2>
            <button
              type="button"
              className="button button--outline"
              onClick={() => change({ ...form, items: [...form.items, blankItem()] })}
            >
              ＋ Добавить продукт
            </button>
          </div>
          {fields.product_id && <p className="field-error">{fields.product_id}</p>}
          {!products.length && (
            <p className="muted">
              В справочнике нет активных продуктов. Попросите администратора добавить их.
            </p>
          )}
          {form.items.map((item, index) => (
            <div className="panel meal-item-editor" key={item.key}>
              <span>{index + 1}</span>
              <label>
                Продукт
                {item.id ? (
                  <input
                    value={item.product_name_snapshot}
                    readOnly
                    title="Название и КБЖУ сохраняются снимком"
                  />
                ) : (
                  <select
                    value={item.product_id}
                    onChange={(event) => editItem(index, { product_id: event.target.value })}
                  >
                    <option value="">Выберите продукт</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label>
                Количество, г
                <input
                  type="number"
                  min="0.01"
                  max="999999"
                  step="0.01"
                  value={item.quantity_g}
                  onChange={(event) => editItem(index, { quantity_g: event.target.value })}
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  change({
                    ...form,
                    items: form.items.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
                aria-label={`Удалить продукт ${index + 1}`}
              >
                ×
              </button>
            </div>
          ))}
          <div className="panel meal-preview">
            <strong>Итого</strong>
            <span>{formatNumber(preview.calories)} ккал</span>
            <span>
              Б {formatNumber(preview.protein)} · Ж {formatNumber(preview.fat)} · У{' '}
              {formatNumber(preview.carbs)} г
            </span>
          </div>
          {error && <Notice message={error} />}
          <div className="form-actions">
            <button className="button button--primary" type="submit" disabled={busy}>
              {busy ? 'Сохраняем…' : 'Сохранить приём пищи'}
            </button>
            {id && (
              <button
                className="button button--danger"
                type="button"
                onClick={remove}
                disabled={busy}
              >
                Удалить приём пищи
              </button>
            )}
          </div>
        </form>
      )}
    </Shell>
  );
}

export function NutritionHistory() {
  const [meals, setMeals] = useState(null);
  const [error, setError] = useState('');
  function reload() {
    api('/meals')
      .then((data) => setMeals(data.meals))
      .catch((problem) => setError(problem.message));
  }
  useEffect(reload, []);
  return (
    <Shell
      title="История питания"
      subtitle="Все сохранённые приёмы пищи"
      action={
        <a className="button button--outline" href="/nutrition">
          ← К дневнику
        </a>
      }
    >
      {error ? (
        <Notice message={error} retry={reload} />
      ) : !meals ? (
        <p className="muted">Загружаем историю…</p>
      ) : meals.length ? (
        <div className="history-list">
          {meals.map((meal) => (
            <a href={`/nutrition/${meal.id}`} key={meal.id}>
              <span>{dateLabel(meal.meal_date)}</span>
              <strong>{mealTypes[meal.meal_type]}</strong>
              <span>{meal.items.length} продуктов</span>
              <b>{formatNumber(meal.totals.calories)} ккал →</b>
            </a>
          ))}
        </div>
      ) : (
        <Empty
          title="История пока пустая"
          detail="Первый приём пищи появится здесь после сохранения."
          action="Добавить питание"
          to="/nutrition/new"
        />
      )}
    </Shell>
  );
}

function offsetDate(date, offset) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + offset);
  return localDate(next);
}

export function StatisticsPage() {
  const [to, setTo] = useState(localDate());
  const [from, setFrom] = useState(offsetDate(localDate(), -6));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  function reload() {
    setError('');
    setData(null);
    api(`/statistics?from=${from}&to=${to}`)
      .then(setData)
      .catch((problem) => setError(problem.fields?.period || problem.message));
  }
  useEffect(reload, [from, to]);
  const maxCalories = data
    ? Math.max(data.goals.calories || 0, ...data.days.map((day) => Number(day.calories)), 1)
    : 1;
  return (
    <Shell
      title="Статистика"
      subtitle="Профиль  /  Статистика"
      action={
        <div className="date-control">
          <input
            type="date"
            aria-label="Начало периода"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <span>—</span>
          <input
            type="date"
            aria-label="Конец периода"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      }
    >
      {error ? (
        <Notice message={error} retry={reload} />
      ) : !data ? (
        <p className="muted">Загружаем статистику…</p>
      ) : (
        <>
          <section className="panel statistics-panel">
            <div className="chart-side">
              <h2>
                <img src={`${A}nav-food.svg`} alt="" />
                Калории и КБЖУ
              </h2>
              <div className="bar-chart">
                {data.days.map((day) => (
                  <div key={day.date} className="chart-column">
                    <span>{formatNumber(day.calories)}</span>
                    <div className="chart-bar-track">
                      <div
                        style={{
                          height: `${Math.max(1, (Number(day.calories) / maxCalories) * 100)}%`,
                        }}
                      />
                    </div>
                    <small>{dateLabel(day.date, { day: 'numeric', month: 'short' })}</small>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                <span>● Фактические калории</span>
                <span>
                  — Цель ({data.goals.calories ? formatNumber(data.goals.calories) : 'не задана'}{' '}
                  ккал)
                </span>
              </div>
            </div>
            <div className="chart-summary">
              <span>{dateLabel(data.to)}</span>
              <p>В рационе</p>
              <strong>
                {formatNumber(data.days.at(-1).calories)} /{' '}
                {data.goals.calories ? formatNumber(data.goals.calories) : '—'} ккал
              </strong>
              <DailyGoals day={data.days.at(-1)} goals={data.goals} />
            </div>
          </section>
          <section className="panel statistics-workouts">
            <div className="section-subtitle">
              <h2>
                <img src={`${A}nav-workouts.svg`} alt="" />
                Тренировки
              </h2>
              <a href="/workouts">Открыть историю тренировок →</a>
            </div>
            <div className="workout-days">
              {data.days.map((day) => (
                <div key={day.date}>
                  <strong>{dateLabel(day.date, { day: 'numeric', month: 'long' })}</strong>
                  <small>
                    {new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(
                      new Date(`${day.date}T12:00:00`),
                    )}
                  </small>
                  <b>{day.workouts ? '⌁' : '—'}</b>
                  <span>
                    {day.workouts
                      ? `${day.workouts} тренировок · ${day.sets} подходов`
                      : 'Нет тренировок'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </Shell>
  );
}

const emptyCatalog = (kind) =>
  kind === 'exercises'
    ? { name: '', muscle_group: '', description: '', is_active: true }
    : {
        name: '',
        calories_per_100g: '',
        protein_per_100g: '',
        fat_per_100g: '',
        carbs_per_100g: '',
        is_active: true,
      };

export function AdminCatalog({ kind, user }) {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCatalog(kind));
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const label = kind === 'exercises' ? 'упражнений' : 'продуктов';
  function reload() {
    setError('');
    api(`/admin/${kind}`)
      .then((data) => setRows(data[kind]))
      .catch((problem) => setError(problem.message));
  }
  useEffect(() => {
    if (user.role === 'admin') reload();
  }, [kind]);
  useEffect(() => {
    if (!editing) return;
    const close = (event) => {
      if (event.key === 'Escape') setEditing(null);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [editing]);
  function open(row) {
    setFields({});
    setError('');
    setForm(
      row
        ? {
            ...row,
            is_active: row.is_active === true || row.is_active === 't' || row.is_active === '1',
          }
        : emptyCatalog(kind),
    );
    setEditing(row ? row.id : 'new');
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      await api(editing === 'new' ? `/admin/${kind}` : `/admin/${kind}/${editing}`, {
        method: editing === 'new' ? 'POST' : 'PUT',
        body: form,
      });
      setEditing(null);
      reload();
    } catch (problem) {
      setError(problem.message);
      setFields(problem.fields || {});
    } finally {
      setBusy(false);
    }
  }
  if (user.role !== 'admin')
    return (
      <Shell title="Доступ закрыт">
        <Notice message="Справочники доступны только администратору." />
      </Shell>
    );
  const filtered = (rows || []).filter((row) =>
    row.name.toLocaleLowerCase('ru-RU').includes(search.trim().toLocaleLowerCase('ru-RU')),
  );
  return (
    <div className="admin-page">
      <div className="admin-banner">
        <div className="content">
          <h1>Справочник {label}</h1>
        </div>
      </div>
      <main className="content admin-content">
        <div className="admin-tabs">
          <a href="/admin/exercises" className={kind === 'exercises' ? 'selected' : ''}>
            Упражнения
          </a>
          <a href="/admin/products" className={kind === 'products' ? 'selected' : ''}>
            Продукты
          </a>
          <a href="/" className="admin-back">
            ← В пользовательское приложение
          </a>
        </div>
        <section className="panel admin-table-panel">
          <div className="admin-tools">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={kind === 'exercises' ? 'Поиск упражнения' : 'Поиск продуктов'}
              aria-label="Поиск по справочнику"
            />
            <button className="button button--primary" onClick={() => open(null)}>
              ＋ Добавить {kind === 'exercises' ? 'упражнение' : 'продукт'}
            </button>
          </div>
          {error && !editing && <Notice message={error} retry={reload} />}
          {!rows ? (
            <p className="muted">Загружаем справочник…</p>
          ) : filtered.length ? (
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Название</th>
                    {kind === 'exercises' ? (
                      <>
                        <th>Группа мышц</th>
                        <th>Описание</th>
                      </>
                    ) : (
                      <>
                        <th>Ккал</th>
                        <th>Б, г</th>
                        <th>Ж, г</th>
                        <th>Угл., г</th>
                      </>
                    )}
                    <th>Статус</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      {kind === 'exercises' ? (
                        <>
                          <td>{row.muscle_group || '—'}</td>
                          <td className="description-cell">{row.description || '—'}</td>
                        </>
                      ) : (
                        <>
                          <td>{formatNumber(row.calories_per_100g)}</td>
                          <td>{formatNumber(row.protein_per_100g)}</td>
                          <td>{formatNumber(row.fat_per_100g)}</td>
                          <td>{formatNumber(row.carbs_per_100g)}</td>
                        </>
                      )}
                      <td>
                        <span
                          className={`status-dot ${row.is_active === true || row.is_active === 't' ? 'active' : ''}`}
                        />
                        {row.is_active === true || row.is_active === 't' ? 'Активно' : 'Неактивно'}
                      </td>
                      <td>
                        <button className="text-button" onClick={() => open(row)}>
                          Редактировать
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={search ? 'Ничего не найдено' : 'Справочник пока пуст'}
              detail={
                search
                  ? 'Попробуйте другой запрос.'
                  : 'Добавьте первую запись, чтобы она появилась здесь.'
              }
            />
          )}
        </section>
      </main>
      {editing && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={editing === 'new' ? 'Новая запись справочника' : 'Редактирование записи'}
          >
            <div className="modal-head">
              <h2>{editing === 'new' ? 'Новая запись' : 'Редактировать запись'}</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Закрыть">
                ×
              </button>
            </div>
            <form onSubmit={save} noValidate>
              <label>
                Название
                <input
                  autoFocus
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  maxLength={150}
                />
              </label>
              {fields.name && <small className="field-error">{fields.name}</small>}
              {kind === 'exercises' ? (
                <>
                  <label>
                    Группа мышц
                    <input
                      value={form.muscle_group || ''}
                      onChange={(event) => setForm({ ...form, muscle_group: event.target.value })}
                      maxLength={100}
                    />
                  </label>
                  <label>
                    Описание
                    <textarea
                      value={form.description || ''}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                    />
                  </label>
                </>
              ) : (
                <div className="form-grid">
                  {[
                    ['calories_per_100g', 'Ккал'],
                    ['protein_per_100g', 'Белки, г'],
                    ['fat_per_100g', 'Жиры, г'],
                    ['carbs_per_100g', 'Углеводы, г'],
                  ].map(([key, title]) => (
                    <label key={key}>
                      {title}
                      <input
                        type="number"
                        min="0"
                        max="999999"
                        step="0.01"
                        value={form[key]}
                        onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                      />
                      {fields[key] && <small className="field-error">{fields[key]}</small>}
                    </label>
                  ))}
                </div>
              )}
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                />
                Активная запись
              </label>
              {error && <Notice message={error} />}
              <div className="form-actions">
                <button className="button button--primary" type="submit" disabled={busy}>
                  {busy ? 'Сохраняем…' : 'Сохранить'}
                </button>
                <button
                  className="button button--outline"
                  type="button"
                  onClick={() => setEditing(null)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
