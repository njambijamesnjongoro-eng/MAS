import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { formatCurrency, formatDateTime, formatStatusLabel } from "@/lib/format";
import { createReceiptPdf, pdfResponse } from "@/lib/pdf-receipt";
import { createProxyResponse, proxyAuthenticatedRequest } from "@/lib/server-api";
import type { InvoiceReceipt, Payment } from "@/types";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ paymentId: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { paymentId } = await context.params;
  const cookieStore = await cookies();
  const paymentResult = await proxyAuthenticatedRequest(cookieStore, `/api/finance/payments/${paymentId}/`);
  const paymentResponse = await createProxyResponse(paymentResult);

  if (paymentResponse.status !== 200) {
    return NextResponse.json(paymentResponse.payload, { status: paymentResponse.status });
  }

  const payment = paymentResponse.payload as Payment;
  const invoiceResult = await proxyAuthenticatedRequest(cookieStore, `/api/finance/invoices/${payment.invoice}/receipt/`);
  const invoiceResponse = await createProxyResponse(invoiceResult);

  if (invoiceResponse.status !== 200) {
    return NextResponse.json(invoiceResponse.payload, { status: invoiceResponse.status });
  }

  const receipt = invoiceResponse.payload as InvoiceReceipt;
  const { invoice } = receipt;
  const receiptNumber = `PAY-${String(payment.id).padStart(6, "0")}`;
  const buffer = createReceiptPdf({
    title: "Payment Confirmation Receipt",
    subtitle: "Proof that payment was recorded against the hospital bill.",
    meta: [
      ["Receipt number", receiptNumber],
      ["Invoice number", invoice.invoice_number],
      ["Patient", invoice.patient_name],
      ["Amount paid", formatCurrency(payment.amount_paid)],
      ["Payment method", formatStatusLabel(payment.payment_method)],
      ["Payment date", formatDateTime(payment.payment_date)],
      ["Transaction reference", payment.transaction_reference || "Cash payment"],
      ["Recorded by", payment.recorded_by_name || "Hospital billing"],
    ],
    tables: [
      {
        title: "Payment summary",
        table: {
          headers: ["Item", "Amount"],
          widths: [350, 146],
          rows: [
            ["Original hospital bill", formatCurrency(invoice.total_amount)],
            ["This payment", formatCurrency(payment.amount_paid)],
            ["Total paid after this payment", formatCurrency(invoice.amount_paid)],
            ["Remaining balance", formatCurrency(invoice.balance_due)],
          ],
        },
      },
    ],
    sections: [
      {
        title: "Confirmation",
        lines: [
          "This confirms that the payment above was recorded in the hospital billing system.",
          "Keep this receipt for patient, billing, insurance, or discharge follow-up.",
        ],
      },
    ],
    signatures: ["Cashier / billing signature", "Patient / guardian signature"],
  });

  return pdfResponse(buffer, `payment-receipt-${receiptNumber}.pdf`);
}
