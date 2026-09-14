import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AcceptInvitationForm } from "@/features/auth/components/AcceptInvitationForm";
import { messages } from "@/messages/en";

// See app/(auth)/login/page.tsx for why: nonce-based CSP requires dynamic rendering.
export const dynamic = "force-dynamic";

/**
 * The page the resident invitation email's link points at (ADR 0029) —
 * reads `?token=` and lets the Resident set their own password,
 * redeeming it server-to-server against `api` through
 * `acceptInvitationAction`. Never calls `api` from the browser: the
 * browser only ever reaches `web`, per the BFF pattern, same as every
 * other page. Mirrors `/confirm-email`'s shape, except redemption needs
 * a password input, so this can't be a plain server-rendered query —
 * it renders a form instead.
 */
export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.auth.acceptInvitation.title}</CardTitle>
        <CardDescription>{messages.auth.acceptInvitation.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {token ? (
          <AcceptInvitationForm token={token} />
        ) : (
          <Alert>{messages.auth.acceptInvitation.missingToken}</Alert>
        )}
      </CardContent>
    </Card>
  );
}
