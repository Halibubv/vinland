import React, { useEffect, useRef, useState } from 'react';

// Opens a native <dialog> as a modal: the rest of the page becomes inert,
// Escape closes it, and focus returns to the button that opened it.
export function useModal(onClose) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog.showModal();
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
      opener?.focus?.();
    };
  }, []);
  const props = {
    ref,
    onCancel: (event) => {
      event.preventDefault();
      onClose();
    },
    onMouseDown: (event) => {
      if (event.target === ref.current) onClose();
    },
  };
  return props;
}

export function CatalogDialog({ title, items, describe, onChoose, onClose }) {
  const modal = useModal(onClose);
  const [query, setQuery] = useState('');
  const needle = query.trim().toLocaleLowerCase('ru-RU');
  const filtered = items.filter((item) => item.name.toLocaleLowerCase('ru-RU').includes(needle));
  return (
    <dialog {...modal} className="modal catalog-dialog" aria-label={title}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
      </div>
      <input
        autoFocus
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Поиск по справочнику"
        placeholder="Поиск по справочнику"
      />
      <div className="catalog-options">
        {filtered.length ? (
          filtered.map((item) => (
            <button type="button" key={item.id} onClick={() => onChoose(item)}>
              <strong>{item.name}</strong>
              {describe && <small>{describe(item)}</small>}
            </button>
          ))
        ) : (
          <p className="muted">Ничего не найдено. Попробуйте другой запрос.</p>
        )}
      </div>
    </dialog>
  );
}

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
        <button autoFocus className="button button--outline" type="button" onClick={onClose}>
          Отмена
        </button>
      </div>
    </dialog>
  );
}
