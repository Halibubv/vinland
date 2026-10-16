import React, { useEffect, useState } from 'react';
import { api, formatNumber } from '../lib/api.js';
import { Shell, Notice, Empty } from '../components/ui.jsx';

const emptyCatalog = (kind) =>
  kind === 'exercises'
    ? { name: '', muscle_group: '', description: '', is_active: true }
    : {
        name: '',
        calories_per_100g: '',
        protein_per_100g: '',
        fat_per_100g: '',
        carbs_per_100g: '',
        is_active: true,
      };

export function AdminCatalog({ kind, user }) {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCatalog(kind));
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const label = kind === 'exercises' ? 'упражнений' : 'продуктов';
  function reload() {
    setError('');
    api(`/admin/${kind}`)
      .then((data) => setRows(data[kind]))
      .catch((problem) => setError(problem.message));
  }
  useEffect(() => {
    if (user.role === 'admin') reload();
  }, [kind]);
  useEffect(() => {
    if (!editing) return;
    const close = (event) => {
      if (event.key === 'Escape') setEditing(null);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [editing]);
  function open(row) {
    setFields({});
    setError('');
    setForm(
      row
        ? {
            ...row,
            is_active: row.is_active === true || row.is_active === 't' || row.is_active === '1',
          }
        : emptyCatalog(kind),
    );
    setEditing(row ? row.id : 'new');
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      await api(editing === 'new' ? `/admin/${kind}` : `/admin/${kind}/${editing}`, {
        method: editing === 'new' ? 'POST' : 'PUT',
        body: form,
      });
      setEditing(null);
      reload();
    } catch (problem) {
      setError(problem.message);
      setFields(problem.fields || {});
    } finally {
      setBusy(false);
    }
  }
  if (user.role !== 'admin')
    return (
      <Shell title="Доступ закрыт">
        <Notice message="Справочники доступны только администратору." />
      </Shell>
    );
  const filtered = (rows || []).filter((row) =>
    row.name.toLocaleLowerCase('ru-RU').includes(search.trim().toLocaleLowerCase('ru-RU')),
  );
  return (
    <div className="admin-page">
      <div className="admin-banner">
        <div className="content">
          <h1>Справочник {label}</h1>
        </div>
      </div>
      <main className="content admin-content">
        <div className="admin-tabs">
          <a href="/admin/exercises" className={kind === 'exercises' ? 'selected' : ''}>
            Упражнения
          </a>
          <a href="/admin/products" className={kind === 'products' ? 'selected' : ''}>
            Продукты
          </a>
          <a href="/" className="admin-back">
            ← В пользовательское приложение
          </a>
        </div>
        <section className="panel admin-table-panel">
          <div className="admin-tools">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={kind === 'exercises' ? 'Поиск упражнения' : 'Поиск продуктов'}
              aria-label="Поиск по справочнику"
            />
            <button className="button button--primary" onClick={() => open(null)}>
              ＋ Добавить {kind === 'exercises' ? 'упражнение' : 'продукт'}
            </button>
          </div>
          {error && !editing && <Notice message={error} retry={reload} />}
          {!rows ? (
            <p className="muted">Загружаем справочник…</p>
          ) : filtered.length ? (
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Название</th>
                    {kind === 'exercises' ? (
                      <>
                        <th>Группа мышц</th>
                        <th>Описание</th>
                      </>
                    ) : (
                      <>
                        <th>Ккал</th>
                        <th>Б, г</th>
                        <th>Ж, г</th>
                        <th>Угл., г</th>
                      </>
                    )}
                    <th>Статус</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      {kind === 'exercises' ? (
                        <>
                          <td>{row.muscle_group || '—'}</td>
                          <td className="description-cell">{row.description || '—'}</td>
                        </>
                      ) : (
                        <>
                          <td>{formatNumber(row.calories_per_100g)}</td>
                          <td>{formatNumber(row.protein_per_100g)}</td>
                          <td>{formatNumber(row.fat_per_100g)}</td>
                          <td>{formatNumber(row.carbs_per_100g)}</td>
                        </>
                      )}
                      <td>
                        <span
                          className={`status-dot ${row.is_active === true || row.is_active === 't' ? 'active' : ''}`}
                        />
                        {row.is_active === true || row.is_active === 't' ? 'Активно' : 'Неактивно'}
                      </td>
                      <td>
                        <button className="text-button" onClick={() => open(row)}>
                          Редактировать
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={search ? 'Ничего не найдено' : 'Справочник пока пуст'}
              detail={
                search
                  ? 'Попробуйте другой запрос.'
                  : 'Добавьте первую запись, чтобы она появилась здесь.'
              }
            />
          )}
        </section>
      </main>
      {editing && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={editing === 'new' ? 'Новая запись справочника' : 'Редактирование записи'}
          >
            <div className="modal-head">
              <h2>{editing === 'new' ? 'Новая запись' : 'Редактировать запись'}</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Закрыть">
                ×
              </button>
            </div>
            <form onSubmit={save} noValidate>
              <label>
                Название
                <input
                  autoFocus
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  maxLength={150}
                />
              </label>
              {fields.name && <small className="field-error">{fields.name}</small>}
              {kind === 'exercises' ? (
                <>
                  <label>
                    Группа мышц
                    <input
                      value={form.muscle_group || ''}
                      onChange={(event) => setForm({ ...form, muscle_group: event.target.value })}
                      maxLength={100}
                    />
                  </label>
                  <label>
                    Описание
                    <textarea
                      value={form.description || ''}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                    />
                  </label>
                </>
              ) : (
                <div className="form-grid">
                  {[
                    ['calories_per_100g', 'Ккал'],
                    ['protein_per_100g', 'Белки, г'],
                    ['fat_per_100g', 'Жиры, г'],
                    ['carbs_per_100g', 'Углеводы, г'],
                  ].map(([key, title]) => (
                    <label key={key}>
                      {title}
                      <input
                        type="number"
                        min="0"
                        max="999999"
                        step="0.01"
                        value={form[key]}
                        onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                      />
                      {fields[key] && <small className="field-error">{fields[key]}</small>}
                    </label>
                  ))}
                </div>
              )}
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                />
                Активная запись
              </label>
              {error && <Notice message={error} />}
              <div className="form-actions">
                <button className="button button--primary" type="submit" disabled={busy}>
                  {busy ? 'Сохраняем…' : 'Сохранить'}
                </button>
                <button
                  className="button button--outline"
                  type="button"
                  onClick={() => setEditing(null)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
