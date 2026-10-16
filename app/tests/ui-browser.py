"""Browser smoke checks against the built PHP-served VИНЛАНД UI."""
import os
from pathlib import Path
from uuid import uuid4
from playwright.sync_api import sync_playwright


BASE = os.environ.get('UI_TEST_BASE', 'http://127.0.0.1:8081')
OUT = Path(__file__).resolve().parents[1] / ".screenshots"
OUT.mkdir(exist_ok=True)
email = f"ui-{uuid4().hex[:10]}@example.test"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        headless=True,
    )
    page = browser.new_page(viewport={"width": 1280, "height": 900}, device_scale_factor=1)
    failures = []
    page.on("pageerror", lambda error: failures.append(str(error)))

    for width, label in [(1280, "desktop"), (834, "tablet"), (390, "phone")]:
        page.set_viewport_size({"width": width, "height": 850})
        response = page.goto(BASE + "/", wait_until="networkidle")
        assert response.status == 200, ("root", response.status)
        assert page.get_by_role("heading", name="ВИНЛАНД").count() > 0
        height = page.evaluate("document.body.scrollHeight")
        for y in range(0, height, 450):
            page.evaluate("y => window.scrollTo(0, y)", y)
            page.wait_for_timeout(90)
        page.wait_for_timeout(700)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=str(OUT / f"landing-{label}.png"), full_page=True)
        if width == 390:
            assert page.locator(".guest-mobile-nav").is_visible()
            assert not page.locator(".landing .site-footer").is_visible()

    page.set_viewport_size({"width": 1280, "height": 900})
    for route, title in [("/login", "Вход"), ("/register", "Регистрация")]:
        response = page.goto(BASE + route, wait_until="networkidle")
        assert response.status == 200, (route, response.status)
        assert page.get_by_role("heading", name=title).is_visible()
    for private in ["/.env", "/backend/config.php", "/database/001-schema.sql"]:
        assert page.request.get(BASE + private).status == 404, private
    for asset in ["icon-calendar.svg", "icon-pencil.svg", "icon-plus.svg", "icon-sun.svg", "icon-trash.svg"]:
        response = page.request.get(BASE + "/assets/" + asset)
        assert response.status == 200 and response.body().startswith(b"<svg"), asset

    page.get_by_label("Имя", exact=True).fill("Тестовый Пользователь")
    page.get_by_label("Email", exact=True).fill(email)
    page.locator('input[name="password"]').fill("CorrectHorse42")
    page.locator('input[name="passwordAgain"]').fill("wrong")
    page.get_by_role("button", name="Создать аккаунт").click()
    assert page.get_by_text("Пароли не совпадают.").is_visible()
    page.locator('input[name="passwordAgain"]').fill("CorrectHorse42")
    page.get_by_role("button", name="Создать аккаунт").click()
    page.get_by_role("heading", name="Добрый день, Тестовый").wait_for(timeout=10000)
    assert page.url == BASE + "/"

    page.goto(BASE + "/profile", wait_until="networkidle")
    assert page.get_by_text(email).is_visible()
    page.get_by_role("button", name="Настройки профиля").click()
    page.get_by_label("Калории").fill("2400")
    page.get_by_label("Белки").fill("180")
    page.get_by_label("Жиры").fill("80")
    page.get_by_label("Углеводы").fill("240")
    page.get_by_role("button", name="Сохранить изменения").click()
    page.get_by_text("Профиль и цели сохранены.").wait_for(timeout=10000)
    page.reload(wait_until="networkidle")
    assert page.request.get(BASE + '/api/profile').json()['user']['target_calories'] == 2400
    page.get_by_text("2 400", exact=False).first.wait_for(timeout=10000)
    page.screenshot(path=str(OUT / "profile-desktop.png"), full_page=True)

    page.set_viewport_size({"width": 390, "height": 844})
    page.reload(wait_until="networkidle")
    assert page.locator(".mobile-nav").is_visible()
    page.screenshot(path=str(OUT / "profile-phone.png"), full_page=True)
    page.get_by_role("button", name="Выйти из аккаунта").click()
    page.get_by_role("heading", name="ВИНЛАНД").wait_for(timeout=10000)

    page.goto(BASE + "/login", wait_until="networkidle")
    page.get_by_label("Email", exact=True).fill(email)
    page.locator('input[name="password"]').fill("CorrectHorse42")
    page.get_by_role("button", name="Войти", exact=True).click()
    page.get_by_role("heading", name="Добрый день, Тестовый").wait_for(timeout=10000)
    assert not page.locator(".global-error").count()
    response = page.goto(BASE + "/workouts", wait_until="networkidle")
    assert response.status == 200
    assert page.locator(".app-header").is_visible()
    assert not failures, failures
    print("UI browser checks passed: routes, privacy, responsive nav, register, profile persistence, logout/login.")
    print("Screenshots:", OUT)
    browser.close()
