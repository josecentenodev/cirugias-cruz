"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { messages } from "@/messages/en";
import type { CustomFieldView } from "../mappers";
import { CustomFieldForm } from "./CustomFieldForm";
import { CustomFieldRemoveButton } from "./CustomFieldRemoveButton";

/**
 * Purely presentational, same shape as `ProcedureTypeList` — receives
 * already-mapped views, does no fetching of its own. Lives inside
 * `ProcedureTypeDetail`, not its own page: a CustomField has no meaning
 * or lifecycle outside the Procedure Type that defines it, mirroring
 * `api`'s own aggregate boundary (ADR 0018 — no `CustomFieldRepository`).
 * The "add one" form is a sibling card on the same detail page, not a
 * link to a separate route — see `ProcedureTypeDetail.tsx`, mirroring
 * how `SurgeryDetail.tsx` places `RecordControlForm` inline rather than
 * linking to a `controls/new` page. Editing an unused field (ADR 0027)
 * follows `ControlDefinitionList`'s own inline-row-becomes-a-form
 * pattern exactly.
 */
export function CustomFieldList({
  procedureTypeId,
  customFields,
}: {
  procedureTypeId: string;
  customFields: CustomFieldView[];
}) {
  const c = messages.procedureTypes.customFields;
  const [editingId, setEditingId] = useState<string | null>(null);

  if (customFields.length === 0) {
    return <p className="text-sm text-muted-foreground">{c.empty}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{c.columns.name}</TableHead>
          <TableHead>{c.columns.scope}</TableHead>
          <TableHead>{c.columns.type}</TableHead>
          <TableHead>{c.columns.rules}</TableHead>
          <TableHead>{c.columns.unit}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {customFields.map((field) =>
          editingId === field.id ? (
            <TableRow key={field.id}>
              <TableCell colSpan={6}>
                <CustomFieldForm
                  procedureTypeId={procedureTypeId}
                  field={field}
                  onDone={() => setEditingId(null)}
                />
              </TableCell>
            </TableRow>
          ) : (
            <TableRow key={field.id}>
              <TableCell className="font-medium">{field.name}</TableCell>
              <TableCell>
                {field.scope === "SURGERY" ? c.scopeSurgeryShort : c.scopeControlShort}
              </TableCell>
              <TableCell>{field.typeLabel}</TableCell>
              <TableCell>{field.rulesSummary}</TableCell>
              <TableCell>{field.unit}</TableCell>
              <TableCell>
                {field.inUse ? (
                  <span className="text-xs text-muted-foreground">{c.frozenHint}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(field.id)}
                      className="text-sm underline"
                    >
                      {c.edit}
                    </button>
                    <CustomFieldRemoveButton
                      procedureTypeId={procedureTypeId}
                      fieldId={field.id}
                      fieldName={field.name}
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
