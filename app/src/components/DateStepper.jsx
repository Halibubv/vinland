import React from 'react';
import { A } from '../lib/constants.js';
import { dateLabel, offsetDate } from '../lib/dates.js';

// "‹ 16 октября 2026 ›": arrows move by a day, the label opens the calendar.
export function DateStepper({ value, onChange, label = 'Дата', className = '' }) {
  return (
    <div className={`date-stepper ${className}`}>
      <img src={`${A}icon-calendar.svg`} alt="" />
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
          aria-label={label}
          onClick={(event) => event.currentTarget.showPicker?.()}
          onChange={(event) => event.target.value && onChange(event.target.value)}
        />
      </label>
      <button
        type="button"
        aria-label="Следующий день"
        onClick={() => onChange(offsetDate(value, 1))}
      >
        ›
      </button>
    </div>
  );
}
