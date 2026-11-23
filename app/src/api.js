// Запросы к PHP-бэкенду. Все адреса начинаются с /api, сервер отвечает в JSON.
//
// Пример: api('/meals', 'POST', { meal_date: '2026-11-20', ... })
// method — 'GET' (по умолчанию), 'POST', 'PUT' или 'DELETE';
// body — объект, который отправится на сервер (для GET не нужен).
export async function api(path, method = 'GET', body) {
  let response;
  try {
    response = await fetch('/api' + path, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Нет связи с сервером. Проверьте подключение и повторите попытку.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Сервер вернул неожиданный ответ. Обновите страницу и повторите попытку.');
  }

  if (!response.ok) {
    // 401 — сессия на сервере закончилась. Перезагружаем страницу:
    // App.jsx увидит, что пользователь не вошёл, и покажет форму входа.
    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.location.reload();
    }
    // Сервер присылает текст ошибки (error) и ошибки по полям формы (fields).
    const error = new Error(data.error || 'Не удалось выполнить действие.');
    error.status = response.status;
    error.fields = data.fields || {};
    throw error;
  }

  return data;
}

// Текст ошибки для формы: ошибки по полям через пробел, а если их нет — общее сообщение.
export function errorText(error) {
  const fieldMessages = Object.values(error.fields || {}).join(' ');
  return fieldMessages || error.message;
}
