import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
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
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">No procedure types registered yet.</p>
          <Link href="/settings/procedure-types/new" className={cn(buttonVariants())}>
            Register your first procedure type
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Technique</TableHead>
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
              <TableCell>{procedureType.technique}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
