import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OwnSurgeryListView } from "../mappers";

/** The Surgery panel a Resident sees — only the Surgeries they participate in (ADR 0017). */
export function OwnSurgeryList({ surgeries }: { surgeries: OwnSurgeryListView[] }) {
  if (surgeries.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            You aren&apos;t participating in any surgery yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
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
