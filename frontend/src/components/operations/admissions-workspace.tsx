"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client-api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";
import type { Admission, Bed, PaginatedResponse, PatientSummary, Ward } from "@/types";

import { ToastNotice } from "@/components/clinical/toast-notice";

type AdmissionFormState = {
  patient: string;
  ward: string;
  bed: string;
  admission_reason: string;
};

type TransferState = Record<number, { ward: string; bed: string }>;

const defaultForm: AdmissionFormState = {
  patient: "",
  ward: "",
  bed: "",
  admission_reason: "",
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

export function AdmissionsWorkspace() {
  const [form, setForm] = useState<AdmissionFormState>(defaultForm);
  const [admissions, setAdmissions] = useState<PaginatedResponse<Admission> | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientMatches, setPatientMatches] = useState<PatientSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [transferState, setTransferState] = useState<TransferState>({});
  const deferredPatientSearch = useDeferredValue(patientSearch);

  async function fetchReferenceData(selectedWard?: string) {
    const [wardsResponse, bedsResponse] = await Promise.all([
      apiRequest<PaginatedResponse<Ward>>("/api/operations/wards?page_size=100"),
      apiRequest<PaginatedResponse<Bed>>(
        `/api/operations/beds?page_size=100${selectedWard ? `&ward=${selectedWard}` : ""}&occupancy_status=available`,
      ),
    ]);
    return {
      wards: wardsResponse.data.results,
      beds: bedsResponse.data.results,
    };
  }

  async function fetchAdmissions(currentPage: number, currentStatus: string) {
    const params = new URLSearchParams({ page: String(currentPage) });
    if (currentStatus) {
      params.set("status", currentStatus);
    }
    const { data } = await apiRequest<PaginatedResponse<Admission>>(`/api/operations/admissions?${params.toString()}`);
    return data;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAdmissions() {
      try {
        const data = await fetchAdmissions(page, statusFilter);
        if (!cancelled) {
          setAdmissions(data);
        }
      } catch (error) {
        if (!cancelled) {
          setToast({ message: error instanceof Error ? error.message : "Unable to load admissions.", tone: "error" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAdmissions();
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadReferenceData() {
      try {
        const data = await fetchReferenceData(form.ward || undefined);
        if (!cancelled) {
          setWards(data.wards);
          setBeds(data.beds);
        }
      } catch (error) {
        if (!cancelled) {
          setToast({ message: error instanceof Error ? error.message : "Unable to load ward references.", tone: "error" });
        }
      }
    }

    void loadReferenceData();
    return () => {
      cancelled = true;
    };
  }, [form.ward]);

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

  const availableBedsForTransfer = useMemo(() => beds, [beds]);

  async function submitAdmission() {
    setSaving(true);
    try {
      const response = await fetch("/api/operations/admissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient: Number(form.patient),
          ward: Number(form.ward),
          bed: Number(form.bed),
          admission_reason: form.admission_reason,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractError(payload));
      }
      setToast({ message: "Admission recorded successfully.", tone: "success" });
      setForm(defaultForm);
      setPatientSearch("");
      setPatientMatches([]);
      setAdmissions(await fetchAdmissions(page, statusFilter));
      const referenceData = await fetchReferenceData();
      setWards(referenceData.wards);
      setBeds(referenceData.beds);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Unable to admit patient.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function dischargeAdmission(admissionId: number) {
    const response = await fetch(`/api/operations/admissions/${admissionId}/discharge`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToast({ message: extractError(payload), tone: "error" });
      return;
    }
    setToast({ message: "Patient discharged and bed released.", tone: "success" });
    setAdmissions(await fetchAdmissions(page, statusFilter));
    const referenceData = await fetchReferenceData();
    setWards(referenceData.wards);
    setBeds(referenceData.beds);
  }

  async function transferAdmission(admissionId: number) {
    const transfer = transferState[admissionId];
    if (!transfer?.ward || !transfer?.bed) {
      setToast({ message: "Select a destination ward and bed first.", tone: "error" });
      return;
    }

    const response = await fetch(`/api/operations/admissions/${admissionId}/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ward: Number(transfer.ward),
        bed: Number(transfer.bed),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToast({ message: extractError(payload), tone: "error" });
      return;
    }
    setToast({ message: "Admission transferred successfully.", tone: "success" });
    setAdmissions(await fetchAdmissions(page, statusFilter));
    const referenceData = await fetchReferenceData();
    setWards(referenceData.wards);
    setBeds(referenceData.beds);
  }

  return (
    <div className="space-y-6">
      {toast && <ToastNotice message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      <section className="medical-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Admit a patient</h3>
            <p className="mt-2 text-sm text-slate-600">
              Assign the patient to a ward and bed while enforcing one active admission and one active bed occupant.
            </p>
          </div>
          <div className="medical-badge">Beds are allocated server-side</div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="relative">
            <label className="medical-label">Patient search</label>
            <input
              className="medical-input"
              value={patientSearch}
              onChange={(event) => setPatientSearch(event.target.value)}
              placeholder="Search by name or health ID"
            />
            {patientMatches.length > 0 && (
              <div className="absolute z-10 mt-2 w-full rounded-[1.3rem] border border-[var(--border)] bg-white p-2 shadow-lg">
                {patientMatches.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => {
                      setForm((current) => ({ ...current, patient: String(patient.id) }));
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

          <div>
            <label className="medical-label">Selected patient ID</label>
            <input
              className="medical-input"
              value={form.patient}
              onChange={(event) => setForm((current) => ({ ...current, patient: event.target.value }))}
              placeholder="Patient numeric ID"
            />
          </div>

          <div>
            <label className="medical-label">Ward</label>
            <select
              className="medical-input"
              value={form.ward}
              onChange={(event) =>
                setForm((current) => ({ ...current, ward: event.target.value, bed: "" }))
              }
            >
              <option value="">Select ward</option>
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.ward_name} ({formatStatusLabel(ward.ward_type)}) - {ward.occupied_beds_count}/{ward.capacity}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="medical-label">Available bed</label>
            <select
              className="medical-input"
              value={form.bed}
              onChange={(event) => setForm((current) => ({ ...current, bed: event.target.value }))}
            >
              <option value="">Select bed</option>
              {beds.map((bed) => (
                <option key={bed.id} value={bed.id}>
                  {bed.ward_name} - Bed {bed.bed_number}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="medical-label">Admission reason</label>
            <textarea
              className="medical-input min-h-28"
              value={form.admission_reason}
              onChange={(event) => setForm((current) => ({ ...current, admission_reason: event.target.value }))}
              placeholder="Reason for inpatient admission"
            />
          </div>
        </div>

        <button type="button" onClick={submitAdmission} disabled={saving} className="medical-button medical-button-primary mt-6">
          {saving ? "Saving..." : "Admit patient"}
        </button>
      </section>

      <section className="medical-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Admission history</h3>
            <p className="mt-2 text-sm text-slate-600">Review active inpatients, transfers, and discharge activity.</p>
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
            <option value="active">Active</option>
            <option value="discharged">Discharged</option>
          </select>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-600">Loading admissions...</div>
          ) : admissions?.results.length ? (
            admissions.results.map((admission) => (
              <article key={admission.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-slate-900">{admission.patient_name}</h4>
                      <span className="medical-badge">{formatStatusLabel(admission.status)}</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      {admission.ward_name} - Bed {admission.bed_number}
                    </div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">{admission.admission_reason}</div>
                    <div className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                      Admitted {formatDateTime(admission.admission_date)}
                      {admission.discharge_date ? ` • Discharged ${formatDateTime(admission.discharge_date)}` : ""}
                    </div>
                  </div>

                  {admission.status === "active" && (
                    <div className="w-full max-w-md rounded-[1.4rem] bg-[var(--panel-muted)] p-4">
                      <div className="text-sm font-semibold text-slate-900">Transfer or discharge</div>
                      <div className="mt-3 grid gap-3">
                        <select
                          className="medical-input"
                          value={transferState[admission.id]?.ward ?? ""}
                          onChange={(event) =>
                            setTransferState((current) => ({
                              ...current,
                              [admission.id]: {
                                ward: event.target.value,
                                bed: "",
                              },
                            }))
                          }
                        >
                          <option value="">Transfer ward</option>
                          {wards.map((ward) => (
                            <option key={ward.id} value={ward.id}>
                              {ward.ward_name}
                            </option>
                          ))}
                        </select>
                        <select
                          className="medical-input"
                          value={transferState[admission.id]?.bed ?? ""}
                          onChange={(event) =>
                            setTransferState((current) => ({
                              ...current,
                              [admission.id]: {
                                ward: current[admission.id]?.ward ?? "",
                                bed: event.target.value,
                              },
                            }))
                          }
                        >
                          <option value="">Transfer bed</option>
                          {availableBedsForTransfer
                            .filter((bed) =>
                              transferState[admission.id]?.ward
                                ? bed.ward === Number(transferState[admission.id]?.ward)
                                : true,
                            )
                            .map((bed) => (
                              <option key={bed.id} value={bed.id}>
                                {bed.ward_name} - Bed {bed.bed_number}
                              </option>
                            ))}
                        </select>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => transferAdmission(admission.id)}
                            className="medical-button medical-button-secondary"
                          >
                            Transfer
                          </button>
                          <button
                            type="button"
                            onClick={() => dischargeAdmission(admission.id)}
                            className="medical-button medical-button-primary"
                          >
                            Discharge
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No admissions match the current filter.
            </div>
          )}
        </div>

        {admissions && admissions.num_pages > 1 && (
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
              Page {admissions.page} of {admissions.num_pages}
            </div>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setPage((current) => Math.min(admissions.num_pages, current + 1));
              }}
              disabled={page >= admissions.num_pages}
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
