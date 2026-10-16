import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { formatNumber } from '../lib/format.js';
import { A } from '../lib/constants.js';
import { Notice, Empty } from '../components/ui.jsx';
import { useModal } from '../components/Dialogs.jsx';
import './AdminCatalog.css';

// Wording and fields of the two catalogs.
const kinds = {
  exercises: {
    title: 'Справочник упражнений',
    tab: 'Упражнения',
    one: 'упражнение',
    search: 'Поиск упражнения',
    empty: { name: '', muscle_group: '', description: '', is_active: true },
  },
  products: {
    title: 'Справочник продуктов',
    tab: 'Продукты',
    one: 'продукт',
    search: 'Поиск продуктов',
    empty: {
      name: '',
      calories_per_100g: '',
      protein_per_100g: '',
      fat_per_100g: '',
      carbs_per_100g: '',
      is_active: true,
    },
  },
};

// Field, table heading, form label.
const nutrients = [
  ['calories_per_100g', 'Ккал', 'Калории, ккал'],
  ['protein_per_100g', 'Б, г', 'Белки, г'],
  ['fat_per_100g', 'Ж, г', 'Жиры, г'],
  ['carbs_per_100g', 'У, г', 'Углеводы, г'],
];

const isActive = (row) => row.is_active === true || row.is_active === 't';

// "Ноги · Базовое упражнение…" or "366 ккал · Б 12 · Ж 6 · У 60 / 100 г".
function rowSummary(kind, row) {
  if (kind === 'exercises')
    return [row.muscle_group, row.description].filter(Boolean).join(' · ') || 'Без описания';
  const n = (key) => formatNumber(row[key]);
  return `${n('calories_per_100g')} ккал · Б ${n('protein_per_100g')} · Ж ${n('fat_per_100g')} · У ${n('carbs_per_100g')} / 100 г`;
}

function EntryDialog({ kind, entry, onSaved, onClose }) {
  const modal = useModal(onClose);
  const [form, setForm] = useState(() =>
    entry ? { ...entry, is_active: isActive(entry) } : kinds[kind].empty,
  );
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      await api(entry ? `/admin/${kind}/${entry.id}` : `/admin/${kind}`, {
        method: entry ? 'PUT' : 'POST',
        body: form,
      });
      onSaved();
    } catch (problem) {
      setError(problem.message);
      setFields(problem.fields || {});
      setBusy(false);
    }
  }

  const title = `${entry ? 'Редактировать' : 'Добавить'} ${kinds[kind].one}`;
  return (
    <dialog {...modal} className="modal admin-dialog" aria-label={title}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
      </div>
      <form className="admin-form" onSubmit={save} noValidate>
        <label>
          Название
          <input data-autofocus value={form.name} onChange={set('name')} maxLength={150} />
          {fields.name && <small className="field-error">{fields.name}</small>}
        </label>
        {kind === 'exercises' ? (
          <>
            <label>
              Группа мышц (необязательно)
              <input
                value={form.muscle_group || ''}
                onChange={set('muscle_group')}
                maxLength={100}
              />
            </label>
            <label>
              Описание (необязательно)
              <textarea value={form.description || ''} onChange={set('description')} />
            </label>
          </>
        ) : (
          <div className="admin-form-grid">
            <p className="admin-form-hint">Все значения — на 100 г продукта.</p>
            {nutrients.map(([key, , label]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="999999"
                  step="0.01"
                  value={form[key]}
                  onChange={set(key)}
                />
                {fields[key] && <small className="field-error">{fields[key]}</small>}
              </label>
            ))}
          </div>
        )}
        <label className="admin-form-check">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
          />
          Активно — доступно для новых записей
        </label>
        {error && <Notice message={error} />}
        <div className="modal-actions">
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? 'Сохраняем…' : entry ? 'Сохранить изменения' : 'Добавить'}
          </button>
          <button className="button button--outline" type="button" onClick={onClose}>
            Отмена
          </button>
        </div>
      </form>
    </dialog>
  );
}

function Status({ row }) {
  return (
    <span className={`admin-status ${isActive(row) ? 'is-active' : ''}`}>
      {isActive(row) ? 'Активно' : 'Неактивно'}
    </span>
  );
}

export function AdminCatalog({ kind, user }) {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [toggling, setToggling] = useState(null);
  const text = kinds[kind];

  function reload() {
    setError('');
    api(`/admin/${kind}`)
      .then((data) => setRows(data[kind]))
      .catch((problem) => setError(problem.message));
  }
  useEffect(() => {
    setRows(null);
    setSearch('');
    if (user.role === 'admin') reload();
  }, [kind]);

  // Disabled entries stay in saved workouts and meals but cannot be picked again.
  async function toggle(row) {
    setToggling(row.id);
    setError('');
    try {
      const { id, ...values } = row;
      await api(`/admin/${kind}/${id}`, {
        method: 'PUT',
        body: { ...values, is_active: !isActive(row) },
      });
      reload();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setToggling(null);
    }
  }

  const needle = search.trim().toLocaleLowerCase('ru-RU');
  const filtered = (rows || []).filter((row) =>
    row.name.toLocaleLowerCase('ru-RU').includes(needle),
  );

  return (
    <>
      <div className="admin-banner">
        <div className="content">
          <h1>{user.role === 'admin' ? text.title : 'Доступ закрыт'}</h1>
        </div>
      </div>
      <main className="content admin-page">
        {user.role !== 'admin' ? (
          <Notice message="Справочники доступны только администратору." />
        ) : (
          <>
            <p className="admin-caption narrow-only">Администратор · Справочники</p>
            <nav className="admin-tabs" aria-label="Справочники">
              {Object.entries(kinds).map(([key, item]) => (
                <a
                  key={key}
                  href={`/admin/${key}`}
                  className={kind === key ? 'selected' : ''}
                  aria-current={kind === key ? 'page' : undefined}
                >
                  {item.tab}
                </a>
              ))}
              <a href="/" className="admin-back wide-only">
                ← В пользовательское приложение
              </a>
            </nav>

            <section className="admin-panel">
              <div className="admin-tools">
                <label className="admin-search">
                  <span className="sr-only">{text.search}</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={text.search}
                  />
                </label>
                <button className="button button--primary" onClick={() => setEditing('new')}>
                  <img src={`${A}icon-plus.svg`} alt="" />
                  Добавить {text.one}
                </button>
              </div>
              {error && <Notice message={error} retry={reload} />}
              {!rows ? (
                <p className="muted admin-loading">Загружаем справочник…</p>
              ) : !filtered.length ? (
                <Empty
                  title={search ? 'Ничего не найдено' : 'Справочник пока пуст'}
                  detail={
                    search
                      ? 'Попробуйте другой запрос.'
                      : 'Добавьте первую запись, чтобы она появилась здесь.'
                  }
                />
              ) : (
                <>
                  <table className="admin-table wide-only">
                    <thead>
                      <tr>
                        <th scope="col">Название</th>
                        {kind === 'exercises' ? (
                          <>
                            <th scope="col">Группа мышц</th>
                            <th scope="col">Описание</th>
                          </>
                        ) : (
                          nutrients.map(([key, label]) => (
                            <th scope="col" key={key}>
                              {label}
                            </th>
                          ))
                        )}
                        <th scope="col">Статус</th>
                        <th scope="col">
                          <span className="sr-only">Действия</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) => (
                        <tr key={row.id}>
                          <th scope="row">{row.name}</th>
                          {kind === 'exercises' ? (
                            <>
                              <td>{row.muscle_group || '—'}</td>
                              <td className="admin-description">{row.description || '—'}</td>
                            </>
                          ) : (
                            nutrients.map(([key]) => <td key={key}>{formatNumber(row[key])}</td>)
                          )}
                          <td>
                            <Status row={row} />
                          </td>
                          <td>
                            <button className="text-button" onClick={() => setEditing(row)}>
                              Редактировать
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <ul className="admin-cards narrow-only">
                    {filtered.map((row) => (
                      <li className="panel admin-card" key={row.id}>
                        <h2>{row.name}</h2>
                        <p>{rowSummary(kind, row)}</p>
                        <Status row={row} />
                        <button className="button button--outline" onClick={() => setEditing(row)}>
                          <img src={`${A}icon-pencil.svg`} alt="" />
                          Редактировать
                        </button>
                        <button
                          className="button button--outline"
                          onClick={() => toggle(row)}
                          disabled={toggling === row.id}
                        >
                          {isActive(row) ? 'Отключить' : 'Включить'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
            <p className="admin-note">
              Отключённые записи остаются в истории, но недоступны для новых записей.
            </p>
          </>
        )}
      </main>
      {editing && (
        <EntryDialog
          kind={kind}
          entry={editing === 'new' ? null : editing}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
