"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { messages } from "@/messages/en";

type ConfirmState = { error?: string };
type BoundAction = (previousState: ConfirmState, formData: FormData) => Promise<ConfirmState>;

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
 * already-`.bind()`-ed Server Action; its returned `{ error }` renders
 * inline next to the trigger. For destructive actions that also return a
 * value to display (e.g. a reissued password) keep a plain form instead.
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
  action: BoundAction;
  triggerLabel: string;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  message: string;
  title?: string;
  size?: "sm" | "default";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(action, {});

  // Close the dialog once the action resolves with an error to show
  // (success paths redirect away and unmount this entirely).
  useEffect(() => {
    if (state.error) dialogRef.current?.close();
  }, [state.error]);

  return (
    <div className="flex flex-col items-start gap-2">
      {state.error ? <Alert>{state.error}</Alert> : null}

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
