import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
import type { ResidentView } from "../mappers";
import { ResidentCredentialActions } from "./ResidentCredentialActions";

/** Purely presentational — mirrors `features/patients/components/PatientList.tsx`. No detail page (see queries.ts). */
export function ResidentList({ residents }: { residents: ResidentView[] }) {
  if (residents.length === 0) {
    return (
      <EmptyState
        title={messages.residents.empty.title}
        hint={messages.residents.empty.hint}
        action={
          <Link href="/staff/residents/new" className={cn(buttonVariants())}>
            {messages.residents.empty.cta}
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
            <TableHead>{messages.residents.columns.name}</TableHead>
            <TableHead>{messages.residents.columns.phone}</TableHead>
            <TableHead>{messages.residents.columns.email}</TableHead>
            <TableHead>{messages.residents.columns.dateOfBirth}</TableHead>
            <TableHead>{messages.residents.columns.status}</TableHead>
            <TableHead>{messages.residents.columns.credential}</TableHead>
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
                <Badge variant={resident.active ? "success" : "neutral"}>
                  {resident.active ? messages.residents.active : messages.residents.inactive}
                </Badge>
              </TableCell>
              <TableCell>
                <ResidentCredentialActions
                  residentId={resident.id}
                  residentName={resident.fullName}
                  active={resident.active}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
