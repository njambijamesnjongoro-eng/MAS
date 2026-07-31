import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { formatCurrency, formatDateTime, formatStatusLabel } from "@/lib/format";
import { createReceiptPdf, pdfResponse } from "@/lib/pdf-receipt";
import { createProxyResponse, proxyAuthenticatedRequest } from "@/lib/server-api";
import type { Invoice, InvoiceReceipt } from "@/types";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ invoiceId: string }>;
};

const chargeRows: Array<[keyof Pick<Invoice, "consultation_fee" | "lab_fee" | "pharmacy_fee" | "admission_fee" | "radiology_fee">, string]> = [
  ["consultation_fee", "Consultation fee"],
  ["lab_fee", "Lab fee"],
  ["pharmacy_fee", "Pharmacy / medicines"],
  ["admission_fee", "Admission / ward"],
  ["radiology_fee", "Radiology / imaging"],
];

export async function GET(_request: Request, context: Context) {
  const { invoiceId } = await context.params;
  const cookieStore = await cookies();
  const result = await proxyAuthenticatedRequest(cookieStore, `/api/finance/invoices/${invoiceId}/receipt/`);
  const { payload, status } = await createProxyResponse(result);

  if (status !== 200) {
    return NextResponse.json(payload, { status });
  }

  const receipt = payload as InvoiceReceipt;
  const { invoice, payments } = receipt;
  const buffer = createReceiptPdf({
    title: "Hospital Bill",
    subtitle: "Invoice for hospital services, medicines, investigations, and care.",
    meta: [
      ["Invoice number", invoice.invoice_number],
      ["Status", formatStatusLabel(invoice.status)],
      ["Patient", invoice.patient_name],
      ["Created", formatDateTime(invoice.created_at)],
      ["Insurance", invoice.insurance_provider || "None recorded"],
      ["Policy number", invoice.insurance_policy_number || "None recorded"],
    ],
    tables: [
      {
        title: "Bill charges",
        table: {
          headers: ["Service", "Amount"],
          widths: [350, 146],
          rows: chargeRows.map(([field, label]) => [label, formatCurrency(invoice[field])]),
        },
      },
      {
        title: "Payments recorded",
        table: {
          headers: ["Payment", "Method", "Reference", "Date"],
          widths: [110, 90, 160, 136],
          rows: payments.length
            ? payments.map((payment) => [
                formatCurrency(payment.amount_paid),
                formatStatusLabel(payment.payment_method),
                payment.transaction_reference || "Cash payment",
                formatDateTime(payment.payment_date),
              ])
            : [["No payments recorded", "", "", ""]],
        },
      },
    ],
    totals: [
      ["Total bill", formatCurrency(invoice.total_amount)],
      ["Paid", formatCurrency(invoice.amount_paid)],
      ["Balance", formatCurrency(invoice.balance_due)],
    ],
    signatures: ["Billing officer signature", "Patient / guardian signature"],
  });

  return pdfResponse(buffer, `hospital-bill-${invoice.invoice_number}.pdf`);
}
