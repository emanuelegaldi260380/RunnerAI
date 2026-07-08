"use client";

import { useRef, useState } from "react";
import Modal from "@/components/Modal";
import { useT } from "@/components/LangProvider";

/**
 * Dialog di conferma accessibile per azioni importanti/distruttive
 * (NN/g – Error Prevention, WCAG 2.2 – 3.3.4). Costruito su `Modal`.
 * `onConfirm` può essere async: mostra lo stato di caricamento sul pulsante.
 */
export default function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onClose,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const tr = useT();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    try {
      setLoading(true);
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={title} onClose={loading ? () => {} : onClose} size="sm" initialFocusRef={confirmRef}>
      {body && <p className="text-sm text-muted">{body}</p>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button onClick={onClose} disabled={loading} className="btn-ghost">
          {cancelLabel ?? tr("confirm.cancel")}
        </button>
        <button
          ref={confirmRef}
          onClick={confirm}
          disabled={loading}
          className={
            danger
              ? "focus-ring inline-flex items-center justify-center rounded-full bg-red-500 px-5 py-2.5 font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              : "btn-brand"
          }
        >
          {loading ? "…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
