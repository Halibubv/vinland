// Число, которое быстро «досчитывает» до нужного значения (как карточки статистики
// на designbookmark.com/motion). Если значение меняется, счёт идёт от старого к новому.
import React, { useEffect, useRef, useState } from 'react';
import { formatInt } from '../lib/format.js';

const DURATION = 900; // длительность счёта, мс

export function CountUp({ value }) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(0);
  // Последнее показанное число: с него начнётся следующий счёт.
  const shownRef = useRef(0);

  useEffect(() => {
    // Кто попросил систему «меньше движения» — сразу показываем итог.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shownRef.current = target;
      setShown(target);
      return;
    }

    const from = shownRef.current;
    const start = performance.now();
    let frame;

    function step(now) {
      const progress = Math.min((now - start) / DURATION, 1);
      // Плавное замедление к концу: сначала быстро, потом медленно.
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (target - from) * eased);
      shownRef.current = current;
      setShown(current);
      if (progress < 1) frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    // Если компонент убрали со страницы раньше конца — останавливаем счёт.
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return formatInt(shown);
}
