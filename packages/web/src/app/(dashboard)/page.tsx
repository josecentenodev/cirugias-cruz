import { redirect } from "next/navigation";

// See login/page.tsx for why: nonce-based CSP requires dynamic rendering.
export const dynamic = "force-dynamic";

/** No standalone dashboard-landing content yet in this slice — Patients is the only vertical built so far. */
export default function DashboardIndexPage() {
  redirect("/patients");
}
