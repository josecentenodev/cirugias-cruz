import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        That page, or the resource it refers to, doesn&apos;t exist.
      </p>
      <Link href="/patients" className={cn(buttonVariants())}>
        Back to patients
      </Link>
    </div>
  );
}
