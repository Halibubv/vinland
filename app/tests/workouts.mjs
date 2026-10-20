import assert from 'node:assert/strict';

const base = process.env.TEST_API_URL || 'http://127.0.0.1:8081';
const exerciseIds = (process.env.TEST_EXERCISE_IDS || '').split(',').map(Number);
assert.equal(exerciseIds.length, 2, 'Set TEST_EXERCISE_IDS to two seeded exercise IDs');
const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
let cookie;
let csrf;

function keepCookie(response) {
  const setCookie = response.headers.getSetCookie?.()[0] ?? response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
}

async function request(path, method = 'GET', body) {
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

async function start() {
  const result = await request('/api/session');
  assert.equal(result.response.status, 200);
  csrf = result.data.csrf;
}

async function register(emailPrefix, name) {
  const result = await request('/api/auth/register', 'POST', {
    email: `${emailPrefix}-${unique}@example.test`, name, password: 'CorrectHorse42',
  });
  assert.equal(result.response.status, 201);
  return result.data.user;
}

await start();
const owner = await register('owner', 'Владелец');
let result = await request('/api/exercises');
assert.equal(result.response.status, 200);
assert.ok(result.data.exercises.some((exercise) => Number(exercise.id) === exerciseIds[0]));

const initialPayload = {
  workout_date: '2026-10-09', notes: 'Порядок важен',
  exercises: [
    { exercise_id: exerciseIds[1], notes: 'Без подходов', sets: [] },
    { exercise_id: exerciseIds[0], notes: 'С подходами', sets: [
      { repetitions: 8, weight_kg: 50, notes: 'Тяжело' },
      { repetitions: 0, weight_kg: 0, notes: 'Собственный вес' },
    ] },
  ],
};
result = await request('/api/workouts', 'POST', initialPayload);
assert.equal(result.response.status, 201);
const workoutId = Number(result.data.workout.id);
assert.equal(Number(result.data.workout.exercises[0].exercise_id), exerciseIds[1]);
assert.equal(result.data.workout.exercises[0].sets.length, 0);
assert.equal(Number(result.data.workout.exercises[1].exercise_id), exerciseIds[0]);
assert.equal(result.data.workout.exercises[1].sets.length, 2);

result = await request('/api/workouts');
assert.equal(result.response.status, 200);
assert.equal(result.data.workouts.length, 1);

const countBeforeFailedWrite = result.data.workouts.length;
result = await request('/api/workouts', 'POST', {
  workout_date: '2026-10-11', notes: 'Не сохранится',
  exercises: [{ exercise_id: exerciseIds[0], notes: null, sets: [] }, { exercise_id: 999999999, notes: null, sets: [] }],
});
assert.equal(result.response.status, 422);
result = await request('/api/workouts');
assert.equal(result.data.workouts.length, countBeforeFailedWrite, 'Failed transaction must not leave a workout');

// A workout needs at least one exercise, both when created and when edited.
result = await request('/api/workouts', 'POST', { workout_date: '2026-10-11', notes: null, exercises: [] });
assert.equal(result.response.status, 422);
assert.equal(result.data.fields.exercises, 'Добавьте хотя бы одно упражнение.');
result = await request(`/api/workouts/${workoutId}`, 'PUT', { workout_date: '2026-10-11', notes: null, exercises: [] });
assert.equal(result.response.status, 422, 'Edit must not remove every exercise');
result = await request(`/api/workouts/${workoutId}`);
assert.equal(result.data.workout.exercises.length, 2, 'Rejected edit keeps the exercises');

result = await request(`/api/workouts/${workoutId}`, 'PUT', {
  workout_date: '2026-10-10', notes: 'Переставлено',
  exercises: [initialPayload.exercises[1], initialPayload.exercises[0]],
});
assert.equal(result.response.status, 200);
assert.equal(Number(result.data.workout.exercises[0].exercise_id), exerciseIds[0]);

result = await request('/api/auth/logout', 'POST');
assert.equal(result.response.status, 200);
const other = await register('other', 'Другой пользователь');
for (const method of ['GET', 'PUT', 'DELETE']) {
  result = await request(`/api/workouts/${workoutId}`, method, method === 'PUT' ? initialPayload : undefined);
  assert.equal(result.response.status, 404, `${method} must not expose another user's workout`);
}
assert.notEqual(other.id, owner.id);

result = await request('/api/auth/logout', 'POST');
assert.equal(result.response.status, 200);
result = await request('/api/auth/login', 'POST', { email: owner.email, password: 'CorrectHorse42' });
assert.equal(result.response.status, 200);
result = await request(`/api/workouts/${workoutId}`, 'DELETE');
assert.equal(result.response.status, 200);
assert.equal(result.data.deleted, true);

console.log('Workout checks passed: order, empty sets, rollback, ownership and CRUD.');
