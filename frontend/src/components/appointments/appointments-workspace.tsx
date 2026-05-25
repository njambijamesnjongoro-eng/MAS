"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

import { ToastNotice } from "@/components/clinical/toast-notice";
import { apiRequest } from "@/lib/client-api";
import { formatDate, formatDateTime, formatStatusLabel } from "@/lib/format";
import type { AppointmentRecord, AppointmentReferenceData, DoctorOption, PaginatedResponse, PatientSummary } from "@/types";

type AppointmentFormState = {
  patient: string;
  doctor: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason: string;
  notes: string;
};

const defaultForm: AppointmentFormState = {
  patient: "",
  doctor: "",
  appointment_date: "",
  appointment_time: "",
  status: "scheduled",
  reason: "",
  notes: "",
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

export function AppointmentsWorkspace() {
  const [form, setForm] = useState<AppointmentFormState>(defaultForm);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [statuses, setStatuses] = useState<Array<{ code: string; label: string }>>([]);
  const [appointments, setAppointments] = useState<PaginatedResponse<AppointmentRecord> | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientMatches, setPatientMatches] = useState<PatientSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const deferredPatientSearch = useDeferredValue(patientSearch);

  async function fetchAppointments(currentPage: number, currentStatus: string) {
    const params = new URLSearchParams({ page: String(currentPage) });
    if (currentStatus) {
      params.set("status", currentStatus);
    }
    const { data } = await apiRequest<PaginatedResponse<AppointmentRecord>>(`/api/appointments?${params.toString()}`);
    return data;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadReferenceData() {
      try {
        const { data } = await apiRequest<AppointmentReferenceData>("/api/appointments/reference-data");
        if (!cancelled) {
          setDoctors(data.doctors);
          setStatuses(data.statuses);
        }
      } catch (error) {
        if (!cancelled) {
          setToast({ message: error instanceof Error ? error.message : "Unable to load doctors.", tone: "error" });
        }
      }
    }

    void loadReferenceData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAppointments() {
      try {
        const data = await fetchAppointments(page, statusFilter);
        if (!cancelled) {
          setAppointments(data);
        }
      } catch (error) {
        if (!cancelled) {
          setToast({ message: error instanceof Error ? error.message : "Unable to load appointments.", tone: "error" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAppointments();
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

  async function createAppointment() {
    setSaving(true);
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient: Number(form.patient),
          doctor: Number(form.doctor),
          appointment_date: form.appointment_date,
          appointment_time: form.appointment_time,
          status: form.status,
          reason: form.reason,
          notes: form.notes,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractError(payload));
      }
      setToast({ message: "Appointment booked successfully.", tone: "success" });
      setForm(defaultForm);
      setPatientSearch("");
      setPatientMatches([]);
      setAppointments(await fetchAppointments(page, statusFilter));
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Unable to create appointment.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {toast && <ToastNotice message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      <section className="medical-card medical-hero rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="medical-badge">Booking and follow-up coordination</div>
            <h3 className="mt-3 text-2xl font-semibold text-medical-primary">Schedule an appointment</h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-medical-secondary">
              Book the patient, assign the doctor, and capture the contact channels the reminder engine will use before the visit.
            </p>
          </div>
          <Link href="/reminders" className="medical-button medical-button-secondary">
            Open reminder dashboard
          </Link>
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
              <div className="absolute z-10 mt-2 w-full rounded-[1.3rem] border border-[var(--border)] bg-[var(--panel)] p-2 shadow-lg">
                {patientMatches.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => {
                      setForm((current) => ({ ...current, patient: String(patient.id) }));
                      setPatientSearch(`${patient.full_name} (${patient.health_id})`);
                      setPatientMatches([]);
                    }}
                    className="block w-full rounded-xl px-3 py-3 text-left text-sm transition hover:bg-[var(--panel-muted)]"
                  >
                    <div className="font-semibold text-medical-primary">{patient.full_name}</div>
                    <div className="text-medical-secondary">{patient.health_id}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="medical-label">Doctor</label>
            <select
              className="medical-input"
              value={form.doctor}
              onChange={(event) => setForm((current) => ({ ...current, doctor: event.target.value }))}
            >
              <option value="">Select doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="medical-label">Status</label>
            <select
              className="medical-input"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              {statuses.map((status) => (
                <option key={status.code} value={status.code}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="medical-label">Appointment date</label>
            <input
              className="medical-input"
              type="date"
              value={form.appointment_date}
              onChange={(event) => setForm((current) => ({ ...current, appointment_date: event.target.value }))}
            />
          </div>

          <div>
            <label className="medical-label">Appointment time</label>
            <input
              className="medical-input"
              type="time"
              value={form.appointment_time}
              onChange={(event) => setForm((current) => ({ ...current, appointment_time: event.target.value }))}
            />
          </div>

          <div>
            <label className="medical-label">Reason</label>
            <input
              className="medical-input"
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Follow-up, review, consultation"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="medical-label">Notes</label>
            <textarea
              className="medical-input min-h-28"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Scheduling notes for internal staff use"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={createAppointment} disabled={saving} className="medical-button medical-button-primary">
            {saving ? "Saving..." : "Book appointment"}
          </button>
          {form.patient && (
            <Link href={`/communication-preferences?patient=${form.patient}`} className="medical-button medical-button-ghost">
              Reminder settings
            </Link>
          )}
        </div>
      </section>

      <section className="medical-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-medical-primary">Upcoming appointments</h3>
            <p className="mt-2 text-sm text-medical-secondary">Monitor booking status and reminder readiness across the queue.</p>
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
            {statuses.map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="medical-empty-state rounded-2xl px-4 py-5 text-sm">Loading appointments...</div>
          ) : appointments?.results.length ? (
            appointments.results.map((appointment) => (
              <article key={appointment.id} className="medical-card medical-card-interactive rounded-[1.5rem] p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-medical-primary">{appointment.patient_name}</h4>
                      <span className="medical-badge">{formatStatusLabel(appointment.status)}</span>
                    </div>
                    <div className="mt-2 text-sm text-medical-secondary">
                      {appointment.doctor_name} • {formatDateTime(appointment.appointment_datetime)}
                    </div>
                    <div className="mt-2 text-sm leading-7 text-medical-secondary">{appointment.reason || "No reason recorded."}</div>
                    <div className="mt-4 grid gap-2 text-sm text-medical-secondary md:grid-cols-3">
                      <div>SMS: <span className="font-semibold text-medical-primary">{formatStatusLabel(appointment.sms_status)}</span></div>
                      <div>Email: <span className="font-semibold text-medical-primary">{formatStatusLabel(appointment.email_status)}</span></div>
                      <div>Reminder sent: <span className="font-semibold text-medical-primary">{appointment.reminder_sent ? "Yes" : "No"}</span></div>
                    </div>
                  </div>

                  <div className="medical-subtle-panel w-full max-w-sm rounded-[1.4rem] p-4">
                    <div className="text-sm font-semibold text-medical-primary">Contact snapshot</div>
                    <div className="mt-3 grid gap-2 text-sm text-medical-secondary">
                      <div>{appointment.phone_number || "No phone number"}</div>
                      <div>{appointment.email || "No email address"}</div>
                      <div>Booked {formatDate(appointment.created_at)}</div>
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="medical-empty-state rounded-2xl px-4 py-5 text-sm">No appointments match the current filter.</div>
          )}
        </div>

        {appointments && appointments.num_pages > 1 && (
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
            <div className="text-sm text-medical-secondary">
              Page {appointments.page} of {appointments.num_pages}
            </div>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setPage((current) => Math.min(appointments.num_pages, current + 1));
              }}
              disabled={page >= appointments.num_pages}
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
