import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    return <p className="text-sm text-muted-foreground">No custom fields defined yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Rules</TableHead>
          <TableHead>Unit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customFields.map((field) => (
          <TableRow key={field.id}>
            <TableCell className="font-medium">{field.name}</TableCell>
            <TableCell>{field.scope === "SURGERY" ? "Surgery" : "Control"}</TableCell>
            <TableCell>{field.typeLabel}</TableCell>
            <TableCell>{field.rulesSummary}</TableCell>
            <TableCell>{field.unit}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
