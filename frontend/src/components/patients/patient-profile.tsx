"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client-api";
import { formatDate, formatRoleLabel } from "@/lib/format";
import type { AuthUser, PatientDetail } from "@/types";

import { PatientClinicalPanel } from "@/components/clinical/patient-clinical-panel";

import { PatientForm } from "./patient-form";

export function PatientProfile({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [{ data: patientData }, { data: userData }] = await Promise.all([
          apiRequest<PatientDetail>(`/api/patients/${patientId}`),
          apiRequest<AuthUser>("/api/auth/me"),
        ]);
        if (!cancelled) {
          setPatient(patientData);
          setUser(userData);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load patient profile.");
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
  }, [patientId]);

  const canEditProfile = useMemo(() => {
    return user ? !["patient", "lab_technician", "pharmacist"].includes(user.effective_role) : false;
  }, [user]);

  const canStartEncounter = useMemo(() => {
    return user ? ["doctor", "hospital_admin", "super_admin"].includes(user.effective_role) : false;
  }, [user]);

  if (loading) {
    return <div className="medical-card rounded-[2rem] p-6 text-sm text-slate-600">Loading patient profile...</div>;
  }

  if (error) {
    return <div className="rounded-[2rem] bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>;
  }

  if (!patient) {
    return null;
  }

  if (editing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold text-slate-900">Edit patient profile</h3>
          <button type="button" onClick={() => setEditing(false)} className="medical-button medical-button-secondary">
            Cancel
          </button>
        </div>
        <PatientForm
          endpoint={`/api/patients/${patient.id}`}
          method="PATCH"
          submitLabel="Save changes"
          successMessage="Patient profile updated."
          initialPatient={patient}
          onSuccess={(updatedPatient) => {
            setPatient(updatedPatient);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="medical-card rounded-[2rem] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="medical-badge">{patient.health_id}</div>
              <h3 className="mt-4 text-3xl font-semibold text-slate-900">
                {patient.first_name} {patient.last_name}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Registered on {formatDate(patient.created_at)} • Updated {formatDate(patient.updated_at)}
              </p>
            </div>
            {canEditProfile && (
              <button type="button" onClick={() => setEditing(true)} className="medical-button medical-button-primary">
                Edit profile
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.4rem] bg-[var(--panel-muted)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">National ID</div>
              <div className="mt-2 font-semibold text-slate-900">{patient.national_id}</div>
            </div>
            <div className="rounded-[1.4rem] bg-[var(--panel-muted)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Gender / DOB</div>
              <div className="mt-2 font-semibold text-slate-900">
                {patient.gender} • {formatDate(patient.date_of_birth)}
              </div>
            </div>
            <div className="rounded-[1.4rem] bg-[var(--panel-muted)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Phone / Email</div>
              <div className="mt-2 font-semibold text-slate-900">
                {patient.phone_number}
                <div className="mt-1 text-sm font-normal text-slate-600">{patient.email || "No email provided"}</div>
              </div>
            </div>
            <div className="rounded-[1.4rem] bg-[var(--panel-muted)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Blood group</div>
              <div className="mt-2 font-semibold text-slate-900">{patient.blood_group}</div>
            </div>
            <div className="rounded-[1.4rem] bg-[var(--panel-muted)] p-4 md:col-span-2">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Address</div>
              <div className="mt-2 font-semibold text-slate-900">{patient.address}</div>
            </div>
            <div className="rounded-[1.4rem] bg-[var(--panel-muted)] p-4 md:col-span-2">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Emergency contact</div>
              <div className="mt-2 font-semibold text-slate-900">{patient.emergency_contact}</div>
            </div>
          </div>
        </article>

        <article className="medical-card rounded-[2rem] p-6">
          <h3 className="text-xl font-semibold text-slate-900">Patient identifier</h3>
          <p className="mt-2 text-sm text-slate-600">
            QR code supports fast bedside and front-desk identification for later workflow phases.
          </p>
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-white p-4">
            <Image
              src={patient.qr_code_data_url}
              alt="Patient QR code"
              width={192}
              height={192}
              unoptimized
              className="mx-auto rounded-xl"
            />
          </div>
          {user && (
            <div className="mt-4 rounded-[1.3rem] bg-[var(--panel-muted)] px-4 py-3 text-sm text-slate-600">
              Viewing as {formatRoleLabel(user.effective_role)}.
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="medical-card rounded-[2rem] p-6">
          <h3 className="text-xl font-semibold text-slate-900">Alerts and conditions</h3>
          <div className="mt-5 space-y-4">
            <div>
              <div className="text-sm font-semibold text-slate-700">Allergies</div>
              <p className="mt-2 text-sm leading-7 text-slate-600">{patient.allergies || "No allergies recorded."}</p>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-700">Chronic conditions</div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {patient.chronic_conditions || "No chronic conditions recorded."}
              </p>
            </div>
          </div>
        </article>

        <article className="medical-card rounded-[2rem] p-6">
          <h3 className="text-xl font-semibold text-slate-900">Medical history foundation</h3>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
            <div>
              <div className="font-semibold text-slate-700">Summary</div>
              <p>{patient.history?.summary || "No summary recorded."}</p>
            </div>
            <div>
              <div className="font-semibold text-slate-700">Past medical history</div>
              <p>{patient.history?.past_medical_history || "No past medical history recorded."}</p>
            </div>
            <div>
              <div className="font-semibold text-slate-700">Current medications</div>
              <p>{patient.history?.current_medications || "No current medications recorded."}</p>
            </div>
            <div>
              <div className="font-semibold text-slate-700">Notes</div>
              <p>{patient.history?.notes || "No clinical notes recorded."}</p>
            </div>
          </div>
        </article>
      </section>

      <PatientClinicalPanel patientId={patientId} canStartEncounter={canStartEncounter} />
    </div>
  );
}
