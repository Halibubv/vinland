// Корневой компонент: узнаёт, кто вошёл, и по адресу страницы выбирает экран.
import React, { useEffect, useState } from 'react';
import { api, session } from './lib/api.js';
import { currentLocation, go, interceptLinks } from './lib/router.js';
import { Brand, LinkButton, AppHeader, Footer } from './components/Layout.jsx';
import { Landing } from './pages/Landing.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { Home } from './pages/Home.jsx';
import { Profile } from './pages/Profile.jsx';
import { WorkoutsPage } from './pages/Workouts.jsx';
import { WorkoutEditor } from './pages/WorkoutEditor.jsx';
import { WorkoutView } from './pages/WorkoutView.jsx';
import { NutritionPage } from './pages/Nutrition.jsx';
import { MealEditor } from './pages/MealEditor.jsx';
import { NutritionHistory } from './pages/NutritionHistory.jsx';
import { StatisticsPage } from './pages/Statistics.jsx';
import { AdminCatalog } from './pages/AdminCatalog.jsx';

// Число из адреса по шаблону, например "12" из "/workouts/12", или null.
function idFromPath(path, pattern) {
  const match = path.match(pattern);
  if (match) return match[1];
  return null;
}

// Экран раздела для вошедшего пользователя. Главная и профиль обрабатываются в App.
function SectionPage({ path, user }) {
  const workoutId = idFromPath(path, /^\/workouts\/(\d+)$/);
  const editedWorkoutId = idFromPath(path, /^\/workouts\/(\d+)\/edit$/);
  const mealId = idFromPath(path, /^\/nutrition\/(\d+)$/);

  if (path === '/workouts') return <WorkoutsPage />;
  if (path === '/workouts/new') return <WorkoutEditor />;
  if (workoutId) return <WorkoutView id={workoutId} />;
  if (editedWorkoutId) return <WorkoutEditor id={editedWorkoutId} />;
  if (path === '/nutrition') return <NutritionPage />;
  if (path === '/nutrition/new') return <MealEditor />;
  if (mealId) return <MealEditor id={mealId} />;
  if (path === '/nutrition/history') return <NutritionHistory />;
  if (path === '/statistics') return <StatisticsPage />;
  if (path === '/admin/exercises') return <AdminCatalog kind="exercises" user={user} />;
  if (path === '/admin/products') return <AdminCatalog kind="products" user={user} />;

  return (
    <main className="content placeholder-page">
      <h1>Страница не найдена</h1>
      <LinkButton to="/" variant="outline">
        Вернуться на главную
      </LinkButton>
    </main>
  );
}

function SessionError({ message }) {
  if (!message) return null;
  return (
    <div className="global-error" role="alert">
      {message}
    </div>
  );
}

export default function App() {
  const [location, setLocation] = useState(currentLocation());
  const path = location.split('?')[0];
  // undefined — ещё не знаем, null — гость, объект — вошедший пользователь.
  const [user, setUser] = useState(undefined);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [sessionError, setSessionError] = useState('');

  // Следим за сменой адреса (кнопки браузера и переходы через go()).
  useEffect(() => {
    const updateLocation = () => setLocation(currentLocation());
    window.addEventListener('popstate', updateLocation);
    const stopIntercepting = interceptLinks();
    return () => {
      window.removeEventListener('popstate', updateLocation);
      stopIntercepting();
    };
  }, []);

  // При открытии страницы спрашиваем сервер, кто вошёл.
  useEffect(() => {
    session()
      .then((data) => setUser(data.user))
      .catch((error) => {
        setSessionError(error.message);
        setUser(null);
      });
  }, []);

  // Это событие посылает lib/api.js, когда сессия на сервере закончилась.
  useEffect(() => {
    const handleExpired = () => {
      setSessionError('Сессия истекла. Войдите снова.');
      setUser(null);
      // Запоминаем страницу, чтобы после входа вернуться на неё.
      go(`/login?next=${encodeURIComponent(currentLocation())}`);
    };
    window.addEventListener('vinland:auth-required', handleExpired);
    return () => window.removeEventListener('vinland:auth-required', handleExpired);
  }, []);

  const isAuthPath = path === '/login' || path === '/register';

  // Вошедшему пользователю страницы входа не нужны — отправляем на главную.
  useEffect(() => {
    if (user && isAuthPath) go('/');
  }, [user, path]);

  async function logout() {
    setLogoutBusy(true);
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      go('/');
    } catch (error) {
      setSessionError(error.message);
    } finally {
      setLogoutBusy(false);
    }
  }

  function handleAuth(nextUser) {
    setSessionError('');
    setUser(nextUser);
  }

  if (user === undefined) {
    return (
      <div className="loading-screen">
        <Brand />
        <p>Загружаем ВИНЛАНД…</p>
      </div>
    );
  }

  // Гость: на главной — лендинг, на /register — регистрация, везде иначе — вход.
  if (!user) {
    let guestPage;
    if (path === '/register') {
      guestPage = <AuthPage mode="register" onAuth={handleAuth} />;
    } else if (path === '/') {
      guestPage = <Landing />;
    } else {
      guestPage = <AuthPage mode="login" onAuth={handleAuth} />;
    }
    return (
      <>
        <SessionError message={sessionError} />
        {guestPage}
      </>
    );
  }

  // Пользователь вошёл, а адрес ещё /login: эффект выше сейчас переведёт на главную.
  if (isAuthPath) {
    return (
      <div className="loading-screen">
        <Brand />
        <p>Открываем личный кабинет…</p>
      </div>
    );
  }

  let page;
  if (path === '/') {
    page = <Home user={user} />;
  } else if (path === '/profile') {
    page = <Profile user={user} onUpdate={setUser} onLogout={logout} logoutBusy={logoutBusy} />;
  } else {
    // key={location}: при смене адреса экран создаётся заново и загружает свои данные.
    page = (
      <React.Fragment key={location}>
        <SectionPage path={path} user={user} />
        <Footer />
      </React.Fragment>
    );
  }

  return (
    <>
      <AppHeader user={user} onLogout={logout} busy={logoutBusy} />
      <SessionError message={sessionError} />
      {page}
    </>
  );
}
