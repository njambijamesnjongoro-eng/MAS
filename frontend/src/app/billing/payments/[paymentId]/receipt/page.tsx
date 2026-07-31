import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/documents/print-button";
import { createProxyResponse, proxyAuthenticatedRequest } from "@/lib/server-api";
import { formatCurrency, formatDateTime, formatStatusLabel } from "@/lib/format";
import type { InvoiceReceipt, Payment } from "@/types";

type PageProps = {
  params: Promise<{ paymentId: string }>;
};

async function loadPaymentReceipt(paymentId: string): Promise<{ payment: Payment; receipt: InvoiceReceipt } | null> {
  const cookieStore = await cookies();
  const paymentResult = await proxyAuthenticatedRequest(cookieStore, `/api/finance/payments/${paymentId}/`);
  const paymentResponse = await createProxyResponse(paymentResult);

  if (paymentResponse.status !== 200 || typeof paymentResponse.payload !== "object" || paymentResponse.payload === null) {
    return null;
  }

  const payment = paymentResponse.payload as Payment;
  const invoiceResult = await proxyAuthenticatedRequest(cookieStore, `/api/finance/invoices/${payment.invoice}/receipt/`);
  const invoiceResponse = await createProxyResponse(invoiceResult);

  if (invoiceResponse.status !== 200 || typeof invoiceResponse.payload !== "object" || invoiceResponse.payload === null) {
    return null;
  }

  return {
    payment,
    receipt: invoiceResponse.payload as InvoiceReceipt,
  };
}

export default async function PaymentReceiptPage({ params }: PageProps) {
  const { paymentId } = await params;
  const documentData = await loadPaymentReceipt(paymentId);

  if (!documentData) {
    notFound();
  }

  const { payment, receipt } = documentData;
  const { invoice } = receipt;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:p-0">
      <section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Hospital EHR</div>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Payment Confirmation Receipt</h1>
            <p className="mt-2 text-sm text-slate-600">Proof that payment was recorded against the hospital bill.</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Link href="/billing" className="medical-button medical-button-secondary">
              Back to billing
            </Link>
            <PrintButton label="Print payment receipt" />
          </div>
        </div>

        <div className="rounded-3xl bg-teal-50 p-6 text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Amount paid</div>
          <div className="mt-2 text-4xl font-bold text-slate-950">{formatCurrency(payment.amount_paid)}</div>
          <div className="mt-2 text-sm text-slate-600">
            Paid by {formatStatusLabel(payment.payment_method)} on {formatDateTime(payment.payment_date)}
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 p-4 text-sm sm:grid-cols-2">
          <div>
            <div className="text-slate-500">Receipt number</div>
            <div className="mt-1 font-semibold">PAY-{String(payment.id).padStart(6, "0")}</div>
          </div>
          <div>
            <div className="text-slate-500">Invoice number</div>
            <div className="mt-1 font-semibold">{invoice.invoice_number}</div>
          </div>
          <div>
            <div className="text-slate-500">Patient</div>
            <div className="mt-1 font-semibold">{invoice.patient_name}</div>
          </div>
          <div>
            <div className="text-slate-500">Transaction reference</div>
            <div className="mt-1 font-semibold">{payment.transaction_reference || "Cash payment"}</div>
          </div>
          <div>
            <div className="text-slate-500">Recorded by</div>
            <div className="mt-1 font-semibold">{payment.recorded_by_name || "Hospital billing"}</div>
          </div>
          <div>
            <div className="text-slate-500">Printed</div>
            <div className="mt-1 font-semibold">{formatDateTime(new Date().toISOString())}</div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <tbody>
              <tr>
                <td className="border-b border-slate-200 px-4 py-3 text-slate-500">Original hospital bill</td>
                <td className="border-b border-slate-200 px-4 py-3 text-right font-semibold">
                  {formatCurrency(invoice.total_amount)}
                </td>
              </tr>
              <tr>
                <td className="border-b border-slate-200 px-4 py-3 text-slate-500">Total paid after this payment</td>
                <td className="border-b border-slate-200 px-4 py-3 text-right font-semibold">
                  {formatCurrency(invoice.amount_paid)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-500">Remaining balance</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(invoice.balance_due)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          This confirms that the payment above was recorded in the hospital billing system. Keep this receipt for
          patient, billing, insurance, or discharge follow-up.
        </div>

        <div className="mt-10 grid gap-8 text-sm sm:grid-cols-2">
          <div className="border-t border-slate-300 pt-3">Cashier / billing signature</div>
          <div className="border-t border-slate-300 pt-3">Patient / guardian signature</div>
        </div>
      </section>
    </main>
  );
}
