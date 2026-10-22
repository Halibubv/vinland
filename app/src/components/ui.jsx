// Мелкие общие элементы интерфейса: поле формы, полоска прогресса,
// каркас страницы раздела, сообщение об ошибке и пустое состояние.
import React, { useState } from 'react';
import { formatInt, percentOf } from '../lib/format.js';
import { ASSETS } from '../lib/constants.js';

// Поле формы с подписью и текстом ошибки. Для пароля есть кнопка-глазок «Показать пароль».
export function Field({
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
  const [passwordVisible, setPasswordVisible] = useState(false);
  let inputType = type;
  if (type === 'password' && passwordVisible) inputType = 'text';
  // ?? '': пустое значение (null из базы) показываем как пустое поле.
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
            onClick={() => setPasswordVisible(!passwordVisible)}
            aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
          >
            <img src={`${ASSETS}${passwordVisible ? 'icon-eye-off.svg' : 'icon-eye.svg'}`} alt="" />
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

// Полоска «съедено / цель» (используется в демо-блоке на лендинге).
export function Progress({ label, value, target, unit = 'г' }) {
  const percent = percentOf(value, target);
  return (
    <div className="progress-stat">
      <div className="progress-label">
        <span>{label}</span>
        <strong>
          {formatInt(value)} / {target ? formatInt(target) : '—'} {unit}
        </strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${percent}%` }} />
      </div>
      <span className="progress-percent">{target ? `${percent}%` : 'Цель не задана'}</span>
    </div>
  );
}

// Ссылка назад над заголовком страницы: "‹ Тренировки / 27 сентября 2026".
export function BackLink({ to, label, current }) {
  return (
    <nav className="back-link" aria-label="Навигация по разделу">
      <a href={to}>
        <span aria-hidden="true">‹</span>
        {label}
      </a>
      {current && (
        <>
          <span className="back-link-sep" aria-hidden="true">
            /
          </span>
          <span className="back-link-current">{current}</span>
        </>
      )}
    </nav>
  );
}

// Каркас страницы раздела: полоса-баннер, заголовок, кнопка справа и содержимое.
export function Shell({ title, subtitle, action, back, children, className = '' }) {
  return (
    <>
      <div className="section-banner" />
      <main className={`content section-content ${className}`}>
        {back}
        <div className="section-title-row">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </main>
    </>
  );
}

// Сообщение об ошибке; если передан retry — с кнопкой «Повторить».
export function Notice({ message, retry }) {
  return (
    <div className="section-notice" role="alert">
      <p>{message}</p>
      {retry && (
        <button className="button button--outline" onClick={retry}>
          Повторить
        </button>
      )}
    </div>
  );
}

// Пустой список: заголовок, пояснение и, если есть ссылка to, кнопка действия.
export function Empty({ title, detail, action, to }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{detail}</p>
      {to && (
        <a className="button button--primary" href={to}>
          {action}
        </a>
      )}
    </div>
  );
}
