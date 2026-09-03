import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { confirmEmail } from "@/features/auth/queries";
import { cn } from "@/lib/cn";

// See app/(auth)/login/page.tsx for why: nonce-based CSP requires dynamic rendering.
export const dynamic = "force-dynamic";

/**
 * The page the confirmation email's link points at (ADR 0015) — reads
 * `?token=` and redeems it server-to-server against `api`. Never calls
 * `api` from the browser: the browser only ever reaches `web`, per the
 * BFF pattern, same as every other page.
 */
export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const result = token
    ? await confirmEmail(token)
    : { ok: false as const, error: "This confirmation link is missing its token." };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Epitaxy</CardTitle>
        <CardDescription>{result.ok ? "Account confirmed" : "Confirmation failed"}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {result.ok ? (
          <p className="text-sm text-muted-foreground">
            Your account is confirmed. You can sign in now.
          </p>
        ) : (
          <Alert>{result.error}</Alert>
        )}
        <Link href="/login" className={cn(buttonVariants(), "w-full")}>
          Go to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
