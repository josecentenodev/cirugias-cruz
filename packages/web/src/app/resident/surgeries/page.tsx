import { OwnSurgeryList } from "@/features/resident-session/components/OwnSurgeryList";
import { toOwnSurgeryListView } from "@/features/resident-session/mappers";
import { listOwnSurgeries } from "@/features/resident-session/queries";

export const dynamic = "force-dynamic";

/** A Resident's landing page after login — their own "Surgery panel" (ADR 0017). */
export default async function ResidentSurgeriesPage() {
  const surgeries = await listOwnSurgeries();
  const views = surgeries.map(toOwnSurgeryListView);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">My surgeries</h1>
      <OwnSurgeryList surgeries={views} />
    </div>
  );
}
