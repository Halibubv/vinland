// Экран входа и регистрации (mode = 'login' или 'register').
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { go } from '../lib/router.js';
import { ASSETS } from '../lib/constants.js';
import { Brand, LinkButton, Footer, GuestMobileNav } from '../components/Layout.jsx';
import { Field } from '../components/ui.jsx';

const emptyValues = { name: '', email: '', password: '', passwordAgain: '' };

// Проверка формы до отправки на сервер. Возвращает ошибки по полям (пустой объект — всё верно).
function validate(values, isRegister) {
  const errors = {};
  if (isRegister && !values.name.trim()) errors.name = 'Введите имя.';
  if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = 'Введите корректный email.';
  // Длину пароля считаем в байтах, как сервер: русская буква занимает 2 байта.
  const passwordBytes = new TextEncoder().encode(values.password).length;
  if (passwordBytes < 10 || passwordBytes > 72) {
    errors.password = 'Пароль должен содержать от 10 до 72 байт.';
  }
  if (isRegister && values.password !== values.passwordAgain) {
    errors.passwordAgain = 'Пароли не совпадают.';
  }
  return errors;
}

export function AuthPage({ mode, onAuth }) {
  const register = mode === 'register';
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  // При переключении вход ↔ регистрация очищаем форму.
  useEffect(() => {
    setValues(emptyValues);
    setErrors({});
    setMessage('');
  }, [mode]);
  // Одна функция для всех полей: какое поле менять, берём из атрибута name.
  function change(event) {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
  }
  async function submit(event) {
    event.preventDefault();
    const formErrors = validate(values, register);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
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
      // Сервер может вернуть ошибки по полям, например «email уже занят».
      setErrors(error.fields || {});
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  let submitLabel = register ? 'Создать аккаунт' : 'Войти';
  if (busy) submitLabel = 'Подождите…';

  return (
    <div className="auth-layout">
      <div className="auth-visual">
        <Brand />
        <img src={`${ASSETS}hero-athlete.png`} alt="Атлет на фоне северных гор" />
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
              {submitLabel}
            </button>
          </form>
          <div className="auth-under">
            {register && 'После регистрации будет создан пользовательский аккаунт.'}
            {!register && (
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
