// Мелкие общие элементы интерфейса, которые нужны на нескольких страницах:
// поле формы, каркас страницы, сообщение об ошибке, пустой список,
// выбор даты и фото у записи.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { dateLabel, localDate, offsetDate } from '../format.js';

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
            <img src={`/assets/${passwordVisible ? 'icon-eye-off.svg' : 'icon-eye.svg'}`} alt="" />
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
        <Link className="button button--primary" to={to}>
          {action}
        </Link>
      )}
    </div>
  );
}

// Выбор даты: стрелки листают дни, а по клику на дату открывается календарь.
// Выглядит как "‹ 16 октября 2026 ›". Поверх подписи лежит невидимый <input type="date">.
// Дальше сегодняшнего дня листать нельзя: записывать еду и тренировки на будущее нет смысла.
export function DateStepper({ value, onChange, label = 'Дата', className = '' }) {
  const today = localDate();
  const isToday = value >= today;

  function openCalendar(event) {
    // showPicker есть не во всех браузерах, поэтому сначала проверяем.
    if (event.currentTarget.showPicker) event.currentTarget.showPicker();
  }

  return (
    <div className={`date-stepper ${className}`}>
      <img src="/assets/icon-calendar.svg" alt="" />
      <button
        type="button"
        aria-label="Предыдущий день"
        onClick={() => onChange(offsetDate(value, -1))}
      >
        ‹
      </button>
      <label className="date-stepper-value">
        <span>{dateLabel(value)}</span>
        <input
          type="date"
          value={value}
          max={today}
          aria-label={label}
          onClick={openCalendar}
          onChange={(event) => {
            // Пустое значение бывает, когда в календаре нажали «Очистить».
            // Дату из будущего, набранную вручную, заменяем на сегодня.
            if (event.target.value)
              onChange(event.target.value > today ? today : event.target.value);
          }}
        />
      </label>
      <button
        type="button"
        aria-label="Следующий день"
        disabled={isToday}
        onClick={() => onChange(offsetDate(value, 1))}
      >
        ›
      </button>
    </div>
  );
}

// Фото упражнений по группе мышц (файлы в public/assets/entries).
const musclePhotos = {
  Ноги: 'exercise-legs.jpg',
  Грудь: 'exercise-chest.jpg',
  Спина: 'exercise-back.jpg',
  Плечи: 'exercise-shoulders.jpg',
  Руки: 'exercise-arms.jpg',
  Пресс: 'exercise-abs.jpg',
};

// Картинка из справочника (поле image) или null, если её нет.
// Картинки лежат в public/assets/catalog.
export function catalogImageUrl(item) {
  if (!item || !item.image) return null;
  return `/assets/catalog/${item.image}`;
}

// Фото упражнения: своя картинка из справочника (image), иначе общее фото
// группы мышц, иначе null (своё упражнение без группы).
export function exercisePhoto(muscleGroup, image) {
  if (image) return `/assets/catalog/${image}`;
  const file = musclePhotos[muscleGroup];
  if (!file) return null;
  return `/assets/entries/${file}`;
}

// Картинка слева от записи в списке: у приёма пищи — фото по его типу,
// у упражнения — своя картинка или фото по группе мышц, а если фото нет — иконка гантели.
export function EntryPhoto({ meal, muscleGroup, image }) {
  let photo = exercisePhoto(muscleGroup, image);
  if (meal) photo = `/assets/entries/meal-${meal}.jpg`;

  if (!photo) {
    return (
      <span className="entry-icon" title={muscleGroup}>
        <img src="/assets/icon-dumbbell.svg" alt="" />
      </span>
    );
  }
  return (
    <span className="entry-icon entry-icon--photo" title={muscleGroup}>
      <img src={photo} alt="" />
    </span>
  );
}
