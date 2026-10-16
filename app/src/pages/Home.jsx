import React, { useEffect, useState } from 'react';
import { api, formatNumber, localDate } from '../lib/api.js';
import { A } from '../lib/constants.js';
import { LinkButton, Footer } from '../components/Layout.jsx';
import { Progress } from '../components/ui.jsx';

export function Home({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    Promise.all([
      api(`/statistics?from=${localDate()}&to=${localDate()}`),
      api('/workouts'),
      api(`/meals?date=${localDate()}`),
    ])
      .then((results) => {
        if (live) setData({ stats: results[0], workouts: results[1], meals: results[2] });
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);
  const day = data?.stats?.days?.[0];
  const goals = data?.stats?.goals || {};
  return (
    <>
      <section className="home-hero">
        <div className="home-hero-photo" />
        <div className="home-hero-copy">
          <h1>
            Добрый день,
            <br />
            {user.name.split(' ')[0]}
          </h1>
          <p>Сегодня — новый шаг в пути.</p>
          <div className="button-row">
            <LinkButton to="/workouts/new">Записать тренировку</LinkButton>
            <LinkButton to="/nutrition/new" variant="outline">
              Добавить питание
            </LinkButton>
          </div>
        </div>
      </section>
      <main className="content home-content">
        <div className="ornament" />
        <h2>Полезное</h2>
        <p className="subheading">Знания. Практика. Твой путь.</p>
        <div className="useful-grid">
          <img src={`${A}article-barbell.png`} alt="Штанга для силовой тренировки" />
          <article>
            <span className="eyebrow">ТРЕНИРОВКИ</span>
            <h3>
              Техника приседаний:
              <br />
              основа движения
            </h3>
            <p>
              Разбираем ключевые принципы, технику и частые ошибки, чтобы приседания были
              эффективными и безопасными.
            </p>
            <a href="/workouts">Открыть тренировки →</a>
          </article>
          <div className="useful-links">
            <a href="/nutrition">
              <strong>Дневник питания без догадок</strong>
              <span>Как проще учитывать рацион и видеть реальную картину.</span>
              <b>→</b>
            </a>
            <a href="/statistics">
              <strong>Восстановление после нагрузки</strong>
              <span>Что помогает организму быть готовым к новым тренировкам.</span>
              <b>→</b>
            </a>
          </div>
        </div>
        <section className="dashboard-preview">
          <div className="section-heading">
            <h2>Сегодня</h2>
            <a href="/statistics">Вся статистика →</a>
          </div>
          {error ? (
            <p className="form-message">{error}</p>
          ) : !data ? (
            <p className="muted">Загружаем данные…</p>
          ) : (
            <div className="overview-grid">
              <article className="panel">
                <span className="eyebrow">ПИТАНИЕ</span>
                <h3>{formatNumber(day.calories)} ккал</h3>
                <Progress
                  label="Калории"
                  value={day.calories}
                  target={goals.calories}
                  unit="ккал"
                />
                <a href="/nutrition">Открыть дневник →</a>
              </article>
              <article className="panel">
                <span className="eyebrow">ТРЕНИРОВКИ</span>
                <h3>{day.workouts} за сегодня</h3>
                <p>{day.sets} подходов записано</p>
                <a href="/workouts">Открыть историю →</a>
              </article>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
