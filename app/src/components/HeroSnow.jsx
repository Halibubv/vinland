// Падающий снег поверх фото на главном баннере. Рисуем на <canvas>:
// каждый кадр стираем холст и рисуем снежинки чуть ниже, чем в прошлый раз.
import React, { useEffect, useRef } from 'react';

const FLAKE_COUNT = 90;

// Новая снежинка в случайном месте холста.
function makeFlake(width, height) {
  const size = Math.random() * 2 + 0.6; // радиус в пикселях
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size,
    speed: size * 0.35 + 0.15, // крупные снежинки «ближе» и падают быстрее
    swing: Math.random() * Math.PI * 2, // фаза покачивания влево-вправо
    alpha: Math.random() * 0.5 + 0.25,
  };
}

export function HeroSnow() {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Если в системе включено «уменьшить движение», снег не запускаем.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    let flakes = [];
    let frameId;

    // Холст должен быть того же размера, что и баннер.
    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      flakes = [];
      for (let i = 0; i < FLAKE_COUNT; i++) flakes.push(makeFlake(canvas.width, canvas.height));
    }

    function draw() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (const flake of flakes) {
        flake.y += flake.speed;
        flake.swing += 0.01;
        flake.x += Math.sin(flake.swing) * 0.3 + 0.15; // лёгкий ветер вправо

        // Улетела за край — возвращаем наверх в случайное место.
        if (flake.y > canvas.height + 5) {
          flake.y = -5;
          flake.x = Math.random() * canvas.width;
        }
        if (flake.x > canvas.width + 5) flake.x = -5;

        context.beginPath();
        context.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
        context.fillStyle = `rgba(235, 240, 248, ${flake.alpha})`;
        context.fill();
      }
      frameId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);
    // Когда уходим со страницы, останавливаем анимацию.
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-snow" aria-hidden="true" />;
}
