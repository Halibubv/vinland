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

// Картинка записи в списке. Если картинки нет (или файл не загрузился) —
// кружок с первой буквой названия.
export function CatalogThumb({ src, name }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      <span className="catalog-thumb">
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
      </span>
    );
  }
  return (
    <span className="catalog-thumb catalog-thumb--letter" aria-hidden="true">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

// Поиск и выбор записи из справочника (упражнения или продукты).
// describe(item) — необязательная строка-подсказка под названием,
// image(item) — путь к картинке или null.
// addLabel и onAdd(name) — кнопка «Добавить своё…» под поиском, если нужной записи
// нет в справочнике. В onAdd передаём то, что ввели в поиск, — это готовое название.
// groupOf(item) — необязательная группа записи (у упражнений — группа мышц):
// тогда над списком появляются кнопки-фильтры «Все, Ноги, Грудь…».
export function CatalogDialog({
  title,
  items,
  describe,
  image,
  addLabel,
  onAdd,
  groupOf,
  onChoose,
  onClose,
}) {
  const [query, setQuery] = useState('');
  // Выбранная группа; '' — показываем все.
  const [group, setGroup] = useState('');

  // Список групп для кнопок: каждая группа один раз, без пустых.
  const groups = [];
  if (groupOf) {
    for (const item of items) {
      const name = groupOf(item);
      if (name && !groups.includes(name)) groups.push(name);
    }
  }

  // Фильтр: запись подходит, если название содержит поиск и группа совпадает с выбранной.
  const search = query.trim().toLocaleLowerCase('ru-RU');
  const found = items.filter((item) => {
    const nameMatches = item.name.toLocaleLowerCase('ru-RU').includes(search);
    const groupMatches = group === '' || groupOf(item) === group;
    return nameMatches && groupMatches;
  });

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
      {onAdd && (
        <button type="button" className="catalog-add" onClick={() => onAdd(query.trim())}>
          <span aria-hidden="true">+</span>
          {addLabel}
          {query.trim() && <b>«{query.trim()}»</b>}
        </button>
      )}
      {groups.length > 0 && (
        <div className="catalog-groups" role="group" aria-label="Фильтр по группе">
          <button
            type="button"
            className={group === '' ? 'selected' : ''}
            onClick={() => setGroup('')}
          >
            Все
          </button>
          {groups.map((name) => (
            <button
              type="button"
              key={name}
              className={group === name ? 'selected' : ''}
              onClick={() => setGroup(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="catalog-options">
        {found.length === 0 && <p className="muted">В справочнике такого нет.</p>}
        {found.map((item) => (
          <button type="button" key={item.id} onClick={() => onChoose(item)}>
            <CatalogThumb src={image ? image(item) : null} name={item.name} />
            <span className="catalog-option-text">
              <strong>
                {item.name}
                {item.user_id && <em className="catalog-own">своё</em>}
              </strong>
              {describe && <small>{describe(item)}</small>}
            </span>
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
