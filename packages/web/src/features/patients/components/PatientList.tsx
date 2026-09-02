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
import type { PatientView } from "../mappers";

/**
 * Purely presentational — receives already-mapped view models, does no
 * fetching or error handling of its own. A Server Component (no
 * interactivity here), composed by `app/(dashboard)/patients/page.tsx`.
 */
export function PatientList({ patients }: { patients: PatientView[] }) {
  if (patients.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">No patients registered yet.</p>
          <Link href="/patients/new" className={cn(buttonVariants())}>
            Register your first patient
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
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Date of birth</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell>
                <Link href={`/patients/${patient.id}`} className="font-medium hover:underline">
                  {patient.fullName}
                </Link>
              </TableCell>
              <TableCell>{patient.phone}</TableCell>
              <TableCell>{patient.email}</TableCell>
              <TableCell>{patient.dateOfBirthLabel}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
