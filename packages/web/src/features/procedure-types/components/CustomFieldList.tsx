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

/**
 * Purely presentational, same shape as `ProcedureTypeList` — receives
 * already-mapped views, does no fetching of its own. Lives inside
 * `ProcedureTypeDetail`, not its own page: a CustomField has no meaning
 * or lifecycle outside the Procedure Type that defines it, mirroring
 * `api`'s own aggregate boundary (ADR 0018 — no `CustomFieldRepository`).
 * The "add one" form is a sibling card on the same detail page, not a
 * link to a separate route — see `ProcedureTypeDetail.tsx`, mirroring
 * how `SurgeryDetail.tsx` places `RecordControlForm` inline rather than
 * linking to a `controls/new` page.
 */
export function CustomFieldList({ customFields }: { customFields: CustomFieldView[] }) {
  if (customFields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{messages.procedureTypes.customFields.empty}</p>
    );
  }

  const c = messages.procedureTypes.customFields;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{c.columns.name}</TableHead>
          <TableHead>{c.columns.scope}</TableHead>
          <TableHead>{c.columns.type}</TableHead>
          <TableHead>{c.columns.rules}</TableHead>
          <TableHead>{c.columns.unit}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customFields.map((field) => (
          <TableRow key={field.id}>
            <TableCell className="font-medium">{field.name}</TableCell>
            <TableCell>
              {field.scope === "SURGERY" ? c.scopeSurgeryShort : c.scopeControlShort}
            </TableCell>
            <TableCell>{field.typeLabel}</TableCell>
            <TableCell>{field.rulesSummary}</TableCell>
            <TableCell>{field.unit}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
