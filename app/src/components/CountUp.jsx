// Число, которое быстро «досчитывает» от нуля до нужного значения
// (как карточки статистики на designbookmark.com/motion).
import React, { useEffect, useState } from 'react';
import { formatInt } from '../lib/format.js';

const DURATION = 900; // длительность счёта, мс

export function CountUp({ value }) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    // Кто попросил систему «меньше движения» — сразу показываем итог.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(target);
      return;
    }

    const start = Date.now();
    // Каждые 16 мс (примерно 60 раз в секунду) пересчитываем число.
    const timer = setInterval(() => {
      const progress = Math.min((Date.now() - start) / DURATION, 1);
      // Плавное замедление к концу: сначала быстро, потом медленно.
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(target * eased));
      if (progress === 1) clearInterval(timer);
    }, 16);

    // Если компонент убрали со страницы раньше конца — останавливаем счёт.
    return () => clearInterval(timer);
  }, [target]);

  return formatInt(shown);
}
