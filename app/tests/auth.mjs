import assert from 'node:assert/strict';

const base = process.env.TEST_API_URL || 'http://127.0.0.1:8081';
const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const email = `user-${unique}@example.test`;
let cookie;
let csrf;

function keepCookie(response) {
  const setCookie = response.headers.getSetCookie?.()[0] ?? response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
}

async function session() {
  const response = await fetch(`${base}/api/session`, { headers: cookie ? { Cookie: cookie } : {} });
  assert.equal(response.status, 200);
  keepCookie(response);
  const data = await response.json();
  csrf = data.csrf;
  return data;
}

async function api(path, method, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  keepCookie(response);
  const data = await response.json();
  if (data.csrf) csrf = data.csrf;
  return { response, data };
}

async function withToken(path, method, body, token) {
  return fetch(`${base}${path}`, {
    method,
    headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const initial = await session();
assert.equal(initial.user, null);
const guestCookie = cookie;
const guestCsrf = csrf;

let result = await api('/api/auth/register', 'POST', {
  email: `too-long-${unique}@example.test`, name: 'Длинный пароль', password: 'a'.repeat(73),
});
assert.equal(result.response.status, 422);
assert.ok(result.data.fields.password);

result = await api('/api/auth/register', 'POST', {
  email, name: 'Тестовый пользователь', password: 'CorrectHorse42', role: 'admin', id: 999,
});
assert.equal(result.response.status, 201);
assert.equal(result.data.user.email, email);
assert.equal(result.data.user.role, 'user');
assert.equal(result.data.user.password_hash, undefined);
assert.notEqual(cookie, guestCookie, 'Session cookie must rotate after registration');
assert.notEqual(csrf, guestCsrf, 'CSRF token must rotate after registration');

let oldToken = await withToken('/api/profile', 'PUT', { name: 'Подмена' }, guestCsrf);
assert.equal(oldToken.status, 403, 'Old CSRF must not work after registration');

result = await api('/api/auth/register', 'POST', { email, name: 'Дубль', password: 'CorrectHorse42' });
assert.equal(result.response.status, 422);
assert.ok(result.data.fields.email);

result = await api('/api/profile', 'PUT', {
  name: 'Обновлённое имя', target_calories: 2400, target_protein_g: 180, target_fat_g: 80, target_carbs_g: 300,
  role: 'admin', email: 'other@example.test', id: 999999,
});
assert.equal(result.response.status, 200);
assert.equal(result.data.user.name, 'Обновлённое имя');
assert.equal(String(result.data.user.target_calories), '2400');
assert.equal(result.data.user.email, email);
assert.equal(result.data.user.role, 'user');

const authenticatedCookie = cookie;
const authenticatedCsrf = csrf;
result = await api('/api/auth/logout', 'POST');
assert.equal(result.response.status, 200);
assert.equal(result.data.user, null);
assert.notEqual(cookie, authenticatedCookie, 'Session cookie must rotate after logout');
assert.notEqual(csrf, authenticatedCsrf, 'CSRF token must rotate after logout');
oldToken = await withToken('/api/auth/logout', 'POST', undefined, authenticatedCsrf);
assert.equal(oldToken.status, 403, 'Old CSRF must not work after logout');
let anonymous = await session();
assert.equal(anonymous.user, null);

result = await api('/api/profile', 'GET');
assert.equal(result.response.status, 401);

result = await api('/api/auth/login', 'POST', { email, password: 'WrongPassword42' });
assert.equal(result.response.status, 401);
const anonymousCookie = cookie;
const anonymousCsrf = csrf;
result = await api('/api/auth/login', 'POST', { email, password: 'CorrectHorse42' });
assert.equal(result.response.status, 200);
assert.equal(result.data.user.name, 'Обновлённое имя');
assert.notEqual(cookie, anonymousCookie, 'Session cookie must rotate after login');
assert.notEqual(csrf, anonymousCsrf, 'CSRF token must rotate after login');
oldToken = await withToken('/api/profile', 'PUT', { name: 'Подмена' }, anonymousCsrf);
assert.equal(oldToken.status, 403, 'Old CSRF must not work after login');

result = await api('/api/auth/logout', 'POST');
assert.equal(result.response.status, 200);
const blockedEmail = `blocked-${unique}@example.test`;
for (let attempt = 0; attempt < 4; attempt += 1) {
  result = await api('/api/auth/login', 'POST', { email: blockedEmail, password: 'WrongPassword42' });
  assert.equal(result.response.status, 401);
}
// A successful login to B must not erase failed attempts for A or shared-IP attempts.
result = await api('/api/auth/login', 'POST', { email, password: 'CorrectHorse42' });
assert.equal(result.response.status, 200);
result = await api('/api/auth/logout', 'POST');
assert.equal(result.response.status, 200);
result = await api('/api/auth/login', 'POST', { email: blockedEmail, password: 'WrongPassword42' });
assert.equal(result.response.status, 401);
result = await api('/api/auth/login', 'POST', { email: blockedEmail, password: 'WrongPassword42' });
assert.equal(result.response.status, 429);

for (let attempt = 0; attempt < 15; attempt += 1) {
  result = await api('/api/auth/login', 'POST', {
    email: `ip-${attempt}-${unique}@example.test`, password: 'WrongPassword42',
  });
  assert.equal(result.response.status, 401);
}
result = await api('/api/auth/login', 'POST', { email: `ip-limit-${unique}@example.test`, password: 'WrongPassword42' });
assert.equal(result.response.status, 429);

console.log('Auth checks passed: register, role, profile persistence, logout, login and account/IP rate limits.');
