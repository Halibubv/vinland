import assert from 'node:assert/strict';

const base = process.env.TEST_API_URL || 'http://127.0.0.1:8081';
const first = await fetch(`${base}/api/session`);
assert.equal(first.status, 200);
assert.equal(first.headers.get('cache-control'), 'no-store');
const cookie = first.headers.get('set-cookie');
assert.match(cookie, /HttpOnly/i);
assert.match(cookie, /SameSite=Lax/i);
const session = await first.json();
assert.equal(session.user, null);
assert.match(session.csrf, /^[a-f0-9]{64}$/);
const headers = { Cookie: cookie.split(';')[0], 'Content-Type': 'application/json' };

const forbidden = await fetch(`${base}/api/missing`, { method: 'POST', headers, body: '{}' });
assert.equal(forbidden.status, 403);
assert.equal((await forbidden.json()).error, 'Обновите страницу и повторите действие.');
const authenticatedRequest = await fetch(`${base}/api/missing`, {
  method: 'POST', headers: { ...headers, 'X-CSRF-Token': session.csrf }, body: '{}',
});
assert.equal(authenticatedRequest.status, 404);
for (const path of ['/.env', '/backend/config.php', '/database/001-schema.sql']) {
  const response = await fetch(base + path, { headers });
  assert.equal(response.status, 404, path);
  assert.doesNotMatch(await response.text(), /DB_PASSWORD|CREATE TABLE|<\?php/, path);
}
// Unknown page: the interface with 404 (React shows "not found"), unknown API address: JSON 404.
const unknownPage = await fetch(`${base}/no-such-page`);
assert.equal(unknownPage.status, 404);
assert.match(unknownPage.headers.get('content-type'), /text\/html/);
const unknownApi = await fetch(`${base}/api/no-such-route`, { headers });
assert.equal(unknownApi.status, 404);
assert.equal((await unknownApi.json()).error, 'Страница не найдена.');
console.log('HTTP checks passed: session, cookie flags, CSRF, private file protection, unknown pages.');
