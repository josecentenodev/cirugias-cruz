import Link from "next/link";
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
import { messages } from "@/messages/en";
import type { OwnSurgeryListView } from "../mappers";

/** The Surgery panel a Resident sees — only the Surgeries they participate in (ADR 0017). */
export function OwnSurgeryList({ surgeries }: { surgeries: OwnSurgeryListView[] }) {
  if (surgeries.length === 0) {
    return <EmptyState title={messages.resident.empty.title} hint={messages.resident.empty.hint} />;
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{messages.resident.columns.patient}</TableHead>
            <TableHead>{messages.resident.columns.procedureType}</TableHead>
            <TableHead>{messages.resident.columns.performed}</TableHead>
            <TableHead>{messages.resident.columns.controls}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {surgeries.map((surgery) => (
            <TableRow key={surgery.id}>
              <TableCell>
                <Link
                  href={`/resident/surgeries/${surgery.id}`}
                  className="font-medium hover:underline"
                >
                  {surgery.patientName}
                </Link>
              </TableCell>
              <TableCell>{surgery.procedureTypeName}</TableCell>
              <TableCell>{surgery.performedAtLabel}</TableCell>
              <TableCell>{surgery.controlCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
