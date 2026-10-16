// Client-side navigation. Every internal link is a plain "/path" href, so it
// works with Ctrl+click and "open in new tab"; ordinary clicks are intercepted
// here and handled without reloading the page.

export function currentPath() {
  return window.location.pathname === '/ui/' ? '/' : window.location.pathname;
}

// Path plus query string: a change of either must remount the screen.
export function currentLocation() {
  return currentPath() + window.location.search;
}

export function go(path) {
  if (path !== currentLocation()) window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function internalHref(link) {
  if (link.target && link.target !== '_self') return null;
  if (link.hasAttribute('download')) return null;
  const href = link.getAttribute('href');
  if (!href || !href.startsWith('/') || href.startsWith('//')) return null;
  if (href.startsWith('/api/') || href.startsWith('/assets/')) return null;
  return href;
}

export function interceptLinks() {
  const follow = (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    const href = link && internalHref(link);
    if (!href) return;
    event.preventDefault();
    go(href);
  };
  document.addEventListener('click', follow);
  return () => document.removeEventListener('click', follow);
}
