import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { ResearchStudyList } from "@/features/research-studies/components/ResearchStudyList";
import { toResearchStudyListView } from "@/features/research-studies/mappers";
import { listResearchStudies } from "@/features/research-studies/queries";

export const dynamic = "force-dynamic";

export default async function ResearchStudiesPage() {
  const studies = await listResearchStudies();
  const views = studies.map(toResearchStudyListView);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Research studies</h1>
        <Link href="/research-studies/new" className={cn(buttonVariants())}>
          Register study
        </Link>
      </div>
      <ResearchStudyList studies={views} />
    </div>
  );
}
