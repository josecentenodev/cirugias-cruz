import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { messages } from "@/messages/en";
import type { ProcedureTypeView } from "../mappers";

/**
 * Purely presentational — receives already-mapped view models, does no
 * fetching or error handling of its own. Mirrors
 * `features/patients/components/PatientList.tsx`. Each row links to its
 * detail page (`/settings/procedure-types/[id]`), where a physician
 * edits the Procedure Type and defines its CustomFields (Milestone 8.6).
 */
export function ProcedureTypeList({ procedureTypes }: { procedureTypes: ProcedureTypeView[] }) {
  if (procedureTypes.length === 0) {
    return (
      <EmptyState
        title={messages.procedureTypes.empty.title}
        hint={messages.procedureTypes.empty.hint}
        action={
          <Link href="/settings/procedure-types/new" className={cn(buttonVariants())}>
            {messages.procedureTypes.empty.cta}
          </Link>
        }
      />
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{messages.procedureTypes.columns.name}</TableHead>
            <TableHead>{messages.procedureTypes.columns.description}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {procedureTypes.map((procedureType) => (
            <TableRow key={procedureType.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/settings/procedure-types/${procedureType.id}`}
                  className="hover:underline"
                >
                  {procedureType.name}
                </Link>
              </TableCell>
              <TableCell>{procedureType.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
