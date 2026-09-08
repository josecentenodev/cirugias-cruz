import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { messages } from "@/messages/en";

// See app/(auth)/login/page.tsx for why: nonce-based CSP requires dynamic rendering.
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.brand.name}</CardTitle>
        <CardDescription>{messages.auth.signup.title}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground">
          {messages.auth.signup.haveAccount}{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            {messages.auth.signup.signIn}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
