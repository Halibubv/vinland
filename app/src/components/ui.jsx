import React, { useEffect, useRef, useState } from 'react';
import { formatNumber } from '../lib/api.js';
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
  const percent = target ? Math.min(100, Math.round((Number(value) / Number(target)) * 100)) : 0;
  return (
    <div className="progress-stat">
      <div className="progress-label">
        <span>{label}</span>
        <strong>
          {formatNumber(value)} / {target ? formatNumber(target) : '—'} {unit}
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

export function CatalogDialog({ title, items, onChoose, onClose }) {
  const dialogRef = useRef(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    dialog.querySelector('input')?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);
  const filtered = items.filter((item) =>
    item.name.toLocaleLowerCase('ru-RU').includes(query.toLocaleLowerCase('ru-RU')),
  );
  function keepFocus(event) {
    if (event.key !== 'Tab') return;
    const controls = [...dialogRef.current.querySelectorAll('button, input')].filter(
      (node) => !node.disabled,
    );
    const first = controls[0];
    const last = controls.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first || !dialogRef.current.contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || !dialogRef.current.contains(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <dialog
      ref={dialogRef}
      className="catalog-dialog"
      onClose={onClose}
      onKeyDown={keepFocus}
      aria-label={title}
    >
      <div className="catalog-dialog-head">
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
      </div>
      <input
        autoFocus
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Поиск по справочнику"
        placeholder="Поиск по справочнику"
      />
      <div className="catalog-options">
        {filtered.length ? (
          filtered.map((item) => (
            <button type="button" key={item.id} onClick={() => onChoose(item)}>
              <strong>{item.name}</strong>
              {item.muscle_group && <small>{item.muscle_group}</small>}
              {item.calories_per_100g !== undefined && (
                <small>{formatNumber(item.calories_per_100g)} ккал / 100 г</small>
              )}
            </button>
          ))
        ) : (
          <p className="muted">Ничего не найдено.</p>
        )}
      </div>
    </dialog>
  );
}

export function DailyGoals({ day, goals }) {
  const rows = [
    ['Белки', 'protein', 'г', 'icon-muscle.svg'],
    ['Жиры', 'fat', 'г', 'icon-drop.svg'],
    ['Углеводы', 'carbs', 'г', 'icon-wheat.svg'],
  ];
  const percent = goals.calories
    ? Math.min(100, Math.round((day.calories / goals.calories) * 100))
    : 0;
  return (
    <div className="panel daily-goals">
      <div className="daily-calories">
        <img src={`${A}icon-flame.svg`} alt="" />
        <span>
          Сегодня в рационе
          <strong>
            {formatNumber(day.calories)} / {goals.calories ? formatNumber(goals.calories) : '—'}{' '}
            ккал
          </strong>
        </span>
        <div className="bar-with-percent">
          <div className="progress-track">
            <span style={{ width: `${percent}%` }} />
          </div>
          <b>{goals.calories ? `${percent}%` : '—'}</b>
        </div>
      </div>
      <div className="daily-macros">
        {rows.map(([label, key, unit, icon]) => {
          const target = goals[key];
          const value = day[key];
          const progress = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
          return (
            <div key={key}>
              <span>
                <img src={`${A}${icon}`} alt="" />
                {label}
              </span>
              <strong>
                {formatNumber(value)} / {target ? formatNumber(target) : '—'} {unit}
              </strong>
              <div className="bar-with-percent">
                <div className="progress-track">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <small>{target ? `${progress}%` : '—'}</small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
