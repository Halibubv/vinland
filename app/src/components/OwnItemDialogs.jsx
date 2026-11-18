// Окна «Своё упражнение» и «Свой продукт»: если нужной записи нет в справочнике,
// пользователь добавляет её сам. Запись сохраняется на сервере и видна только ему.
import React, { useState } from 'react';
import { api } from '../lib/api.js';
import { Modal } from './Dialogs.jsx';
import { Field } from './ui.jsx';

// Группы мышц для выбора (такие же, как в общем справочнике).
const muscleGroups = ['Ноги', 'Грудь', 'Спина', 'Плечи', 'Руки', 'Пресс'];

// Заголовок окна с кнопкой «Назад к списку».
function OwnHead({ title, onBack }) {
  return (
    <div className="modal-head">
      <h2>{title}</h2>
      <button type="button" className="modal-close" onClick={onBack} aria-label="Назад к списку">
        ×
      </button>
    </div>
  );
}

// Кнопки внизу формы и сообщение об ошибке.
function OwnActions({ busy, message, onBack }) {
  return (
    <>
      {message && (
        <p className="form-message" role="alert">
          {message}
        </p>
      )}
      <div className="modal-actions">
        <button className="button button--primary" type="submit" disabled={busy}>
          {busy ? 'Сохраняем…' : 'Добавить'}
        </button>
        <button className="button button--outline" type="button" onClick={onBack}>
          Назад к списку
        </button>
      </div>
    </>
  );
}

// Своё упражнение: название и группа мышц. onSaved(exercise) получает новую запись с сервера.
export function OwnExerciseDialog({ initialName, onSaved, onBack }) {
  const [name, setName] = useState(initialName);
  const [muscleGroup, setMuscleGroup] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(event) {
    event.preventDefault();
    if (!name.trim()) {
      setErrors({ name: 'Введите название упражнения.' });
      return;
    }
    setBusy(true);
    try {
      const body = { name: name.trim(), muscle_group: muscleGroup || null };
      const result = await api('/exercises', { method: 'POST', body });
      onSaved(result.exercise);
    } catch (problem) {
      setErrors(problem.fields || {});
      setMessage(problem.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Своё упражнение" className="own-dialog" onClose={onBack}>
      <form onSubmit={save} noValidate>
        <OwnHead title="Своё упражнение" onBack={onBack} />
        <p className="own-dialog-hint">
          Его увидите только вы. Картинка подберётся по группе мышц.
        </p>
        <Field
          label="Название"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
          placeholder="Например: Гиперэкстензия"
        />
        <span className="own-dialog-label">Группа мышц</span>
        <div className="own-dialog-chips">
          {muscleGroups.map((group) => (
            <button
              type="button"
              key={group}
              className={muscleGroup === group ? 'selected' : ''}
              aria-pressed={muscleGroup === group}
              onClick={() => setMuscleGroup(muscleGroup === group ? '' : group)}
            >
              {group}
            </button>
          ))}
        </div>
        <OwnActions busy={busy} message={message} onBack={onBack} />
      </form>
    </Modal>
  );
}

// Поля КБЖУ на 100 г в форме своего продукта.
const productFields = [
  { key: 'calories_per_100g', label: 'Калории', suffix: 'ккал' },
  { key: 'protein_per_100g', label: 'Белки', suffix: 'г' },
  { key: 'fat_per_100g', label: 'Жиры', suffix: 'г' },
  { key: 'carbs_per_100g', label: 'Углеводы', suffix: 'г' },
];

// Свой продукт: название и КБЖУ на 100 г (их пишут на упаковке).
export function OwnProductDialog({ initialName, onSaved, onBack }) {
  const [values, setValues] = useState({
    name: initialName,
    calories_per_100g: '',
    protein_per_100g: '',
    fat_per_100g: '',
    carbs_per_100g: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Одна функция для всех полей: какое поле менять, берём из атрибута name.
  function change(event) {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
  }

  async function save(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!values.name.trim()) nextErrors.name = 'Введите название продукта.';
    for (const field of productFields) {
      if (values[field.key] === '') nextErrors[field.key] = 'Заполните поле.';
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setBusy(true);
    try {
      const body = { ...values, name: values.name.trim() };
      const result = await api('/products', { method: 'POST', body });
      onSaved(result.product);
    } catch (problem) {
      setErrors(problem.fields || {});
      setMessage(problem.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Свой продукт" className="own-dialog" onClose={onBack}>
      <form onSubmit={save} noValidate>
        <OwnHead title="Свой продукт" onBack={onBack} />
        <p className="own-dialog-hint">КБЖУ на 100 г обычно написаны на упаковке.</p>
        <Field
          label="Название"
          name="name"
          value={values.name}
          onChange={change}
          error={errors.name}
          placeholder="Например: Сырники домашние"
        />
        <div className="own-dialog-grid">
          {productFields.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              name={field.key}
              value={values[field.key]}
              onChange={change}
              error={errors[field.key]}
              type="number"
              min="0"
              step="0.1"
              suffix={field.suffix}
            />
          ))}
        </div>
        <OwnActions busy={busy} message={message} onBack={onBack} />
      </form>
    </Modal>
  );
}
