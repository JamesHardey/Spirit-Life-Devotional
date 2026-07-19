import { isAdminAuthed } from "@/lib/auth";
import { getAllDevotionals } from "@/lib/db";
import { isPushConfigured } from "@/lib/push";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAdminAuthed();

  if (!authed) return <AdminLogin />;

  const devotionals = await getAllDevotionals();
  return (
    <AdminDashboard
      initialDevotionals={devotionals}
      pushConfigured={isPushConfigured()}
    />
  );
}
