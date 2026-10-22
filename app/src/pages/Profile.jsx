// Личный кабинет: имя и цели КБЖУ, итоги сегодняшнего дня и ссылки на разделы.
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { localDate } from '../lib/dates.js';
import { formatInt, pluralWord, setsSummary } from '../lib/format.js';
import { ASSETS, mealTypes } from '../lib/constants.js';
import { initials, Footer } from '../components/Layout.jsx';
import { Field, Notice } from '../components/ui.jsx';
import { DayTotals } from '../components/DayTotals.jsx';
import { EntryPhoto } from '../components/EntryIcon.jsx';
import { PageHero } from '../components/PageHero.jsx';
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

// Цели пользователя в том виде, который ждёт DayTotals.
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

// Карточка «Сегодня в зале»: упражнения из сегодняшних тренировок.
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
    <section className="profile-card">
      <h2 className="section-heading">Сегодня в зале</h2>
      {exercises.slice(0, 5).map((exercise, index) => (
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

// Карточка «Сегодня в рационе»: кольцо калорий, БЖУ и сегодняшние приёмы пищи.
function TodayMeals({ day, goals, meals }) {
  // Копируем массив, потому что sort меняет его на месте.
  const sorted = [...meals].sort(
    (first, second) => mealOrder.indexOf(first.meal_type) - mealOrder.indexOf(second.meal_type),
  );
  return (
    <section className="profile-card">
      <h2 className="section-heading">Сегодня в рационе</h2>
      <DayTotals day={day} goals={goals} />
      <div className="profile-card-list">
        {sorted.slice(0, 4).map((meal) => (
          <a className="profile-entry" href={`/nutrition/${meal.id}`} key={meal.id}>
            <EntryPhoto meal={meal.meal_type} />
            <span className="profile-entry-text">{mealTypes[meal.meal_type]}</span>
            <b>{formatInt(meal.totals.calories)} ккал</b>
          </a>
        ))}
        {sorted.length === 0 && (
          <p className="profile-empty">
            Сегодня приёмов пищи пока нет. <a href="/nutrition/new">Добавить питание →</a>
          </p>
        )}
      </div>
    </section>
  );
}

// Крупные цифры в баннере профиля.
function profileStats(user, today) {
  const total = today.allWorkouts;
  let goal = '—';
  if (user.target_calories) goal = formatInt(user.target_calories);
  return [
    {
      value: formatInt(total),
      label: `${pluralWord(total, 'тренировка', 'тренировки', 'тренировок')} всего`,
    },
    { value: formatInt(today.day.calories), label: 'ккал съедено сегодня' },
    { value: goal, label: 'ккал в день — цель' },
  ];
}

export function Profile({ user, onUpdate, onLogout, logoutBusy }) {
  // today: { day — итоги питания, workouts — тренировки за сегодня,
  // allWorkouts — сколько тренировок всего, meals — приёмы пищи за сегодня }.
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
          allWorkouts: workouts.workouts.length,
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

  // Подпись и кнопки над именем в баннере.
  const top = (
    <>
      <span className="page-hero-eyebrow">Личный кабинет</span>
      <div className="page-hero-actions">
        <button
          className="button button--outline"
          type="button"
          onClick={toggleSettings}
          aria-expanded={editing}
        >
          <img src={`${ASSETS}icon-settings.svg`} alt="" />
          {editing ? 'Закрыть настройки' : 'Настройки профиля'}
        </button>
        <button className="profile-logout" type="button" onClick={onLogout} disabled={logoutBusy}>
          {logoutBusy ? 'Выходим…' : 'Выйти'}
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="section-banner" />
      <main className="content section-content profile-page">
        <PageHero
          image={`${ASSETS}hero-profile.jpg`}
          top={top}
          media={<div className="profile-avatar">{initials(user.name)}</div>}
          title={user.name}
          subtitle={user.email}
          stats={today && profileStats(user, today)}
        />

        {editing && <ProfileForm user={user} onSaved={saved} onCancel={() => setEditing(false)} />}
        {notice && (
          <p className="form-notice profile-notice" role="status">
            {notice}
          </p>
        )}

        {error && <Notice message={`Не удалось загрузить показатели: ${error}`} retry={load} />}
        {!error && !today && <p className="muted">Загружаем показатели…</p>}
        {!error && today && (
          <div className="profile-cards">
            <TodayMeals day={today.day} goals={userGoals(user)} meals={today.meals} />
            <TodayWorkout workouts={today.workouts} />
          </div>
        )}

        <nav className="profile-links" aria-label="Разделы профиля">
          <a href="/statistics">
            <img src={`${ASSETS}icon-chart.svg`} alt="" />
            <span>
              <strong>Статистика</strong>
              <small>Динамика тренировок и питания</small>
            </span>
            <b aria-hidden="true">→</b>
          </a>
          <a href="/workouts">
            <img src={`${ASSETS}icon-calendar.svg`} alt="" />
            <span>
              <strong>Тренировки</strong>
              <small>Все выполненные тренировки</small>
            </span>
            <b aria-hidden="true">→</b>
          </a>
        </nav>
      </main>
      <Footer />
    </>
  );
}
