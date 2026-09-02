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
import type { ResearchStudyListView } from "../mappers";

/** Purely presentational — mirrors `features/surgeries/components/SurgeryList.tsx`. */
export function ResearchStudyList({ studies }: { studies: ResearchStudyListView[] }) {
  if (studies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">No research studies registered yet.</p>
          <Link href="/research-studies/new" className={cn(buttonVariants())}>
            Register your first study
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
            <TableHead>Hypothesis</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Surgeries</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {studies.map((study) => (
            <TableRow key={study.id}>
              <TableCell>
                <Link
                  href={`/research-studies/${study.id}`}
                  className="font-medium hover:underline"
                >
                  {study.hypothesisPreview}
                </Link>
              </TableCell>
              <TableCell>{study.statusLabel}</TableCell>
              <TableCell>{study.surgeryCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
