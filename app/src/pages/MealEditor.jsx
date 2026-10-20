// Создание и редактирование приёма пищи: дата, тип, список продуктов с граммами.
import React, { useEffect, useState } from 'react';
import { api, errorText } from '../lib/api.js';
import { dateLabel, localDate, parseDate } from '../lib/dates.js';
import { formatInt, formatNumber } from '../lib/format.js';
import { go as navigate } from '../lib/router.js';
import { ASSETS, mealTypes } from '../lib/constants.js';
import { Shell, Notice } from '../components/ui.jsx';
import { CatalogDialog, ConfirmDialog } from '../components/Dialogs.jsx';
import { DateStepper } from '../components/DateStepper.jsx';
import './MealEditor.css';

// КБЖУ на 100 г продукта. Сохранённые продукты хранят значения на день записи
// (поля *_snapshot), чтобы правка справочника не меняла историю.
// Новые, ещё не сохранённые, берут значения из справочника (поля *_per_100g).
function per100(item) {
  if (item.id) {
    return {
      calories: Number(item.calories_snapshot),
      protein: Number(item.protein_snapshot),
      fat: Number(item.fat_snapshot),
      carbs: Number(item.carbs_snapshot),
    };
  }
  return {
    calories: Number(item.calories_per_100g),
    protein: Number(item.protein_per_100g),
    fat: Number(item.fat_per_100g),
    carbs: Number(item.carbs_per_100g),
  };
}

// КБЖУ для указанного количества граммов.
function amounts(item) {
  const values = per100(item);
  const grams = Number(item.quantity_g) || 0;
  return {
    calories: (values.calories * grams) / 100,
    protein: (values.protein * grams) / 100,
    fat: (values.fat * grams) / 100,
    carbs: (values.carbs * grams) / 100,
  };
}

// Сумма КБЖУ по всем продуктам приёма пищи.
function mealTotal(items) {
  const total = { calories: 0, protein: 0, fat: 0, carbs: 0 };
  for (const item of items) {
    const values = amounts(item);
    total.calories += values.calories;
    total.protein += values.protein;
    total.fat += values.fat;
    total.carbs += values.carbs;
  }
  return total;
}

// "Б 12 · Ж 6 · У 60"
function macroLine(values, suffix = '') {
  return `Б ${formatNumber(values.protein)} · Ж ${formatNumber(values.fat)} · У ${formatNumber(values.carbs)}${suffix}`;
}

// Подсказка под продуктом в окне выбора: "366 ккал · Б 12 · Ж 6 · У 60 / 100 г".
function describeProduct(product) {
  const macros = macroLine({
    protein: product.protein_per_100g,
    fat: product.fat_per_100g,
    carbs: product.carbs_per_100g,
  });
  return `${formatInt(product.calories_per_100g)} ккал · ${macros} / 100 г`;
}

// Пустая форма. Дату и тип можно передать в адресе: /nutrition/new?date=...&type=lunch.
function initialForm() {
  const query = new URLSearchParams(window.location.search);
  const date = query.get('date');
  const type = query.get('type');
  return {
    meal_date: parseDate(date) ? date : localDate(),
    meal_type: mealTypes[type] ? type : 'breakfast',
    items: [],
  };
}

// Дата и тип приёма пищи (кнопки «Завтрак», «Обед»...).
function MealWhen({ form, onChange }) {
  return (
    <div className="meal-form-when">
      <div>
        <span className="meal-form-label">Дата</span>
        <DateStepper
          value={form.meal_date}
          onChange={(meal_date) => onChange({ meal_date })}
          label="Дата приёма пищи"
        />
      </div>
      <div role="radiogroup" aria-label="Приём пищи">
        <span className="meal-form-label">Приём пищи</span>
        <div className="meal-type-choice">
          {Object.entries(mealTypes).map(([value, label]) => (
            <button
              type="button"
              role="radio"
              aria-checked={form.meal_type === value}
              className={form.meal_type === value ? 'selected' : ''}
              key={value}
              onClick={() => onChange({ meal_type: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Карточка одного продукта: название, КБЖУ, поле граммов и кнопка удаления.
function MealItem({ item, onGramsChange, onRemove }) {
  const values = amounts(item);
  return (
    <li className="panel meal-item">
      <h3>{item.product_name_snapshot || item.name}</h3>
      <p>
        {formatNumber(item.quantity_g)} г · {formatInt(values.calories)} ккал
        <small>{macroLine(values)}</small>
      </p>
      <label className="meal-item-grams">
        <img src={`${ASSETS}icon-pencil.svg`} alt="" />
        Количество, г
        <input
          id={`grams-${item.key}`}
          type="number"
          inputMode="decimal"
          min="0.01"
          max="999999"
          step="any"
          value={item.quantity_g}
          onChange={(event) => onGramsChange(event.target.value)}
        />
      </label>
      <button type="button" className="text-button meal-item-remove" onClick={onRemove}>
        <img src={`${ASSETS}icon-trash.svg`} alt="" />
        Удалить из приёма пищи
      </button>
    </li>
  );
}

// id есть — редактируем сохранённый приём пищи, нет — создаём новый.
export function MealEditor({ id }) {
  const [form, setForm] = useState(initialForm);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // Увеличение счётчика заново запускает загрузку (кнопка «Повторить»).
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Загружаем справочник продуктов и, при редактировании, сам приём пищи.
  useEffect(() => {
    setLoading(true);
    setLoadError('');
    let mealRequest = null;
    if (id) mealRequest = api(`/meals/${id}`);
    Promise.all([api('/products'), mealRequest])
      .then(([catalog, existing]) => {
        setProducts(catalog.products);
        if (existing) {
          const meal = existing.meal;
          setForm({
            meal_date: meal.meal_date,
            meal_type: meal.meal_type,
            // key — уникальный ключ строки для React; граммы в поле ввода храним строкой.
            items: meal.items.map((item) => ({
              ...item,
              key: crypto.randomUUID(),
              quantity_g: String(Number(item.quantity_g)),
            })),
          });
        }
        // ?add=1 в адресе — сразу открыть окно выбора продукта.
        if (new URLSearchParams(window.location.search).get('add')) setPicking(true);
      })
      .catch((problem) => setLoadError(problem.message))
      .finally(() => setLoading(false));
  }, [id, loadAttempt]);

  function change(patch) {
    setForm((previous) => ({ ...previous, ...patch }));
    setError('');
  }

  function changeGrams(key, grams) {
    const items = form.items.map((item) => {
      if (item.key === key) return { ...item, quantity_g: grams };
      return item;
    });
    change({ items });
  }

  function removeItem(key) {
    change({ items: form.items.filter((item) => item.key !== key) });
  }

  function addProduct(product) {
    const key = crypto.randomUUID();
    // id: undefined — это новый продукт в приёме пищи, а не сохранённая строка.
    const newItem = { ...product, id: undefined, product_id: product.id, quantity_g: '100', key };
    change({ items: [...form.items, newItem] });
    setPicking(false);
    // Выделяем граммы новой строки, когда React её нарисует.
    setTimeout(() => {
      const input = document.getElementById(`grams-${key}`);
      if (input) input.select();
    }, 0);
  }

  const total = mealTotal(form.items);
  const backHref = `/nutrition?date=${form.meal_date}`;

  async function save(event) {
    event.preventDefault();
    if (!form.items.length) {
      setError('Добавьте хотя бы один продукт.');
      return;
    }
    const hasBadGrams = form.items.some((item) => !(Number(item.quantity_g) > 0));
    if (hasBadGrams) {
      setError('Укажите количество в граммах больше нуля для каждого продукта.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Сохранённые строки передаём по id, новые — по id продукта из справочника.
      const items = form.items.map((item) => {
        if (item.id) return { id: Number(item.id), quantity_g: item.quantity_g };
        return { product_id: Number(item.product_id), quantity_g: item.quantity_g };
      });
      const body = { meal_date: form.meal_date, meal_type: form.meal_type, items };
      if (id) await api(`/meals/${id}`, { method: 'PUT', body });
      else await api('/meals', { method: 'POST', body });
      navigate(backHref);
    } catch (problem) {
      setError(errorText(problem));
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/meals/${id}`, { method: 'DELETE' });
      navigate(backHref);
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
      setConfirming(false);
    }
  }

  let saveLabel = id ? 'Сохранить изменения' : 'Сохранить в дневник';
  if (busy) saveLabel = 'Сохраняем…';

  // Пока сохранённый приём пищи не загружен (или не найден), в форме ещё
  // значения по умолчанию — «Завтрак» и сегодня. Их в заголовке не показываем.
  let title = 'Новый приём пищи';
  let subtitle = dateLabel(form.meal_date);
  if (id) {
    const loaded = !loading && !loadError;
    title = loaded ? mealTypes[form.meal_type] : 'Приём пищи';
    subtitle = loaded ? subtitle : '';
  }

  return (
    <Shell title={title} subtitle={subtitle} className="meal-editor-page">
      {loading && <p className="muted">Загружаем продукты…</p>}
      {!loading && loadError && (
        <Notice message={loadError} retry={() => setLoadAttempt(loadAttempt + 1)} />
      )}
      {!loading && !loadError && (
        <form className="meal-form" onSubmit={save} noValidate>
          <MealWhen form={form} onChange={change} />
          <h2>Состав приёма пищи</h2>
          {!form.items.length && (
            <p className="muted meal-form-empty">
              Продуктов пока нет. Нажмите «Добавить продукт», найдите его в справочнике и укажите
              граммы.
            </p>
          )}
          <ul className="meal-items">
            {form.items.map((item) => (
              <MealItem
                key={item.key}
                item={item}
                onGramsChange={(grams) => changeGrams(item.key, grams)}
                onRemove={() => removeItem(item.key)}
              />
            ))}
          </ul>
          <div className="meal-total">
            <strong>Итого: {formatInt(total.calories)} ккал</strong>
            <span>{macroLine(total, ' г')}</span>
            <small>
              Название и КБЖУ сохраняются на дату записи: изменение справочника не меняет историю.
            </small>
          </div>
          {error && <Notice message={error} />}
          <button
            type="button"
            className="button button--outline meal-add"
            onClick={() => setPicking(true)}
          >
            <img src={`${ASSETS}icon-plus.svg`} alt="" />
            Добавить продукт
          </button>
          <div className="form-actions">
            <button className="button button--primary" type="submit" disabled={busy}>
              {saveLabel}
            </button>
            <a className="button button--outline" href={backHref}>
              Отмена
            </a>
            {id && (
              <button
                className="button button--danger"
                type="button"
                onClick={() => setConfirming(true)}
                disabled={busy}
              >
                Удалить приём пищи
              </button>
            )}
          </div>
        </form>
      )}
      {picking && (
        <CatalogDialog
          title="Добавить продукт"
          items={products}
          describe={describeProduct}
          onChoose={addProduct}
          onClose={() => setPicking(false)}
        />
      )}
      {confirming && (
        <ConfirmDialog
          title="Удалить приём пищи?"
          busy={busy}
          onConfirm={remove}
          onClose={() => setConfirming(false)}
        >
          {mealTypes[form.meal_type]} за {dateLabel(form.meal_date)} будет удалён из дневника вместе
          со всеми продуктами. Это действие нельзя отменить.
        </ConfirmDialog>
      )}
    </Shell>
  );
}
