import React from 'react';
import { currentPath } from '../lib/router.js';
import { A } from '../lib/constants.js';

export const navigation = [
  ['/', 'Главная', 'nav-home.svg'],
  ['/workouts', 'Тренировки', 'nav-workouts.svg'],
  ['/nutrition', 'Питание', 'nav-food.svg'],
  ['/profile', 'Профиль', 'nav-profile.svg'],
];

// Statistics is opened from the profile, so the profile tab stays highlighted there.

export function isActive(to, path) {
  if (to === '/') return path === '/';
  if (to === '/profile' && path === '/statistics') return true;
  return path === to || path.startsWith(`${to}/`);
}

export function Brand() {
  return (
    <a className="brand" href="/" aria-label="ВИНЛАНД — главная">
      <img src={`${A}logo-v.svg`} alt="" />
      <span>ВИНЛАНД</span>
    </a>
  );
}

export function LinkButton({ to, children, variant = 'primary', className = '' }) {
  return (
    <a className={`button button--${variant} ${className}`} href={to}>
      {children}
    </a>
  );
}

export function AppHeader({ user, onLogout, busy }) {
  const path = currentPath();
  return (
    <>
      <header className="app-header">
        <Brand />
        <nav className="desktop-nav" aria-label="Основная навигация">
          {navigation.map(([to, label, icon]) => {
            const active = isActive(to, path);
            return (
              <a
                key={to}
                href={to}
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
            <a className="admin-entry" href="/admin/exercises">
              Администрирование
            </a>
          )}
          <a href="/profile" className="avatar" aria-label="Открыть профиль">
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
          const active = isActive(to, path);
          return (
            <a
              key={to}
              href={to}
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

export function initials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('') || 'V'
  );
}

export function Footer({ guest = false }) {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        {guest && <Brand />}
        <span>ВИНЛАНД · Тренировки и питание</span>
      </div>
      <nav aria-label="Нижняя навигация">
        <a href="/">Главная</a>
        {guest ? (
          <>
            <a href="/login">Войти</a>
            <a href="/register">Создать аккаунт</a>
          </>
        ) : (
          navigation.slice(1).map(([to, label]) => (
            <a key={to} href={to}>
              {label}
            </a>
          ))
        )}
      </nav>
    </footer>
  );
}

export function GuestMobileNav() {
  return (
    <nav className="mobile-nav guest-mobile-nav" aria-label="Основная навигация">
      {navigation.map(([to, label, icon]) => (
        <a
          key={to}
          href={to === '/' ? '/' : '/login'}
          aria-label={to === '/' ? label : `${label} — войти`}
        >
          <img src={`${A}${icon}`} alt="" />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
