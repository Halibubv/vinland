// Главная страница для вошедшего пользователя: приветствие, две главные кнопки и блок «Полезное».
import React from 'react';
import { ASSETS } from '../lib/constants.js';
import { Footer } from '../components/Layout.jsx';
import './Home.css';

// Короткие подсказки в блоке «Полезное», каждая ведёт в свой раздел.
const guides = [
  {
    to: '/nutrition',
    icon: 'nav-food.svg',
    topic: 'Питание',
    title: 'Дневник питания без догадок',
    text: 'Как проще учитывать рацион и видеть реальную картину.',
  },
  {
    to: '/statistics',
    icon: 'icon-chart.svg',
    topic: 'Восстановление',
    title: 'Восстановление после нагрузки',
    text: 'Что помогает организму быть готовым к новым тренировкам.',
  },
];

export function Home({ user }) {
  const firstName = user.name.split(' ')[0];
  return (
    <>
      <section className="home-hero">
        <div className="home-hero-copy">
          <h1>
            Добрый день,
            <br />
            {firstName}
          </h1>
          <p>Сегодня — новый шаг в пути.</p>
          <div className="home-hero-actions">
            <a className="button button--primary" href="/workouts/new">
              <img src={`${ASSETS}nav-workouts.svg`} alt="" />
              Записать тренировку
            </a>
            <a className="button button--outline" href="/nutrition/new">
              <img src={`${ASSETS}nav-food.svg`} alt="" />
              Добавить питание
            </a>
          </div>
        </div>
      </section>

      <main className="content home-content">
        <div className="home-ornament" aria-hidden="true" />
        <h2>Полезное</h2>
        <p className="home-lead">Знания. Практика. Твой путь.</p>
        <div className="home-useful">
          <img src={`${ASSETS}article-barbell.png`} alt="Штанга для силовой тренировки" />
          <article className="home-feature">
            <span>Тренировки</span>
            <h3>
              Техника приседаний:
              <br />
              основа движения
            </h3>
            <p>
              Разбираем ключевые принципы, технику и частые ошибки, чтобы приседания были
              эффективными и безопасными.
            </p>
            <a href="/workouts">
              <span aria-hidden="true">→</span>
              Открыть тренировки
            </a>
          </article>
          <ul className="home-guides">
            {guides.map((guide) => (
              <li key={guide.to}>
                <a href={guide.to}>
                  {/* На широком экране — иконка темы, на узком — значок книги. */}
                  <span className="home-guide-icon">
                    <img className="wide-only" src={`${ASSETS}${guide.icon}`} alt="" />
                    <img className="narrow-only" src={`${ASSETS}icon-book.svg`} alt="" />
                  </span>
                  <span className="home-guide-text">
                    <small className="wide-only">{guide.topic}</small>
                    <strong>{guide.title}</strong>
                    <span className="wide-only">{guide.text}</span>
                  </span>
                  <b className="wide-only" aria-hidden="true">
                    →
                  </b>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
