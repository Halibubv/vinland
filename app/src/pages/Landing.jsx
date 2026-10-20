// Лендинг для гостя: описание возможностей и кнопки входа и регистрации.
// Все цифры и записи здесь — статичный пример, а не данные пользователя.
import React, { useEffect } from 'react';
import { ASSETS } from '../lib/constants.js';
import { Brand, LinkButton, Footer, GuestMobileNav } from '../components/Layout.jsx';
import { Progress } from '../components/ui.jsx';

export function Landing() {
  // Блоки с классом .reveal плавно появляются, когда до них докрутили страницу:
  // IntersectionObserver сообщает, что блок попал в экран, и мы добавляем класс is-visible.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;

    function handleVisible(entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    }

    const observer = new IntersectionObserver(handleVisible, { threshold: 0.08 });
    for (const block of document.querySelectorAll('.reveal')) observer.observe(block);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="hero-photo" aria-hidden="true" />
        <div className="hero-shade" />
        <div className="hero-fog" aria-hidden="true" />
        <header className="guest-header">
          <Brand />
          <div>
            <LinkButton to="/login" variant="outline">
              Войти
            </LinkButton>
            <LinkButton to="/register">Создать аккаунт</LinkButton>
          </div>
        </header>
        <div className="landing-hero-copy">
          <h1>
            <img src={`${ASSETS}wordmark.svg`} alt="ВИНЛАНД" />
          </h1>
          <p>
            Учёт силовых тренировок и дневник
            <br />
            питания с КБЖУ.
          </p>
          <div className="button-row">
            <LinkButton to="/register">Создать аккаунт</LinkButton>
            <LinkButton to="/login" variant="outline">
              Войти
            </LinkButton>
          </div>
        </div>
      </section>
      <section className="landing-showcase reveal">
        <div className="showcase-copy">
          <span className="eyebrow">БОЛЬШЕ, ЧЕМ ДНЕВНИК</span>
          <h2>
            Порядок в тренировках.
            <br />
            Осознанность в питании.
          </h2>
          <p>
            ВИНЛАНД помогает сохранять баланс
            <br />и двигаться к своим целям — шаг за шагом.
          </p>
          <div className="button-row">
            <LinkButton to="/register">Создать аккаунт</LinkButton>
            <LinkButton to="/login" variant="outline">
              Войти
            </LinkButton>
          </div>
        </div>
        <img
          className="mobile-device"
          src={`${ASSETS}mobile-device.png`}
          alt="ВИНЛАНД на устройстве на фоне фьорда"
        />
      </section>
      <section className="landing-product reveal">
        <img src={`${ASSETS}phone-product.png`} alt="Приложение ВИНЛАНД на двух телефонах" />
        <div>
          <span className="eyebrow">ВОЗМОЖНОСТИ</span>
          <h2>
            Всё, что нужно
            <br />
            для твоих целей
          </h2>
          <ul>
            <li>
              <span className="product-icon">
                <img src={`${ASSETS}feature-dumbbell.svg`} alt="" />
              </span>
              <div>
                <strong>Запись тренировок</strong>
                <span>
                  Фиксируй упражнения, количество подходов, повторений и рабочий вес. Добавляй
                  заметки к каждой тренировке.
                </span>
              </div>
            </li>
            <li>
              <span className="product-icon">
                <img src={`${ASSETS}icon-food.svg`} alt="" />
              </span>
              <div>
                <strong>Дневник питания с КБЖУ</strong>
                <span>
                  Указывай продукты и граммовку. Калории, белки, жиры и углеводы рассчитываются
                  автоматически по каждому приёму пищи.
                </span>
              </div>
            </li>
            <li>
              <span className="product-icon">
                <img src={`${ASSETS}icon-chart.svg`} alt="" />
              </span>
              <div>
                <strong>Статистика и история</strong>
                <span>
                  Возвращайся к прошлым тренировкам и приёмам пищи. Сравнивай фактическое
                  потребление с целями КБЖУ.
                </span>
              </div>
            </li>
            <li>
              <span className="product-icon">
                <img src={`${ASSETS}icon-sliders.svg`} alt="" />
              </span>
              <div>
                <strong>Цели и личный кабинет</strong>
                <span>
                  Настрой личные цели КБЖУ в профиле и отслеживай, как питание соответствует твоим
                  задачам.
                </span>
              </div>
            </li>
          </ul>
        </div>
      </section>
      <section className="editorial-row reveal">
        <img src={`${ASSETS}landing-photo-2.png`} alt="Атлетка выполняет упражнение со штангой" />
        <div>
          <span className="eyebrow">ТРЕНИРОВКИ</span>
          <h2>
            Каждый подход
            <br />
            имеет значение.
          </h2>
          <p>
            Записывай выполненные тренировки: упражнения, порядок, повторения и вес. Возвращайся к
            сохранённым результатам.
          </p>
          <div className="demo-card">
            <strong>
              <img src={`${ASSETS}feature-dumbbell.svg`} alt="" />
              Тренировка сегодня
            </strong>
            <div className="demo-row">
              <img src={`${ASSETS}squat-photo.png`} alt="" />
              <span>
                Приседания со штангой<small>3 × 8 · 100 кг</small>
              </span>
            </div>
            <div className="demo-row">
              <img src={`${ASSETS}exercise-photo.png`} alt="" />
              <span>
                Жим лёжа<small>3 × 10 · 80 кг</small>
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="editorial-row editorial-row--reverse reveal">
        <img
          src={`${ASSETS}landing-photo-6.png`}
          alt="Сбалансированное блюдо с курицей, рисом и овощами"
        />
        <div>
          <span className="eyebrow">ПИТАНИЕ И КБЖУ</span>
          <h2>
            Знай, что
            <br />в твоём рационе.
          </h2>
          <p>
            Выбери продукт и укажи граммовку — ВИНЛАНД посчитает калории, белки, жиры и углеводы и
            суммирует все приёмы пищи за день.
          </p>
          <div className="demo-card">
            <strong>Обед · 27 сентября 2026</strong>
            <div className="demo-row">
              <img src={`${ASSETS}food-photo.png`} alt="" />
              <span>
                Куриная грудка · 200 г<small>330 ккал · Б 62 · Ж 8 · У 0</small>
              </span>
            </div>
            <div className="demo-row">
              <img src={`${ASSETS}food-photo.png`} alt="" />
              <span>
                Рис варёный · 250 г<small>320 ккал · Б 6,75 · Ж 0,75 · У 70</small>
              </span>
            </div>
            <div className="demo-total">
              <strong>Итого: 650 ккал</strong>
              <span>Б 68,75 · Ж 8,75 · У 70 г</span>
            </div>
          </div>
        </div>
      </section>
      <section className="landing-stats reveal">
        <div className="stats-heading">
          <div>
            <span className="eyebrow">ПРОГРЕСС И СТАТИСТИКА</span>
            <h2>
              Сравни записи.
              <br />
              Замечай изменения.
            </h2>
          </div>
          <p>
            История питания и сохранённые тренировки всегда под рукой. Статистика показывает
            динамику и помогает сравнивать фактическое потребление с личными целями КБЖУ.
          </p>
        </div>
        <div className="panel demo-progress">
          <div>
            <img src={`${ASSETS}icon-flame.svg`} alt="" />
            <span>
              Сегодня в рационе<strong>1 850 / 2 400 ккал</strong>
            </span>
            <div className="demo-calorie-bar">
              <div className="progress-track">
                <span style={{ width: '77%' }} />
              </div>
              <b>77%</b>
            </div>
          </div>
          <div className="demo-macros">
            <Progress label="Белки" value={149} target={180} />
            <Progress label="Жиры" value={56} target={80} />
            <Progress label="Углеводы" value={175} target={240} />
          </div>
        </div>
      </section>
      <section className="landing-steps reveal">
        <h2>Начни свой путь.</h2>
        <div className="step-grid">
          <article>
            <span>01</span>
            <strong>Создай аккаунт</strong>
            <p>Зарегистрируйся с именем, электронной почтой и паролем.</p>
          </article>
          <article>
            <span>02</span>
            <strong>Укажи цели КБЖУ</strong>
            <p>Настрой личные цели по калориям, белкам, жирам и углеводам в профиле.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Сохрани первую запись</strong>
            <p>Запиши выполненную тренировку или добавь первый приём пищи.</p>
          </article>
        </div>
      </section>
      <section className="landing-cta reveal">
        <span className="eyebrow">ТВОИ ЦЕЛИ. ТВОЙ ПУТЬ. ТВОЯ СИЛА.</span>
        <h2>Следующий шаг — твой.</h2>
        <p>
          Тренировки и питание в одном месте.
          <br />
          Создай аккаунт и начни с первой записи.
        </p>
        <div className="button-row">
          <LinkButton to="/register">Создать аккаунт</LinkButton>
          <LinkButton to="/login" variant="outline">
            Войти в аккаунт
          </LinkButton>
        </div>
      </section>
      <Footer guest />
      <GuestMobileNav />
    </div>
  );
}
