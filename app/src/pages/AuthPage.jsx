import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { go } from '../lib/router.js';
import { A } from '../lib/constants.js';
import { Brand, LinkButton, Footer, GuestMobileNav } from '../components/Layout.jsx';
import { Field } from '../components/ui.jsx';

export function AuthPage({ mode, onAuth }) {
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
                Нет аккаунта? <a href="/register">Регистрация →</a>
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
