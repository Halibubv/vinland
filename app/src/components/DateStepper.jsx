// Выбор даты: стрелки листают дни, а по клику на дату открывается календарь.
import React from 'react';
import { ASSETS } from '../lib/constants.js';
import { dateLabel, localDate, offsetDate } from '../lib/dates.js';

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
      <img src={`${ASSETS}icon-calendar.svg`} alt="" />
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
