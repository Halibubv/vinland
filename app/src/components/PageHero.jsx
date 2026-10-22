// Большой баннер вверху страниц тренировки, питания и профиля:
// фото на фоне, слева крупный заголовок, снизу или справа — дополнения.
import React from 'react';
import '../styles/page-hero.css';

// image — путь к фото; top — строка над заголовком (ссылка назад, кнопки);
// media — что-то перед заголовком (аватар); aside — блок справа от заголовка;
// stats — крупные цифры под заголовком: [{ value: '3', label: 'подхода' }].
export function PageHero({ image, top, eyebrow, title, subtitle, media, aside, stats }) {
  return (
    <section className="page-hero" style={{ '--hero-image': `url(${image})` }}>
      {top && <div className="page-hero-top">{top}</div>}
      <div className="page-hero-main">
        <div className="page-hero-heading">
          {media}
          <div className="page-hero-text">
            {eyebrow && <span className="page-hero-eyebrow">{eyebrow}</span>}
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {aside}
      </div>
      {stats && (
        <dl className="page-hero-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
