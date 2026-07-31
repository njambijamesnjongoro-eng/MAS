import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/documents/print-button";
import { createProxyResponse, proxyAuthenticatedRequest } from "@/lib/server-api";
import { formatCurrency, formatDateTime, formatStatusLabel } from "@/lib/format";
import type { InvoiceReceipt } from "@/types";

type PageProps = {
  params: Promise<{ invoiceId: string }>;
};

const chargeRows = [
  ["consultation_fee", "Consultation fee"],
  ["lab_fee", "Lab fee"],
  ["pharmacy_fee", "Pharmacy / medicines"],
  ["admission_fee", "Admission / ward"],
  ["radiology_fee", "Radiology / imaging"],
] as const;

async function loadInvoiceReceipt(invoiceId: string): Promise<InvoiceReceipt | null> {
  const cookieStore = await cookies();
  const result = await proxyAuthenticatedRequest(cookieStore, `/api/finance/invoices/${invoiceId}/receipt/`);
  const { payload, status } = await createProxyResponse(result);
  if (status !== 200 || typeof payload !== "object" || payload === null || !("invoice" in payload)) {
    return null;
  }
  return payload as InvoiceReceipt;
}

export default async function InvoiceReceiptPage({ params }: PageProps) {
  const { invoiceId } = await params;
  const receipt = await loadInvoiceReceipt(invoiceId);

  if (!receipt) {
    notFound();
  }

  const { invoice, payments } = receipt;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:p-0">
      <section className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Hospital EHR</div>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Hospital Bill</h1>
            <p className="mt-2 text-sm text-slate-600">Invoice for hospital services, medicines, investigations, and care.</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Link href="/billing" className="medical-button medical-button-secondary">
              Back to billing
            </Link>
            <PrintButton label="Print hospital bill" />
          </div>
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 text-sm sm:grid-cols-2">
          <div>
            <div className="text-slate-500">Invoice number</div>
            <div className="mt-1 font-semibold">{invoice.invoice_number}</div>
          </div>
          <div>
            <div className="text-slate-500">Status</div>
            <div className="mt-1 font-semibold">{formatStatusLabel(invoice.status)}</div>
          </div>
          <div>
            <div className="text-slate-500">Patient</div>
            <div className="mt-1 font-semibold">{invoice.patient_name}</div>
          </div>
          <div>
            <div className="text-slate-500">Created</div>
            <div className="mt-1 font-semibold">{formatDateTime(invoice.created_at)}</div>
          </div>
          <div>
            <div className="text-slate-500">Insurance</div>
            <div className="mt-1 font-semibold">{invoice.insurance_provider || "None recorded"}</div>
          </div>
          <div>
            <div className="text-slate-500">Policy number</div>
            <div className="mt-1 font-semibold">{invoice.insurance_policy_number || "None recorded"}</div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {chargeRows.map(([field, label]) => (
                <tr key={field} className="border-t border-slate-200">
                  <td className="px-4 py-3">{label}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(invoice[field])}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold">
              <tr>
                <td className="px-4 py-3">Total bill</td>
                <td className="px-4 py-3 text-right">{formatCurrency(invoice.total_amount)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Paid</td>
                <td className="px-4 py-3 text-right">{formatCurrency(invoice.amount_paid)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Balance</td>
                <td className="px-4 py-3 text-right">{formatCurrency(invoice.balance_due)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Payments recorded</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {payments.length ? (
              payments.map((payment) => (
                <div key={payment.id} className="flex flex-col gap-1 rounded-xl bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    {formatCurrency(payment.amount_paid)} via {formatStatusLabel(payment.payment_method)}
                    {payment.transaction_reference ? ` - Ref ${payment.transaction_reference}` : ""}
                  </span>
                  <span>{formatDateTime(payment.payment_date)}</span>
                </div>
              ))
            ) : (
              <p>No payments have been recorded for this invoice yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-8 text-sm sm:grid-cols-2">
          <div className="border-t border-slate-300 pt-3">Billing officer signature</div>
          <div className="border-t border-slate-300 pt-3">Patient / guardian signature</div>
        </div>
      </section>
    </main>
  );
}
