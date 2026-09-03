import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/LoginForm";

// Forces per-request rendering so `proxy.ts`'s fresh CSP nonce actually
// reaches this page's script tags — a statically-prerendered page has no
// per-request nonce to thread through (see lib/security-headers.ts and
// Next's own CSP guide: nonces require dynamic rendering).
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Epitaxy</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
