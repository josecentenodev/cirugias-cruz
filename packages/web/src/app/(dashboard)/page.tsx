import { redirect } from "next/navigation";

/** No standalone dashboard-landing content yet in this slice — Patients is the only vertical built so far. */
export default function DashboardIndexPage() {
  redirect("/patients");
}
