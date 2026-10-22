// Картинка слева от упражнения или приёма пищи в списках.
import React from 'react';
import { ASSETS } from '../lib/constants.js';

const mealIcons = {
  breakfast: 'icon-sun.svg',
  lunch: 'icon-sun.svg',
  snack: 'nav-food.svg',
  dinner: 'nav-food.svg',
};

// Фото по группе мышц из справочника упражнений (файлы в public/assets/entries).
const musclePhotos = {
  Ноги: 'exercise-legs.jpg',
  Грудь: 'exercise-chest.jpg',
  Спина: 'exercise-back.jpg',
  Плечи: 'exercise-shoulders.jpg',
  Руки: 'exercise-arms.jpg',
  Пресс: 'exercise-abs.jpg',
};

// Маленькая иконка: у заголовка приёма пищи. meal — тип приёма пищи; без него — гантель.
export function EntryIcon({ meal, label }) {
  let icon = 'icon-dumbbell.svg';
  if (meal) icon = mealIcons[meal] || 'nav-food.svg';

  return (
    <span className="entry-icon" title={label}>
      <img src={`${ASSETS}${icon}`} alt="" />
    </span>
  );
}

// Фото у записи: у упражнения — по группе мышц, у приёма пищи — по его типу.
// Если для группы мышц фото нет (админ добавил новую группу), показываем иконку.
export function EntryPhoto({ meal, muscleGroup }) {
  const photo = entryPhotoUrl({ meal, muscleGroup });
  if (!photo) return <EntryIcon label={muscleGroup} />;

  return (
    <span className="entry-icon entry-icon--photo" title={muscleGroup}>
      <img src={photo} alt="" />
    </span>
  );
}

// Путь к фото записи или null, если подходящего фото нет.
export function entryPhotoUrl({ meal, muscleGroup }) {
  let photo = musclePhotos[muscleGroup];
  if (meal) photo = `meal-${meal}.jpg`;
  if (!photo) return null;
  return `${ASSETS}entries/${photo}`;
}
