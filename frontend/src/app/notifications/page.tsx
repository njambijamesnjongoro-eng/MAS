import { AppShell } from "@/components/dashboard/app-shell";
import { NotificationsWorkspace } from "@/components/messaging/notifications-workspace";

export default function NotificationsPage() {
  return (
    <AppShell
      title="Notifications"
      description="Keep internal hospital alerts visible, organized, and easy to clear without leaving the secure workspace."
    >
      <NotificationsWorkspace />
    </AppShell>
  );
}
