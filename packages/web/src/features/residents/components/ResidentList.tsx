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
import type { ResidentView } from "../mappers";
import { ResidentCredentialActions } from "./ResidentCredentialActions";

/** Purely presentational — mirrors `features/patients/components/PatientList.tsx`. No detail page (see queries.ts). */
export function ResidentList({ residents }: { residents: ResidentView[] }) {
  if (residents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">No residents registered yet.</p>
          <Link href="/residents/new" className={cn(buttonVariants())}>
            Register your first resident
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
            <TableHead>Credential</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {residents.map((resident) => (
            <TableRow key={resident.id}>
              <TableCell className="font-medium">{resident.fullName}</TableCell>
              <TableCell>{resident.phone}</TableCell>
              <TableCell>{resident.email}</TableCell>
              <TableCell>{resident.dateOfBirthLabel}</TableCell>
              <TableCell>
                <ResidentCredentialActions residentId={resident.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
