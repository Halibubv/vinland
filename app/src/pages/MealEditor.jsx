import React, { useEffect, useMemo, useState } from 'react';
import { api, formatNumber, localDate } from '../lib/api.js';
import { go as navigate } from '../lib/router.js';
import { mealTypes } from '../lib/constants.js';
import { Shell, Notice } from '../components/ui.jsx';

const blankItem = () => ({ key: crypto.randomUUID(), product_id: '', quantity_g: '100' });

export function MealEditor({ id, user }) {
  const query = new URLSearchParams(window.location.search);
  const draftKey = `vinland-meal-${user.id}-${id || 'new'}`;
  const [form, setForm] = useState({
    meal_date: query.get('date') || localDate(),
    meal_type: query.get('type') || 'breakfast',
    items: [blankItem()],
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  useEffect(() => {
    setLoading(true);
    setLoadError('');
    Promise.all([api('/products'), id ? api(`/meals/${id}`) : Promise.resolve(null)])
      .then(([catalog, existing]) => {
        setProducts(catalog.products);
        const meal = existing?.meal;
        const base = meal
          ? {
              meal_date: meal.meal_date,
              meal_type: meal.meal_type,
              items: meal.items.map((item) => ({
                key: crypto.randomUUID(),
                id: item.id,
                product_id: item.product_id,
                product_name_snapshot: item.product_name_snapshot,
                quantity_g: String(item.quantity_g),
                calories_snapshot: item.calories_snapshot,
                protein_snapshot: item.protein_snapshot,
                fat_snapshot: item.fat_snapshot,
                carbs_snapshot: item.carbs_snapshot,
              })),
            }
          : {
              meal_date: query.get('date') || localDate(),
              meal_type: query.get('type') || 'breakfast',
              items: [blankItem()],
            };
        try {
          setForm(JSON.parse(sessionStorage.getItem(draftKey) || 'null') || base);
        } catch {
          setForm(base);
        }
      })
      .catch((problem) => setLoadError(problem.message))
      .finally(() => setLoading(false));
  }, [id, loadAttempt]);
  function change(next) {
    setForm(next);
    sessionStorage.setItem(draftKey, JSON.stringify(next));
    setFields({});
  }
  function editItem(index, patch) {
    change({
      ...form,
      items: form.items.map((item, itemIndex) =>
        index === itemIndex ? { ...item, ...patch } : item,
      ),
    });
  }
  const preview = useMemo(
    () =>
      form.items.reduce(
        (total, item) => {
          const product = item.id
            ? {
                calories_per_100g: item.calories_snapshot,
                protein_per_100g: item.protein_snapshot,
                fat_per_100g: item.fat_snapshot,
                carbs_per_100g: item.carbs_snapshot,
              }
            : products.find((entry) => String(entry.id) === String(item.product_id));
          if (!product) return total;
          for (const key of ['calories', 'protein', 'fat', 'carbs'])
            total[key] +=
              (Number(product[`${key}_per_100g`] || 0) * Number(item.quantity_g || 0)) / 100;
          return total;
        },
        { calories: 0, protein: 0, fat: 0, carbs: 0 },
      ),
    [form.items, products],
  );
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    if (form.items.some((item) => !item.id && !item.product_id)) {
      setFields({ product_id: 'Выберите продукт для каждой позиции.' });
      setBusy(false);
      return;
    }
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
      sessionStorage.removeItem(draftKey);
      navigate(`/nutrition?date=${form.meal_date}`);
    } catch (problem) {
      setError(Object.values(problem.fields || {}).join(' ') || problem.message);
      setFields(problem.fields || {});
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!window.confirm('Удалить приём пищи? Это действие нельзя отменить.')) return;
    setBusy(true);
    try {
      await api(`/meals/${id}`, { method: 'DELETE' });
      sessionStorage.removeItem(draftKey);
      navigate('/nutrition');
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
    }
  }
  return (
    <Shell
      title={id ? 'Приём пищи' : 'Добавить питание'}
      subtitle="Выберите продукты и укажите граммовку"
      action={
        <a className="button button--outline" href="/nutrition">
          ← К дневнику
        </a>
      }
    >
      {loading ? (
        <p className="muted">Загружаем продукты…</p>
      ) : loadError ? (
        <Notice message={loadError} retry={() => setLoadAttempt((value) => value + 1)} />
      ) : (
        <form className="editor-form" onSubmit={save} noValidate>
          <div className="panel form-intro two-fields">
            <label>
              Дата
              <input
                type="date"
                value={form.meal_date}
                onChange={(event) => change({ ...form, meal_date: event.target.value })}
                required
              />
            </label>
            <label>
              Приём пищи
              <select
                value={form.meal_type}
                onChange={(event) => change({ ...form, meal_type: event.target.value })}
              >
                {Object.entries(mealTypes).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="section-subtitle">
            <h2>Продукты</h2>
            <button
              type="button"
              className="button button--outline"
              onClick={() => change({ ...form, items: [...form.items, blankItem()] })}
            >
              ＋ Добавить продукт
            </button>
          </div>
          {fields.product_id && <p className="field-error">{fields.product_id}</p>}
          {!products.length && (
            <p className="muted">
              В справочнике нет активных продуктов. Попросите администратора добавить их.
            </p>
          )}
          {form.items.map((item, index) => (
            <div className="panel meal-item-editor" key={item.key}>
              <span>{index + 1}</span>
              <label>
                Продукт
                {item.id ? (
                  <input
                    value={item.product_name_snapshot}
                    readOnly
                    title="Название и КБЖУ сохраняются снимком"
                  />
                ) : (
                  <select
                    value={item.product_id}
                    onChange={(event) => editItem(index, { product_id: event.target.value })}
                  >
                    <option value="">Выберите продукт</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label>
                Количество, г
                <input
                  type="number"
                  min="0.01"
                  max="999999"
                  step="0.01"
                  value={item.quantity_g}
                  onChange={(event) => editItem(index, { quantity_g: event.target.value })}
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  change({
                    ...form,
                    items: form.items.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
                aria-label={`Удалить продукт ${index + 1}`}
              >
                ×
              </button>
            </div>
          ))}
          <div className="panel meal-preview">
            <strong>Итого</strong>
            <span>{formatNumber(preview.calories)} ккал</span>
            <span>
              Б {formatNumber(preview.protein)} · Ж {formatNumber(preview.fat)} · У{' '}
              {formatNumber(preview.carbs)} г
            </span>
          </div>
          {error && <Notice message={error} />}
          <div className="form-actions">
            <button className="button button--primary" type="submit" disabled={busy}>
              {busy ? 'Сохраняем…' : 'Сохранить приём пищи'}
            </button>
            {id && (
              <button
                className="button button--danger"
                type="button"
                onClick={remove}
                disabled={busy}
              >
                Удалить приём пищи
              </button>
            )}
          </div>
        </form>
      )}
    </Shell>
  );
}
