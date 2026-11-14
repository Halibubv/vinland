// Модальные окна: выбор из справочника и подтверждение удаления.
import React, { useEffect, useState } from 'react';

// Модальное окно на стандартном теге <dialog>: остальная страница недоступна,
// Escape и клик по затемнённому фону закрывают окно, а фокус потом
// возвращается на кнопку, которая его открыла. Одновременно открыто только одно окно.
export function Modal({ title, className, onClose, children }) {
  useEffect(() => {
    const dialog = document.getElementById('modal');
    const opener = document.activeElement;
    dialog.showModal();
    // Ставим курсор в элемент с атрибутом data-autofocus (поле поиска, кнопка «Отмена»).
    const autofocusElement = dialog.querySelector('[data-autofocus]');
    if (autofocusElement) autofocusElement.focus();
    document.body.classList.add('modal-open');

    // Окно убрали со страницы: возвращаем прокрутку и фокус.
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
    if (event.target.id === 'modal') onClose();
  }

  return (
    <dialog
      id="modal"
      className={`modal ${className}`}
      aria-label={title}
      onCancel={handleCancel}
      onMouseDown={handleMouseDown}
    >
      {children}
    </dialog>
  );
}

// Поиск и выбор записи из справочника (упражнения или продукты).
// describe(item) — необязательная строка-подсказка под названием.
export function CatalogDialog({ title, items, describe, onChoose, onClose }) {
  const [query, setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase('ru-RU');
  const found = items.filter((item) => item.name.toLocaleLowerCase('ru-RU').includes(search));

  return (
    <Modal title={title} className="catalog-dialog" onClose={onClose}>
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
    </Modal>
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
  return (
    <Modal title={title} className="confirm-dialog" onClose={onClose}>
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
    </Modal>
  );
}
