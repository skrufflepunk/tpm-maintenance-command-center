import { trapFocus } from "./focus";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
export function Panel({
  title,
  eyebrow,
  children,
  action,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onKeyDown={(e) => {
        if (ref.current) trapFocus(e, ref.current);
      }}
      aria-labelledby="modal-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Palm() {
  return (
    <svg viewBox="0 0 180 180" fill="none" aria-hidden="true">
      <path d="M84 170Q110 95 92 54" stroke="currentColor" strokeWidth="9" />
      <path
        d="M92 57Q42 9 13 65Q51 39 92 57ZM92 57Q100 4 151 23Q118 28 92 57ZM92 57Q147 28 173 83Q129 55 92 57ZM92 57Q61 35 42 101Q62 67 92 57ZM92 57Q121 49 136 112Q111 77 92 57ZM92 57Q58 0 34 15Q74 23 92 57Z"
        fill="currentColor"
      />
    </svg>
  );
}
