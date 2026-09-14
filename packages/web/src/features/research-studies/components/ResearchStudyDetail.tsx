import { DetailGrid } from "@/components/DetailGrid";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { messages } from "@/messages/en";
import type { ResearchStudyDetailView } from "../mappers";
import { AddSurgeryForm } from "./AddSurgeryForm";
import { DeleteResearchStudyButton } from "./DeleteResearchStudyButton";
import { RemoveSurgeryButton } from "./RemoveSurgeryButton";
import { ResearchStudyFieldsForm } from "./ResearchStudyFieldsForm";
import { StatusActions } from "./StatusActions";
import { statusBadgeVariant } from "./statusBadge";

/**
 * Server Component. `DetailGrid` (desktop-space-usage.md §4.4): the four
 * research text fields are the primary column — the writing is the work.
 * Lifecycle (status transitions, delete) and the Surgery universe are
 * supporting context in the sticky aside. `ResearchStudyFieldsForm`,
 * `StatusActions`, `AddSurgeryForm`, `RemoveSurgeryButton` and
 * `DeleteResearchStudyButton` are the only Client Components nested
 * inside. Adding/removing a Surgery lives here, not on a Surgery-owned
 * page, mirroring `api` (`addSurgeryToResearchStudy` /
 * `removeSurgeryFromResearchStudy` are ResearchStudy's own operations).
 */
export function ResearchStudyDetail({
  study,
  availableSurgeries,
}: {
  study: ResearchStudyDetailView;
  availableSurgeries: { id: string; label: string }[];
}) {
  return (
    <DetailGrid
      primary={
        <Card>
          <CardHeader>
            <CardTitle>{messages.research.cardTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResearchStudyFieldsForm study={study} />
          </CardContent>
        </Card>
      }
      aside={
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{messages.research.statusCardTitle}</CardTitle>
              <Badge variant={statusBadgeVariant[study.status]}>{study.statusLabel}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <StatusActions researchStudyId={study.id} status={study.status} />
              {study.status === "DRAFT" ? (
                <DeleteResearchStudyButton researchStudyId={study.id} />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{messages.research.surgeries.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {study.surgeries.length === 0 ? (
                <EmptyState title={messages.research.surgeries.empty} />
              ) : (
                <ul className="flex flex-col gap-2">
                  {study.surgeries.map((surgery) => (
                    <li
                      key={surgery.id}
                      className="flex items-center justify-between rounded-md border border-border p-2"
                    >
                      <span className="text-sm">{surgery.label}</span>
                      {study.status !== "COMPLETED" ? (
                        <RemoveSurgeryButton researchStudyId={study.id} surgeryId={surgery.id} />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {study.status === "COMPLETED" ? (
                <Alert variant="muted">{messages.research.surgeries.completedLocked}</Alert>
              ) : (
                <AddSurgeryForm researchStudyId={study.id} surgeries={availableSurgeries} />
              )}
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}
