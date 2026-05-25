import { AppShell } from "@/components/dashboard/app-shell";
import { BillingWorkspace } from "@/components/finance/billing-workspace";

export default function BillingPage() {
  return (
    <AppShell
      title="Billing and Payments"
      description="Generate invoices, accept partial payments, and keep balances accurate across consultation, pharmacy, admission, lab, and imaging charges."
    >
      <BillingWorkspace />
    </AppShell>
  );
}
