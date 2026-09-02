import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { ResidentList } from "@/features/residents/components/ResidentList";
import { toResidentView } from "@/features/residents/mappers";
import { listResidents } from "@/features/residents/queries";

export const dynamic = "force-dynamic";

export default async function ResidentsPage() {
  const residents = await listResidents();
  const views = residents.map(toResidentView);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Residents</h1>
        <Link href="/residents/new" className={cn(buttonVariants())}>
          Register resident
        </Link>
      </div>
      <ResidentList residents={views} />
    </div>
  );
}
