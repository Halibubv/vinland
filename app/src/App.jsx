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

export default function App() {
  const [location, setLocation] = useState(currentLocation());
  const path = location.split('?')[0];
  const [user, setUser] = useState(undefined);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [sessionError, setSessionError] = useState('');
  useEffect(() => {
    const change = () => setLocation(currentLocation());
    window.addEventListener('popstate', change);
    const stopIntercepting = interceptLinks();
    return () => {
      window.removeEventListener('popstate', change);
      stopIntercepting();
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
  const editedWorkoutId = path.match(/^\/workouts\/(\d+)\/edit$/)?.[1];
  const mealId = path.match(/^\/nutrition\/(\d+)$/)?.[1];
  let section = null;
  if (path === '/workouts') section = <WorkoutsPage />;
  else if (path === '/workouts/new') section = <WorkoutEditor />;
  else if (workoutId) section = <WorkoutView id={workoutId} />;
  else if (editedWorkoutId) section = <WorkoutEditor id={editedWorkoutId} />;
  else if (path === '/nutrition') section = <NutritionPage />;
  else if (path === '/nutrition/new') section = <MealEditor />;
  else if (mealId) section = <MealEditor id={mealId} />;
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
        <React.Fragment key={location}>
          {section}
          <Footer />
        </React.Fragment>
      )}
    </>
  );
}
