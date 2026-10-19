import assert from 'node:assert/strict';

const base = process.env.TEST_API_URL || 'http://127.0.0.1:8081';
const productId = Number(process.env.TEST_PRODUCT_ID);
assert.ok(Number.isSafeInteger(productId) && productId > 0, 'Set TEST_PRODUCT_ID to a seeded product ID');
const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

function client() {
  let cookie = '';
  let csrf = '';
  return {
    async request(path, method = 'GET', body, token = csrf) {
      const headers = { 'Content-Type': 'application/json' };
      if (cookie) headers.Cookie = cookie;
      if (token) headers['X-CSRF-Token'] = token;
      const response = await fetch(`${base}${path}`, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      });
      const setCookie = response.headers.getSetCookie?.()[0] ?? response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      const data = await response.json();
      if (data.csrf) csrf = data.csrf;
      return { status: response.status, data };
    },
  };
}

async function register(browser, label) {
  let result = await browser.request('/api/session');
  assert.equal(result.status, 200);
  result = await browser.request('/api/auth/register', 'POST', {
    email: `${label}-${suffix}@example.test`, name: label, password: 'CorrectHorse42',
  });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  return result.data.user;
}

const guest = client();
let result = await guest.request('/api/meals');
assert.equal(result.status, 401, 'Guest cannot list meals');
result = await guest.request('/api/session');
assert.equal(result.status, 200);
result = await guest.request('/api/meals', 'POST', { meal_date: '2026-10-10', meal_type: 'lunch', items: [] });
assert.equal(result.status, 401, 'Guest cannot create meals with a valid CSRF token');

const owner = client();
const other = client();
await register(owner, 'owner');
await register(other, 'other');

const initial = {
  meal_date: '2026-10-10', meal_type: 'lunch', items: [{
    product_id: productId, quantity_g: 150,
    product_name_snapshot: 'Подмена', calories_snapshot: 999, protein_snapshot: 999,
    fat_snapshot: 999, carbs_snapshot: 999,
  }],
};
result = await owner.request('/api/meals', 'POST', initial, 'incorrect-token');
assert.equal(result.status, 403, 'Mutation without the session CSRF token must fail');
result = await owner.request('/api/meals');
assert.equal(result.status, 200);
assert.deepEqual(result.data.meals, [], 'Rejected CSRF request must not create a meal');

result = await owner.request('/api/products');
assert.equal(result.status, 200);
const product = result.data.products.find((row) => Number(row.id) === productId);
assert.ok(product, 'Seeded product must be available');
result = await owner.request('/api/meals', 'POST', initial);
assert.equal(result.status, 201, JSON.stringify(result.data));
const mealId = Number(result.data.meal.id);
const itemId = Number(result.data.meal.items[0].id);
assert.deepEqual(result.data.meal.totals, { calories: 300, protein: 15, fat: 7.5, carbs: 30 });
assert.equal(result.data.meal.items[0].product_name_snapshot, product.name);
assert.equal(Number(result.data.meal.items[0].calories_snapshot), 200);

result = await owner.request(`/api/meals/${mealId}`);
assert.equal(result.status, 200);
assert.deepEqual(result.data.meal.totals, { calories: 300, protein: 15, fat: 7.5, carbs: 30 }, 'Reload uses stored snapshots');
result = await owner.request('/api/meals?date=2026-10-10');
assert.equal(result.status, 200);
assert.equal(result.data.meals.length, 1);
result = await owner.request('/api/meals?date=2026-10-11');
assert.equal(result.status, 200);
assert.equal(result.data.meals.length, 0);
result = await owner.request('/api/meals?date=2026-02-30');
assert.equal(result.status, 422, 'Invalid date filter must fail');

const changed = { meal_date: '2026-10-11', meal_type: 'dinner', items: [{
  id: itemId, product_id: 999999999, quantity_g: 200, calories_snapshot: 999,
  protein_snapshot: 999, fat_snapshot: 999, carbs_snapshot: 999,
}] };
result = await owner.request(`/api/meals/${mealId}`, 'PUT', changed);
assert.equal(result.status, 200, JSON.stringify(result.data));
assert.deepEqual(result.data.meal.totals, { calories: 400, protein: 20, fat: 10, carbs: 40 });
assert.equal(result.data.meal.items[0].product_name_snapshot, product.name);
assert.equal(Number(result.data.meal.items[0].calories_snapshot), 200, 'Client snapshot update is ignored');
result = await owner.request('/api/meals?date=2026-10-10');
assert.equal(result.data.meals.length, 0);
result = await owner.request('/api/meals?date=2026-10-11');
assert.equal(result.data.meals.length, 1);

for (const grams of [0, -1, 1000000]) {
  result = await owner.request('/api/meals', 'POST', {
    meal_date: '2026-10-12', meal_type: 'snack', items: [{ product_id: productId, quantity_g: grams }],
  });
  assert.equal(result.status, 422, `Invalid quantity ${grams} must fail`);
}
result = await owner.request('/api/meals', 'POST', {
  meal_date: '2026-02-30', meal_type: 'snack', items: [],
});
assert.equal(result.status, 422, 'Invalid meal date must fail');
result = await owner.request('/api/meals');
assert.equal(result.data.meals.length, 1, 'Invalid writes must not leave meals');

for (const method of ['GET', 'PUT', 'DELETE']) {
  result = await other.request(`/api/meals/${mealId}`, method, method === 'PUT' ? changed : undefined);
  assert.equal(result.status, 404, `${method} must not reveal another user's meal`);
}
result = await other.request('/api/meals', 'POST', {
  meal_date: '2026-10-12', meal_type: 'breakfast', items: [],
});
assert.equal(result.status, 201);
const otherMealId = Number(result.data.meal.id);
result = await other.request(`/api/meals/${otherMealId}`, 'PUT', {
  meal_date: '2026-10-13', meal_type: 'snack', items: [{ id: itemId, quantity_g: 1 }],
});
assert.equal(result.status, 422, 'Foreign meal item ID must fail');
result = await other.request(`/api/meals/${otherMealId}`);
assert.equal(result.status, 200);
assert.equal(result.data.meal.meal_date, '2026-10-12', 'Foreign item failure must roll back meal changes');
assert.equal(result.data.meal.items.length, 0, 'Foreign item must not be copied');

result = await owner.request(`/api/meals/${mealId}`, 'DELETE');
assert.equal(result.status, 200);
assert.equal(result.data.deleted, true);
result = await owner.request(`/api/meals/${mealId}`);
assert.equal(result.status, 404);
result = await owner.request('/api/meals');
assert.equal(result.data.meals.length, 0);

console.log('Meal HTTP checks passed: CRUD, dates, snapshots, validation, CSRF, guest and ownership.');
