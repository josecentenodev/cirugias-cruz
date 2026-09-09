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
  stretchedLinkClass,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { messages } from "@/messages/en";
import type { PatientView } from "../mappers";

/**
 * Purely presentational — receives already-mapped view models, does no
 * fetching or error handling of its own. A Server Component (no
 * interactivity here), composed by `app/(dashboard)/patients/page.tsx`.
 */
export function PatientList({ patients }: { patients: PatientView[] }) {
  if (patients.length === 0) {
    return (
      <EmptyState
        title={messages.patients.empty.title}
        hint={messages.patients.empty.hint}
        action={
          <Link href="/patients/new" className={cn(buttonVariants())}>
            {messages.patients.empty.cta}
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
            <TableHead>{messages.patients.columns.name}</TableHead>
            <TableHead>{messages.patients.columns.dni}</TableHead>
            <TableHead>{messages.patients.columns.age}</TableHead>
            <TableHead>{messages.patients.columns.dateOfBirth}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell>
                <Link
                  href={`/patients/${patient.id}`}
                  className={cn("font-medium hover:underline", stretchedLinkClass)}
                >
                  {patient.fullName}
                </Link>
              </TableCell>
              <TableCell>{patient.dni ?? messages.common.none}</TableCell>
              <TableCell>{patient.age}</TableCell>
              <TableCell>{patient.dateOfBirthLabel}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
