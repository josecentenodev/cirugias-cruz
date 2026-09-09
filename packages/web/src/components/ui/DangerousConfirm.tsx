"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { matchesConfirmationPhrase } from "@/components/ui/dangerous-confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { messages } from "@/messages/en";

type ConfirmState = { error?: string };
type BoundAction = (previousState: ConfirmState, formData: FormData) => Promise<ConfirmState>;

function SubmitButton({
  label,
  pendingLabel,
  enabled,
}: {
  label: string;
  pendingLabel: string;
  enabled: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" size="sm" disabled={pending || !enabled}>
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
 * The heavyweight tier of destructive confirmation (see
 * docs/design/ux-principles.md §4 Forgiving, docs/design/design-system.md).
 * Same `<dialog>` + Server-Action mechanics as `ConfirmSubmit`, but the
 * confirm button stays `disabled` until the user types
 * `confirmationPhrase` exactly — the record's own name, or the literal
 * word `DELETE` when it has no obvious name. Use only for actions that
 * destroy data with no undo; keep `ConfirmSubmit` for reversible ones.
 *
 * `action` is the already-`.bind()`-ed Server Action; its returned
 * `{ error }` renders inline next to the trigger.
 */
export function DangerousConfirm({
  action,
  triggerLabel,
  confirmationPhrase,
  confirmLabel = messages.common.delete,
  pendingLabel = messages.common.deleting,
  cancelLabel = messages.common.cancel,
  message,
  title,
  size = "sm",
}: {
  action: BoundAction;
  triggerLabel: string;
  confirmationPhrase: string;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  message: string;
  title?: string;
  size?: "sm" | "default";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const [state, formAction] = useActionState(action, {});
  const matches = matchesConfirmationPhrase(typed, confirmationPhrase);

  // Close once the action resolves with an error to show (success paths
  // redirect away and unmount this entirely). Closing fires the dialog's
  // `close` event, which resets the typed phrase.
  useEffect(() => {
    if (state.error) dialogRef.current?.close();
  }, [state.error]);

  function close() {
    dialogRef.current?.close();
    setTyped("");
  }

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
        onClose={() => setTyped("")}
        className="max-w-sm rounded-md border border-border bg-surface p-0 text-foreground backdrop:bg-foreground/30"
      >
        <form action={formAction} className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">{title ?? triggerLabel}</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={inputId}>
              {messages.common.dangerousConfirm.prompt(confirmationPhrase)}
            </Label>
            <Input
              id={inputId}
              name="confirmationPhrase"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={close}>
              {cancelLabel}
            </Button>
            <SubmitButton label={confirmLabel} pendingLabel={pendingLabel} enabled={matches} />
          </div>
        </form>
      </dialog>
    </div>
  );
}
