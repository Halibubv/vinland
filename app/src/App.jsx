// Корневой компонент: узнаёт, кто вошёл, и по адресу страницы выбирает экран.
// Какой экран показать по какому адресу, решает React Router (<Routes> и <Route>).
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from './api.js';
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
import { AdminUsers } from './pages/AdminUsers.jsx';

function NotFound() {
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

function LoadingScreen({ text }) {
  return (
    <div className="loading-screen">
      <Brand />
      <p>{text}</p>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  // undefined — ещё не знаем, null — гость, объект — вошедший пользователь.
  const [user, setUser] = useState(undefined);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [sessionError, setSessionError] = useState('');

  // При открытии страницы спрашиваем сервер, кто вошёл.
  useEffect(() => {
    api('/session')
      .then((data) => setUser(data.user))
      .catch((error) => {
        setSessionError(error.message);
        setUser(null);
      });
  }, []);

  // Перешли на другую страницу — прокручиваем её в начало.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  async function logout() {
    setLogoutBusy(true);
    try {
      await api('/auth/logout', 'POST');
      setUser(null);
      navigate('/');
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
    return <LoadingScreen text="Загружаем ВИНЛАНД…" />;
  }

  // Гость: на главной — лендинг, на /register — регистрация, на любом другом
  // адресе — форма входа. После входа адрес не меняется, и на нём сразу
  // открывается нужная страница (а с /login и /register — главная).
  if (!user) {
    return (
      <>
        <SessionError message={sessionError} />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/ui/" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<AuthPage mode="register" onAuth={handleAuth} />} />
          <Route path="*" element={<AuthPage mode="login" onAuth={handleAuth} />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <AppHeader user={user} onLogout={logout} busy={logoutBusy} />
      <SessionError message={sessionError} />
      <Routes>
        <Route path="/" element={<Home user={user} />} />
        {/* Вошедшему пользователю страницы входа не нужны — отправляем на главную. */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="/ui/" element={<Navigate to="/" replace />} />
        <Route
          path="/profile"
          element={
            <Profile user={user} onUpdate={setUser} onLogout={logout} logoutBusy={logoutBusy} />
          }
        />
        <Route path="/workouts" element={<WorkoutsPage />} />
        <Route path="/workouts/new" element={<WorkoutEditor />} />
        <Route path="/workouts/:id" element={<WorkoutView />} />
        <Route path="/workouts/:id/edit" element={<WorkoutEditor />} />
        {/* Дневник питания: сегодня или выбранный день. */}
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/nutrition/day/:date" element={<NutritionPage />} />
        <Route path="/nutrition/history" element={<NutritionHistory />} />
        <Route path="/nutrition/history/:date" element={<NutritionPage history />} />
        {/* Новый приём пищи. На /add сразу открывается окно выбора продукта. */}
        <Route path="/nutrition/new" element={<MealEditor />} />
        <Route path="/nutrition/add/:date" element={<MealEditor openPicker />} />
        <Route path="/nutrition/add/:date/:type" element={<MealEditor openPicker />} />
        {/* Редактирование сохранённого приёма пищи. */}
        <Route path="/nutrition/:id" element={<MealEditor />} />
        <Route path="/nutrition/:id/add" element={<MealEditor openPicker />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/admin/exercises" element={<AdminCatalog kind="exercises" user={user} />} />
        <Route path="/admin/products" element={<AdminCatalog kind="products" user={user} />} />
        <Route path="/admin/users" element={<AdminUsers user={user} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </>
  );
}
