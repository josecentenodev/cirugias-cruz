import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { messages } from "@/messages/en";
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
      <PageHeader
        title={messages.patients.listTitle}
        action={
          <Link href="/patients/new" className={cn(buttonVariants())}>
            {messages.patients.register}
          </Link>
        }
      />

      {/* Plain GET form — the page re-renders with the new `?q=` on submit, no client JS. */}
      <form method="get" className="flex gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={messages.patients.searchPlaceholder}
          aria-label={messages.patients.searchLabel}
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary">
          {messages.common.search}
        </Button>
        {query ? (
          <Link
            href="/patients"
            className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
          >
            {messages.common.clear}
          </Link>
        ) : null}
      </form>

      {query && views.length === 0 ? (
        <EmptyState title={messages.patients.noMatch(query)} />
      ) : (
        <PatientList patients={views} />
      )}
    </div>
  );
}
