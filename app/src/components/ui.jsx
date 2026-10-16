import React, { useState } from 'react';
import { formatInt, percentOf } from '../lib/format.js';
import { A } from '../lib/constants.js';

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

export function Shell({ title, subtitle, action, children, className = '' }) {
  return (
    <>
      <div className="section-banner" />
      <main className={`content section-content ${className}`}>
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
