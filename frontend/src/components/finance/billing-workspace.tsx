"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

import { apiRequest } from "@/lib/client-api";
import { formatCurrency, formatDateTime, formatStatusLabel } from "@/lib/format";
import type { Invoice, PaginatedResponse, PatientSummary, Payment, PaymentMethod } from "@/types";

import { ToastNotice } from "@/components/clinical/toast-notice";

type InvoiceFormState = {
  patient: string;
  consultation_fee: string;
  lab_fee: string;
  pharmacy_fee: string;
  admission_fee: string;
  radiology_fee: string;
  insurance_provider: string;
  insurance_policy_number: string;
};

type PaymentFormState = Record<number, { amount_paid: string; payment_method: PaymentMethod; transaction_reference: string }>;

const defaultInvoiceForm: InvoiceFormState = {
  patient: "",
  consultation_fee: "0",
  lab_fee: "0",
  pharmacy_fee: "0",
  admission_fee: "0",
  radiology_fee: "0",
  insurance_provider: "",
  insurance_policy_number: "",
};

function extractError(payload: unknown) {
  if (typeof payload === "object" && payload !== null) {
    if ("detail" in payload) {
      return String((payload as { detail: string }).detail);
    }
    const first = Object.values(payload as Record<string, unknown>)[0];
    if (Array.isArray(first) && first[0]) {
      return String(first[0]);
    }
  }
  return "Request failed.";
}

export function BillingWorkspace() {
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>(defaultInvoiceForm);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientMatches, setPatientMatches] = useState<PatientSummary[]>([]);
  const [invoices, setInvoices] = useState<PaginatedResponse<Invoice> | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [paymentForms, setPaymentForms] = useState<PaymentFormState>({});
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const deferredPatientSearch = useDeferredValue(patientSearch);

  async function fetchInvoices(currentPage: number, currentStatus: string) {
    const params = new URLSearchParams({ page: String(currentPage) });
    if (currentStatus) {
      params.set("status", currentStatus);
    }
    const { data } = await apiRequest<PaginatedResponse<Invoice>>(`/api/finance/invoices?${params.toString()}`);
    return data;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInvoices() {
      try {
        const data = await fetchInvoices(page, statusFilter);
        if (!cancelled) {
          setInvoices(data);
        }
      } catch (error) {
        if (!cancelled) {
          setToast({ message: error instanceof Error ? error.message : "Unable to load invoices.", tone: "error" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInvoices();
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter]);

  useEffect(() => {
    let cancelled = false;

    async function searchPatients() {
      if (!deferredPatientSearch.trim()) {
        setPatientMatches([]);
        return;
      }
      try {
        const { data } = await apiRequest<PaginatedResponse<PatientSummary>>(
          `/api/patients?search=${encodeURIComponent(deferredPatientSearch)}&page_size=5`,
        );
        if (!cancelled) {
          setPatientMatches(data.results);
        }
      } catch {
        if (!cancelled) {
          setPatientMatches([]);
        }
      }
    }

    void searchPatients();
    return () => {
      cancelled = true;
    };
  }, [deferredPatientSearch]);

  async function createInvoice() {
    setSavingInvoice(true);
    try {
      const response = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient: Number(invoiceForm.patient),
          consultation_fee: invoiceForm.consultation_fee,
          lab_fee: invoiceForm.lab_fee,
          pharmacy_fee: invoiceForm.pharmacy_fee,
          admission_fee: invoiceForm.admission_fee,
          radiology_fee: invoiceForm.radiology_fee,
          insurance_provider: invoiceForm.insurance_provider,
          insurance_policy_number: invoiceForm.insurance_policy_number,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractError(payload));
      }
      setToast({ message: "Invoice created successfully.", tone: "success" });
      setInvoiceForm(defaultInvoiceForm);
      setPatientSearch("");
      setPatientMatches([]);
      setInvoices(await fetchInvoices(page, statusFilter));
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Unable to create invoice.", tone: "error" });
    } finally {
      setSavingInvoice(false);
    }
  }

  async function recordPayment(invoiceId: number) {
    const payment = paymentForms[invoiceId];
    if (!payment?.amount_paid) {
      setToast({ message: "Enter an amount to record a payment.", tone: "error" });
      return;
    }

    const response = await fetch("/api/finance/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invoice: invoiceId,
        amount_paid: payment.amount_paid,
        payment_method: payment.payment_method,
        transaction_reference: payment.transaction_reference,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToast({ message: extractError(payload), tone: "error" });
      return;
    }

    const savedPayment = payload as Payment;
    setToast({
      message: savedPayment.id
        ? `Payment recorded successfully. Payment receipt PAY-${String(savedPayment.id).padStart(6, "0")} is ready.`
        : "Payment recorded successfully.",
      tone: "success",
    });
    setPaymentForms((current) => ({
      ...current,
      [invoiceId]: {
        amount_paid: "",
        payment_method: "cash",
        transaction_reference: "",
      },
    }));
    setInvoices(await fetchInvoices(page, statusFilter));
  }

  return (
    <div className="space-y-6">
      {toast && <ToastNotice message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      <section className="medical-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Create invoice</h3>
            <p className="mt-2 text-sm text-slate-600">
              Invoice totals calculate automatically and balances stay synchronized as partial payments arrive.
            </p>
          </div>
          <div className="medical-badge">Partial payments supported</div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="relative lg:col-span-2">
            <label className="medical-label">Patient search</label>
            <input
              className="medical-input"
              value={patientSearch}
              onChange={(event) => setPatientSearch(event.target.value)}
              placeholder="Search by patient name or health ID"
            />
            {patientMatches.length > 0 && (
              <div className="absolute z-10 mt-2 w-full rounded-[1.3rem] border border-[var(--border)] bg-white p-2 shadow-lg">
                {patientMatches.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => {
                      setInvoiceForm((current) => ({ ...current, patient: String(patient.id) }));
                      setPatientSearch(`${patient.full_name} (${patient.health_id})`);
                      setPatientMatches([]);
                    }}
                    className="block w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-slate-50"
                  >
                    <div className="font-semibold text-slate-900">{patient.full_name}</div>
                    <div className="text-slate-600">{patient.health_id}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {[
            ["consultation_fee", "Consultation fee"],
            ["lab_fee", "Lab fee"],
            ["pharmacy_fee", "Pharmacy fee"],
            ["admission_fee", "Admission fee"],
            ["radiology_fee", "Radiology fee"],
          ].map(([field, label]) => (
            <div key={field}>
              <label className="medical-label">{label}</label>
              <input
                className="medical-input"
                type="number"
                min="0"
                step="0.01"
                value={invoiceForm[field as keyof InvoiceFormState]}
                onChange={(event) =>
                  setInvoiceForm((current) => ({ ...current, [field]: event.target.value }))
                }
              />
            </div>
          ))}

          <div>
            <label className="medical-label">Insurance provider</label>
            <input
              className="medical-input"
              value={invoiceForm.insurance_provider}
              onChange={(event) =>
                setInvoiceForm((current) => ({ ...current, insurance_provider: event.target.value }))
              }
            />
          </div>

          <div>
            <label className="medical-label">Insurance policy number</label>
            <input
              className="medical-input"
              value={invoiceForm.insurance_policy_number}
              onChange={(event) =>
                setInvoiceForm((current) => ({ ...current, insurance_policy_number: event.target.value }))
              }
            />
          </div>
        </div>

        <button type="button" onClick={createInvoice} disabled={savingInvoice} className="medical-button medical-button-primary mt-6">
          {savingInvoice ? "Saving..." : "Generate invoice"}
        </button>
      </section>

      <section className="medical-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Invoices and payments</h3>
            <p className="mt-2 text-sm text-slate-600">Review balances, payment history, and receipt-ready invoice detail.</p>
          </div>
          <select
            className="medical-input max-w-xs"
            value={statusFilter}
            onChange={(event) => {
              setLoading(true);
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially paid</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-600">Loading invoices...</div>
          ) : invoices?.results.length ? (
            invoices.results.map((invoice) => (
              <article key={invoice.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-slate-900">{invoice.invoice_number}</h4>
                      <span className="medical-badge">{formatStatusLabel(invoice.status)}</span>
                      <Link
                        href={`/billing/invoices/${invoice.id}/receipt`}
                        className="medical-button medical-button-secondary"
                      >
                        Print hospital bill
                      </Link>
                      <a
                        href={`/api/documents/invoices/${invoice.id}/receipt-pdf`}
                        className="medical-button medical-button-primary"
                      >
                        Download bill PDF
                      </a>
                    </div>
                    <div className="mt-2 text-sm text-slate-600">{invoice.patient_name}</div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                      <div>Total: <span className="font-semibold text-slate-900">{formatCurrency(invoice.total_amount)}</span></div>
                      <div>Paid: <span className="font-semibold text-slate-900">{formatCurrency(invoice.amount_paid)}</span></div>
                      <div>Balance: <span className="font-semibold text-slate-900">{formatCurrency(invoice.balance_due)}</span></div>
                    </div>
                    <div className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                      Created {formatDateTime(invoice.created_at)}
                    </div>
                  </div>

                  <div className="w-full max-w-md rounded-[1.4rem] bg-[var(--panel-muted)] p-4">
                    <div className="text-sm font-semibold text-slate-900">Record payment</div>
                    <div className="mt-3 grid gap-3">
                      <input
                        className="medical-input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount paid"
                        value={paymentForms[invoice.id]?.amount_paid ?? ""}
                        onChange={(event) =>
                          setPaymentForms((current) => ({
                            ...current,
                            [invoice.id]: {
                              amount_paid: event.target.value,
                              payment_method: current[invoice.id]?.payment_method ?? "cash",
                              transaction_reference: current[invoice.id]?.transaction_reference ?? "",
                            },
                          }))
                        }
                      />
                      <select
                        className="medical-input"
                        value={paymentForms[invoice.id]?.payment_method ?? "cash"}
                        onChange={(event) =>
                          setPaymentForms((current) => ({
                            ...current,
                            [invoice.id]: {
                              amount_paid: current[invoice.id]?.amount_paid ?? "",
                              payment_method: event.target.value as PaymentMethod,
                              transaction_reference: current[invoice.id]?.transaction_reference ?? "",
                            },
                          }))
                        }
                      >
                        <option value="cash">Cash</option>
                        <option value="mpesa">M-Pesa</option>
                        <option value="card">Card</option>
                        <option value="insurance">Insurance</option>
                      </select>
                      <input
                        className="medical-input"
                        placeholder="Transaction reference"
                        value={paymentForms[invoice.id]?.transaction_reference ?? ""}
                        onChange={(event) =>
                          setPaymentForms((current) => ({
                            ...current,
                            [invoice.id]: {
                              amount_paid: current[invoice.id]?.amount_paid ?? "",
                              payment_method: current[invoice.id]?.payment_method ?? "cash",
                              transaction_reference: event.target.value,
                            },
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => recordPayment(invoice.id)}
                        className="medical-button medical-button-primary"
                      >
                        Record payment
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[1.4rem] border border-dashed border-[var(--border)] p-4">
                  <div className="text-sm font-semibold text-slate-900">Payment history</div>
                  <div className="mt-3 space-y-2">
                    {invoice.payments.length ? (
                      invoice.payments.map((payment) => (
                        <div key={payment.id} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          <Link
                            href={`/billing/payments/${payment.id}/receipt`}
                            className="medical-button medical-button-ghost mb-3 inline-flex"
                          >
                            Print payment receipt
                          </Link>
                          <a
                            href={`/api/documents/payments/${payment.id}/receipt-pdf`}
                            className="medical-button medical-button-secondary mb-3 ml-2 inline-flex"
                          >
                            Download PDF
                          </a>
                          <br />
                          {formatCurrency(payment.amount_paid)} via {formatStatusLabel(payment.payment_method)} • {formatDateTime(payment.payment_date)}
                          {payment.transaction_reference ? ` • Ref ${payment.transaction_reference}` : ""}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">No payments recorded yet.</div>
                    )}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No invoices match the current filter.
            </div>
          )}
        </div>

        {invoices && invoices.num_pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setPage((current) => Math.max(1, current - 1));
              }}
              disabled={page === 1}
              className="medical-button medical-button-secondary"
            >
              Previous
            </button>
            <div className="text-sm text-slate-600">
              Page {invoices.page} of {invoices.num_pages}
            </div>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setPage((current) => Math.min(invoices.num_pages, current + 1));
              }}
              disabled={page >= invoices.num_pages}
              className="medical-button medical-button-secondary"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
