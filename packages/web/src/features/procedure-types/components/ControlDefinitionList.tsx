"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DangerousConfirm } from "@/components/ui/DangerousConfirm";
import { PencilIcon, TrashIcon } from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { messages } from "@/messages/en";
import { removeControlDefinitionAction } from "../actions";
import type { ControlDefinitionView } from "../mappers";
import { ControlDefinitionForm } from "./ControlDefinitionForm";

/**
 * The control-scheme editor (ADR 0026 / 0027). Each row offers Edit and
 * Remove, both disabled with an inline explanation when the definition is
 * frozen (a Control already references it). `api` enforces the freeze
 * rule authoritatively regardless of what this renders.
 */
export function ControlDefinitionList({
  procedureTypeId,
  controlDefinitions,
}: {
  procedureTypeId: string;
  controlDefinitions: ControlDefinitionView[];
}) {
  const c = messages.procedureTypes.controlDefinitions;
  const [editingId, setEditingId] = useState<string | null>(null);

  if (controlDefinitions.length === 0) {
    return <p className="text-sm text-muted-foreground">{c.empty}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{c.columns.name}</TableHead>
          <TableHead>{c.columns.rule}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {controlDefinitions.map((definition) =>
          editingId === definition.id ? (
            <TableRow key={definition.id}>
              <TableCell colSpan={3}>
                <ControlDefinitionForm
                  procedureTypeId={procedureTypeId}
                  definition={definition}
                  onDone={() => setEditingId(null)}
                />
              </TableCell>
            </TableRow>
          ) : (
            <TableRow key={definition.id}>
              <TableCell className="font-medium">{definition.name}</TableCell>
              <TableCell>{definition.ruleSummary}</TableCell>
              <TableCell>
                {definition.inUse ? (
                  <span className="text-xs text-muted-foreground">{c.frozenHint}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingId(definition.id)}
                      aria-label={c.edit}
                      title={c.edit}
                    >
                      <PencilIcon />
                    </Button>
                    <DangerousConfirm
                      action={removeControlDefinitionAction.bind(
                        null,
                        procedureTypeId,
                        definition.id,
                      )}
                      triggerLabel={<TrashIcon />}
                      triggerAriaLabel={c.remove}
                      confirmationPhrase={definition.name}
                      confirmLabel={messages.common.remove}
                      pendingLabel={messages.common.removing}
                      message={c.removeConfirm(definition.name)}
                      title={c.remove}
                      size="icon"
                    />
                  </div>
                )}
              </TableCell>
            </TableRow>
          ),
        )}
      </TableBody>
    </Table>
  );
}
