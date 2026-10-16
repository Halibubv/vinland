import React, { useEffect, useState } from 'react';
import { api, dateLabel, formatNumber, localDate, session } from './api';
import {
  AdminCatalog,
  MealEditor,
  NutritionHistory,
  NutritionPage,
  StatisticsPage,
  WorkoutEditor,
  WorkoutsPage,
} from './Sections.jsx';

const A = '/assets/';
const navigation = [
  ['/', 'Главная', 'nav-home.svg'],
  ['/workouts', 'Тренировки', 'nav-workouts.svg'],
  ['/nutrition', 'Питание', 'nav-food.svg'],
  ['/profile', 'Профиль', 'nav-profile.svg'],
];

function pathNow() {
  return window.location.pathname === '/ui/' ? '/' : window.location.pathname;
}
function go(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function Brand() {
  return (
    <a className="brand" href="#/" aria-label="ВИНЛАНД — главная">
      <img src={`${A}logo-v.svg`} alt="" />
      <span>ВИНЛАНД</span>
    </a>
  );
}

function LinkButton({ to, children, variant = 'primary', className = '' }) {
  return (
    <a className={`button button--${variant} ${className}`} href={`#${to}`}>
      {children}
    </a>
  );
}

function AppHeader({ user, onLogout, busy }) {
  const path = pathNow();
  return (
    <>
      <header className="app-header">
        <Brand />
        <nav className="desktop-nav" aria-label="Основная навигация">
          {navigation.map(([to, label, icon]) => {
            const active = to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`);
            return (
              <a
                key={to}
                href={`#${to}`}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
              >
                <img src={`${A}${icon}`} alt="" />
                {label}
              </a>
            );
          })}
        </nav>
        <div className="header-account">
          {user.role === 'admin' && (
            <a className="admin-entry" href="#/admin/exercises">
              Администрирование
            </a>
          )}
          <a href="#/profile" className="avatar" aria-label="Открыть профиль">
            {initials(user.name)}
          </a>
          <span>{user.name.split(' ')[0]}</span>
          <button className="text-button logout" onClick={onLogout} disabled={busy}>
            Выйти
          </button>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Основная навигация">
        {navigation.map(([to, label, icon]) => {
          const active = to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`);
          return (
            <a
              key={to}
              href={`#${to}`}
              className={active ? 'active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              <img src={`${A}${icon}`} alt="" />
              <span>{label}</span>
            </a>
          );
        })}
      </nav>
    </>
  );
}

function initials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('') || 'V'
  );
}

function Footer({ guest = false }) {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        {guest && <Brand />}
        <span>ВИНЛАНД · Тренировки и питание</span>
      </div>
      <nav aria-label="Нижняя навигация">
        <a href="#/">Главная</a>
        {guest ? (
          <>
            <a href="#/login">Войти</a>
            <a href="#/register">Создать аккаунт</a>
          </>
        ) : (
          navigation.slice(1).map(([to, label]) => (
            <a key={to} href={`#${to}`}>
              {label}
            </a>
          ))
        )}
      </nav>
    </footer>
  );
}

function GuestMobileNav() {
  return (
    <nav className="mobile-nav guest-mobile-nav" aria-label="Основная навигация">
      {navigation.map(([to, label, icon]) => (
        <a
          key={to}
          href={`#${to === '/' ? '/' : '/login'}`}
          aria-label={to === '/' ? label : `${label} — войти`}
        >
          <img src={`${A}${icon}`} alt="" />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}

function Landing() {
  useEffect(() => {
    const targets = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="hero-photo" aria-hidden="true" />
        <div className="hero-shade" />
        <div className="hero-fog" aria-hidden="true" />
        <header className="guest-header">
          <Brand />
          <div>
            <LinkButton to="/login" variant="outline">
              Войти
            </LinkButton>
            <LinkButton to="/register">Создать аккаунт</LinkButton>
          </div>
        </header>
        <div className="landing-hero-copy">
          <h1>
            <img src={`${A}wordmark.svg`} alt="ВИНЛАНД" />
          </h1>
          <p>
            Учёт силовых тренировок и дневник
            <br />
            питания с КБЖУ.
          </p>
          <div className="button-row">
            <LinkButton to="/register">Создать аккаунт</LinkButton>
            <LinkButton to="/login" variant="outline">
              Войти
            </LinkButton>
          </div>
        </div>
      </section>
      <section className="feature-strip" aria-label="Возможности">
        <div>
          <span className="feature-icon">
            <img src={`${A}feature-dumbbell.svg`} alt="" />
          </span>
          <strong>Тренировки</strong>
          <span>
            Удобный учёт упражнений
            <br />и прогресса в силовых зале.
          </span>
        </div>
        <div>
          <span className="feature-icon">
            <img src={`${A}icon-food.svg`} alt="" />
          </span>
          <strong>Питание и КБЖУ</strong>
          <span>
            Дневник питания с расчётом
            <br />
            калорий, белков, жиров и углеводов.
          </span>
        </div>
        <div>
          <span className="feature-icon">
            <img src={`${A}nav-profile.svg`} alt="" />
          </span>
          <strong>Личный кабинет</strong>
          <span>
            Вся информация о тренировках
            <br />и питании всегда под рукой.
          </span>
        </div>
      </section>
      <section className="landing-showcase reveal">
        <div className="showcase-copy">
          <span className="eyebrow">БОЛЬШЕ, ЧЕМ ДНЕВНИК</span>
          <h2>
            Порядок в тренировках.
            <br />
            Осознанность в питании.
          </h2>
          <p>
            ВИНЛАНД помогает сохранять баланс
            <br />и двигаться к своим целям — шаг за шагом.
          </p>
          <div className="button-row">
            <LinkButton to="/register">Создать аккаунт</LinkButton>
            <LinkButton to="/login" variant="outline">
              Войти
            </LinkButton>
          </div>
        </div>
        <img
          className="mobile-device"
          src={`${A}mobile-device.png`}
          alt="ВИНЛАНД на устройстве на фоне фьорда"
        />
      </section>
      <section className="landing-product reveal">
        <img src={`${A}phone-product.png`} alt="Приложение ВИНЛАНД на двух телефонах" />
        <div>
          <span className="eyebrow">ВОЗМОЖНОСТИ</span>
          <h2>
            Всё, что нужно
            <br />
            для твоих целей
          </h2>
          <ul>
            <li>
              <span className="product-icon">
                <img src={`${A}feature-dumbbell.svg`} alt="" />
              </span>
              <div>
                <strong>Запись тренировок</strong>
                <span>
                  Фиксируй упражнения, количество подходов, повторений и рабочий вес. Добавляй
                  заметки к каждой тренировке.
                </span>
              </div>
            </li>
            <li>
              <span className="product-icon">
                <img src={`${A}icon-food.svg`} alt="" />
              </span>
              <div>
                <strong>Дневник питания с КБЖУ</strong>
                <span>
                  Указывай продукты и граммовку. Калории, белки, жиры и углеводы рассчитываются
                  автоматически по каждому приёму пищи.
                </span>
              </div>
            </li>
            <li>
              <span className="product-icon">
                <img src={`${A}icon-chart.svg`} alt="" />
              </span>
              <div>
                <strong>Статистика и история</strong>
                <span>
                  Возвращайся к прошлым тренировкам и приёмам пищи. Сравнивай фактическое
                  потребление с целями КБЖУ.
                </span>
              </div>
            </li>
            <li>
              <span className="product-icon">
                <img src={`${A}icon-sliders.svg`} alt="" />
              </span>
              <div>
                <strong>Цели и личный кабинет</strong>
                <span>
                  Настрой личные цели КБЖУ в профиле и отслеживай, как питание соответствует твоим
                  задачам.
                </span>
              </div>
            </li>
          </ul>
        </div>
      </section>
      <section className="editorial-row reveal">
        <img src={`${A}landing-photo-2.png`} alt="Атлетка выполняет упражнение со штангой" />
        <div>
          <span className="eyebrow">ТРЕНИРОВКИ</span>
          <h2>
            Каждый подход
            <br />
            имеет значение.
          </h2>
          <p>
            Записывай выполненные тренировки: упражнения, порядок, повторения и вес. Возвращайся к
            сохранённым результатам.
          </p>
          <div className="demo-card">
            <strong>
              <img src={`${A}feature-dumbbell.svg`} alt="" />
              Тренировка сегодня
            </strong>
            <div className="demo-row">
              <img src={`${A}squat-photo.png`} alt="" />
              <span>
                Приседания со штангой<small>3 × 8 · 100 кг</small>
              </span>
            </div>
            <div className="demo-row">
              <img src={`${A}exercise-photo.png`} alt="" />
              <span>
                Жим лёжа<small>3 × 10 · 80 кг</small>
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="editorial-row editorial-row--reverse reveal">
        <img
          src={`${A}landing-photo-6.png`}
          alt="Сбалансированное блюдо с курицей, рисом и овощами"
        />
        <div>
          <span className="eyebrow">ПИТАНИЕ И КБЖУ</span>
          <h2>
            Знай, что
            <br />в твоём рационе.
          </h2>
          <p>
            Выбери продукт и укажи граммовку — ВИНЛАНД посчитает калории, белки, жиры и углеводы и
            суммирует все приёмы пищи за день.
          </p>
          <div className="demo-card">
            <strong>Обед · 27 сентября 2026</strong>
            <div className="demo-row">
              <img src={`${A}food-photo.png`} alt="" />
              <span>
                Куриная грудка · 200 г<small>330 ккал · Б 62 · Ж 8 · У 0</small>
              </span>
            </div>
            <div className="demo-row">
              <img src={`${A}food-photo.png`} alt="" />
              <span>
                Рис варёный · 250 г<small>320 ккал · Б 6,75 · Ж 0,75 · У 70</small>
              </span>
            </div>
            <div className="demo-total">
              <strong>Итого: 650 ккал</strong>
              <span>Б 68,75 · Ж 8,75 · У 70 г</span>
            </div>
          </div>
        </div>
      </section>
      <section className="landing-stats reveal">
        <div className="stats-heading">
          <div>
            <span className="eyebrow">ПРОГРЕСС И СТАТИСТИКА</span>
            <h2>
              Сравни записи.
              <br />
              Замечай изменения.
            </h2>
          </div>
          <p>
            История питания и сохранённые тренировки всегда под рукой. Статистика показывает
            динамику и помогает сравнивать фактическое потребление с личными целями КБЖУ.
          </p>
        </div>
        <div className="panel demo-progress">
          <div>
            <img src={`${A}icon-flame.svg`} alt="" />
            <span>
              Сегодня в рационе<strong>1 850 / 2 400 ккал</strong>
            </span>
            <div className="demo-calorie-bar">
              <div className="progress-track">
                <span style={{ width: '77%' }} />
              </div>
              <b>77%</b>
            </div>
          </div>
          <div className="demo-macros">
            <Progress label="Белки" value={149} target={180} />
            <Progress label="Жиры" value={56} target={80} />
            <Progress label="Углеводы" value={175} target={240} />
          </div>
        </div>
      </section>
      <section className="landing-steps reveal">
        <h2>Начни свой путь.</h2>
        <div className="step-grid">
          <article>
            <span>01</span>
            <strong>Создай аккаунт</strong>
            <p>Зарегистрируйся с именем, электронной почтой и паролем.</p>
          </article>
          <article>
            <span>02</span>
            <strong>Укажи цели КБЖУ</strong>
            <p>Настрой личные цели по калориям, белкам, жирам и углеводам в профиле.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Сохрани первую запись</strong>
            <p>Запиши выполненную тренировку или добавь первый приём пищи.</p>
          </article>
        </div>
      </section>
      <section className="landing-cta reveal">
        <span className="eyebrow">ТВОИ ЦЕЛИ. ТВОЙ ПУТЬ. ТВОЯ СИЛА.</span>
        <h2>Следующий шаг — твой.</h2>
        <p>
          Тренировки и питание в одном месте.
          <br />
          Создай аккаунт и начни с первой записи.
        </p>
        <div className="button-row">
          <LinkButton to="/register">Создать аккаунт</LinkButton>
          <LinkButton to="/login" variant="outline">
            Войти в аккаунт
          </LinkButton>
        </div>
      </section>
      <Footer guest />
      <GuestMobileNav />
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
  min,
  max,
  step,
  placeholder,
  suffix,
}) {
  const [visible, setVisible] = useState(false);
  const inputType = type === 'password' && visible ? 'text' : type;
  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-control">
        <input
          name={name}
          type={inputType}
          value={value ?? ''}
          onChange={onChange}
          autoComplete={autoComplete}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        {suffix && <em>{suffix}</em>}
        {type === 'password' && (
          <button
            type="button"
            className="reveal-password"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {visible ? 'Скрыть' : 'Показать'}
          </button>
        )}
      </div>
      {error && (
        <small id={`${name}-error`} role="alert">
          {error}
        </small>
      )}
    </label>
  );
}

function AuthPage({ mode, onAuth }) {
  const register = mode === 'register';
  const [values, setValues] = useState({ name: '', email: '', password: '', passwordAgain: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    setValues({ name: '', email: '', password: '', passwordAgain: '' });
    setErrors({});
    setMessage('');
  }, [mode]);
  const change = (event) => {
    setValues((previous) => ({ ...previous, [event.target.name]: event.target.value }));
    setErrors((previous) => ({ ...previous, [event.target.name]: '' }));
  };
  async function submit(event) {
    event.preventDefault();
    const next = {};
    if (register && !values.name.trim()) next.name = 'Введите имя.';
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = 'Введите корректный email.';
    if (
      new TextEncoder().encode(values.password).length < 10 ||
      new TextEncoder().encode(values.password).length > 72
    )
      next.password = 'Пароль должен содержать от 10 до 72 байт.';
    if (register && values.password !== values.passwordAgain)
      next.passwordAgain = 'Пароли не совпадают.';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const data = await api(register ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: { name: values.name.trim(), email: values.email.trim(), password: values.password },
      });
      onAuth(data.user);
      go('/');
    } catch (error) {
      setErrors(error.fields || {});
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-visual">
        <Brand />
        <img src={`${A}auth-athlete.png`} alt="Атлет на фоне северных гор" />
      </div>
      <div className="auth-side">
        <div className="auth-top">
          <span>{register ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}</span>
          <LinkButton to={register ? '/login' : '/register'} variant="outline">
            {register ? 'Войти' : 'Регистрация'}
          </LinkButton>
        </div>
        <main className="auth-panel">
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          <div className="auth-mobile-photo" role="img" aria-label="Атлет на фоне северных гор" />
          <h1>{register ? 'Регистрация' : 'Вход'}</h1>
          <p className="auth-lead">
            {register
              ? 'Создайте аккаунт для учёта тренировок и питания.'
              : 'Войдите, чтобы продолжить учёт тренировок и питания.'}
          </p>
          <form onSubmit={submit} noValidate>
            {register && (
              <Field
                label="Имя"
                name="name"
                value={values.name}
                onChange={change}
                error={errors.name}
                autoComplete="name"
              />
            )}
            <Field
              label="Email"
              name="email"
              value={values.email}
              onChange={change}
              error={errors.email}
              type="email"
              autoComplete="email"
            />
            <Field
              label="Пароль"
              name="password"
              value={values.password}
              onChange={change}
              error={errors.password}
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
            />
            {register && (
              <Field
                label="Повторите пароль"
                name="passwordAgain"
                value={values.passwordAgain}
                onChange={change}
                error={errors.passwordAgain}
                type="password"
                autoComplete="new-password"
              />
            )}
            {message && (
              <p className="form-message" role="alert">
                {message}
              </p>
            )}
            <button className="button button--primary full-width" type="submit" disabled={busy}>
              {busy ? 'Подождите…' : register ? 'Создать аккаунт' : 'Войти'}
            </button>
          </form>
          <div className="auth-under">
            {register ? (
              'После регистрации будет создан пользовательский аккаунт.'
            ) : (
              <>
                Нет аккаунта? <a href="#/register">Регистрация →</a>
              </>
            )}
          </div>
          <Footer guest />
        </main>
      </div>
      <GuestMobileNav />
    </div>
  );
}

function Progress({ label, value, target, unit = 'г' }) {
  const percent = target ? Math.min(100, Math.round((Number(value) / Number(target)) * 100)) : 0;
  return (
    <div className="progress-stat">
      <div className="progress-label">
        <span>{label}</span>
        <strong>
          {formatNumber(value)} / {target ? formatNumber(target) : '—'} {unit}
        </strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${percent}%` }} />
      </div>
      <span className="progress-percent">{target ? `${percent}%` : 'Цель не задана'}</span>
    </div>
  );
}

function Home({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    Promise.all([
      api(`/statistics?from=${localDate()}&to=${localDate()}`),
      api('/workouts'),
      api(`/meals?date=${localDate()}`),
    ])
      .then((results) => {
        if (live) setData({ stats: results[0], workouts: results[1], meals: results[2] });
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);
  const day = data?.stats?.days?.[0];
  const goals = data?.stats?.goals || {};
  return (
    <>
      <section className="home-hero">
        <div className="home-hero-photo" />
        <div className="home-hero-copy">
          <h1>
            Добрый день,
            <br />
            {user.name.split(' ')[0]}
          </h1>
          <p>Сегодня — новый шаг в пути.</p>
          <div className="button-row">
            <LinkButton to="/workouts/new">Записать тренировку</LinkButton>
            <LinkButton to="/nutrition/new" variant="outline">
              Добавить питание
            </LinkButton>
          </div>
        </div>
      </section>
      <main className="content home-content">
        <div className="ornament" />
        <h2>Полезное</h2>
        <p className="subheading">Знания. Практика. Твой путь.</p>
        <div className="useful-grid">
          <img src={`${A}article-barbell.png`} alt="Штанга для силовой тренировки" />
          <article>
            <span className="eyebrow">ТРЕНИРОВКИ</span>
            <h3>
              Техника приседаний:
              <br />
              основа движения
            </h3>
            <p>
              Разбираем ключевые принципы, технику и частые ошибки, чтобы приседания были
              эффективными и безопасными.
            </p>
            <a href="#/workouts">Открыть тренировки →</a>
          </article>
          <div className="useful-links">
            <a href="#/nutrition">
              <strong>Дневник питания без догадок</strong>
              <span>Как проще учитывать рацион и видеть реальную картину.</span>
              <b>→</b>
            </a>
            <a href="#/statistics">
              <strong>Восстановление после нагрузки</strong>
              <span>Что помогает организму быть готовым к новым тренировкам.</span>
              <b>→</b>
            </a>
          </div>
        </div>
        <section className="dashboard-preview">
          <div className="section-heading">
            <h2>Сегодня</h2>
            <a href="#/statistics">Вся статистика →</a>
          </div>
          {error ? (
            <p className="form-message">{error}</p>
          ) : !data ? (
            <p className="muted">Загружаем данные…</p>
          ) : (
            <div className="overview-grid">
              <article className="panel">
                <span className="eyebrow">ПИТАНИЕ</span>
                <h3>{formatNumber(day.calories)} ккал</h3>
                <Progress
                  label="Калории"
                  value={day.calories}
                  target={goals.calories}
                  unit="ккал"
                />
                <a href="#/nutrition">Открыть дневник →</a>
              </article>
              <article className="panel">
                <span className="eyebrow">ТРЕНИРОВКИ</span>
                <h3>{day.workouts} за сегодня</h3>
                <p>{day.sets} подходов записано</p>
                <a href="#/workouts">Открыть историю →</a>
              </article>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function Profile({ user, onUpdate, onLogout, logoutBusy }) {
  const [values, setValues] = useState(() => {
    const defaults = {
      name: user.name,
      target_calories: user.target_calories ?? '',
      target_protein_g: user.target_protein_g ?? '',
      target_fat_g: user.target_fat_g ?? '',
      target_carbs_g: user.target_carbs_g ?? '',
    };
    try {
      return {
        ...defaults,
        ...JSON.parse(sessionStorage.getItem(`vinland-profile-${user.id}`) || '{}'),
      };
    } catch {
      return defaults;
    }
  });
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
    setValues((previous) => {
      const next = { ...previous, [event.target.name]: event.target.value };
      sessionStorage.setItem(`vinland-profile-${user.id}`, JSON.stringify(next));
      return next;
    });
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
      sessionStorage.removeItem(`vinland-profile-${user.id}`);
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
                {formatNumber(day.calories)} /{' '}
                {user.target_calories ? formatNumber(user.target_calories) : '—'} ккал
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
                    <img src={`${A}squat-photo.png`} alt="" />
                    <span>
                      {exercise.exercise_name}
                      <small>{exercise.sets.length} подходов</small>
                    </span>
                  </div>
                ))
            ) : (
              <div className="profile-empty">
                Пока нет записи за сегодня. <a href="#/workouts/new">Добавить тренировку →</a>
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
                  <img src={`${A}food-photo.png`} alt="" />
                  <span>
                    {mealNames[meal.meal_type]}
                    <small>
                      {meal.items.map((item) => item.product_name_snapshot).join(', ') ||
                        'Без продуктов'}
                    </small>
                  </span>
                  <b>{formatNumber(meal.totals.calories)} ккал</b>
                </div>
              ))
            ) : (
              <div className="profile-empty">
                Сегодня приёмов пищи пока нет. <a href="#/nutrition/new">Добавить питание →</a>
              </div>
            )}
          </section>
        </div>
        <div className="profile-links">
          <a href="#/statistics">
            <img src={`${A}icon-chart.svg`} alt="" />
            <span>
              Статистика<small>Динамика тренировок и питания</small>
            </span>
          </a>
          <button onClick={() => setEditing(true)}>
            <img src={`${A}icon-sliders.svg`} alt="" />
            <span>
              Цели КБЖУ
              <small>
                {[
                  user.target_calories,
                  user.target_protein_g,
                  user.target_fat_g,
                  user.target_carbs_g,
                ]
                  .map((value) => value || '—')
                  .join(' / ')}{' '}
                ккал / г
              </small>
            </span>
          </button>
          <a href="#/workouts">
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

export default function App() {
  const [path, setPath] = useState(pathNow());
  const [user, setUser] = useState(undefined);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [sessionError, setSessionError] = useState('');
  useEffect(() => {
    const change = () => setPath(pathNow());
    const follow = (event) => {
      const link = event.target.closest('a[href^="#/"]');
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      go(link.getAttribute('href').slice(1));
    };
    window.addEventListener('popstate', change);
    document.addEventListener('click', follow);
    return () => {
      window.removeEventListener('popstate', change);
      document.removeEventListener('click', follow);
    };
  }, []);
  useEffect(() => {
    session()
      .then((data) => setUser(data.user))
      .catch((error) => {
        setSessionError(error.message);
        setUser(null);
      });
  }, []);
  useEffect(() => {
    const expired = () => {
      setSessionError('Сессия истекла. Войдите снова.');
      setUser(null);
      go('/login');
    };
    window.addEventListener('vinland:auth-required', expired);
    return () => window.removeEventListener('vinland:auth-required', expired);
  }, []);
  useEffect(() => {
    if (user && (path === '/login' || path === '/register')) go('/');
  }, [user, path]);
  async function logout() {
    setLogoutBusy(true);
    try {
      await api('/auth/logout', { method: 'POST' });
      for (const key of Object.keys(sessionStorage)) {
        if (
          key === `vinland-profile-${user.id}` ||
          key.startsWith(`vinland-workout-${user.id}-`) ||
          key.startsWith(`vinland-meal-${user.id}-`)
        )
          sessionStorage.removeItem(key);
      }
      setUser(null);
      go('/');
    } catch (error) {
      setSessionError(error.message);
    } finally {
      setLogoutBusy(false);
    }
  }
  if (user === undefined)
    return (
      <div className="loading-screen">
        <Brand />
        <p>Загружаем ВИНЛАНД…</p>
      </div>
    );
  const authPath = path === '/login' || path === '/register';
  if (!user)
    return (
      <>
        {sessionError && (
          <div className="global-error" role="alert">
            {sessionError}
          </div>
        )}
        {authPath ? (
          <AuthPage
            mode={path.slice(1)}
            onAuth={(next) => {
              setSessionError('');
              setUser(next);
            }}
          />
        ) : path === '/' ? (
          <Landing />
        ) : (
          <AuthPage
            mode="login"
            onAuth={(next) => {
              setSessionError('');
              setUser(next);
            }}
          />
        )}
      </>
    );
  if (authPath)
    return (
      <div className="loading-screen">
        <Brand />
        <p>Открываем личный кабинет…</p>
      </div>
    );
  const workoutId = path.match(/^\/workouts\/(\d+)$/)?.[1];
  const mealId = path.match(/^\/nutrition\/(\d+)$/)?.[1];
  let section = null;
  if (path === '/workouts') section = <WorkoutsPage />;
  else if (path === '/workouts/new') section = <WorkoutEditor user={user} />;
  else if (workoutId) section = <WorkoutEditor id={workoutId} user={user} />;
  else if (path === '/nutrition') section = <NutritionPage user={user} />;
  else if (path === '/nutrition/new') section = <MealEditor user={user} />;
  else if (mealId) section = <MealEditor id={mealId} user={user} />;
  else if (path === '/nutrition/history') section = <NutritionHistory />;
  else if (path === '/statistics') section = <StatisticsPage />;
  else if (path === '/admin/exercises') section = <AdminCatalog kind="exercises" user={user} />;
  else if (path === '/admin/products') section = <AdminCatalog kind="products" user={user} />;
  else
    section = (
      <main className="content placeholder-page">
        <h1>Страница не найдена</h1>
        <LinkButton to="/" variant="outline">
          Вернуться на главную
        </LinkButton>
      </main>
    );
  return (
    <>
      <AppHeader user={user} onLogout={logout} busy={logoutBusy} />
      {sessionError && (
        <div className="global-error" role="alert">
          {sessionError}
        </div>
      )}
      {path === '/' ? (
        <Home user={user} />
      ) : path === '/profile' ? (
        <Profile user={user} onUpdate={setUser} onLogout={logout} logoutBusy={logoutBusy} />
      ) : (
        <>
          {section}
          <Footer />
        </>
      )}
    </>
  );
}
