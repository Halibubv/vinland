// Администрирование справочников упражнений и продуктов (только для роли admin).
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { formatNumber } from '../lib/format.js';
import { ASSETS } from '../lib/constants.js';
import { Notice, Empty } from '../components/ui.jsx';
import { useModal } from '../components/Dialogs.jsx';
import './AdminCatalog.css';

// Тексты и пустая форма для каждого из двух справочников.
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

// Поля КБЖУ продукта: поле в базе, заголовок столбца таблицы и подпись в форме.
const nutrients = [
  { key: 'calories_per_100g', column: 'Ккал', label: 'Калории, ккал' },
  { key: 'protein_per_100g', column: 'Б, г', label: 'Белки, г' },
  { key: 'fat_per_100g', column: 'Ж, г', label: 'Жиры, г' },
  { key: 'carbs_per_100g', column: 'У, г', label: 'Углеводы, г' },
];

// Сервер отдаёт is_active как true или false (в MySQL это 1 или 0, см. backend/admin.php).
function isActive(row) {
  return row.is_active === true;
}

// Строка для карточки на телефоне:
// "Ноги · Базовое упражнение…" или "366 ккал · Б 12 · Ж 6 · У 60 / 100 г".
function rowSummary(kind, row) {
  if (kind === 'exercises') {
    const parts = [row.muscle_group, row.description].filter(Boolean);
    return parts.join(' · ') || 'Без описания';
  }
  const calories = formatNumber(row.calories_per_100g);
  const protein = formatNumber(row.protein_per_100g);
  const fat = formatNumber(row.fat_per_100g);
  const carbs = formatNumber(row.carbs_per_100g);
  return `${calories} ккал · Б ${protein} · Ж ${fat} · У ${carbs} / 100 г`;
}

// Окно добавления или редактирования записи. entry = null — новая запись.
function EntryDialog({ kind, entry, onSaved, onClose }) {
  const modal = useModal(onClose);
  const [form, setForm] = useState(() => {
    if (entry) return { ...entry, is_active: isActive(entry) };
    return kinds[kind].empty;
  });
  // Ошибки по полям от сервера, например { name: 'Такое название уже есть.' }.
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateField(key, value) {
    setForm({ ...form, [key]: value });
  }

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
  let saveLabel = entry ? 'Сохранить изменения' : 'Добавить';
  if (busy) saveLabel = 'Сохраняем…';
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
          <input
            data-autofocus
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            maxLength={150}
          />
          {fields.name && <small className="field-error">{fields.name}</small>}
        </label>
        {kind === 'exercises' ? (
          <>
            <label>
              Группа мышц (необязательно)
              <input
                value={form.muscle_group || ''}
                onChange={(event) => updateField('muscle_group', event.target.value)}
                maxLength={100}
              />
            </label>
            <label>
              Описание (необязательно)
              <textarea
                value={form.description || ''}
                onChange={(event) => updateField('description', event.target.value)}
              />
            </label>
          </>
        ) : (
          <div className="admin-form-grid">
            <p className="admin-form-hint">Все значения — на 100 г продукта.</p>
            {nutrients.map((nutrient) => (
              <label key={nutrient.key}>
                {nutrient.label}
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="999999"
                  step="0.01"
                  value={form[nutrient.key]}
                  onChange={(event) => updateField(nutrient.key, event.target.value)}
                />
                {fields[nutrient.key] && (
                  <small className="field-error">{fields[nutrient.key]}</small>
                )}
              </label>
            ))}
          </div>
        )}
        <label className="admin-form-check">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => updateField('is_active', event.target.checked)}
          />
          Активно — доступно для новых записей
        </label>
        {error && <Notice message={error} />}
        <div className="modal-actions">
          <button className="button button--primary" type="submit" disabled={busy}>
            {saveLabel}
          </button>
          <button className="button button--outline" type="button" onClick={onClose}>
            Отмена
          </button>
        </div>
      </form>
    </dialog>
  );
}

// Метка «Активно» / «Неактивно».
function Status({ row }) {
  return (
    <span className={`admin-status ${isActive(row) ? 'is-active' : ''}`}>
      {isActive(row) ? 'Активно' : 'Неактивно'}
    </span>
  );
}

// kind — 'exercises' или 'products'.
export function AdminCatalog({ kind, user }) {
  const isAdmin = user.role === 'admin';
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  // Запись в окне редактирования: объект строки, 'new' для новой или null — окно закрыто.
  const [editing, setEditing] = useState(null);
  // id записи, которую сейчас включаем или отключаем.
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
    if (isAdmin) reload();
  }, [kind]);

  // Отключённые записи остаются в сохранённых тренировках и приёмах пищи,
  // но выбрать их для новых записей уже нельзя.
  async function toggle(row) {
    setToggling(row.id);
    setError('');
    try {
      // Отправляем ту же запись, поменяв только is_active (id уже есть в адресе).
      const body = { ...row, is_active: !isActive(row) };
      delete body.id;
      await api(`/admin/${kind}/${row.id}`, { method: 'PUT', body });
      reload();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setToggling(null);
    }
  }

  const searchText = search.trim().toLocaleLowerCase('ru-RU');
  const filtered = (rows || []).filter((row) =>
    row.name.toLocaleLowerCase('ru-RU').includes(searchText),
  );

  return (
    <>
      <div className="admin-banner">
        <div className="content">
          <h1>{isAdmin ? text.title : 'Доступ закрыт'}</h1>
        </div>
      </div>
      <main className="content admin-page">
        {!isAdmin && <Notice message="Справочники доступны только администратору." />}
        {isAdmin && (
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
                  <img src={`${ASSETS}icon-plus.svg`} alt="" />
                  Добавить {text.one}
                </button>
              </div>
              {error && <Notice message={error} retry={reload} />}
              {!rows && <p className="muted admin-loading">Загружаем справочник…</p>}
              {rows && filtered.length === 0 && search && (
                <Empty title="Ничего не найдено" detail="Попробуйте другой запрос." />
              )}
              {rows && filtered.length === 0 && !search && (
                <Empty
                  title="Справочник пока пуст"
                  detail="Добавьте первую запись, чтобы она появилась здесь."
                />
              )}
              {rows && filtered.length > 0 && (
                <>
                  {/* Таблица — на широком экране, карточки — на телефоне. */}
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
                          nutrients.map((nutrient) => (
                            <th scope="col" key={nutrient.key}>
                              {nutrient.column}
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
                            nutrients.map((nutrient) => (
                              <td key={nutrient.key}>{formatNumber(row[nutrient.key])}</td>
                            ))
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
                          <img src={`${ASSETS}icon-pencil.svg`} alt="" />
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
