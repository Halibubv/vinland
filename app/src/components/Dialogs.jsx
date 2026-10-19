// Модальные окна: выбор из справочника и подтверждение удаления.
import React, { useEffect, useRef, useState } from 'react';

// Открывает стандартный <dialog> как модальное окно: остальная страница
// недоступна, Escape закрывает окно, а фокус потом возвращается на кнопку,
// которая его открыла. Возвращает свойства, которые нужно передать в <dialog>.
export function useModal(onClose) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog.showModal();
    // autoFocus из React срабатывает раньше showModal(), поэтому фокус
    // ставим сами на элемент с атрибутом data-autofocus.
    const autofocusElement = dialog.querySelector('[data-autofocus]');
    if (autofocusElement) autofocusElement.focus();
    document.body.classList.add('modal-open');

    return () => {
      document.body.classList.remove('modal-open');
      if (opener && opener.focus) opener.focus();
    };
  }, []);

  function handleCancel(event) {
    // Escape: закрываем окно сами, чтобы родитель убрал его из состояния.
    event.preventDefault();
    onClose();
  }

  function handleMouseDown(event) {
    // Клик по затемнённому фону попадает в сам <dialog>, а не в его содержимое.
    if (event.target === ref.current) onClose();
  }

  return { ref, onCancel: handleCancel, onMouseDown: handleMouseDown };
}

// Поиск и выбор записи из справочника (упражнения или продукты).
// describe(item) — необязательная строка-подсказка под названием.
export function CatalogDialog({ title, items, describe, onChoose, onClose }) {
  const modal = useModal(onClose);
  const [query, setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase('ru-RU');
  const found = items.filter((item) => item.name.toLocaleLowerCase('ru-RU').includes(search));

  return (
    <dialog {...modal} className="modal catalog-dialog" aria-label={title}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
      </div>
      <input
        data-autofocus
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Поиск по справочнику"
        placeholder="Поиск по справочнику"
      />
      <div className="catalog-options">
        {found.length === 0 && (
          <p className="muted">Ничего не найдено. Попробуйте другой запрос.</p>
        )}
        {found.map((item) => (
          <button type="button" key={item.id} onClick={() => onChoose(item)}>
            <strong>{item.name}</strong>
            {describe && <small>{describe(item)}</small>}
          </button>
        ))}
      </div>
    </dialog>
  );
}

// «Вы уверены?» перед удалением. Фокус сразу на «Отмена», чтобы Enter ничего не удалил.
export function ConfirmDialog({
  title,
  children,
  confirmLabel = 'Удалить',
  busy,
  onConfirm,
  onClose,
}) {
  const modal = useModal(onClose);
  return (
    <dialog {...modal} className="modal confirm-dialog" aria-label={title}>
      <h2>{title}</h2>
      <div className="confirm-text">{children}</div>
      <div className="modal-actions">
        <button className="button button--danger" type="button" onClick={onConfirm} disabled={busy}>
          {busy ? 'Удаляем…' : confirmLabel}
        </button>
        <button data-autofocus className="button button--outline" type="button" onClick={onClose}>
          Отмена
        </button>
      </div>
    </dialog>
  );
}
