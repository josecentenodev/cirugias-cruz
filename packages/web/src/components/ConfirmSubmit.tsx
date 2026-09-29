"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FormFeedback, useFormAction } from "@/components/ActionForm";
import type { FormActionFn } from "@/lib/action-result";
import { messages } from "@/messages/en";

function ConfirmButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" size="sm" disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}

/**
 * A destructive Server-Action submit gated behind a native `<dialog>`
 * confirmation (no dependency). The trigger is a `danger`-styled button;
 * the modal spells out the consequence and offers Cancel / Confirm.
 * Replaces one-click destructive submits — see
 * docs/design/ux-principles.md (§4 Forgiving). `action` is the
 * already-`.bind()`-ed Server Action; feedback is centralized — an error
 * renders inline next to the trigger (`FormFeedback`), a success toasts.
 */
export function ConfirmSubmit({
  action,
  triggerLabel,
  confirmLabel = messages.common.confirm,
  pendingLabel = messages.common.deleting,
  cancelLabel = messages.common.cancel,
  message,
  title,
  size = "sm",
}: {
  action: FormActionFn;
  triggerLabel: string;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  message: string;
  title?: string;
  size?: "sm" | "default";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [result, formAction] = useFormAction(action);
  const settledId = result.status === "idle" ? undefined : result.id;

  // Close once the action settles in place — an error to show next to the
  // trigger, or an in-place success (its toast is `useFormAction`'s job).
  // A redirecting success unmounts this entirely.
  useEffect(() => {
    if (settledId !== undefined) dialogRef.current?.close();
  }, [settledId]);

  return (
    <div className="flex flex-col items-start gap-2">
      <FormFeedback result={result} />

      <Button
        type="button"
        variant="ghost"
        size={size}
        className="text-danger hover:bg-danger-bg"
        onClick={() => dialogRef.current?.showModal()}
      >
        {triggerLabel}
      </Button>

      <dialog
        ref={dialogRef}
        className="max-w-sm rounded-md border border-border bg-surface p-0 text-foreground backdrop:bg-foreground/30"
      >
        <form action={formAction} className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">{title ?? triggerLabel}</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => dialogRef.current?.close()}
            >
              {cancelLabel}
            </Button>
            <ConfirmButton label={confirmLabel} pendingLabel={pendingLabel} />
          </div>
        </form>
      </dialog>
    </div>
  );
}
