"use client";

import { useEffect, useId, useRef } from "react";
import { useT } from "@/components/LangProvider";

/**
 * Modale accessibile condivisa (ARIA APG – Dialog).
 * - role="dialog" + aria-modal, etichettata dal titolo
 * - focus iniziale sul dialog e focus-trap con Tab/Shift+Tab
 * - chiusura con Esc e click sul backdrop
 * - blocco dello scroll del body e ritorno del focus al trigger alla chiusura
 */
export default function Modal({
  onClose,
  title,
  children,
  labelledById,
  size = "md",
  initialFocusRef,
}: {
  onClose: () => void;
  /** Titolo mostrato in testa e usato come etichetta accessibile. Ometti se fornisci labelledById. */
  title?: string;
  children: React.ReactNode;
  /** id di un elemento esterno che etichetta il dialog (alternativa a `title`). */
  labelledById?: string;
  size?: "sm" | "md" | "lg";
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const tr = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const titleId = labelledById ?? `modal-title-${autoId}`;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // focus iniziale: elemento richiesto, altrimenti il pannello
    const toFocus = initialFocusRef?.current ?? panelRef.current;
    toFocus?.focus();

    function getFocusable(): HTMLElement[] {
      if (!panelRef.current) return [];
      return Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose, initialFocusRef]);

  const maxW = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative z-10 my-0 w-full ${maxW} rounded-t-2xl bg-card p-5 shadow-2xl outline-none sm:my-4 sm:rounded-2xl`}
      >
        <button
          onClick={onClose}
          aria-label={tr("nav.close")}
          className="focus-ring absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full text-lg text-muted transition hover:bg-black/5 hover:text-foreground"
        >
          <span aria-hidden="true">✕</span>
        </button>
        {title && (
          <h2 id={titleId} className="mb-3 pr-9 text-lg font-bold">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
