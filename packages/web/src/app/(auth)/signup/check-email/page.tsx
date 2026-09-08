import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { messages } from "@/messages/en";

// See app/(auth)/login/page.tsx for why: nonce-based CSP requires dynamic rendering.
// (This page has no data fetch of its own, but stays consistent with
// every other page in the (auth) route group for the same reason.)
export const dynamic = "force-dynamic";

/**
 * Landed on right after registering (ADR 0015) — the account exists but
 * isn't usable yet. No resend-confirmation action here yet (a known,
 * documented gap in the ADR, not an oversight).
 */
export default function CheckEmailPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.auth.checkEmail.title}</CardTitle>
        <CardDescription>{messages.auth.checkEmail.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {messages.auth.checkEmail.confirmed}{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            {messages.auth.checkEmail.signIn}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
