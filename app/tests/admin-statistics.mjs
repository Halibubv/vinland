import assert from 'node:assert/strict';

const base = process.env.TEST_API_URL || 'http://127.0.0.1:8081';
const adminEmail = process.env.TEST_ADMIN_EMAIL;
assert.ok(adminEmail, 'Set TEST_ADMIN_EMAIL to a seeded administrator');
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
  assert.equal((await browser.request('/api/session')).status, 200);
  const result = await browser.request('/api/auth/register', 'POST', {
    email: `${label}-${suffix}@example.test`, name: label, password: 'CorrectHorse42', role: 'admin',
  });
  assert.equal(result.status, 201);
  assert.equal(result.data.user.role, 'user', 'Public registration cannot grant admin rights');
}

const guest = client();
assert.equal((await guest.request('/api/admin/products')).status, 401);
assert.equal((await guest.request('/api/statistics')).status, 401);
const member = client();
const secondMember = client();
await register(member, 'member');
await register(secondMember, 'other');
assert.equal((await member.request('/api/admin/products')).status, 403);
assert.equal((await member.request('/api/admin/exercises')).status, 403);
assert.equal((await member.request('/api/admin/products', 'POST', {
  name: 'Не создавать', calories_per_100g: 1, protein_per_100g: 1,
  fat_per_100g: 1, carbs_per_100g: 1, is_active: true,
})).status, 403);

const admin = client();
assert.equal((await admin.request('/api/session')).status, 200);
let result = await admin.request('/api/auth/login', 'POST', { email: adminEmail, password: 'CorrectHorse42' });
assert.equal(result.status, 200);
assert.equal(result.data.user.role, 'admin');

result = await admin.request('/api/admin/exercises', 'POST', {
  name: 'Норвежская тяга', muscle_group: 'Спина', description: 'Тестовый справочник', is_active: true,
}, 'bad-token');
assert.equal(result.status, 403, 'Admin writes still require CSRF');
result = await admin.request('/api/admin/exercises', 'POST', {
  name: 'Норвежская тяга', muscle_group: 'Спина', description: 'Тестовый справочник', is_active: true,
});
assert.equal(result.status, 201, JSON.stringify(result.data));
const exerciseId = Number(result.data.exercise.id);
result = await admin.request('/api/admin/products', 'POST', {
  name: 'Тестовая крупа', calories_per_100g: 200, protein_per_100g: 10,
  fat_per_100g: 5, carbs_per_100g: 20, is_active: true,
});
assert.equal(result.status, 201, JSON.stringify(result.data));
const productId = Number(result.data.product.id);

result = await admin.request('/api/admin/products', 'POST', {
  name: 'Ошибка', calories_per_100g: -1, protein_per_100g: 10,
  fat_per_100g: 5, carbs_per_100g: 20, is_active: true,
});
assert.equal(result.status, 422, 'Negative nutrition is invalid');
assert.equal((await admin.request('/api/admin/products/999999999', 'PUT', {
  name: 'Ошибка', calories_per_100g: 1, protein_per_100g: 1,
  fat_per_100g: 1, carbs_per_100g: 1, is_active: true,
})).status, 404);

result = await member.request('/api/meals', 'POST', {
  meal_date: '2026-10-10', meal_type: 'breakfast', items: [{ product_id: productId, quantity_g: 150 }],
});
assert.equal(result.status, 201);
const mealId = Number(result.data.meal.id);
result = await member.request('/api/workouts', 'POST', {
  workout_date: '2026-10-10', notes: 'День силы', exercises: [{ exercise_id: exerciseId,
    notes: null, sets: [{ repetitions: 8, weight_kg: 50, notes: null }] }],
});
assert.equal(result.status, 201);
const workoutId = Number(result.data.workout.id);
result = await member.request('/api/profile', 'PUT', {
  name: 'Участник', target_calories: 2400, target_protein_g: 180,
  target_fat_g: 80, target_carbs_g: 300,
});
assert.equal(result.status, 200);

result = await member.request('/api/statistics?from=2026-10-09&to=2026-10-11');
assert.equal(result.status, 200, JSON.stringify(result.data));
assert.equal(result.data.days.length, 3);
assert.deepEqual(result.data.days[0], { date: '2026-10-09', calories: 0, protein: 0,
  fat: 0, carbs: 0, workouts: 0, sets: 0 });
assert.deepEqual(result.data.days[1], { date: '2026-10-10', calories: 300, protein: 15,
  fat: 7.5, carbs: 30, workouts: 1, sets: 1 });
assert.deepEqual(result.data.totals, { calories: 300, protein: 15,
  fat: 7.5, carbs: 30, workouts: 1, sets: 1 });
assert.deepEqual(result.data.goals, { calories: 2400, protein: 180, fat: 80, carbs: 300 });
result = await secondMember.request('/api/statistics?from=2026-10-09&to=2026-10-11');
assert.equal(result.status, 200);
assert.deepEqual(result.data.goals, { calories: null, protein: null, fat: null, carbs: null });
assert.equal(result.data.totals.calories, 0, 'Other member has no access to private nutrition');
assert.equal(result.data.totals.workouts, 0, 'Other member has no access to private workouts');
for (const path of ['/api/statistics?from=2026-10-12&to=2026-10-11',
  '/api/statistics?from=2025-01-01&to=2026-10-11', '/api/statistics?from=2026-02-30&to=2026-10-11']) {
  assert.equal((await member.request(path)).status, 422, `Invalid period ${path} must fail`);
}

result = await admin.request('/api/admin/products', 'POST', {
  name: 'Дробный тест', calories_per_100g: 0.49, protein_per_100g: 0,
  fat_per_100g: 0, carbs_per_100g: 0, is_active: true,
});
assert.equal(result.status, 201);
const fractionalProductId = Number(result.data.product.id);
for (const date of ['2026-10-20', '2026-10-21']) {
  result = await member.request('/api/meals', 'POST', {
    meal_date: date, meal_type: 'snack', items: [{ product_id: fractionalProductId, quantity_g: 1 }],
  });
  assert.equal(result.status, 201);
}
result = await member.request('/api/statistics?from=2026-10-20&to=2026-10-21');
assert.equal(result.status, 200);
assert.equal(result.data.days[0].calories, 0);
assert.equal(result.data.days[1].calories, 0);
assert.equal(result.data.totals.calories, 0.01, 'Period rounds once after summing raw daily values');

result = await admin.request('/api/admin/exercises', 'POST', {
  name: 'Жим для счётчика', muscle_group: 'Грудь', description: null, is_active: true,
});
assert.equal(result.status, 201);
const secondExerciseId = Number(result.data.exercise.id);
result = await member.request('/api/workouts', 'POST', {
  workout_date: '2026-10-10', notes: null, exercises: [
    { exercise_id: exerciseId, notes: null, sets: [{ repetitions: 5, weight_kg: 40, notes: null }] },
    { exercise_id: secondExerciseId, notes: null, sets: [{ repetitions: 6, weight_kg: 30, notes: null }] },
  ],
});
assert.equal(result.status, 201);
result = await member.request('/api/statistics?from=2026-10-10&to=2026-10-10');
assert.equal(result.data.totals.workouts, 2, 'Exercise and set joins must not duplicate workouts');
assert.equal(result.data.totals.sets, 3);

result = await admin.request(`/api/admin/products/${productId}`, 'PUT', {
  name: 'Новая крупа', calories_per_100g: 900, protein_per_100g: 90,
  fat_per_100g: 9, carbs_per_100g: 1, is_active: false,
});
assert.equal(result.status, 200);
result = await admin.request(`/api/admin/exercises/${exerciseId}`, 'PUT', {
  name: 'Новая тяга', muscle_group: 'Спина', description: null, is_active: false,
});
assert.equal(result.status, 200);
result = await admin.request('/api/admin/products');
assert.equal(result.status, 200);
assert.ok(result.data.products.some((row) => Number(row.id) === productId && row.is_active === false),
  'Inactive product remains in admin catalog');
result = await member.request('/api/products');
assert.ok(!result.data.products.some((row) => Number(row.id) === productId));
result = await member.request('/api/exercises');
assert.ok(!result.data.exercises.some((row) => Number(row.id) === exerciseId));
result = await member.request(`/api/meals/${mealId}`);
assert.equal(result.status, 200);
assert.equal(result.data.meal.items[0].product_name_snapshot, 'Тестовая крупа');
assert.deepEqual(result.data.meal.totals, { calories: 300, protein: 15, fat: 7.5, carbs: 30 });
result = await member.request(`/api/workouts/${workoutId}`);
assert.equal(result.status, 200);
assert.equal(Number(result.data.workout.exercises[0].exercise_id), exerciseId);
result = await member.request('/api/statistics?from=2026-10-10&to=2026-10-10');
assert.equal(result.data.totals.calories, 300, 'Historical statistics use stored snapshots');
assert.equal(result.data.totals.workouts, 2, 'Historical workouts remain after deactivation');

console.log('Admin/statistics HTTP checks passed: roles, catalogs, history, goals, period and isolation.');
