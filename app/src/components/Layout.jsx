// Общие части разметки: логотип, шапка с меню, нижнее меню на телефоне и подвал.
import React from 'react';
import { currentPath } from '../lib/router.js';
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

export function Brand() {
  return (
    <a className="brand" href="/" aria-label="ВИНЛАНД — главная">
      <img src={`${ASSETS}logo-v.svg`} alt="" />
      <span>ВИНЛАНД</span>
    </a>
  );
}

// Ссылка, оформленная как кнопка.
export function LinkButton({ to, children, variant = 'primary', className = '' }) {
  return (
    <a className={`button button--${variant} ${className}`} href={to}>
      {children}
    </a>
  );
}

// Шапка для вошедшего пользователя. На узком экране меню из шапки
// скрывается (через CSS) и вместо него показывается нижняя панель .mobile-nav.
export function AppHeader({ user, onLogout, busy }) {
  const path = currentPath();
  const firstName = user.name.split(' ')[0];
  return (
    <>
      <header className="app-header">
        <Brand />
        <nav className="desktop-nav" aria-label="Основная навигация">
          {navigation.map((item) => {
            const active = isActive(item.to, path);
            return (
              <a
                key={item.to}
                href={item.to}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
              >
                <img src={`${ASSETS}${item.icon}`} alt="" />
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="header-account">
          {user.role === 'admin' && (
            <a className="admin-entry" href="/admin/exercises" title="Администрирование">
              <span className="admin-entry-long">Администрирование</span>
              <span className="admin-entry-short">Админ</span>
            </a>
          )}
          <a href="/profile" className="avatar" aria-label="Открыть профиль">
            {initials(user.name)}
          </a>
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
            <a
              key={item.to}
              href={item.to}
              className={active ? 'active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              <img src={`${ASSETS}${item.icon}`} alt="" />
              <span>{item.label}</span>
            </a>
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
        <a href="/">Главная</a>
        {guest && <a href="/login">Войти</a>}
        {guest && <a href="/register">Создать аккаунт</a>}
        {!guest &&
          sectionLinks.map((item) => (
            <a key={item.to} href={item.to}>
              {item.label}
            </a>
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
          <a
            key={item.to}
            href={isHome ? '/' : '/login'}
            aria-label={isHome ? item.label : `${item.label} — войти`}
          >
            <img src={`${ASSETS}${item.icon}`} alt="" />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
