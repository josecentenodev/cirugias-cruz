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
            <TableHead>Status</TableHead>
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
                <span
                  className={
                    resident.active
                      ? "rounded-full border border-border px-2 py-0.5 text-xs font-medium"
                      : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  }
                >
                  {resident.active ? "Active" : "Inactive"}
                </span>
              </TableCell>
              <TableCell>
                <ResidentCredentialActions residentId={resident.id} active={resident.active} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
