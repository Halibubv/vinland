let csrf = '';

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (csrf && options.method && options.method !== 'GET') headers['X-CSRF-Token'] = csrf;
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method || 'GET',
      headers,
      credentials: 'same-origin',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
  if (data.csrf) csrf = data.csrf;
  if (!response.ok) {
    if (
      (response.status === 401 && path !== '/auth/login') ||
      (response.status === 403 && options.method && options.method !== 'GET')
    ) {
      try {
        const renewed = await session();
        if (!renewed.user && path !== '/auth/register' && path !== '/auth/login')
          window.dispatchEvent(new CustomEvent('vinland:auth-required'));
      } catch {
        /* Preserve the original error and form values; never replay a write. */
      }
    }
    const error = new Error(data.error || 'Не удалось выполнить действие.');
    error.status = response.status;
    error.fields = data.fields || {};
    throw error;
  }
  return data;
}

export function session() {
  return api('/session');
}
