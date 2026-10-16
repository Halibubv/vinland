import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { localDate } from '../lib/dates.js';
import { formatInt, goalsSummary, setsSummary } from '../lib/format.js';
import { EntryIcon } from '../components/EntryIcon.jsx';
import { A } from '../lib/constants.js';
import { initials, Footer } from '../components/Layout.jsx';
import { Field, Progress } from '../components/ui.jsx';

export function Profile({ user, onUpdate, onLogout, logoutBusy }) {
  const [values, setValues] = useState(() => ({
    name: user.name,
    target_calories: user.target_calories ?? '',
    target_protein_g: user.target_protein_g == null ? '' : String(Number(user.target_protein_g)),
    target_fat_g: user.target_fat_g == null ? '' : String(Number(user.target_fat_g)),
    target_carbs_g: user.target_carbs_g == null ? '' : String(Number(user.target_carbs_g)),
  }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState(null);
  const [todayWorkouts, setTodayWorkouts] = useState([]);
  const [todayMeals, setTodayMeals] = useState([]);
  const [statsError, setStatsError] = useState('');
  function loadStats() {
    setStatsError('');
    Promise.all([
      api(`/statistics?from=${localDate()}&to=${localDate()}`),
      api('/workouts'),
      api(`/meals?date=${localDate()}`),
    ])
      .then(([statistics, workouts, meals]) => {
        setStats(statistics);
        setTodayWorkouts(workouts.workouts.filter((item) => item.workout_date === localDate()));
        setTodayMeals(meals.meals);
      })
      .catch((error) => setStatsError(error.message));
  }
  useEffect(() => {
    loadStats();
  }, []);
  const change = (event) => {
    setValues((previous) => ({ ...previous, [event.target.name]: event.target.value }));
    setErrors((previous) => ({ ...previous, [event.target.name]: '' }));
  };
  async function save(event) {
    event.preventDefault();
    setNotice('');
    if (!values.name.trim()) {
      setErrors({ name: 'Введите имя.' });
      return;
    }
    setBusy(true);
    try {
      const payload = { name: values.name.trim() };
      for (const key of ['target_calories', 'target_protein_g', 'target_fat_g', 'target_carbs_g'])
        payload[key] = values[key] === '' ? null : values[key];
      const result = await api('/profile', { method: 'PUT', body: payload });
      onUpdate(result.user);
      setNotice('Профиль и цели сохранены.');
      setEditing(false);
    } catch (error) {
      setErrors(error.fields || {});
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }
  if (statsError)
    return (
      <main className="content profile-content">
        <h1>Личный кабинет</h1>
        <p className="form-message" role="alert">
          Не удалось загрузить показатели: {statsError}
        </p>
        <button className="button button--outline" onClick={loadStats}>
          Повторить загрузку
        </button>
      </main>
    );
  if (!stats)
    return (
      <main className="content profile-content">
        <h1>Личный кабинет</h1>
        <p className="muted">Загружаем показатели…</p>
      </main>
    );
  const day = stats.days[0];
  const mealNames = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' };
  const caloriesPercent = user.target_calories
    ? Math.min(100, Math.round((day.calories / user.target_calories) * 100))
    : 0;
  return (
    <>
      <div className="profile-banner" role="img" aria-label="Северный горный пейзаж" />
      <main className="content profile-content">
        <h1 className="profile-mobile-title">Личный кабинет</h1>
        <section className="profile-identity">
          <div className="avatar avatar--large">{initials(user.name)}</div>
          <div>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
          </div>
          <button className="text-button profile-settings" onClick={() => setEditing(!editing)}>
            {editing ? 'Закрыть настройки' : '⚙ Настройки профиля'}
          </button>
        </section>
        {editing && (
          <form className="panel profile-form" onSubmit={save} noValidate>
            <div className="section-heading">
              <h2>Профиль и цели КБЖУ</h2>
              <span>Пустое поле — цель не задана</span>
            </div>
            <div className="form-grid">
              <Field
                label="Имя"
                name="name"
                value={values.name}
                onChange={change}
                error={errors.name}
                autoComplete="name"
              />
              <Field
                label="Калории"
                name="target_calories"
                value={values.target_calories}
                onChange={change}
                error={errors.target_calories}
                type="number"
                min="1"
                max="100000"
                step="1"
                suffix="ккал"
              />
              <Field
                label="Белки"
                name="target_protein_g"
                value={values.target_protein_g}
                onChange={change}
                error={errors.target_protein_g}
                type="number"
                min="0"
                max="10000"
                step="0.01"
                suffix="г"
              />
              <Field
                label="Жиры"
                name="target_fat_g"
                value={values.target_fat_g}
                onChange={change}
                error={errors.target_fat_g}
                type="number"
                min="0"
                max="10000"
                step="0.01"
                suffix="г"
              />
              <Field
                label="Углеводы"
                name="target_carbs_g"
                value={values.target_carbs_g}
                onChange={change}
                error={errors.target_carbs_g}
                type="number"
                min="0"
                max="10000"
                step="0.01"
                suffix="г"
              />
            </div>
            {notice && (
              <p className="form-notice" role="status">
                {notice}
              </p>
            )}
            <button className="button button--primary" type="submit" disabled={busy}>
              {busy ? 'Сохраняем…' : 'Сохранить изменения'}
            </button>
          </form>
        )}
        {!editing && notice && (
          <p className="form-notice" role="status">
            {notice}
          </p>
        )}
        <section className="panel nutrition-progress">
          <div className="calorie-summary">
            <img src={`${A}icon-flame.svg`} alt="" />
            <span>
              Сегодня в рационе
              <strong>
                {formatInt(day.calories)} /{' '}
                {user.target_calories ? formatInt(user.target_calories) : '—'} ккал
              </strong>
            </span>
          </div>
          <div className="calorie-progress">
            <div className="progress-track">
              <span style={{ width: `${caloriesPercent}%` }} />
            </div>
            <span>{user.target_calories ? `${caloriesPercent}%` : 'Цель не задана'}</span>
          </div>
          <div className="macro-grid profile-macros">
            <Progress label="Белки" value={day.protein} target={user.target_protein_g} />
            <Progress label="Жиры" value={day.fat} target={user.target_fat_g} />
            <Progress label="Углеводы" value={day.carbs} target={user.target_carbs_g} />
          </div>
        </section>
        <div className="profile-cards">
          <section className="panel">
            <h3>
              <img src={`${A}nav-workouts.svg`} alt="" />
              Тренировка сегодня
            </h3>
            {todayWorkouts.length ? (
              todayWorkouts
                .flatMap((workout) => workout.exercises)
                .slice(0, 2)
                .map((exercise, index) => (
                  <div className="profile-entry" key={`${exercise.id}-${index}`}>
                    <EntryIcon label={exercise.muscle_group} />
                    <span>
                      {exercise.exercise_name}
                      <small>{setsSummary(exercise.sets)}</small>
                    </span>
                  </div>
                ))
            ) : (
              <div className="profile-empty">
                Пока нет записи за сегодня. <a href="/workouts/new">Добавить тренировку →</a>
              </div>
            )}
          </section>
          <section className="panel">
            <h3>
              <img src={`${A}nav-food.svg`} alt="" />
              Питание
            </h3>
            {todayMeals.length ? (
              todayMeals.slice(0, 3).map((meal) => (
                <div className="profile-entry" key={meal.id}>
                  <EntryIcon meal={meal.meal_type} />
                  <span>
                    {mealNames[meal.meal_type]}
                    <small>
                      {meal.items.map((item) => item.product_name_snapshot).join(', ') ||
                        'Без продуктов'}
                    </small>
                  </span>
                  <b>{formatInt(meal.totals.calories)} ккал</b>
                </div>
              ))
            ) : (
              <div className="profile-empty">
                Сегодня приёмов пищи пока нет. <a href="/nutrition/new">Добавить питание →</a>
              </div>
            )}
          </section>
        </div>
        <div className="profile-links">
          <a href="/statistics">
            <img src={`${A}icon-chart.svg`} alt="" />
            <span>
              Статистика<small>Динамика тренировок и питания</small>
            </span>
          </a>
          <button onClick={() => setEditing(true)}>
            <img src={`${A}icon-sliders.svg`} alt="" />
            <span>
              Цели КБЖУ
              <small>{goalsSummary(user)}</small>
            </span>
          </button>
          <a href="/workouts">
            <img src={`${A}nav-workouts.svg`} alt="" />
            <span>
              Сохранённые тренировки<small>Все выполненные тренировки</small>
            </span>
          </a>
        </div>
        <button className="text-button mobile-logout" onClick={onLogout} disabled={logoutBusy}>
          Выйти из аккаунта
        </button>
      </main>
      <Footer />
    </>
  );
}
