"use client";

import { useState } from "react";

import type { PatientDetail } from "@/types";

type PatientFormProps = {
  endpoint: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  successMessage: string;
  initialPatient?: PatientDetail | null;
  onSuccess?: (patient: PatientDetail) => void;
};

type PatientFormState = {
  first_name: string;
  last_name: string;
  national_id: string;
  date_of_birth: string;
  gender: string;
  phone_number: string;
  email: string;
  address: string;
  emergency_contact: string;
  blood_group: string;
  allergies: string;
  chronic_conditions: string;
  history: {
    summary: string;
    past_medical_history: string;
    current_medications: string;
    notes: string;
  };
};

const defaultState: PatientFormState = {
  first_name: "",
  last_name: "",
  national_id: "",
  date_of_birth: "",
  gender: "female",
  phone_number: "",
  email: "",
  address: "",
  emergency_contact: "",
  blood_group: "unknown",
  allergies: "",
  chronic_conditions: "",
  history: {
    summary: "",
    past_medical_history: "",
    current_medications: "",
    notes: "",
  },
};

function buildState(patient?: PatientDetail | null): PatientFormState {
  if (!patient) {
    return defaultState;
  }

  return {
    first_name: patient.first_name,
    last_name: patient.last_name,
    national_id: patient.national_id,
    date_of_birth: patient.date_of_birth,
    gender: patient.gender,
    phone_number: patient.phone_number,
    email: patient.email ?? "",
    address: patient.address,
    emergency_contact: patient.emergency_contact,
    blood_group: patient.blood_group,
    allergies: patient.allergies ?? "",
    chronic_conditions: patient.chronic_conditions ?? "",
    history: {
      summary: patient.history?.summary ?? "",
      past_medical_history: patient.history?.past_medical_history ?? "",
      current_medications: patient.history?.current_medications ?? "",
      notes: patient.history?.notes ?? "",
    },
  };
}

function extractError(payload: unknown) {
  if (typeof payload === "object" && payload !== null) {
    const values = Object.values(payload as Record<string, unknown>);
    const first = values[0];
    if (Array.isArray(first) && first[0]) {
      return String(first[0]);
    }
    if (typeof first === "string") {
      return first;
    }
    if ("detail" in payload) {
      return String((payload as { detail: string }).detail);
    }
  }
  return "Unable to save patient data.";
}

export function PatientForm({
  endpoint,
  method,
  submitLabel,
  successMessage,
  initialPatient,
  onSuccess,
}: PatientFormProps) {
  const [form, setForm] = useState<PatientFormState>(buildState(initialPatient));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateField<K extends keyof PatientFormState>(field: K, value: PatientFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateHistoryField(field: keyof PatientFormState["history"], value: string) {
    setForm((current) => ({
      ...current,
      history: {
        ...current.history,
        [field]: value,
      },
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(extractError(payload));
      setLoading(false);
      return;
    }

    setSuccess(successMessage);
    if (onSuccess) {
      onSuccess(payload as PatientDetail);
    }
    if (method === "POST") {
      setForm(defaultState);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="medical-card rounded-[2rem] p-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="medical-label">First name</label>
          <input
            className="medical-input"
            value={form.first_name}
            onChange={(event) => updateField("first_name", event.target.value)}
            required
          />
        </div>
        <div>
          <label className="medical-label">Last name</label>
          <input
            className="medical-input"
            value={form.last_name}
            onChange={(event) => updateField("last_name", event.target.value)}
            required
          />
        </div>
        <div>
          <label className="medical-label">National ID</label>
          <input
            className="medical-input"
            value={form.national_id}
            onChange={(event) => updateField("national_id", event.target.value)}
            required
          />
        </div>
        <div>
          <label className="medical-label">Date of birth</label>
          <input
            type="date"
            className="medical-input"
            value={form.date_of_birth}
            onChange={(event) => updateField("date_of_birth", event.target.value)}
            required
          />
        </div>
        <div>
          <label className="medical-label">Gender</label>
          <select
            className="medical-input"
            value={form.gender}
            onChange={(event) => updateField("gender", event.target.value)}
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
        <div>
          <label className="medical-label">Blood group</label>
          <select
            className="medical-input"
            value={form.blood_group}
            onChange={(event) => updateField("blood_group", event.target.value)}
          >
            {["unknown", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="medical-label">Phone number</label>
          <input
            className="medical-input"
            value={form.phone_number}
            onChange={(event) => updateField("phone_number", event.target.value)}
            required
          />
        </div>
        <div>
          <label className="medical-label">Email</label>
          <input
            type="email"
            className="medical-input"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="medical-label">Address</label>
          <input
            className="medical-input"
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="medical-label">Emergency contact</label>
          <input
            className="medical-input"
            value={form.emergency_contact}
            onChange={(event) => updateField("emergency_contact", event.target.value)}
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="medical-label">Allergies</label>
          <textarea
            className="medical-input min-h-24"
            value={form.allergies}
            onChange={(event) => updateField("allergies", event.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="medical-label">Chronic conditions</label>
          <textarea
            className="medical-input min-h-24"
            value={form.chronic_conditions}
            onChange={(event) => updateField("chronic_conditions", event.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="medical-label">Medical history summary</label>
          <textarea
            className="medical-input min-h-28"
            value={form.history.summary}
            onChange={(event) => updateHistoryField("summary", event.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="medical-label">Past medical history</label>
          <textarea
            className="medical-input min-h-28"
            value={form.history.past_medical_history}
            onChange={(event) => updateHistoryField("past_medical_history", event.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="medical-label">Current medications</label>
          <textarea
            className="medical-input min-h-24"
            value={form.history.current_medications}
            onChange={(event) => updateHistoryField("current_medications", event.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="medical-label">Clinical notes</label>
          <textarea
            className="medical-input min-h-28"
            value={form.history.notes}
            onChange={(event) => updateHistoryField("notes", event.target.value)}
          />
        </div>
      </div>

      {error && <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <div className="mt-6 flex justify-end">
        <button type="submit" disabled={loading} className="medical-button medical-button-primary">
          {loading ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
