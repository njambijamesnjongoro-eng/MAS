import { AppShell } from "@/components/dashboard/app-shell";
import { ImagingWorkspace } from "@/components/imaging/imaging-workspace";

export default function ImagingPage() {
  return (
    <AppShell
      title="Radiology and Imaging"
      description="Manage imaging requests, radiologist reports, and secure medical file attachments from one workflow page."
    >
      <ImagingWorkspace />
    </AppShell>
  );
}
