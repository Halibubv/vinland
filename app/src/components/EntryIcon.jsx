// Квадратная иконка слева от упражнения или приёма пищи в списках.
import React from 'react';
import { ASSETS } from '../lib/constants.js';

const mealIcons = {
  breakfast: 'icon-sun.svg',
  lunch: 'icon-sun.svg',
  snack: 'nav-food.svg',
  dinner: 'nav-food.svg',
};

// Вместо фотографий — нейтральная иконка: у записей справочника картинок нет.
// meal — тип приёма пищи; без него показывается гантель (упражнение).
export function EntryIcon({ meal, label }) {
  let icon = 'icon-dumbbell.svg';
  if (meal) icon = mealIcons[meal] || 'nav-food.svg';

  return (
    <span className="entry-icon" title={label}>
      <img src={`${ASSETS}${icon}`} alt="" />
    </span>
  );
}
