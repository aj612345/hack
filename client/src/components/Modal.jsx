import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';

export default function Modal({ children, onClose, title, className = '' }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`modal ${className}`} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); closeRef.current(); }} onClick={(event) => { if (event.target === event.currentTarget) closeRef.current(); }}>
    <div className="modal-content"><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button><h2 id="dialog-title">{title}</h2>{children}</div>
  </dialog>;
}
