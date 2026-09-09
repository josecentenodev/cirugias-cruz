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
import type { SurgeryListView } from "../mappers";

/**
 * Purely presentational. Always rendered inside a Patient page
 * (Milestone 10 IA — a Surgery is navigated under its Patient), so rows
 * link to the patient-nested URL and the Patient column is dropped.
 */
export function SurgeryList({
  patientId,
  surgeries,
}: {
  patientId: string;
  surgeries: SurgeryListView[];
}) {
  if (surgeries.length === 0) {
    return (
      <EmptyState
        title={messages.surgeries.empty.title}
        hint={messages.surgeries.empty.hint}
        action={
          <Link href={`/patients/${patientId}/surgeries/new`} className={cn(buttonVariants())}>
            {messages.surgeries.empty.cta}
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
            <TableHead>{messages.surgeries.columns.procedureType}</TableHead>
            <TableHead>{messages.surgeries.columns.performed}</TableHead>
            <TableHead>{messages.surgeries.columns.controls}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {surgeries.map((surgery) => (
            <TableRow key={surgery.id}>
              <TableCell>
                <Link
                  href={`/patients/${patientId}/surgeries/${surgery.id}`}
                  className={cn("font-medium hover:underline", stretchedLinkClass)}
                >
                  {surgery.procedureTypeName}
                </Link>
              </TableCell>
              <TableCell>{surgery.performedAtLabel}</TableCell>
              <TableCell>{surgery.controlCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
