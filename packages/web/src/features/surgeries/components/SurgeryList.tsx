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
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">No surgeries registered yet.</p>
          <Link href={`/patients/${patientId}/surgeries/new`} className={cn(buttonVariants())}>
            Register the first surgery
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
            <TableHead>Procedure type</TableHead>
            <TableHead>Performed</TableHead>
            <TableHead>Controls</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {surgeries.map((surgery) => (
            <TableRow key={surgery.id}>
              <TableCell>
                <Link
                  href={`/patients/${patientId}/surgeries/${surgery.id}`}
                  className="font-medium hover:underline"
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
