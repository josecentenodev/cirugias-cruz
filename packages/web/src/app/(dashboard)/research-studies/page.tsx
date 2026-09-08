import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { messages } from "@/messages/en";
import { ResearchStudyList } from "@/features/research-studies/components/ResearchStudyList";
import { toResearchStudyListView } from "@/features/research-studies/mappers";
import { listResearchStudies } from "@/features/research-studies/queries";

export const dynamic = "force-dynamic";

export default async function ResearchStudiesPage() {
  const studies = await listResearchStudies();
  const views = studies.map(toResearchStudyListView);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={messages.research.listTitle}
        action={
          <Link href="/research-studies/new" className={cn(buttonVariants())}>
            {messages.research.register}
          </Link>
        }
      />
      <ResearchStudyList studies={views} />
    </div>
  );
}
