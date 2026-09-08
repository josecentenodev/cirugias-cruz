import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { messages } from "@/messages/en";
import { ResidentList } from "@/features/residents/components/ResidentList";
import { toResidentView } from "@/features/residents/mappers";
import { listResidents } from "@/features/residents/queries";

export const dynamic = "force-dynamic";

export default async function ResidentsPage() {
  const residents = await listResidents();
  const views = residents.map(toResidentView);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={messages.residents.listTitle}
        action={
          <Link href="/staff/residents/new" className={cn(buttonVariants())}>
            {messages.residents.register}
          </Link>
        }
      />
      <ResidentList residents={views} />
    </div>
  );
}
