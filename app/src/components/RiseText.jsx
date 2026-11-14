// Заголовок, буквы которого по очереди «всплывают» снизу (анимация из designbookmark.com/motion).
// Каждая буква — отдельный <span> со своим номером --i: по нему CSS считает задержку.
// Слова оборачиваем отдельно, чтобы строка переносилась по словам, а не посреди слова.
// Отступ между словами задан в CSS (.rise-word в motion.css).
import React from 'react';

export function RiseText({ text }) {
  // Не строка (например, null, пока данные грузятся) — показываем как есть.
  if (typeof text !== 'string') return text;

  const words = text.split(' ');
  let letterNumber = 0;
  return (
    <span className="rise-text">
      {/* Экранный диктор читает фразу целиком из скрытой копии, а не по буквам. */}
      <span className="sr-only">{text}</span>
      {words.map((word, wordIndex) => (
        <span className="rise-word" aria-hidden="true" key={wordIndex}>
          {Array.from(word).map((letter, letterIndex) => {
            letterNumber += 1;
            return (
              <span className="rise-letter" style={{ '--i': letterNumber }} key={letterIndex}>
                {letter}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
