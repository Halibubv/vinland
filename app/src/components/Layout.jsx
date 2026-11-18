// Общие части разметки: логотип, шапка с меню, нижнее меню на телефоне и подвал.
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ASSETS } from '../lib/constants.js';

// Пункты главного меню.
const navigation = [
  { to: '/', label: 'Главная', icon: 'nav-home.svg' },
  { to: '/workouts', label: 'Тренировки', icon: 'nav-workouts.svg' },
  { to: '/nutrition', label: 'Питание', icon: 'nav-food.svg' },
  { to: '/profile', label: 'Профиль', icon: 'nav-profile.svg' },
];

// Подсвечен ли пункт меню to на странице path.
function isActive(to, path) {
  if (to === '/') return path === '/';
  // Статистика открывается из профиля, поэтому там подсвечен «Профиль».
  if (to === '/profile' && path === '/statistics') return true;
  return path === to || path.startsWith(`${to}/`);
}

// Инициалы для кружка-аватара: "Анна Смирнова" → "АС". Без имени — "V".
export function initials(name = '') {
  const words = name.trim().split(/\s+/);
  let result = '';
  for (const word of words.slice(0, 2)) {
    if (word) result += word[0].toUpperCase();
  }
  return result || 'V';
}

// Содержимое кружка-аватара: фото пользователя, а если его нет — инициалы.
export function AvatarContent({ user }) {
  if (user.avatar) return <img src={user.avatar} alt="" />;
  return initials(user.name);
}

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="ВИНЛАНД — главная">
      <img src={`${ASSETS}logo-v.svg`} alt="" />
      <span>ВИНЛАНД</span>
    </Link>
  );
}

// Ссылка, оформленная как кнопка.
export function LinkButton({ to, children, variant = 'primary', className = '' }) {
  return (
    <Link className={`button button--${variant} ${className}`} to={to}>
      {children}
    </Link>
  );
}

// Шапка для вошедшего пользователя. На узком экране меню из шапки
// скрывается (через CSS) и вместо него показывается нижняя панель .mobile-nav.
export function AppHeader({ user, onLogout, busy }) {
  const path = useLocation().pathname;
  const firstName = user.name.split(' ')[0];
  return (
    <>
      <header className="app-header">
        <Brand />
        <nav className="desktop-nav" aria-label="Основная навигация">
          {navigation.map((item) => {
            const active = isActive(item.to, path);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
              >
                <img src={`${ASSETS}${item.icon}`} alt="" />
                {/* При наведении надпись прокручивается вверх, снизу выезжает такая же. */}
                <span className="roll-link">
                  <span data-text={item.label}>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="header-account">
          {user.role === 'admin' && (
            <Link className="admin-entry" to="/admin/exercises" title="Администрирование">
              <span className="admin-entry-long">Администрирование</span>
              <span className="admin-entry-short">Админ</span>
            </Link>
          )}
          <Link to="/profile" className="avatar" aria-label="Открыть профиль">
            <AvatarContent user={user} />
          </Link>
          <span>{firstName}</span>
          <button className="text-button logout" onClick={onLogout} disabled={busy}>
            Выйти
          </button>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Основная навигация">
        {navigation.map((item) => {
          const active = isActive(item.to, path);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={active ? 'active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              <img src={`${ASSETS}${item.icon}`} alt="" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

// guest — подвал для гостя (лендинг, вход): с логотипом и ссылками на вход.
export function Footer({ guest = false }) {
  // Для вошедшего — все пункты меню, кроме «Главной» (она уже есть первой ссылкой).
  const sectionLinks = navigation.slice(1);
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        {guest && <Brand />}
        <span>ВИНЛАНД · Тренировки и питание</span>
      </div>
      <nav aria-label="Нижняя навигация">
        <Link to="/">Главная</Link>
        {guest && <Link to="/login">Войти</Link>}
        {guest && <Link to="/register">Создать аккаунт</Link>}
        {!guest &&
          sectionLinks.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
      </nav>
    </footer>
  );
}

// Нижнее меню для гостя на телефоне: все разделы, кроме главной, ведут на вход.
export function GuestMobileNav() {
  return (
    <nav className="mobile-nav guest-mobile-nav" aria-label="Основная навигация">
      {navigation.map((item) => {
        const isHome = item.to === '/';
        return (
          <Link
            key={item.to}
            to={isHome ? '/' : '/login'}
            aria-label={isHome ? item.label : `${item.label} — войти`}
          >
            <img src={`${ASSETS}${item.icon}`} alt="" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
