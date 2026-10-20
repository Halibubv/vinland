// End-to-end checks through the built interface in a real browser.
// Run against an isolated database: tests/run-ui.ps1 prepares one.
//
//   UI_TEST_BASE      server address (default http://127.0.0.1:8082)
//   TEST_ADMIN_EMAIL  administrator created by tests/seed-admin.php (password CorrectHorse42)
//   UI_BROWSER        path to Chrome or Edge (default: the first one found)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.env.UI_TEST_BASE || 'http://127.0.0.1:8082';
const adminEmail = process.env.TEST_ADMIN_EMAIL;
assert.ok(adminEmail, 'Set TEST_ADMIN_EMAIL (tests/seed-admin.php prints one).');
const password = 'CorrectHorse42';
const stamp = Date.now().toString(36);
const userA = `ui-a-${stamp}@example.test`;
const userB = `ui-b-${stamp}@example.test`;
const exerciseA = `Северная тяга ${stamp}`;
const exerciseB = `Полярный жим ${stamp}`;
const product = `Контрольный продукт ${stamp}`;

// Dates as the app sees them (Europe/Moscow).
const moscowDate = (offset = 0) =>
  new Date(Date.now() + offset * 86400000).toLocaleDateString('sv-SE', {
    timeZone: 'Europe/Moscow',
  });
const today = moscowDate();
const past = moscowDate(-2);

const browserPath =
  process.env.UI_BROWSER ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
  ].find((path) => fs.existsSync(path));
assert.ok(browserPath, 'Chrome or Edge not found: set UI_BROWSER.');

const browser = await chromium.launch({ executablePath: browserPath });
const problems = [];

async function newPage(width = 1280, height = 900) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`${page.url()}: ${error}`));
  page.on('console', (message) => {
    // Expected: 4xx answers the scenario provokes on purpose.
    if (message.type() === 'error' && !/status of (40[0-9]|500)/.test(message.text()))
      problems.push(`${page.url()}: ${message.text()}`);
  });
  return page;
}

const open = (page, path) => page.goto(base + path, { waitUntil: 'networkidle' });
const api = async (page, path) => {
  const response = await page.request.get(base + '/api' + path);
  return [response.status(), await response.json()];
};
const noOverflow = async (page, label) =>
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    `${label}: horizontal overflow`,
  );

async function signIn(page, email) {
  await open(page, '/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await page.getByRole('heading', { name: /Добрый день/ }).waitFor();
}

async function register(page, email, name) {
  await open(page, '/register');
  await page.getByLabel('Имя', { exact: true }).fill(name);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="passwordAgain"]').fill(password);
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await page.getByRole('heading', { name: /Добрый день/ }).waitFor();
}

// --- Guest pages, private files, registration -------------------------------
const guest = await newPage();
for (const width of [1280, 834, 390]) {
  await guest.setViewportSize({ width, height: 850 });
  assert.equal((await open(guest, '/')).status(), 200);
  await noOverflow(guest, `landing ${width}`);
  if (width === 390) assert.ok(await guest.locator('.guest-mobile-nav').isVisible());
}
await guest.setViewportSize({ width: 1280, height: 900 });
for (const [path, title] of [
  ['/login', 'Вход'],
  ['/register', 'Регистрация'],
]) {
  assert.equal((await open(guest, path)).status(), 200);
  assert.ok(await guest.getByRole('heading', { name: title }).isVisible());
}
for (const path of ['/.env', '/backend/config.php', '/database/001-schema.sql'])
  assert.equal((await guest.request.get(base + path)).status(), 404, path);

await guest.getByLabel('Имя', { exact: true }).fill('Пользователь А');
await guest.getByLabel('Email', { exact: true }).fill(userA);
await guest.locator('input[name="password"]').fill(password);
await guest.locator('input[name="passwordAgain"]').fill('wrong-password');
await guest.getByRole('button', { name: 'Создать аккаунт' }).click();
await guest.getByText('Пароли не совпадают.').waitFor();
await guest.locator('input[name="passwordAgain"]').fill(password);
await guest.getByRole('button', { name: 'Создать аккаунт' }).click();
await guest.getByRole('heading', { name: /Добрый день/ }).waitFor();
const user = guest;

// --- Profile goals ------------------------------------------------------------
await open(user, '/profile');
await user.getByText(userA).waitFor();
await user.getByRole('button', { name: 'Настройки профиля' }).click();
await user.getByLabel('Калории').fill('2400');
await user.getByLabel('Белки').fill('180');
await user.getByLabel('Жиры').fill('80');
await user.getByLabel('Углеводы').fill('240');
await user.getByRole('button', { name: 'Сохранить изменения' }).click();
await user.getByText('Профиль и цели сохранены.').waitFor();
assert.equal((await api(user, '/profile'))[1].user.target_calories, 2400);
await user.reload({ waitUntil: 'networkidle' });
await user.getByText('2 400 ккал · Б 180 / Ж 80 / У 240 г').waitFor();

// --- Admin creates catalog entries -----------------------------------------
const admin = await newPage();
await signIn(admin, adminEmail);
async function createEntry(kind, name, fields) {
  await open(admin, `/admin/${kind}`);
  await admin.locator('.admin-tools .button').click();
  const dialog = admin.getByRole('dialog');
  await dialog.getByLabel('Название').fill(name);
  for (const [label, value] of Object.entries(fields)) await dialog.getByLabel(label).fill(value);
  await dialog.getByRole('button', { name: 'Добавить', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await admin.getByRole('rowheader', { name }).waitFor();
}
await createEntry('exercises', exerciseA, { 'Группа мышц (необязательно)': 'Спина' });
await createEntry('exercises', exerciseB, { 'Группа мышц (необязательно)': 'Грудь' });
await createEntry('products', product, {
  'Калории, ккал': '200',
  'Белки, г': '10',
  'Жиры, г': '5',
  'Углеводы, г': '20',
});
const exerciseIds = Object.fromEntries(
  (await api(admin, '/admin/exercises'))[1].exercises.map((row) => [row.name, Number(row.id)]),
);

// --- Workout: picker, sets, order -------------------------------------------
await open(user, '/workouts/new');
await user.getByLabel('Заметка (необязательно)').fill('Порядок А затем Б');
await user.getByRole('button', { name: 'Добавить упражнение' }).click();
const picker = user.getByRole('dialog', { name: 'Выберите упражнение' });
await picker.waitFor();
// Search is focused on open, Tab moves on to the options inside the dialog.
assert.equal(await user.evaluate(() => document.activeElement.type), 'search');
await user.keyboard.press('Tab');
assert.ok(await user.evaluate(() => Boolean(document.activeElement.closest('.catalog-options'))));
await user.keyboard.press('Escape');
await picker.waitFor({ state: 'hidden' });
assert.equal(await user.locator('.workout-exercise').count(), 0, 'cancelled pick leaves no row');

await user.getByRole('button', { name: 'Добавить упражнение' }).click();
await picker.getByRole('button', { name: new RegExp(exerciseA) }).click();
const first = user.locator('.workout-exercise').nth(0);
await first.getByRole('button', { name: 'Добавить подход' }).click();
await first.getByLabel('Повторения, подход 1').fill('8');
await first.getByLabel('Вес, кг, подход 1').fill('0');
await user.getByRole('button', { name: 'Добавить упражнение' }).click();
await picker.getByRole('button', { name: new RegExp(exerciseB) }).click();
await user.getByRole('button', { name: 'Сохранить тренировку' }).click();
await user.waitForURL(/\/workouts\/\d+$/);
const workoutId = Number(user.url().split('/').pop());
await user.getByRole('heading', { name: new RegExp(exerciseB) }).waitFor();
// The saved form replaced its history entry: Back does not reopen the filled form.
await user.goBack({ waitUntil: 'networkidle' });
assert.ok(!user.url().endsWith('/workouts/new'), `Back after save opened ${user.url()}`);
await user.goForward({ waitUntil: 'networkidle' });
await user.waitForURL(new RegExp(`/workouts/${workoutId}$`));

let [, saved] = await api(user, `/workouts/${workoutId}`);
assert.deepEqual(
  saved.workout.exercises.map((row) => Number(row.exercise_id)),
  [exerciseIds[exerciseA], exerciseIds[exerciseB]],
);
assert.equal(saved.workout.exercises[0].sets[0].weight_kg, '0.00');
assert.deepEqual(saved.workout.exercises[1].sets, []);

await open(user, `/workouts/${workoutId}/edit`);
await user.locator('.workout-exercise').nth(0).getByRole('button', { name: 'Ниже' }).click();
await user.getByRole('button', { name: 'Сохранить тренировку' }).click();
await user.waitForURL(new RegExp(`/workouts/${workoutId}$`));
[, saved] = await api(user, `/workouts/${workoutId}`);
assert.deepEqual(
  saved.workout.exercises.map((row) => Number(row.exercise_id)),
  [exerciseIds[exerciseB], exerciseIds[exerciseA]],
);

// --- Meal: product, grams, totals ---------------------------------------------
await open(user, `/nutrition/new?date=${today}&type=lunch`);
await user.getByRole('button', { name: 'Добавить продукт' }).click();
await user
  .getByRole('dialog', { name: 'Добавить продукт' })
  .getByRole('button', { name: new RegExp(product) })
  .click();
await user.getByLabel('Количество, г').fill('150');
await user.getByRole('button', { name: 'Сохранить в дневник' }).click();
await user.waitForURL(/\/nutrition\?date=/);
let [, meals] = await api(user, `/meals?date=${today}`);
assert.equal(meals.meals.length, 1);
const mealId = Number(meals.meals[0].id);
assert.deepEqual(meals.meals[0].totals, { calories: 300, protein: 15, fat: 7.5, carbs: 30 });

// --- Admin edits and disables entries; history keeps old values ---------------
async function disable(kind, name, fields = {}) {
  await open(admin, `/admin/${kind}`);
  await admin
    .getByRole('row')
    .filter({ hasText: name })
    .getByRole('button', { name: 'Редактировать' })
    .click();
  const dialog = admin.getByRole('dialog');
  for (const [label, value] of Object.entries(fields)) await dialog.getByLabel(label).fill(value);
  await dialog.getByLabel(/Активно/).uncheck();
  await dialog.getByRole('button', { name: 'Сохранить изменения' }).click();
  await dialog.waitFor({ state: 'hidden' });
}
await disable('exercises', exerciseA);
await disable('products', product, { 'Калории, ккал': '100' });

await open(user, `/workouts/${workoutId}/edit`);
await user.getByTitle('Упражнение в архиве').waitFor();
await user.getByRole('button', { name: 'Сохранить тренировку' }).click();
await user.waitForURL(new RegExp(`/workouts/${workoutId}$`));
[, saved] = await api(user, `/workouts/${workoutId}`);
assert.equal(saved.workout.exercises[1].exercise_name, exerciseA);

await open(user, `/nutrition/${mealId}`);
await user.getByLabel('Количество, г').fill('200');
await user.getByRole('button', { name: 'Сохранить изменения' }).click();
await user.waitForURL(/\/nutrition\?date=/);
[, meals] = await api(user, `/meals?date=${today}`);
assert.deepEqual(meals.meals[0].totals, { calories: 400, protein: 20, fat: 10, carbs: 40 });
assert.equal(meals.meals[0].items[0].calories_snapshot, '200.00');

await open(user, '/nutrition/new');
await user.getByRole('button', { name: 'Добавить продукт' }).click();
assert.equal(
  await user.getByRole('dialog').getByText(product).count(),
  0,
  'disabled product offered',
);
await user.keyboard.press('Escape');

const [, stats] = await api(user, `/statistics?from=${today}&to=${today}`);
assert.equal(stats.totals.calories, 400);
assert.equal(stats.totals.workouts, 1);
await open(user, '/statistics');
await user.getByRole('heading', { name: 'Статистика' }).waitFor();

// --- Save error keeps the form; screens fit narrow widths --------------------
await open(user, `/workouts/${workoutId}/edit`);
await user.getByLabel('Заметка (необязательно)').fill('Проверка ошибки сохранения');
const failSave = (route) =>
  route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: '{"error":"Тестовая ошибка сохранения"}',
  });
await user.route(/\/api\/workouts\/\d+$/, failSave);
await user.getByRole('button', { name: 'Сохранить тренировку' }).click();
await user.getByText('Тестовая ошибка сохранения').waitFor();
assert.equal(
  await user.getByLabel('Заметка (необязательно)').inputValue(),
  'Проверка ошибки сохранения',
);
await user.unroute(/\/api\/workouts\/\d+$/, failSave);
await user.getByRole('button', { name: 'Сохранить тренировку' }).click();
await user.waitForURL(new RegExp(`/workouts/${workoutId}$`));
await user.getByText('Заметка: Проверка ошибки сохранения').waitFor();

for (const width of [834, 390]) {
  await user.setViewportSize({ width, height: 900 });
  for (const path of [
    '/profile',
    `/workouts/${workoutId}`,
    `/workouts/${workoutId}/edit`,
    `/nutrition/${mealId}`,
    '/nutrition',
    '/statistics',
  ]) {
    await open(user, path);
    await noOverflow(user, `${path} at ${width}`);
  }
}
await user.setViewportSize({ width: 1280, height: 900 });

// --- Another user sees nothing of user A ----------------------------------------
const other = await newPage(390, 844);
await register(other, userB, 'Пользователь Б');
await open(other, '/admin/products');
await other.getByText('Справочники доступны только администратору.').waitFor();
assert.equal((await api(other, '/admin/products'))[0], 403);
await open(other, `/workouts/${workoutId}`);
await other.getByText('Тренировка не найдена.').waitFor();
await open(other, `/nutrition/${mealId}`);
await other.getByText('Приём пищи не найден.').waitFor();

// --- Expired session sends the user to the login screen ------------------------
await open(user, '/workouts/new');
await user.context().clearCookies();
await user.getByRole('button', { name: 'Сохранить тренировку' }).click();
await user.getByRole('heading', { name: 'Вход' }).waitFor();
await signIn(user, userA);

// --- Deleting with the confirmation dialog -----------------------------------------
await open(user, `/workouts/${workoutId}`);
await user
  .locator('.wide-only')
  .getByRole('button', { name: /Удалить/ })
  .click();
await user
  .getByRole('dialog', { name: 'Удалить тренировку?' })
  .getByRole('button', { name: 'Удалить' })
  .click();
await user.waitForURL(base + '/workouts');
assert.equal((await api(user, `/workouts/${workoutId}`))[0], 404);

await open(user, `/nutrition/${mealId}`);
await user.getByRole('button', { name: 'Удалить приём пищи' }).click();
await user
  .getByRole('dialog', { name: 'Удалить приём пищи?' })
  .getByRole('button', { name: 'Удалить' })
  .click();
await user.waitForURL(/\/nutrition/);
assert.equal((await api(user, `/meals/${mealId}`))[0], 404);

await browser.close();
assert.deepEqual(problems, [], 'browser errors');
console.log(
  'UI checks passed: guest pages, private files, registration, profile goals, catalogs, ' +
    'workout and meal CRUD, history snapshots, statistics, rights, expired session, deletion, ' +
    'no overflow at 834/390.',
);
