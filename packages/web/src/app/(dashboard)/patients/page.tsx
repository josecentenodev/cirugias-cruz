import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { PatientList } from "@/features/patients/components/PatientList";
import { toPatientView } from "@/features/patients/mappers";
import { listPatients } from "@/features/patients/queries";

export const dynamic = "force-dynamic";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const patients = await listPatients(query);
  const views = patients.map(toPatientView);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Patients</h1>
        <Link href="/patients/new" className={cn(buttonVariants())}>
          Register patient
        </Link>
      </div>

      {/* Plain GET form — the page re-renders with the new `?q=` on submit, no client JS. */}
      <form method="get" className="flex gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by name or DNI"
          aria-label="Search patients"
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {query ? (
          <Link
            href="/patients"
            className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
          >
            Clear
          </Link>
        ) : null}
      </form>

      {query && views.length === 0 ? (
        <p className="text-sm text-muted-foreground">No patients match “{query}”.</p>
      ) : (
        <PatientList patients={views} />
      )}
    </div>
  );
}
