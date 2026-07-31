"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client-api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";
import { canCreateImagingRequestRole } from "@/lib/role-access";
import type {
  AuthUser,
  ImagingRequestRecord,
  ImagingType,
  PaginatedResponse,
  PatientSummary,
} from "@/types";

import { ToastNotice } from "@/components/clinical/toast-notice";

type ImagingFormState = {
  patient: string;
  visit: string;
  imaging_type: ImagingType;
  clinical_notes: string;
};

type UploadState = Record<number, { radiologist_report: string; remarks: string; file: File | null }>;

const defaultForm: ImagingFormState = {
  patient: "",
  visit: "",
  imaging_type: "xray",
  clinical_notes: "",
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

export function ImagingWorkspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<ImagingFormState>(defaultForm);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientMatches, setPatientMatches] = useState<PatientSummary[]>([]);
  const [requests, setRequests] = useState<PaginatedResponse<ImagingRequestRecord> | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({});
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const deferredPatientSearch = useDeferredValue(patientSearch);

  const canCreateRequest = useMemo(
    () => canCreateImagingRequestRole(user?.effective_role),
    [user],
  );
  const canUploadResults = useMemo(
    () => (user ? ["lab_technician", "hospital_admin", "super_admin"].includes(user.effective_role) : false),
    [user],
  );

  async function fetchRequests(currentPage: number, currentStatus: string) {
    const [userResponse, requestsResponse] = await Promise.all([
      apiRequest<AuthUser>("/api/auth/me"),
      apiRequest<PaginatedResponse<ImagingRequestRecord>>(
        `/api/imaging/requests?page=${currentPage}${currentStatus ? `&status=${currentStatus}` : ""}`,
      ),
    ]);
    return {
      user: userResponse.data,
      requests: requestsResponse.data,
    };
  }

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      try {
        const data = await fetchRequests(page, statusFilter);
        if (!cancelled) {
          setUser(data.user);
          setRequests(data.requests);
        }
      } catch (error) {
        if (!cancelled) {
          setToast({ message: error instanceof Error ? error.message : "Unable to load imaging workflow.", tone: "error" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRequests();
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

  async function createRequest() {
    setSaving(true);
    try {
      const response = await fetch("/api/imaging/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient: Number(form.patient),
          visit: form.visit ? Number(form.visit) : null,
          imaging_type: form.imaging_type,
          clinical_notes: form.clinical_notes,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractError(payload));
      }
      setToast({ message: "Imaging request created successfully.", tone: "success" });
      setForm(defaultForm);
      setPatientSearch("");
      setPatientMatches([]);
      const data = await fetchRequests(page, statusFilter);
      setUser(data.user);
      setRequests(data.requests);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Unable to create imaging request.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function uploadResult(requestId: number) {
    const currentUpload = uploadState[requestId];
    if (!currentUpload) {
      setToast({ message: "Provide report details or an attachment first.", tone: "error" });
      return;
    }

    const formData = new FormData();
    formData.set("radiologist_report", currentUpload.radiologist_report);
    formData.set("remarks", currentUpload.remarks);
    if (currentUpload.file) {
      formData.set("attachment", currentUpload.file);
    }

    const response = await fetch(`/api/imaging/requests/${requestId}/result`, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToast({ message: extractError(payload), tone: "error" });
      return;
    }

    setToast({ message: "Imaging result uploaded successfully.", tone: "success" });
    setUploadState((current) => ({
      ...current,
      [requestId]: { radiologist_report: "", remarks: "", file: null },
    }));
    const data = await fetchRequests(page, statusFilter);
    setUser(data.user);
    setRequests(data.requests);
  }

  return (
    <div className="space-y-6">
      {toast && <ToastNotice message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      <section className="medical-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Imaging requests</h3>
            <p className="mt-2 text-sm text-slate-600">
              Create secure radiology orders and upload radiologist reports with validated medical attachments.
            </p>
          </div>
          <div className="medical-badge">Protected file access</div>
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
            <label className="medical-label">Linked visit ID (optional)</label>
            <input
              className="medical-input"
              value={form.visit}
              onChange={(event) => setForm((current) => ({ ...current, visit: event.target.value }))}
              placeholder="Visit numeric ID"
              disabled={!canCreateRequest}
            />
          </div>

          <div>
            <label className="medical-label">Imaging type</label>
            <select
              className="medical-input"
              value={form.imaging_type}
              onChange={(event) =>
                setForm((current) => ({ ...current, imaging_type: event.target.value as ImagingType }))
              }
              disabled={!canCreateRequest}
            >
              <option value="xray">X-Ray</option>
              <option value="mri">MRI</option>
              <option value="ct_scan">CT Scan</option>
              <option value="ultrasound">Ultrasound</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="medical-label">Clinical notes</label>
            <textarea
              className="medical-input min-h-28"
              value={form.clinical_notes}
              onChange={(event) => setForm((current) => ({ ...current, clinical_notes: event.target.value }))}
              disabled={!canCreateRequest}
            />
          </div>
        </div>

        <button type="button" onClick={createRequest} disabled={!canCreateRequest || saving} className="medical-button medical-button-primary mt-6">
          {saving ? "Saving..." : "Create imaging request"}
        </button>
      </section>

      <section className="medical-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Imaging history</h3>
            <p className="mt-2 text-sm text-slate-600">Track ordered studies, result upload progress, and secure downloads.</p>
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
            <option value="requested">Requested</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-600">Loading imaging requests...</div>
          ) : requests?.results.length ? (
            requests.results.map((request) => (
              <article key={request.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-slate-900">{formatStatusLabel(request.imaging_type)}</h4>
                      <span className="medical-badge">{formatStatusLabel(request.status)}</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-600">{request.patient_name}</div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">{request.clinical_notes || "No clinical notes recorded."}</div>
                    <div className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                      Requested {formatDateTime(request.created_at)}
                    </div>
                    {request.result?.attachment_url && (
                      <a
                        href={`/api/imaging/requests/${request.id}/download`}
                        className="medical-button medical-button-secondary mt-4 inline-flex"
                      >
                        Download attachment
                      </a>
                    )}
                  </div>

                  {canUploadResults && (
                    <div className="w-full max-w-md rounded-[1.4rem] bg-[var(--panel-muted)] p-4">
                      <div className="text-sm font-semibold text-slate-900">Upload radiology result</div>
                      <div className="mt-3 grid gap-3">
                        <textarea
                          className="medical-input min-h-24"
                          placeholder="Radiologist report"
                          value={uploadState[request.id]?.radiologist_report ?? request.result?.radiologist_report ?? ""}
                          onChange={(event) =>
                            setUploadState((current) => ({
                              ...current,
                              [request.id]: {
                                radiologist_report: event.target.value,
                                remarks: current[request.id]?.remarks ?? request.result?.remarks ?? "",
                                file: current[request.id]?.file ?? null,
                              },
                            }))
                          }
                        />
                        <textarea
                          className="medical-input min-h-20"
                          placeholder="Remarks"
                          value={uploadState[request.id]?.remarks ?? request.result?.remarks ?? ""}
                          onChange={(event) =>
                            setUploadState((current) => ({
                              ...current,
                              [request.id]: {
                                radiologist_report:
                                  current[request.id]?.radiologist_report ?? request.result?.radiologist_report ?? "",
                                remarks: event.target.value,
                                file: current[request.id]?.file ?? null,
                              },
                            }))
                          }
                        />
                        <input
                          type="file"
                          className="medical-input"
                          accept=".pdf,image/*"
                          onChange={(event) =>
                            setUploadState((current) => ({
                              ...current,
                              [request.id]: {
                                radiologist_report:
                                  current[request.id]?.radiologist_report ?? request.result?.radiologist_report ?? "",
                                remarks: current[request.id]?.remarks ?? request.result?.remarks ?? "",
                                file: event.target.files?.[0] ?? null,
                              },
                            }))
                          }
                        />
                        <button type="button" onClick={() => uploadResult(request.id)} className="medical-button medical-button-primary">
                          Upload result
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {request.result && (
                  <div className="mt-4 rounded-[1.4rem] border border-dashed border-[var(--border)] p-4 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">Current result summary</div>
                    <div className="mt-2">{request.result.radiologist_report || "Report uploaded."}</div>
                    {request.result.remarks && <div className="mt-2 text-slate-600">{request.result.remarks}</div>}
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No imaging requests match the current filter.
            </div>
          )}
        </div>

        {requests && requests.num_pages > 1 && (
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
              Page {requests.page} of {requests.num_pages}
            </div>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setPage((current) => Math.min(requests.num_pages, current + 1));
              }}
              disabled={page >= requests.num_pages}
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
