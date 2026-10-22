// Личный кабинет: имя и цели КБЖУ, итоги сегодняшнего дня и ссылки на разделы.
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { localDate } from '../lib/dates.js';
import { formatInt, setsSummary } from '../lib/format.js';
import { ASSETS, mealTypes } from '../lib/constants.js';
import { initials, Footer } from '../components/Layout.jsx';
import { Field, Notice } from '../components/ui.jsx';
import { DaySummary } from '../components/DaySummary.jsx';
import { EntryPhoto } from '../components/EntryIcon.jsx';
import './Profile.css';

// Поля целей КБЖУ в форме профиля; min, max и step — ограничения поля ввода.
const goalFields = [
  { key: 'target_calories', label: 'Калории', suffix: 'ккал', min: '1', max: '100000', step: '1' },
  { key: 'target_protein_g', label: 'Белки', suffix: 'г', min: '0', max: '10000', step: '0.01' },
  { key: 'target_fat_g', label: 'Жиры', suffix: 'г', min: '0', max: '10000', step: '0.01' },
  { key: 'target_carbs_g', label: 'Углеводы', suffix: 'г', min: '0', max: '10000', step: '0.01' },
];

// Значения для полей формы. Незаданная цель (null) — пустое поле.
function formValues(user) {
  const values = { name: user.name };
  for (const field of goalFields) {
    const goal = user[field.key];
    if (goal === null || goal === undefined) values[field.key] = '';
    else values[field.key] = String(Number(goal));
  }
  return values;
}

// Цели пользователя в том виде, который ждёт DaySummary.
function userGoals(user) {
  return {
    calories: user.target_calories,
    protein: user.target_protein_g,
    fat: user.target_fat_g,
    carbs: user.target_carbs_g,
  };
}

// Форма «Профиль и цели КБЖУ», открывается кнопкой «Настройки профиля».
function ProfileForm({ user, onSaved, onCancel }) {
  const [values, setValues] = useState(() => formValues(user));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Одна функция для всех полей: какое поле менять, берём из атрибута name.
  function change(event) {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
  }

  async function save(event) {
    event.preventDefault();
    setMessage('');
    if (!values.name.trim()) {
      setErrors({ name: 'Введите имя.' });
      return;
    }
    setBusy(true);
    try {
      const payload = { name: values.name.trim() };
      // Пустое поле отправляем как null — цель не задана.
      for (const field of goalFields) {
        const value = values[field.key];
        payload[field.key] = value === '' ? null : value;
      }
      const result = await api('/profile', { method: 'PUT', body: payload });
      onSaved(result.user);
    } catch (error) {
      setErrors(error.fields || {});
      setMessage(error.message);
      setBusy(false);
    }
  }

  return (
    <form className="panel profile-form" onSubmit={save} noValidate>
      <div className="profile-form-head">
        <h2>Профиль и цели КБЖУ</h2>
        <p>Пустое поле — цель не задана. Инициалы формируются из имени.</p>
      </div>
      <div className="profile-form-grid">
        <Field
          label="Имя"
          name="name"
          value={values.name}
          onChange={change}
          error={errors.name}
          autoComplete="name"
        />
        {goalFields.map((field) => (
          <Field
            key={field.key}
            label={field.label}
            name={field.key}
            value={values[field.key]}
            onChange={change}
            error={errors[field.key]}
            type="number"
            min={field.min}
            max={field.max}
            step={field.step}
            suffix={field.suffix}
          />
        ))}
      </div>
      {message && (
        <p className="form-message" role="alert">
          {message}
        </p>
      )}
      <div className="profile-form-actions">
        <button className="button button--primary" type="submit" disabled={busy}>
          {busy ? 'Сохраняем…' : 'Сохранить изменения'}
        </button>
        <button className="button button--outline" type="button" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  );
}

// Карточка «Тренировка сегодня»: первые три упражнения из сегодняшних тренировок.
function TodayWorkout({ workouts }) {
  // Собираем упражнения всех тренировок за сегодня в один список,
  // запоминая, к какой тренировке ведёт ссылка.
  const exercises = [];
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      exercises.push({ ...exercise, workoutId: workout.id });
    }
  }
  return (
    <section className="panel profile-card">
      <h2>
        <img src={`${ASSETS}nav-workouts.svg`} alt="" />
        Тренировка сегодня
      </h2>
      {exercises.length > 0 &&
        exercises.slice(0, 3).map((exercise, index) => (
          <a className="profile-entry" href={`/workouts/${exercise.workoutId}`} key={index}>
            <EntryPhoto muscleGroup={exercise.muscle_group} />
            <span className="profile-entry-text">
              {exercise.exercise_name}
              <small>{setsSummary(exercise.sets)}</small>
            </span>
          </a>
        ))}
      {exercises.length === 0 && (
        <p className="profile-empty">
          Сегодня тренировки ещё не было. <a href="/workouts/new">Добавить тренировку →</a>
        </p>
      )}
    </section>
  );
}

// Порядок приёмов пищи за день: завтрак, обед, перекус, ужин.
const mealOrder = Object.keys(mealTypes);

// Карточка «Питание»: до четырёх сегодняшних приёмов пищи по порядку.
function TodayMeals({ meals }) {
  // Копируем массив, потому что sort меняет его на месте.
  const sorted = [...meals].sort(
    (first, second) => mealOrder.indexOf(first.meal_type) - mealOrder.indexOf(second.meal_type),
  );
  return (
    <section className="panel profile-card">
      <h2>
        <img src={`${ASSETS}nav-food.svg`} alt="" />
        Питание
      </h2>
      {sorted.length > 0 &&
        sorted.slice(0, 4).map((meal) => {
          const calories = `${formatInt(meal.totals.calories)} ккал`;
          const products = meal.items.map((item) => item.product_name_snapshot).join(', ');
          return (
            <a className="profile-entry" href={`/nutrition/${meal.id}`} key={meal.id}>
              <EntryPhoto meal={meal.meal_type} />
              <span className="profile-entry-text">
                {mealTypes[meal.meal_type]}
                <small className="wide-only">{products || 'Без продуктов'}</small>
                <small className="narrow-only">{calories}</small>
              </span>
              <b className="wide-only">{calories}</b>
            </a>
          );
        })}
      {sorted.length === 0 && (
        <p className="profile-empty">
          Сегодня приёмов пищи пока нет. <a href="/nutrition/new">Добавить питание →</a>
        </p>
      )}
    </section>
  );
}

export function Profile({ user, onUpdate, onLogout, logoutBusy }) {
  // today: { day — итоги питания, workouts — тренировки, meals — приёмы пищи } за сегодня.
  const [today, setToday] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');

  function load() {
    const date = localDate();
    setError('');
    // Отдельного запроса «тренировки за день» нет, поэтому берём все и фильтруем по дате.
    Promise.all([
      api(`/statistics?from=${date}&to=${date}`),
      api('/workouts'),
      api(`/meals?date=${date}`),
    ])
      .then(([statistics, workouts, meals]) =>
        setToday({
          day: statistics.days[0],
          workouts: workouts.workouts.filter((workout) => workout.workout_date === date),
          meals: meals.meals,
        }),
      )
      .catch((loadError) => setError(loadError.message));
  }
  useEffect(load, []);

  function toggleSettings() {
    setNotice('');
    setEditing(!editing);
  }

  function saved(nextUser) {
    onUpdate(nextUser);
    setEditing(false);
    setNotice('Профиль и цели сохранены.');
  }

  return (
    <>
      <div className="profile-banner" role="img" aria-label="Северный горный пейзаж" />
      <main className="content profile-page">
        <h1 className="profile-title">Личный кабинет</h1>
        <section className="profile-identity">
          <div className="avatar profile-avatar">{initials(user.name)}</div>
          <div className="profile-name">
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
          <button className="profile-settings" onClick={toggleSettings} aria-expanded={editing}>
            <img src={`${ASSETS}icon-settings.svg`} alt="" />
            {editing ? 'Закрыть настройки' : 'Настройки профиля'}
          </button>
        </section>

        {editing && <ProfileForm user={user} onSaved={saved} onCancel={() => setEditing(false)} />}
        {notice && (
          <p className="form-notice profile-notice" role="status">
            {notice}
          </p>
        )}

        {error && <Notice message={`Не удалось загрузить показатели: ${error}`} retry={load} />}
        {!error && !today && <p className="muted">Загружаем показатели…</p>}
        {!error && today && (
          <>
            <DaySummary title="Сегодня в рационе" day={today.day} goals={userGoals(user)} />
            <div className="profile-cards">
              <TodayWorkout workouts={today.workouts} />
              <TodayMeals meals={today.meals} />
            </div>
          </>
        )}

        <nav className="profile-links" aria-label="Разделы профиля">
          <a href="/statistics">
            <img src={`${ASSETS}icon-chart.svg`} alt="" />
            <span>
              Статистика
              <small>Динамика тренировок и питания</small>
            </span>
          </a>
          <a href="/workouts">
            <img src={`${ASSETS}icon-calendar.svg`} alt="" />
            <span>
              Сохранённые тренировки
              <small>Все выполненные тренировки</small>
            </span>
          </a>
        </nav>

        <button
          className="button button--outline profile-logout narrow-only"
          onClick={onLogout}
          disabled={logoutBusy}
        >
          {logoutBusy ? 'Выходим…' : 'Выйти из аккаунта'}
        </button>
      </main>
      <Footer />
    </>
  );
}
