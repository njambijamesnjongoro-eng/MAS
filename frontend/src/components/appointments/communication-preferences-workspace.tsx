"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { ToastNotice } from "@/components/clinical/toast-notice";
import { apiRequest } from "@/lib/client-api";
import type { PaginatedResponse, PatientCommunicationPreferenceRecord, PatientSummary } from "@/types";

type PreferenceFormState = {
  sms_enabled: boolean;
  email_enabled: boolean;
  phone_number: string;
  email: string;
};

const defaultForm: PreferenceFormState = {
  sms_enabled: true,
  email_enabled: true,
  phone_number: "",
  email: "",
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

export function CommunicationPreferencesWorkspace() {
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<PatientSummary[]>([]);
  const [preferences, setPreferences] = useState<PatientCommunicationPreferenceRecord | null>(null);
  const [form, setForm] = useState<PreferenceFormState>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let cancelled = false;

    async function searchPatients() {
      if (!deferredSearch.trim()) {
        setMatches([]);
        return;
      }
      try {
        const { data } = await apiRequest<PaginatedResponse<PatientSummary>>(
          `/api/patients?search=${encodeURIComponent(deferredSearch)}&page_size=5`,
        );
        if (!cancelled) {
          setMatches(data.results);
        }
      } catch {
        if (!cancelled) {
          setMatches([]);
        }
      }
    }

    void searchPatients();
    return () => {
      cancelled = true;
    };
  }, [deferredSearch]);

  async function loadPreferences(patient: PatientSummary) {
    setLoading(true);
    try {
      const { data } = await apiRequest<PatientCommunicationPreferenceRecord>(`/api/communication-preferences/${patient.id}`);
      setSelectedPatient(patient);
      setPreferences(data);
      setForm({
        sms_enabled: data.sms_enabled,
        email_enabled: data.email_enabled,
        phone_number: data.phone_number,
        email: data.email,
      });
      setSearch(`${patient.full_name} (${patient.health_id})`);
      setMatches([]);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Unable to load preferences.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    if (!selectedPatient) {
      setToast({ message: "Select a patient first.", tone: "error" });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/communication-preferences/${selectedPatient.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractError(payload));
      }
      const record = payload as PatientCommunicationPreferenceRecord;
      setPreferences(record);
      setForm({
        sms_enabled: record.sms_enabled,
        email_enabled: record.email_enabled,
        phone_number: record.phone_number,
        email: record.email,
      });
      setToast({ message: "Reminder settings updated.", tone: "success" });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Unable to save preferences.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {toast && <ToastNotice message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      <section className="medical-card medical-hero rounded-[2rem] p-6">
        <div>
          <div className="medical-badge">Patient communication preferences</div>
          <h3 className="mt-3 text-2xl font-semibold text-medical-primary">Reminder settings</h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-medical-secondary">
            Control whether appointment reminders should use SMS, email, or both, and confirm the destination contacts before reminders go out.
          </p>
        </div>

        <div className="relative mt-6">
          <label className="medical-label">Patient search</label>
          <input
            className="medical-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by patient name or health ID"
          />
          {matches.length > 0 && (
            <div className="absolute z-10 mt-2 w-full rounded-[1.3rem] border border-[var(--border)] bg-[var(--panel)] p-2 shadow-lg">
              {matches.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => void loadPreferences(patient)}
                  className="block w-full rounded-xl px-3 py-3 text-left text-sm transition hover:bg-[var(--panel-muted)]"
                >
                  <div className="font-semibold text-medical-primary">{patient.full_name}</div>
                  <div className="text-medical-secondary">{patient.health_id}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="medical-card rounded-[2rem] p-6">
        {loading ? (
          <div className="medical-empty-state rounded-2xl px-4 py-5 text-sm">Loading reminder settings...</div>
        ) : preferences && selectedPatient ? (
          <div className="space-y-6">
            <div className="medical-subtle-panel rounded-[1.5rem] p-4">
              <div className="text-sm font-semibold text-medical-primary">{selectedPatient.full_name}</div>
              <div className="mt-1 text-sm text-medical-secondary">{selectedPatient.health_id}</div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <label className="medical-subtle-panel flex items-center justify-between gap-4 rounded-[1.4rem] p-4">
                <div>
                  <div className="font-semibold text-medical-primary">SMS reminders</div>
                  <div className="mt-1 text-sm text-medical-secondary">Use phone-based reminders for next-day appointments.</div>
                </div>
                <input
                  type="checkbox"
                  checked={form.sms_enabled}
                  onChange={(event) => setForm((current) => ({ ...current, sms_enabled: event.target.checked }))}
                />
              </label>

              <label className="medical-subtle-panel flex items-center justify-between gap-4 rounded-[1.4rem] p-4">
                <div>
                  <div className="font-semibold text-medical-primary">Email reminders</div>
                  <div className="mt-1 text-sm text-medical-secondary">Use secure email notifications for appointment reminders.</div>
                </div>
                <input
                  type="checkbox"
                  checked={form.email_enabled}
                  onChange={(event) => setForm((current) => ({ ...current, email_enabled: event.target.checked }))}
                />
              </label>

              <div>
                <label className="medical-label">Phone number</label>
                <input
                  className="medical-input"
                  value={form.phone_number}
                  onChange={(event) => setForm((current) => ({ ...current, phone_number: event.target.value }))}
                  placeholder="+2547..."
                />
              </div>

              <div>
                <label className="medical-label">Email address</label>
                <input
                  className="medical-input"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="patient@example.com"
                />
              </div>
            </div>

            <button type="button" onClick={savePreferences} disabled={saving} className="medical-button medical-button-primary">
              {saving ? "Saving..." : "Save reminder settings"}
            </button>
          </div>
        ) : (
          <div className="medical-empty-state rounded-2xl px-4 py-5 text-sm">Search and select a patient to manage reminder settings.</div>
        )}
      </section>
    </div>
  );
}
