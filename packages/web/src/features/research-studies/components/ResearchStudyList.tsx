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
import type { ResearchStudyListView } from "../mappers";
import { statusBadgeVariant } from "./statusBadge";

/** Purely presentational — mirrors `features/surgeries/components/SurgeryList.tsx`. */
export function ResearchStudyList({ studies }: { studies: ResearchStudyListView[] }) {
  if (studies.length === 0) {
    return (
      <EmptyState
        title={messages.research.empty.title}
        hint={messages.research.empty.hint}
        action={
          <Link href="/research-studies/new" className={cn(buttonVariants())}>
            {messages.research.empty.cta}
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
            <TableHead>{messages.research.columns.hypothesis}</TableHead>
            <TableHead>{messages.research.columns.status}</TableHead>
            <TableHead>{messages.research.columns.surgeries}</TableHead>
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
              <TableCell>
                <Badge variant={statusBadgeVariant[study.status]}>{study.statusLabel}</Badge>
              </TableCell>
              <TableCell>{study.surgeryCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
