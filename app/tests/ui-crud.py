"""End-to-end CRUD and authorization checks through the built browser UI."""
import os
import re
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from playwright.sync_api import sync_playwright


BASE = os.environ.get('UI_TEST_BASE', 'http://127.0.0.1:8081')
TODAY_DATE = datetime.now(timezone(timedelta(hours=3))).date()
TODAY = TODAY_DATE.isoformat()
PAST = (TODAY_DATE - timedelta(days=2)).isoformat()
OUT = Path(__file__).resolve().parents[1] / '.screenshots'
OUT.mkdir(exist_ok=True)
ADMIN_EMAIL = os.environ['TEST_ADMIN_EMAIL']
PASSWORD = 'CorrectHorse42'
stamp = uuid4().hex[:10]
USER_A = f'ui-a-{stamp}@example.test'
USER_B = f'ui-b-{stamp}@example.test'


def enter(page, email, password=PASSWORD):
    page.goto(BASE + '/login', wait_until='networkidle')
    page.locator('input[name="email"]').fill(email)
    page.locator('input[name="password"]').fill(password)
    page.get_by_role('button', name='Войти', exact=True).click()
    page.get_by_role('heading', name=re.compile('Добрый день')).wait_for(timeout=10000)


def register(page, email, name):
    page.goto(BASE + '/register', wait_until='networkidle')
    page.locator('input[name="name"]').fill(name)
    page.locator('input[name="email"]').fill(email)
    page.locator('input[name="password"]').fill(PASSWORD)
    page.locator('input[name="passwordAgain"]').fill(PASSWORD)
    page.get_by_role('button', name='Создать аккаунт').click()
    page.get_by_role('heading', name=re.compile('Добрый день')).wait_for(timeout=10000)


def exit_account(page):
    page.locator('.header-account button.logout').click()
    page.get_by_role('heading', name='ВИНЛАНД').wait_for(timeout=10000)


def api_json(context, route):
    response = context.request.get(BASE + route)
    return response.status, response.json()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        headless=True,
    )
    admin_context = browser.new_context(viewport={'width': 1280, 'height': 900})
    admin = admin_context.new_page()
    enter(admin, ADMIN_EMAIL)

    def create_catalog(kind, name, values):
        admin.goto(BASE + f'/admin/{kind}', wait_until='networkidle')
        admin.locator('.admin-tools button').click()
        dialog = admin.get_by_role('dialog')
        dialog.get_by_label('Название').fill(name)
        for field, value in values.items():
            if field == 'muscle_group':
                dialog.get_by_label('Группа мышц').fill(value)
            elif field == 'description':
                dialog.get_by_label('Описание').fill(value)
            else:
                titles = {'calories_per_100g': 'Ккал', 'protein_per_100g': 'Белки, г', 'fat_per_100g': 'Жиры, г', 'carbs_per_100g': 'Углеводы, г'}
                dialog.get_by_label(titles[field]).fill(value)
        dialog.get_by_role('button', name='Сохранить', exact=True).click()
        dialog.wait_for(state='hidden', timeout=10000)
        admin.get_by_role('cell', name=name).wait_for(timeout=10000)

    create_catalog('exercises', 'Северная тяга', {'muscle_group': 'Спина', 'description': 'Тяговое упражнение'})
    create_catalog('exercises', 'Полярный жим', {'muscle_group': 'Грудь', 'description': 'Жимовое упражнение'})
    create_catalog('products', 'Контрольный продукт', {'calories_per_100g': '200', 'protein_per_100g': '10', 'fat_per_100g': '5', 'carbs_per_100g': '20'})
    status, catalog = api_json(admin_context, '/api/admin/exercises')
    assert status == 200
    exercises = {row['name']: row['id'] for row in catalog['exercises']}
    status, catalog = api_json(admin_context, '/api/admin/products')
    assert status == 200
    product_id = next(row['id'] for row in catalog['products'] if row['name'] == 'Контрольный продукт')
    admin.screenshot(path=str(OUT / 'admin-products-desktop.png'), full_page=True)

    user_context = browser.new_context(viewport={'width': 1280, 'height': 900})
    user = user_context.new_page()
    register(user, USER_A, 'Пользователь А')
    user.goto(BASE + '/workouts/new', wait_until='networkidle')
    assert user.get_by_role('heading', name='Новая тренировка').is_visible()
    user.get_by_label('Название или заметка').fill('Порядок А затем Б')
    user.locator('.add-exercise').click()
    picker = user.get_by_role('dialog', name='Выберите упражнение')
    picker.wait_for(timeout=10000)
    user.keyboard.press('Shift+Tab')
    assert user.evaluate('document.activeElement.closest("dialog") !== null')
    user.keyboard.press('Tab')
    assert user.evaluate('document.activeElement.closest("dialog") !== null')
    user.keyboard.press('Escape')
    picker.wait_for(state='hidden', timeout=10000)
    assert user.locator('.exercise-editor').count() == 0
    assert user.evaluate('document.activeElement.classList.contains("add-exercise")')
    user.locator('.add-exercise').click()
    user.get_by_role('dialog', name='Выберите упражнение').get_by_role('button', name='Северная тяга').click()
    first = user.locator('.exercise-editor').nth(0)
    first.locator('.exercise-choice').click()
    user.keyboard.press('Escape')
    assert 'Северная тяга' in first.locator('.exercise-editor-head').inner_text()
    assert user.locator('.exercise-editor').count() == 1
    first.locator('.add-set').click()
    first.locator('.set-row input[type="number"]').nth(0).fill('8')
    first.locator('.set-row input[type="number"]').nth(1).fill('0')
    user.locator('.add-exercise').click()
    user.get_by_role('dialog', name='Выберите упражнение').get_by_role('button', name='Полярный жим').click()
    second = user.locator('.exercise-editor').nth(1)
    assert second.locator('.set-row').count() == 0
    user.get_by_label('Дата тренировки').fill('')
    user.get_by_text('Дата не указана').wait_for(timeout=10000)
    user.get_by_role('button', name='Сохранить тренировку').click()
    user.get_by_text('Введите корректную дату.').wait_for(timeout=10000)
    assert first.locator('.set-row').count() == 1
    user.get_by_label('Дата тренировки').fill(TODAY)
    user.get_by_role('button', name='Сохранить тренировку').click()
    user.wait_for_url(re.compile(r'/workouts/\d+$'), timeout=10000)
    workout_id = int(user.url.rsplit('/', 1)[-1])
    user.reload(wait_until='networkidle')
    status, history = api_json(user_context, '/api/workouts')
    assert status == 200
    workout = next(row for row in history['workouts'] if int(row['id']) == workout_id)
    assert [int(row['exercise_id']) for row in workout['exercises']] == [int(exercises['Северная тяга']), int(exercises['Полярный жим'])]
    assert workout['exercises'][0]['sets'][0]['weight_kg'] == '0.00'
    assert workout['exercises'][1]['sets'] == []

    user.locator('.exercise-editor').nth(0).get_by_role('button', name='Опустить упражнение').click()
    user.get_by_role('button', name='Сохранить тренировку').click()
    status, history = api_json(user_context, '/api/workouts')
    workout = next(row for row in history['workouts'] if int(row['id']) == workout_id)
    assert [int(row['exercise_id']) for row in workout['exercises']] == [int(exercises['Полярный жим']), int(exercises['Северная тяга'])]
    user.goto(BASE + '/workouts', wait_until='networkidle')
    user.get_by_text('Порядок А затем Б').wait_for(timeout=10000)
    user.screenshot(path=str(OUT / 'workouts-desktop.png'), full_page=True)

    user.goto(BASE + '/nutrition/new?date=' + TODAY + '&type=lunch', wait_until='networkidle')
    assert user.get_by_role('heading', name='Добавить питание').is_visible()
    user.locator('.meal-item-editor select').select_option(label='Контрольный продукт')
    user.locator('.meal-item-editor input[type="number"]').fill('150')
    user.get_by_role('button', name='Сохранить приём пищи').click()
    user.wait_for_url(re.compile(r'/nutrition\?date='), timeout=10000)
    status, history = api_json(user_context, f'/api/meals?date={TODAY}')
    assert status == 200 and len(history['meals']) == 1
    meal = history['meals'][0]
    meal_id = int(meal['id'])
    assert meal['totals'] == {'calories': 300, 'protein': 15, 'fat': 7.5, 'carbs': 30}, meal['totals']
    assert int(meal['items'][0]['product_id']) == int(product_id)
    user.get_by_text('300 ккал').wait_for(timeout=10000)
    user.screenshot(path=str(OUT / 'nutrition-desktop.png'), full_page=True)

    def deactivate(kind, name, change_calories=False):
        admin.goto(BASE + f'/admin/{kind}', wait_until='networkidle')
        row = admin.get_by_role('row').filter(has_text=name)
        row.get_by_role('button', name='Редактировать').click()
        dialog = admin.get_by_role('dialog')
        if change_calories:
            dialog.get_by_label('Ккал').fill('100')
        dialog.get_by_label('Активная запись').uncheck()
        dialog.get_by_role('button', name='Сохранить', exact=True).click()
        dialog.wait_for(state='hidden', timeout=10000)

    deactivate('exercises', 'Северная тяга')
    deactivate('products', 'Контрольный продукт', change_calories=True)
    user.goto(BASE + f'/workouts/{workout_id}', wait_until='networkidle')
    assert 'Северная тяга' in user.locator('.exercise-editor').nth(1).locator('.exercise-editor-head').inner_text()
    assert 'в архиве' in user.locator('.exercise-editor').nth(1).locator('.exercise-choice').inner_text()
    user.get_by_role('button', name='Сохранить тренировку').click()
    status, history = api_json(user_context, '/api/workouts')
    assert next(row for row in history['workouts'] if int(row['id']) == workout_id)['exercises'][1]['exercise_name'] == 'Северная тяга'

    user.goto(BASE + f'/nutrition/{meal_id}', wait_until='networkidle')
    assert user.locator('.meal-item-editor input[readonly]').input_value() == 'Контрольный продукт'
    user.locator('.meal-item-editor input[type="number"]').fill('200')
    user.get_by_role('button', name='Сохранить приём пищи').click()
    user.wait_for_url(re.compile(r'/nutrition\?date='), timeout=10000)
    status, history = api_json(user_context, f'/api/meals?date={TODAY}')
    meal = next(row for row in history['meals'] if int(row['id']) == meal_id)
    assert meal['totals'] == {'calories': 400, 'protein': 20, 'fat': 10, 'carbs': 40}, meal['totals']
    assert meal['items'][0]['calories_snapshot'] == '200.00'
    user.goto(BASE + '/nutrition/new', wait_until='networkidle')
    assert user.locator('.meal-item-editor select option').filter(has_text='Контрольный продукт').count() == 0
    user.goto(BASE + '/statistics', wait_until='networkidle')
    user.get_by_role('heading', name='Статистика').wait_for(timeout=10000)
    status, stats = api_json(user_context, f'/api/statistics?from={TODAY}&to={TODAY}')
    assert status == 200 and stats['totals']['calories'] == 400 and stats['totals']['workouts'] == 1
    assert '400' in user.locator('.chart-summary > strong').inner_text()
    user.get_by_label('Начало периода').fill((TODAY_DATE + timedelta(days=1)).isoformat())
    user.get_by_text('Выберите период не длиннее года, с началом до окончания.').wait_for(timeout=10000)
    user.get_by_label('Начало периода').fill(TODAY)
    assert '400' in user.locator('.chart-summary > strong').inner_text()
    user.screenshot(path=str(OUT / 'statistics-desktop.png'), full_page=True)

    user.goto(BASE + f'/workouts/{workout_id}', wait_until='networkidle')
    user.get_by_label('Дата тренировки').fill(PAST)
    user.get_by_label('Название или заметка').fill('Проверка ошибки сохранения')
    def fail_workout(route):
        route.fulfill(status=500, content_type='application/json', body='{"error":"Тестовая ошибка сохранения"}')
    user.route(re.compile(r'/api/workouts/\d+$'), fail_workout)
    user.get_by_role('button', name='Сохранить тренировку').click()
    user.get_by_text('Тестовая ошибка сохранения').wait_for(timeout=10000)
    assert user.get_by_label('Название или заметка').input_value() == 'Проверка ошибки сохранения'
    user.unroute(re.compile(r'/api/workouts/\d+$'), fail_workout)
    user.get_by_role('button', name='Сохранить тренировку').click()
    user.reload(wait_until='networkidle')
    assert user.get_by_label('Дата тренировки').input_value() == PAST
    assert user.get_by_label('Название или заметка').input_value() == 'Проверка ошибки сохранения'
    for width, name in [(834, 'tablet'), (390, 'phone')]:
        user.set_viewport_size({'width': width, 'height': 900})
        user.screenshot(path=str(OUT / f'workout-editor-{name}.png'), full_page=True)
        assert user.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), f'Workout editor overflow at {width}px'
    user.set_viewport_size({'width': 1280, 'height': 900})

    user.goto(BASE + f'/nutrition/{meal_id}', wait_until='networkidle')
    user.get_by_label('Дата', exact=True).fill(PAST)
    for width, name in [(834, 'tablet'), (390, 'phone')]:
        user.set_viewport_size({'width': width, 'height': 900})
        user.screenshot(path=str(OUT / f'meal-editor-{name}.png'), full_page=True)
        assert user.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), f'Meal editor overflow at {width}px'
    user.set_viewport_size({'width': 1280, 'height': 900})
    user.get_by_role('button', name='Сохранить приём пищи').click()
    user.wait_for_url(BASE + f'/nutrition?date={PAST}', timeout=10000)
    user.reload(wait_until='networkidle')
    user.get_by_text('400 ккал').wait_for(timeout=10000)
    assert next(row for row in api_json(user_context, f'/api/meals?date={PAST}')[1]['meals'] if int(row['id']) == meal_id)['totals']['calories'] == 400

    other_context = browser.new_context(viewport={'width': 390, 'height': 844})
    other = other_context.new_page()
    register(other, USER_B, 'Пользователь Б')
    other.goto(BASE + '/admin/products', wait_until='networkidle')
    other.get_by_text('Справочники доступны только администратору.').wait_for(timeout=10000)
    assert api_json(other_context, '/api/admin/products')[0] == 403
    other.goto(BASE + f'/workouts/{workout_id}', wait_until='networkidle')
    other.get_by_text('Тренировка не найдена.').wait_for(timeout=10000)
    assert other.locator('.editor-form').count() == 0
    other.goto(BASE + f'/nutrition/{meal_id}', wait_until='networkidle')
    other.get_by_text('Приём пищи не найден.').wait_for(timeout=10000)
    assert other.locator('.editor-form').count() == 0
    other.goto(BASE + '/workouts', wait_until='networkidle')
    other.screenshot(path=str(OUT / 'workouts-phone.png'), full_page=True)

    user.goto(BASE + '/workouts/new', wait_until='networkidle')
    user.get_by_label('Название или заметка').fill('Черновик только для А')
    exit_account(user)
    enter(user, USER_B)
    user.goto(BASE + '/workouts/new', wait_until='networkidle')
    assert user.get_by_label('Название или заметка').input_value() == ''
    exit_account(user)
    enter(user, USER_A)
    user.goto(BASE + '/workouts/new', wait_until='networkidle')
    user.get_by_label('Название или заметка').fill('После истечения сессии')
    user_context.clear_cookies()
    user.get_by_role('button', name='Сохранить тренировку').click()
    user.get_by_role('heading', name='Вход').wait_for(timeout=10000)
    enter(user, USER_A)
    user.goto(BASE + '/workouts/new', wait_until='networkidle')
    assert user.get_by_label('Название или заметка').input_value() == 'После истечения сессии'

    user.goto(BASE + f'/workouts/{workout_id}', wait_until='networkidle')
    user.once('dialog', lambda dialog: dialog.accept())
    user.get_by_role('button', name='Удалить тренировку').click()
    user.wait_for_url(BASE + '/workouts', timeout=10000)
    user.reload(wait_until='networkidle')
    assert user.get_by_text('Проверка ошибки сохранения').count() == 0
    assert api_json(user_context, f'/api/workouts/{workout_id}')[0] == 404

    user.goto(BASE + f'/nutrition/{meal_id}', wait_until='networkidle')
    user.once('dialog', lambda dialog: dialog.accept())
    user.get_by_role('button', name='Удалить приём пищи').click()
    user.wait_for_url(BASE + '/nutrition', timeout=10000)
    user.goto(BASE + f'/nutrition?date={PAST}', wait_until='networkidle')
    user.reload(wait_until='networkidle')
    assert user.get_by_text('400 ккал').count() == 0
    assert api_json(user_context, f'/api/meals/{meal_id}')[0] == 404

    print('UI CRUD checks passed: catalogs, workout and meal CRUD, snapshots, statistics, rights, drafts, responsive editors.')
    print('Screenshots:', OUT)
    browser.close()
