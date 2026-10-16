import React from 'react';
import { A } from '../lib/constants.js';

const mealIcons = {
  breakfast: 'icon-sun.svg',
  lunch: 'icon-sun.svg',
  snack: 'nav-food.svg',
  dinner: 'nav-food.svg',
};

// A neutral icon tile instead of a stock photo: real catalog entries have no pictures.
export function EntryIcon({ meal, label }) {
  const icon = meal ? mealIcons[meal] || 'nav-food.svg' : 'icon-dumbbell.svg';
  return (
    <span className="entry-icon" title={label}>
      <img src={`${A}${icon}`} alt="" />
    </span>
  );
}
