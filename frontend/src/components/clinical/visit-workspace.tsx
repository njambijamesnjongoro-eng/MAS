"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client-api";
import { formatDateTime, formatRoleLabel, formatStatusLabel } from "@/lib/format";
import type { AuthUser, LabRequest, PatientDetail, Prescription, VisitDetail } from "@/types";
import { PatientJourneyGuide } from "@/components/workflow/patient-journey-guide";

import { ToastNotice } from "./toast-notice";

type VisitWorkspaceProps = {
  patientId: string;
  visitId?: string;
};

type VisitFormState = {
  visit_date: string;
  chief_complaint: string;
  symptoms: string;
  diagnosis_summary: string;
  treatment_plan: string;
  follow_up_date: string;
  status: "open" | "in_progress" | "closed";
  vitals: {
    temperature: string;
    blood_pressure: string;
    pulse_rate: string;
    respiratory_rate: string;
    oxygen_saturation: string;
    weight: string;
    height: string;
  };
  diagnosis: {
    primary_diagnosis: string;
    secondary_diagnosis: string;
    icd_code: string;
    severity: "mild" | "moderate" | "severe" | "critical";
    clinical_notes: string;
  };
  prescriptions: Prescription[];
  lab_requests: LabRequest[];
};

const emptyPrescription = (): Prescription => ({
  medication_name: "",
  dosage: "",
  frequency: "",
  duration: "",
  route: "Oral",
  instructions: "",
  status: "active",
});

const emptyLabRequest = (): LabRequest => ({
  test_name: "",
  priority: "routine",
  clinical_notes: "",
  status: "requested",
});

const defaultFormState: VisitFormState = {
  visit_date: new Date().toISOString().slice(0, 16),
  chief_complaint: "",
  symptoms: "",
  diagnosis_summary: "",
  treatment_plan: "",
  follow_up_date: "",
  status: "open",
  vitals: {
    temperature: "",
    blood_pressure: "",
    pulse_rate: "",
    respiratory_rate: "",
    oxygen_saturation: "",
    weight: "",
    height: "",
  },
  diagnosis: {
    primary_diagnosis: "",
    secondary_diagnosis: "",
    icd_code: "",
    severity: "moderate",
    clinical_notes: "",
  },
  prescriptions: [emptyPrescription()],
  lab_requests: [emptyLabRequest()],
};

const consultationSteps = [
  { href: "#visit-story", label: "1. Patient story" },
  { href: "#visit-vitals", label: "2. Vitals" },
  { href: "#visit-diagnosis", label: "3. Diagnosis" },
  { href: "#visit-medicines", label: "4. Medicines" },
  { href: "#visit-labs", label: "5. Labs" },
  { href: "#finish-visit", label: "6. Finish" },
];

function toLocalDateTime(value?: string) {
  if (!value) {
    return new Date().toISOString().slice(0, 16);
  }
  return value.slice(0, 16);
}

function normalizeNumber(value: string) {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildFormFromVisit(visit: VisitDetail): VisitFormState {
  return {
    visit_date: toLocalDateTime(visit.visit_date),
    chief_complaint: visit.chief_complaint,
    symptoms: visit.symptoms,
    diagnosis_summary: visit.diagnosis_summary,
    treatment_plan: visit.treatment_plan,
    follow_up_date: visit.follow_up_date ?? "",
    status: visit.status,
    vitals: {
      temperature: visit.vitals?.temperature?.toString() ?? "",
      blood_pressure: visit.vitals?.blood_pressure ?? "",
      pulse_rate: visit.vitals?.pulse_rate?.toString() ?? "",
      respiratory_rate: visit.vitals?.respiratory_rate?.toString() ?? "",
      oxygen_saturation: visit.vitals?.oxygen_saturation?.toString() ?? "",
      weight: visit.vitals?.weight?.toString() ?? "",
      height: visit.vitals?.height?.toString() ?? "",
    },
    diagnosis: {
      primary_diagnosis: visit.diagnosis?.primary_diagnosis ?? "",
      secondary_diagnosis: visit.diagnosis?.secondary_diagnosis ?? "",
      icd_code: visit.diagnosis?.icd_code ?? "",
      severity: visit.diagnosis?.severity ?? "moderate",
      clinical_notes: visit.diagnosis?.clinical_notes ?? "",
    },
    prescriptions: visit.prescriptions.length ? visit.prescriptions : [emptyPrescription()],
    lab_requests: visit.lab_requests.length ? visit.lab_requests : [emptyLabRequest()],
  };
}

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
  return "Unable to save visit.";
}

export function VisitWorkspace({ patientId, visitId }: VisitWorkspaceProps) {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<VisitFormState>(defaultFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closingVisit, setClosingVisit] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadStates, setUploadStates] = useState<Record<number, { result_text: string; remarks: string; file: File | null }>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const requests: Array<Promise<{ data: unknown }>> = [
          apiRequest<PatientDetail>(`/api/patients/${patientId}`),
          apiRequest<AuthUser>("/api/auth/me"),
        ];
        if (visitId) {
          requests.push(apiRequest<VisitDetail>(`/api/clinical/visits/${visitId}`));
        }

        const [patientResponse, userResponse, visitResponse] = await Promise.all(requests);
        if (cancelled) {
          return;
        }

        setPatient(patientResponse.data as PatientDetail);
        setUser(userResponse.data as AuthUser);
        if (visitResponse) {
          const currentVisit = visitResponse.data as VisitDetail;
          setVisit(currentVisit);
          setForm(buildFormFromVisit(currentVisit));
        } else {
          setForm(defaultFormState);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load visit workspace.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, [patientId, visitId]);

  const canEditEncounter = useMemo(() => {
    return user ? ["doctor", "hospital_admin", "super_admin"].includes(user.effective_role) : false;
  }, [user]);
  const canEditVitals = useMemo(() => {
    return user ? ["doctor", "nurse", "hospital_admin", "super_admin"].includes(user.effective_role) : false;
  }, [user]);
  const canDispense = useMemo(() => {
    return user ? ["pharmacist", "hospital_admin", "super_admin"].includes(user.effective_role) : false;
  }, [user]);
  const canUploadLab = useMemo(() => {
    return user ? ["lab_technician", "hospital_admin", "super_admin"].includes(user.effective_role) : false;
  }, [user]);
  const visitJourneyStep = useMemo(() => {
    const hasOrders =
      form.prescriptions.some((item) => item.medication_name.trim()) ||
      form.lab_requests.some((item) => item.test_name.trim());
    return hasOrders ? 4 : 3;
  }, [form.lab_requests, form.prescriptions]);
  const hasSavedPrescriptions = form.prescriptions.some((item) => item.id && item.medication_name.trim());

  function updateField<K extends keyof VisitFormState>(field: K, value: VisitFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateVitals(field: keyof VisitFormState["vitals"], value: string) {
    setForm((current) => ({ ...current, vitals: { ...current.vitals, [field]: value } }));
  }

  function updateDiagnosis(field: keyof VisitFormState["diagnosis"], value: string) {
    setForm((current) => ({ ...current, diagnosis: { ...current.diagnosis, [field]: value } }));
  }

  function updatePrescription(index: number, field: keyof Prescription, value: string) {
    setForm((current) => ({
      ...current,
      prescriptions: current.prescriptions.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function updateLabRequest(index: number, field: keyof LabRequest, value: string) {
    setForm((current) => ({
      ...current,
      lab_requests: current.lab_requests.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function buildPayload() {
    return {
      patient: Number(patientId),
      visit_date: new Date(form.visit_date).toISOString(),
      chief_complaint: form.chief_complaint,
      symptoms: form.symptoms,
      diagnosis_summary: form.diagnosis_summary,
      treatment_plan: form.treatment_plan,
      follow_up_date: form.follow_up_date || null,
      status: form.status,
      vitals: {
        temperature: normalizeNumber(form.vitals.temperature),
        blood_pressure: form.vitals.blood_pressure,
        pulse_rate: normalizeNumber(form.vitals.pulse_rate),
        respiratory_rate: normalizeNumber(form.vitals.respiratory_rate),
        oxygen_saturation: normalizeNumber(form.vitals.oxygen_saturation),
        weight: normalizeNumber(form.vitals.weight),
        height: normalizeNumber(form.vitals.height),
      },
      diagnosis: {
        primary_diagnosis: form.diagnosis.primary_diagnosis,
        secondary_diagnosis: form.diagnosis.secondary_diagnosis,
        icd_code: form.diagnosis.icd_code,
        severity: form.diagnosis.severity,
        clinical_notes: form.diagnosis.clinical_notes,
      },
      prescriptions: form.prescriptions
        .filter((item) => item.medication_name.trim())
        .map((item) => ({
          id: item.id,
          medication_name: item.medication_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          route: item.route,
          instructions: item.instructions,
          status: item.status,
        })),
      lab_requests: form.lab_requests
        .filter((item) => item.test_name.trim())
        .map((item) => ({
          id: item.id,
          test_name: item.test_name,
          priority: item.priority,
          clinical_notes: item.clinical_notes,
          status: item.status,
        })),
    };
  }

  async function saveVisit() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(visitId ? `/api/clinical/visits/${visitId}` : "/api/clinical/visits", {
        method: visitId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload()),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractError(payload));
      }
      const savedVisit = payload as VisitDetail;
      setVisit(savedVisit);
      setForm(buildFormFromVisit(savedVisit));
      setToast({ message: visitId ? "Visit updated successfully." : "Visit created successfully.", tone: "success" });
      if (!visitId) {
        router.replace(`/patients/${patientId}/visits/${savedVisit.id}`);
      }
    } catch (saveError) {
      setToast({ message: saveError instanceof Error ? saveError.message : "Unable to save visit.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function closeCurrentVisit() {
    if (!visitId) {
      return;
    }
    setClosingVisit(true);
    try {
      const response = await fetch(`/api/clinical/visits/${visitId}/close`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractError(payload));
      }
      const closedVisit = payload as VisitDetail;
      setVisit(closedVisit);
      setForm(buildFormFromVisit(closedVisit));
      setToast({ message: "Visit closed successfully.", tone: "success" });
    } catch (closeError) {
      setToast({ message: closeError instanceof Error ? closeError.message : "Unable to close visit.", tone: "error" });
    } finally {
      setClosingVisit(false);
    }
  }

  async function dispensePrescription(prescriptionId: number) {
    const response = await fetch(`/api/clinical/prescriptions/${prescriptionId}/dispense`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToast({ message: extractError(payload), tone: "error" });
      return;
    }
    if (visitId) {
      const { data } = await apiRequest<VisitDetail>(`/api/clinical/visits/${visitId}`);
      setVisit(data);
      setForm(buildFormFromVisit(data));
    }
    setToast({ message: "Prescription marked as dispensed.", tone: "success" });
  }

  async function uploadLabResult(requestId: number) {
    const currentUpload = uploadStates[requestId];
    if (!currentUpload) {
      return;
    }
    const formData = new FormData();
    formData.set("result_text", currentUpload.result_text);
    formData.set("remarks", currentUpload.remarks);
    if (currentUpload.file) {
      formData.set("attachment", currentUpload.file);
    }

    const response = await fetch(`/api/clinical/lab-requests/${requestId}/result`, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToast({ message: extractError(payload), tone: "error" });
      return;
    }
    if (visitId) {
      const { data } = await apiRequest<VisitDetail>(`/api/clinical/visits/${visitId}`);
      setVisit(data);
      setForm(buildFormFromVisit(data));
    }
    setUploadStates((current) => ({ ...current, [requestId]: { result_text: "", remarks: "", file: null } }));
    setToast({ message: "Lab result uploaded successfully.", tone: "success" });
  }

  if (loading) {
    return <div className="medical-card rounded-[2rem] p-6 text-sm text-slate-600">Loading visit workspace...</div>;
  }

  if (error || !patient) {
    return <div className="rounded-[2rem] bg-red-50 px-5 py-4 text-sm text-red-700">{error ?? "Patient not found."}</div>;
  }

  return (
    <div className="space-y-6">
      {toast && <ToastNotice message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      <section className="medical-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="medical-badge">{patient.health_id}</div>
            <h3 className="mt-4 text-3xl font-semibold text-slate-900">
              {patient.first_name} {patient.last_name}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {visit ? `${visit.visit_id} • ${formatStatusLabel(visit.status)} • ${formatDateTime(visit.visit_date)}` : "New clinical encounter"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/patients/${patientId}`} className="medical-button medical-button-secondary">
              Back to chart
            </Link>
            {canEditEncounter && (
              <button type="button" onClick={saveVisit} disabled={saving} className="medical-button medical-button-primary">
                {saving ? "Saving..." : visitId ? "Save consultation" : "Start consultation"}
              </button>
            )}
            {visitId && canEditEncounter && form.status !== "closed" && (
              <button type="button" onClick={closeCurrentVisit} disabled={closingVisit} className="medical-button medical-button-secondary">
                {closingVisit ? "Finishing..." : "Finish visit"}
              </button>
            )}
          </div>
        </div>

        {user && (
          <div className="mt-5 rounded-[1.4rem] bg-[var(--panel-muted)] px-4 py-3 text-sm text-slate-600">
            Signed in as {formatRoleLabel(user.effective_role)}. Clinical actions are enforced by the backend.
          </div>
        )}
      </section>

      <PatientJourneyGuide activeStep={visitJourneyStep} canStartEncounter={canEditEncounter} compact patientId={patientId} />

      <section className="medical-card rounded-[2rem] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h4 className="text-base font-semibold text-slate-900">Consultation steps</h4>
            <p className="mt-1 text-sm text-slate-600">
              Move through the visit from history taking to orders, then save and finish.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {consultationSteps.map((step) => (
              <a key={step.href} href={step.href} className="medical-button medical-button-ghost">
                {step.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article id="visit-story" className="medical-card scroll-mt-24 rounded-[2rem] p-6">
          <h4 className="text-xl font-semibold text-slate-900">Step 1: Ask what brought the patient in</h4>
          <p className="mt-2 text-sm text-slate-600">
            Capture the patient story first. This is the main consultation note doctors will return to later.
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="medical-label">Visit date and time</label>
              <input
                type="datetime-local"
                className="medical-input"
                value={form.visit_date}
                onChange={(event) => updateField("visit_date", event.target.value)}
                disabled={!canEditEncounter}
              />
            </div>
            <div className="md:col-span-2">
              <label className="medical-label">Main problem today</label>
              <input
                className="medical-input"
                value={form.chief_complaint}
                onChange={(event) => updateField("chief_complaint", event.target.value)}
                disabled={!canEditEncounter}
              />
            </div>
            <div className="md:col-span-2">
              <label className="medical-label">History and symptoms</label>
              <textarea
                className="medical-input min-h-28"
                value={form.symptoms}
                onChange={(event) => updateField("symptoms", event.target.value)}
                disabled={!canEditEncounter}
              />
            </div>
            <div className="md:col-span-2">
              <label className="medical-label">Working diagnosis summary</label>
              <textarea
                className="medical-input min-h-24"
                value={form.diagnosis_summary}
                onChange={(event) => updateField("diagnosis_summary", event.target.value)}
                disabled={!canEditEncounter}
              />
            </div>
            <div className="md:col-span-2">
              <label className="medical-label">Treatment and care plan</label>
              <textarea
                className="medical-input min-h-24"
                value={form.treatment_plan}
                onChange={(event) => updateField("treatment_plan", event.target.value)}
                disabled={!canEditEncounter}
              />
            </div>
            <div>
              <label className="medical-label">Follow-up date</label>
              <input
                type="date"
                className="medical-input"
                value={form.follow_up_date}
                onChange={(event) => updateField("follow_up_date", event.target.value)}
                disabled={!canEditEncounter}
              />
            </div>
            <div>
              <label className="medical-label">Status</label>
              <select
                className="medical-input"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as VisitFormState["status"])}
                disabled={!canEditEncounter}
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </article>

        <article id="visit-vitals" className="medical-card scroll-mt-24 rounded-[2rem] p-6">
          <h4 className="text-xl font-semibold text-slate-900">Step 2: Record vital signs</h4>
          <p className="mt-2 text-sm text-slate-600">
            Vitals can be entered by nurses and reviewed by doctors before diagnosis and treatment.
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {[
              ["temperature", "Temperature (C)"],
              ["blood_pressure", "Blood pressure"],
              ["pulse_rate", "Pulse rate"],
              ["respiratory_rate", "Respiratory rate"],
              ["oxygen_saturation", "Oxygen saturation (%)"],
              ["weight", "Weight (kg)"],
              ["height", "Height (cm)"],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="medical-label">{label}</label>
                <input
                  className="medical-input"
                  value={form.vitals[field as keyof VisitFormState["vitals"]]}
                  onChange={(event) => updateVitals(field as keyof VisitFormState["vitals"], event.target.value)}
                  disabled={!canEditVitals}
                />
              </div>
            ))}
            {visit?.vitals?.bmi !== undefined && visit.vitals?.bmi !== null && (
              <div>
                <label className="medical-label">BMI</label>
                <div className="medical-input bg-slate-50">{visit.vitals.bmi}</div>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article id="visit-diagnosis" className="medical-card scroll-mt-24 rounded-[2rem] p-6">
          <h4 className="text-xl font-semibold text-slate-900">Step 3: Diagnosis</h4>
          <p className="mt-2 text-sm text-slate-600">
            Record the clinical decision clearly enough that another clinician can safely continue care.
          </p>
          <div className="mt-5 grid gap-5">
            <div>
              <label className="medical-label">Primary diagnosis</label>
              <input
                className="medical-input"
                value={form.diagnosis.primary_diagnosis}
                onChange={(event) => updateDiagnosis("primary_diagnosis", event.target.value)}
                disabled={!canEditEncounter}
              />
            </div>
            <div>
              <label className="medical-label">Secondary diagnosis</label>
              <input
                className="medical-input"
                value={form.diagnosis.secondary_diagnosis}
                onChange={(event) => updateDiagnosis("secondary_diagnosis", event.target.value)}
                disabled={!canEditEncounter}
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="medical-label">ICD code</label>
                <input
                  className="medical-input"
                  value={form.diagnosis.icd_code}
                  onChange={(event) => updateDiagnosis("icd_code", event.target.value)}
                  disabled={!canEditEncounter}
                />
              </div>
              <div>
                <label className="medical-label">Severity</label>
                <select
                  className="medical-input"
                  value={form.diagnosis.severity}
                  onChange={(event) => updateDiagnosis("severity", event.target.value)}
                  disabled={!canEditEncounter}
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="medical-label">Clinical notes</label>
              <textarea
                className="medical-input min-h-28"
                value={form.diagnosis.clinical_notes}
                onChange={(event) => updateDiagnosis("clinical_notes", event.target.value)}
                disabled={!canEditEncounter}
              />
            </div>
          </div>
        </article>

        <article id="visit-medicines" className="medical-card scroll-mt-24 rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xl font-semibold text-slate-900">Step 4: Medicines to give</h4>
              <p className="mt-2 text-sm text-slate-600">Add medicines, doses, frequency, route, and instructions.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {visitId && hasSavedPrescriptions && (
                <Link
                  href={`/patients/${patientId}/visits/${visitId}/prescription`}
                  className="medical-button medical-button-primary"
                >
                  Print medicine slip
                </Link>
              )}
              {canEditEncounter && (
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, prescriptions: [...current.prescriptions, emptyPrescription()] }))}
                  className="medical-button medical-button-secondary"
                >
                  Add medicine
                </button>
              )}
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {form.prescriptions.map((prescription, index) => (
              <div key={`${prescription.id ?? "new"}-${index}`} className="rounded-[1.4rem] border border-[var(--border)] p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["medication_name", "Medication name"],
                    ["dosage", "Dosage"],
                    ["frequency", "Frequency"],
                    ["duration", "Duration"],
                    ["route", "Route"],
                  ].map(([field, label]) => (
                    <div key={field}>
                      <label className="medical-label">{label}</label>
                      <input
                        className="medical-input"
                        value={String(prescription[field as keyof Prescription] ?? "")}
                        onChange={(event) => updatePrescription(index, field as keyof Prescription, event.target.value)}
                        disabled={!canEditEncounter}
                      />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <label className="medical-label">Instructions</label>
                    <textarea
                      className="medical-input min-h-24"
                      value={prescription.instructions}
                      onChange={(event) => updatePrescription(index, "instructions", event.target.value)}
                      disabled={!canEditEncounter}
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-600">
                    Status: <span className="font-semibold text-slate-900">{formatStatusLabel(prescription.status)}</span>
                    {prescription.dispensed_at ? ` • Dispensed ${formatDateTime(prescription.dispensed_at)}` : ""}
                  </div>
                  <div className="flex gap-3">
                    {canEditEncounter && form.prescriptions.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            prescriptions: current.prescriptions.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                        className="medical-button medical-button-secondary"
                      >
                        Remove
                      </button>
                    )}
                    {canDispense && prescription.id && prescription.status !== "dispensed" && (
                      <button
                        type="button"
                        onClick={() => dispensePrescription(prescription.id as number)}
                        className="medical-button medical-button-primary"
                      >
                        Mark dispensed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section id="visit-labs" className="medical-card scroll-mt-24 rounded-[2rem] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xl font-semibold text-slate-900">Step 5: Lab tests and results</h4>
            <p className="mt-2 text-sm text-slate-600">
              Request the tests needed for this visit. Lab staff upload results here for the doctor to review.
            </p>
          </div>
          {canEditEncounter && (
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, lab_requests: [...current.lab_requests, emptyLabRequest()] }))}
              className="medical-button medical-button-secondary"
            >
              Request lab test
            </button>
          )}
        </div>

        <div className="mt-5 space-y-4">
          {form.lab_requests.map((labRequest, index) => (
            <div key={`${labRequest.id ?? "new"}-${index}`} className="rounded-[1.4rem] border border-[var(--border)] p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="medical-label">Test name</label>
                  <input
                    className="medical-input"
                    value={labRequest.test_name}
                    onChange={(event) => updateLabRequest(index, "test_name", event.target.value)}
                    disabled={!canEditEncounter}
                  />
                </div>
                <div>
                  <label className="medical-label">Priority</label>
                  <select
                    className="medical-input"
                    value={labRequest.priority}
                    onChange={(event) => updateLabRequest(index, "priority", event.target.value)}
                    disabled={!canEditEncounter}
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="medical-label">Clinical notes</label>
                  <textarea
                    className="medical-input min-h-24"
                    value={labRequest.clinical_notes}
                    onChange={(event) => updateLabRequest(index, "clinical_notes", event.target.value)}
                    disabled={!canEditEncounter}
                  />
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-600">
                Status: <span className="font-semibold text-slate-900">{formatStatusLabel(labRequest.status)}</span>
              </div>

              {labRequest.result && (
                <div className="mt-4 rounded-[1.2rem] bg-[var(--panel-muted)] px-4 py-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Uploaded result</div>
                  <div className="mt-2">{labRequest.result.result_text || labRequest.result.remarks || "Result uploaded."}</div>
                  {labRequest.result.attachment_url && (
                    <a
                      href={labRequest.result.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-[var(--primary-strong)] underline"
                    >
                      Open attachment
                    </a>
                  )}
                </div>
              )}

              {canUploadLab && labRequest.id && (
                <div className="mt-4 rounded-[1.2rem] border border-dashed border-[var(--border)] p-4">
                  <div className="text-sm font-semibold text-slate-900">Upload lab result</div>
                  <div className="mt-3 grid gap-4">
                    <textarea
                      className="medical-input min-h-24"
                      placeholder="Result text"
                      value={uploadStates[labRequest.id]?.result_text ?? ""}
                      onChange={(event) =>
                        setUploadStates((current) => ({
                          ...current,
                          [labRequest.id as number]: {
                            result_text: event.target.value,
                            remarks: current[labRequest.id as number]?.remarks ?? "",
                            file: current[labRequest.id as number]?.file ?? null,
                          },
                        }))
                      }
                    />
                    <textarea
                      className="medical-input min-h-20"
                      placeholder="Remarks"
                      value={uploadStates[labRequest.id]?.remarks ?? ""}
                      onChange={(event) =>
                        setUploadStates((current) => ({
                          ...current,
                          [labRequest.id as number]: {
                            result_text: current[labRequest.id as number]?.result_text ?? "",
                            remarks: event.target.value,
                            file: current[labRequest.id as number]?.file ?? null,
                          },
                        }))
                      }
                    />
                    <input
                      type="file"
                      className="medical-input"
                      accept=".pdf,image/*"
                      onChange={(event) =>
                        setUploadStates((current) => ({
                          ...current,
                          [labRequest.id as number]: {
                            result_text: current[labRequest.id as number]?.result_text ?? "",
                            remarks: current[labRequest.id as number]?.remarks ?? "",
                            file: event.target.files?.[0] ?? null,
                          },
                        }))
                      }
                    />
                    <div>
                      <button
                        type="button"
                        onClick={() => uploadLabResult(labRequest.id as number)}
                        className="medical-button medical-button-primary"
                      >
                        Upload result
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {canEditEncounter && form.lab_requests.length > 1 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        lab_requests: current.lab_requests.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                    className="medical-button medical-button-secondary"
                  >
                    Remove request
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="finish-visit" className="medical-card scroll-mt-24 rounded-[2rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="medical-badge">Step 6</div>
            <h4 className="mt-3 text-xl font-semibold text-slate-900">Finish the visit safely</h4>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              Save the consultation first. When the doctor is done, finish the visit so the chart history is complete
              and the patient can move to pharmacy, lab, billing, admission, or follow-up.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/patients/${patientId}`} className="medical-button medical-button-secondary">
              Back to chart
            </Link>
            {canEditEncounter && (
              <button type="button" onClick={saveVisit} disabled={saving} className="medical-button medical-button-primary">
                {saving ? "Saving..." : "Save consultation"}
              </button>
            )}
            {visitId && canEditEncounter && form.status !== "closed" && (
              <button type="button" onClick={closeCurrentVisit} disabled={closingVisit} className="medical-button medical-button-secondary">
                {closingVisit ? "Finishing..." : "Finish visit"}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
