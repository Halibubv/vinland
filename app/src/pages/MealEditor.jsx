import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { dateLabel, localDate, parseDate } from '../lib/dates.js';
import { formatInt, formatNumber } from '../lib/format.js';
import { go as navigate } from '../lib/router.js';
import { A, mealTypes } from '../lib/constants.js';
import { Shell, Notice } from '../components/ui.jsx';
import { CatalogDialog, ConfirmDialog } from '../components/Dialogs.jsx';
import { DateStepper } from '../components/DateStepper.jsx';
import './MealEditor.css';

const nutrients = ['calories', 'protein', 'fat', 'carbs'];

// Saved items keep the values per 100 g from the day they were added (snapshots),
// new items use the current catalog values.
function per100(item) {
  return Object.fromEntries(
    nutrients.map((key) => [
      key,
      Number(item.id ? item[`${key}_snapshot`] : item[`${key}_per_100g`]),
    ]),
  );
}

function amounts(item) {
  const values = per100(item);
  const grams = Number(item.quantity_g) || 0;
  return Object.fromEntries(nutrients.map((key) => [key, (values[key] * grams) / 100]));
}

function macroLine(values, suffix = '') {
  return `Б ${formatNumber(values.protein)} · Ж ${formatNumber(values.fat)} · У ${formatNumber(values.carbs)}${suffix}`;
}

function initialForm() {
  const query = new URLSearchParams(window.location.search);
  return {
    meal_date: parseDate(query.get('date')) ? query.get('date') : localDate(),
    meal_type: mealTypes[query.get('type')] ? query.get('type') : 'breakfast',
    items: [],
  };
}

export function MealEditor({ id }) {
  const [form, setForm] = useState(initialForm);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    setLoading(true);
    setLoadError('');
    Promise.all([api('/products'), id ? api(`/meals/${id}`) : Promise.resolve(null)])
      .then(([catalog, existing]) => {
        setProducts(catalog.products);
        if (existing) {
          const { meal } = existing;
          setForm({
            meal_date: meal.meal_date,
            meal_type: meal.meal_type,
            items: meal.items.map((item) => ({
              ...item,
              key: crypto.randomUUID(),
              quantity_g: String(Number(item.quantity_g)),
            })),
          });
        }
        if (new URLSearchParams(window.location.search).get('add')) setPicking(true);
      })
      .catch((problem) => setLoadError(problem.message))
      .finally(() => setLoading(false));
  }, [id, loadAttempt]);
  const change = (patch) => {
    setForm((previous) => ({ ...previous, ...patch }));
    setError('');
  };
  const editItem = (key, patch) =>
    change({ items: form.items.map((item) => (item.key === key ? { ...item, ...patch } : item)) });
  const addProduct = (product) => {
    const key = crypto.randomUUID();
    change({
      items: [
        ...form.items,
        { ...product, id: undefined, product_id: product.id, quantity_g: '100', key },
      ],
    });
    setPicking(false);
    // Focus the grams field of the new row once it is rendered.
    setTimeout(() => document.getElementById(`grams-${key}`)?.select(), 0);
  };
  const total = useMemo(
    () =>
      form.items.reduce(
        (sum, item) => {
          const values = amounts(item);
          for (const key of nutrients) sum[key] += values[key];
          return sum;
        },
        { calories: 0, protein: 0, fat: 0, carbs: 0 },
      ),
    [form.items],
  );
  const backHref = `/nutrition?date=${form.meal_date}`;
  async function save(event) {
    event.preventDefault();
    if (!form.items.length) {
      setError('Добавьте хотя бы один продукт.');
      return;
    }
    if (form.items.some((item) => !(Number(item.quantity_g) > 0))) {
      setError('Укажите количество в граммах больше нуля для каждого продукта.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const body = {
        meal_date: form.meal_date,
        meal_type: form.meal_type,
        items: form.items.map((item) =>
          item.id
            ? { id: Number(item.id), quantity_g: item.quantity_g }
            : { product_id: Number(item.product_id), quantity_g: item.quantity_g },
        ),
      };
      await api(id ? `/meals/${id}` : '/meals', { method: id ? 'PUT' : 'POST', body });
      navigate(backHref);
    } catch (problem) {
      setError(Object.values(problem.fields || {}).join(' ') || problem.message);
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
  return (
    <Shell
      title={id ? mealTypes[form.meal_type] : 'Новый приём пищи'}
      subtitle={dateLabel(form.meal_date)}
      className="meal-editor-page"
    >
      {loading ? (
        <p className="muted">Загружаем продукты…</p>
      ) : loadError ? (
        <Notice message={loadError} retry={() => setLoadAttempt((value) => value + 1)} />
      ) : (
        <form className="meal-form" onSubmit={save} noValidate>
          <div className="meal-form-when">
            <div>
              <span className="meal-form-label">Дата</span>
              <DateStepper
                value={form.meal_date}
                onChange={(meal_date) => change({ meal_date })}
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
                    onClick={() => change({ meal_type: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <h2>Состав приёма пищи</h2>
          {!form.items.length && (
            <p className="muted meal-form-empty">
              Продуктов пока нет. Нажмите «Добавить продукт», найдите его в справочнике и укажите
              граммы.
            </p>
          )}
          <ul className="meal-items">
            {form.items.map((item) => {
              const values = amounts(item);
              return (
                <li className="panel meal-item" key={item.key}>
                  <h3>{item.product_name_snapshot || item.name}</h3>
                  <p>
                    {formatNumber(item.quantity_g)} г · {formatInt(values.calories)} ккал
                    <small>{macroLine(values)}</small>
                  </p>
                  <label className="meal-item-grams">
                    <img src={`${A}icon-pencil.svg`} alt="" />
                    Количество, г
                    <input
                      id={`grams-${item.key}`}
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      max="999999"
                      step="any"
                      value={item.quantity_g}
                      onChange={(event) => editItem(item.key, { quantity_g: event.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-button meal-item-remove"
                    onClick={() =>
                      change({ items: form.items.filter((entry) => entry.key !== item.key) })
                    }
                  >
                    <img src={`${A}icon-trash.svg`} alt="" />
                    Удалить из приёма пищи
                  </button>
                </li>
              );
            })}
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
            <img src={`${A}icon-plus.svg`} alt="" />
            Добавить продукт
          </button>
          <div className="form-actions">
            <button className="button button--primary" type="submit" disabled={busy}>
              {busy ? 'Сохраняем…' : id ? 'Сохранить изменения' : 'Сохранить в дневник'}
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
          describe={(product) =>
            `${formatInt(product.calories_per_100g)} ккал · ${macroLine({
              protein: product.protein_per_100g,
              fat: product.fat_per_100g,
              carbs: product.carbs_per_100g,
            })} / 100 г`
          }
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
