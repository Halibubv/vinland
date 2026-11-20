// Панель администратора: общая статистика сайта и список пользователей
// (сменить роль или удалить пользователя).
import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Notice } from '../components/ui.jsx';
import { ConfirmDialog } from '../components/Dialogs.jsx';
import { AdminTabs } from './AdminCatalog.jsx';
import './AdminCatalog.css';
import './AdminUsers.css';

// Плитки статистики: ключ из ответа сервера и подпись.
const statTiles = [
  { key: 'users', label: 'Пользователей' },
  { key: 'workouts', label: 'Тренировок' },
  { key: 'meals', label: 'Приёмов пищи' },
  { key: 'exercises', label: 'Упражнений в справочнике' },
  { key: 'products', label: 'Продуктов в справочнике' },
];

export function AdminUsers({ user }) {
  const isAdmin = user.role === 'admin';
  // data — ответ сервера: { stats: {...}, users: [...] }.
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  // Пользователь, которого собираемся удалить (окно подтверждения), или null.
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    setError('');
    api('/admin/users')
      .then(setData)
      .catch((problem) => setError(problem.message));
  }
  useEffect(() => {
    if (isAdmin) reload();
  }, []);

  async function changeRole(row, role) {
    setError('');
    try {
      setData(await api(`/admin/users/${row.id}`, 'PUT', { role }));
    } catch (problem) {
      setError(problem.message);
    }
  }

  async function remove() {
    setBusy(true);
    setError('');
    try {
      setData(await api(`/admin/users/${deleting.id}`, 'DELETE'));
    } catch (problem) {
      setError(problem.message);
    }
    setBusy(false);
    setDeleting(null);
  }

  return (
    <>
      <div className="admin-banner">
        <div className="content">
          <h1>{isAdmin ? 'Панель администратора' : 'Доступ закрыт'}</h1>
        </div>
      </div>
      <main className="content admin-page">
        {!isAdmin && <Notice message="Этот раздел доступен только администратору." />}
        {isAdmin && (
          <>
            <AdminTabs current="users" />
            {error && <Notice message={error} retry={reload} />}
            {!data && !error && <p className="muted">Загружаем данные…</p>}
            {data && (
              <>
                <ul className="admin-stats">
                  {statTiles.map((tile) => (
                    <li className="panel" key={tile.key}>
                      <strong>{data.stats[tile.key]}</strong>
                      <span>{tile.label}</span>
                    </li>
                  ))}
                </ul>

                <section className="admin-panel">
                  <table className="admin-table admin-users">
                    <thead>
                      <tr>
                        <th scope="col">Имя</th>
                        <th scope="col">Email</th>
                        <th scope="col">Тренировок</th>
                        <th scope="col">Приёмов пищи</th>
                        <th scope="col">Роль</th>
                        <th scope="col">
                          <span className="sr-only">Действия</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.users.map((row) => {
                        const isMe = row.id === user.id;
                        return (
                          <tr key={row.id}>
                            <th scope="row">{row.name}</th>
                            <td>{row.email}</td>
                            <td>{row.workouts}</td>
                            <td>{row.meals}</td>
                            <td>
                              <select
                                value={row.role}
                                disabled={isMe}
                                onChange={(event) => changeRole(row, event.target.value)}
                                aria-label={`Роль: ${row.name}`}
                              >
                                <option value="user">Пользователь</option>
                                <option value="admin">Администратор</option>
                              </select>
                            </td>
                            <td>
                              {!isMe && (
                                <button className="text-button" onClick={() => setDeleting(row)}>
                                  Удалить
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>
              </>
            )}
          </>
        )}
      </main>
      {deleting && (
        <ConfirmDialog
          title="Удалить пользователя?"
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        >
          {deleting.name} ({deleting.email}) и все его тренировки и приёмы пищи будут удалены.
        </ConfirmDialog>
      )}
    </>
  );
}
