"use client";

import { Dialog } from "@/components/molecules/Dialog";
import { Button } from "@/components/atoms/Buttons";
import { Text } from "@/components/atoms/Text";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` styles the confirm action as destructive. */
  tone?: "danger" | "primary";
  /** Short caution under the description. Pass `null` to hide it. */
  hint?: string | null;
  /** Shows a spinner on the confirm button and blocks both actions. */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * ConfirmDialog
 *
 * Accessible confirmation modal that replaces `window.confirm`: it keeps the
 * app's visual language, traps focus through `Dialog`, and supports a pending
 * state while the destructive action runs.
 *
 * Used in X case: confirming record and user deletions.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  hint = "Esta acción no se puede deshacer.",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      busy={loading}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {hint && (
        <Text as="p" size="sm" className="text-slate-600">
          {hint}
        </Text>
      )}
    </Dialog>
  );
}
