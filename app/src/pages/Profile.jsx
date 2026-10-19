import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { localDate } from '../lib/dates.js';
import { formatInt, goalsSummary, setsSummary } from '../lib/format.js';
import { A, mealTypes } from '../lib/constants.js';
import { initials, Footer } from '../components/Layout.jsx';
import { Field } from '../components/ui.jsx';
import { DaySummary } from '../components/DaySummary.jsx';
import { EntryIcon } from '../components/EntryIcon.jsx';
import './Profile.css';

const goalFields = [
  ['target_calories', 'Калории', 'ккал', '1', '100000', '1'],
  ['target_protein_g', 'Белки', 'г', '0', '10000', '0.01'],
  ['target_fat_g', 'Жиры', 'г', '0', '10000', '0.01'],
  ['target_carbs_g', 'Углеводы', 'г', '0', '10000', '0.01'],
];

function formValues(user) {
  const values = { name: user.name };
  for (const [key] of goalFields) values[key] = user[key] == null ? '' : String(Number(user[key]));
  return values;
}

function userGoals(user) {
  return {
    calories: user.target_calories,
    protein: user.target_protein_g,
    fat: user.target_fat_g,
    carbs: user.target_carbs_g,
  };
}

function ProfileForm({ user, onSaved, onCancel }) {
  const [values, setValues] = useState(() => formValues(user));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
  };

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
      for (const [key] of goalFields) payload[key] = values[key] === '' ? null : values[key];
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
        {goalFields.map(([key, label, suffix, min, max, step]) => (
          <Field
            key={key}
            label={label}
            name={key}
            value={values[key]}
            onChange={change}
            error={errors[key]}
            type="number"
            min={min}
            max={max}
            step={step}
            suffix={suffix}
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

function TodayWorkout({ workouts }) {
  const exercises = workouts.flatMap((workout) =>
    workout.exercises.map((exercise) => ({ ...exercise, workoutId: workout.id })),
  );
  return (
    <section className="panel profile-card">
      <h2>
        <img src={`${A}nav-workouts.svg`} alt="" />
        Тренировка сегодня
      </h2>
      {exercises.length ? (
        exercises.slice(0, 3).map((exercise, index) => (
          <a className="profile-entry" href={`/workouts/${exercise.workoutId}`} key={index}>
            <EntryIcon label={exercise.muscle_group} />
            <span className="profile-entry-text">
              {exercise.exercise_name}
              <small>{setsSummary(exercise.sets)}</small>
            </span>
          </a>
        ))
      ) : (
        <p className="profile-empty">
          Сегодня тренировки ещё не было. <a href="/workouts/new">Добавить тренировку →</a>
        </p>
      )}
    </section>
  );
}

const mealOrder = Object.keys(mealTypes);

function TodayMeals({ meals }) {
  const sorted = [...meals].sort(
    (a, b) => mealOrder.indexOf(a.meal_type) - mealOrder.indexOf(b.meal_type),
  );
  return (
    <section className="panel profile-card">
      <h2>
        <img src={`${A}nav-food.svg`} alt="" />
        Питание
      </h2>
      {sorted.length ? (
        sorted.slice(0, 4).map((meal) => {
          const calories = `${formatInt(meal.totals.calories)} ккал`;
          const products = meal.items.map((item) => item.product_name_snapshot).join(', ');
          return (
            <a className="profile-entry" href={`/nutrition/${meal.id}`} key={meal.id}>
              <EntryIcon meal={meal.meal_type} />
              <span className="profile-entry-text">
                {mealTypes[meal.meal_type]}
                <small className="wide-only">{products || 'Без продуктов'}</small>
                <small className="narrow-only">{calories}</small>
              </span>
              <b className="wide-only">{calories}</b>
            </a>
          );
        })
      ) : (
        <p className="profile-empty">
          Сегодня приёмов пищи пока нет. <a href="/nutrition/new">Добавить питание →</a>
        </p>
      )}
    </section>
  );
}

export function Profile({ user, onUpdate, onLogout, logoutBusy }) {
  const [today, setToday] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');

  function load() {
    const date = localDate();
    setError('');
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

  function openSettings() {
    setNotice('');
    setEditing(true);
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
          <button
            className="profile-settings"
            onClick={editing ? () => setEditing(false) : openSettings}
            aria-expanded={editing}
          >
            <img src={`${A}icon-settings.svg`} alt="" />
            {editing ? 'Закрыть настройки' : 'Настройки профиля'}
          </button>
        </section>

        {editing && <ProfileForm user={user} onSaved={saved} onCancel={() => setEditing(false)} />}
        {notice && (
          <p className="form-notice profile-notice" role="status">
            {notice}
          </p>
        )}

        {error ? (
          <div className="section-notice" role="alert">
            <p>Не удалось загрузить показатели: {error}</p>
            <button className="button button--outline" onClick={load}>
              Повторить
            </button>
          </div>
        ) : !today ? (
          <p className="muted">Загружаем показатели…</p>
        ) : (
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
            <img src={`${A}icon-chart.svg`} alt="" />
            <span>
              Статистика
              <small>Динамика тренировок и питания</small>
            </span>
          </a>
          <button type="button" onClick={openSettings}>
            <img src={`${A}icon-sliders.svg`} alt="" />
            <span>
              Цели КБЖУ
              <small>{goalsSummary(user)}</small>
            </span>
          </button>
          <a href="/workouts">
            <img src={`${A}icon-calendar.svg`} alt="" />
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
