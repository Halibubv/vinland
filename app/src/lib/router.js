// Переходы между экранами без перезагрузки страницы.
// Все внутренние ссылки — обычные <a href="/путь">, поэтому работают Ctrl+клик
// и «открыть в новой вкладке»; обычный клик перехватывается здесь.

export function currentPath() {
  // Собранный фронтенд лежит в /ui/ (см. vite.config.js), этот адрес — тоже главная.
  if (window.location.pathname === '/ui/') return '/';
  return window.location.pathname;
}

// Путь вместе с ?параметрами: при смене любого из них экран открывается заново.
export function currentLocation() {
  return currentPath() + window.location.search;
}

// Перейти на другой экран. App.jsx слушает событие popstate и перерисовывается.
// replace: true — заменить текущую запись истории, а не добавить новую. Так после
// сохранения формы кнопка «Назад» не возвращает к уже отправленной форме.
export function go(path, { replace = false } = {}) {
  if (replace) {
    window.history.replaceState({}, '', path);
  } else if (path !== currentLocation()) {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// Адрес ссылки, если её можно открыть внутри приложения, иначе null.
function internalHref(link) {
  if (link.target && link.target !== '_self') return null;
  if (link.hasAttribute('download')) return null;
  const href = link.getAttribute('href');
  if (!href || !href.startsWith('/') || href.startsWith('//')) return null;
  // API и картинки отдаёт сервер, их не перехватываем.
  if (href.startsWith('/api/') || href.startsWith('/assets/')) return null;
  return href;
}

// Включает перехват кликов по ссылкам. Возвращает функцию, которая его выключает.
export function interceptLinks() {
  function handleClick(event) {
    if (event.defaultPrevented || event.button !== 0) return;
    // С зажатой клавишей браузер должен сам открыть новую вкладку или окно.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = internalHref(link);
    if (!href) return;
    event.preventDefault();
    go(href);
  }
  document.addEventListener('click', handleClick);
  return () => document.removeEventListener('click', handleClick);
}
