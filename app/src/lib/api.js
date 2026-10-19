// Запросы к PHP-бэкенду. Все адреса начинаются с /api, ответ всегда в JSON.

// CSRF-токен приходит от сервера в ответах и отправляется обратно
// в заголовке при каждом изменяющем запросе (POST, PUT, DELETE).
let csrfToken = '';

export async function api(path, options = {}) {
  const method = options.method || 'GET';
  const isWrite = Boolean(options.method) && options.method !== 'GET';

  const headers = { 'Content-Type': 'application/json' };
  if (csrfToken && isWrite) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  let body = undefined;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body,
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

  if (data.csrf) {
    csrfToken = data.csrf;
  }

  if (!response.ok) {
    // 401 или 403 может значить, что сессия истекла. Спрашиваем сервер о сессии
    // и, если пользователь уже не вошёл, сообщаем приложению (App.jsx откроет вход).
    const notLoggedIn = response.status === 401 && path !== '/auth/login';
    const writeForbidden = response.status === 403 && isWrite;
    if (notLoggedIn || writeForbidden) {
      try {
        const renewed = await session();
        const isAuthForm = path === '/auth/register' || path === '/auth/login';
        if (!renewed.user && !isAuthForm) {
          window.dispatchEvent(new CustomEvent('vinland:auth-required'));
        }
      } catch {
        // Ошибку проверки сессии не показываем: важнее исходная ошибка,
        // а изменяющий запрос повторно не отправляем.
      }
    }

    // Текст ошибки и ошибки по полям формы (fields) приходят с сервера.
    const error = new Error(data.error || 'Не удалось выполнить действие.');
    error.status = response.status;
    error.fields = data.fields || {};
    throw error;
  }

  return data;
}

// Текущий пользователь (или null) и свежий CSRF-токен.
export function session() {
  return api('/session');
}

// Текст ошибки для формы: если сервер прислал ошибки по полям — все они через пробел,
// иначе общее сообщение.
export function errorText(problem) {
  const fieldMessages = Object.values(problem.fields || {}).join(' ');
  return fieldMessages || problem.message;
}
