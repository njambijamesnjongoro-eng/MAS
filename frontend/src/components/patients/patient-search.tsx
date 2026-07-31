"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

import { PatientJourneyGuide } from "@/components/workflow/patient-journey-guide";
import { apiRequest } from "@/lib/client-api";
import { formatDate } from "@/lib/format";
import type { PaginatedResponse, PatientSummary } from "@/types";

function EmptyState({ message }: { message: string }) {
  return <div className="medical-empty-state rounded-2xl px-4 py-5 text-sm">{message}</div>;
}

export function PatientSearch() {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<PatientSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const hasActiveFilters = Boolean(deferredSearch.trim() || gender || bloodGroup);
  const emptyMessage = hasActiveFilters
    ? "No patients matched the current search."
    : "No patients are registered yet. Register the first patient to start the directory.";
  const directoryTitle = hasActiveFilters ? "Search results" : "All registered patients";
  const directoryBadge = data
    ? `${data.count} ${hasActiveFilters ? "matching patient" : "registered patient"}${data.count === 1 ? "" : "s"}`
    : "";

  function clearFilters() {
    setSearch("");
    setGender("");
    setBloodGroup("");
    setPage(1);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPatients() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (deferredSearch.trim()) {
        params.set("search", deferredSearch.trim());
      }
      if (gender) {
        params.set("gender", gender);
      }
      if (bloodGroup) {
        params.set("blood_group", bloodGroup);
      }
      params.set("page", String(page));
      params.set("page_size", "25");

      try {
        const { data: payload } = await apiRequest<PaginatedResponse<PatientSummary>>(
          `/api/patients?${params.toString()}`,
        );
        if (!cancelled) {
          setData(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load patients.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPatients();
    return () => {
      cancelled = true;
    };
  }, [deferredSearch, gender, bloodGroup, page]);

  return (
    <div className="space-y-6">
      <PatientJourneyGuide activeStep={1} compact />

      <section className="medical-card medical-hero rounded-[2rem] p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="medical-badge">Step 1 - Find the patient</div>
            <h3 className="mt-3 text-2xl font-semibold text-medical-primary">Find patient and open chart</h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-medical-secondary">
              When you click Find Patient, the full registered patient list appears first. Type a name, health ID, ID
              number, or phone number only when you need to narrow it down.
            </p>
          </div>

          <Link href="/patients/register" className="medical-button medical-button-primary whitespace-nowrap">
            Register new patient
          </Link>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
          <input
            className="medical-input"
            placeholder="Type patient name, health ID, ID number, or phone"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <select
            className="medical-input"
            value={gender}
            onChange={(event) => {
              setGender(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All genders</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
          <select
            className="medical-input"
            value={bloodGroup}
            onChange={(event) => {
              setBloodGroup(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All blood groups</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"].map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-medical-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>
            {hasActiveFilters
              ? "Showing filtered patients. Clear filters to return to the full registry."
              : "Showing the full patient registry, newest registrations first."}
          </span>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="medical-button medical-button-secondary">
              Show all registered patients
            </button>
          )}
        </div>
      </section>

      {error && <div className="rounded-[2rem] bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}

      <section className="medical-card rounded-[2rem] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-medical-primary">{directoryTitle}</h3>
            <p className="mt-2 text-sm text-medical-secondary">
              Choose the correct patient, then open the chart to review alerts, visits, labs, medicines, and next steps.
            </p>
          </div>
          {data && <div className="medical-badge">{directoryBadge}</div>}
        </div>

        <div className="mt-5 space-y-3 md:hidden">
          {loading ? (
            <EmptyState message="Loading registered patients..." />
          ) : data?.results.length ? (
            data.results.map((patient) => (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="medical-card medical-card-interactive flex flex-col gap-4 rounded-[1.4rem] px-5 py-4"
              >
                <div>
                  <div className="text-lg font-semibold text-medical-primary">{patient.full_name}</div>
                  <div className="mt-1 text-sm text-medical-secondary">
                    {patient.health_id} - {patient.national_id}
                  </div>
                </div>
                <div className="grid gap-2 text-sm text-medical-secondary">
                  <div>{patient.phone_number}</div>
                  <div>{patient.blood_group}</div>
                  <div>{formatDate(patient.created_at)}</div>
                </div>
              </Link>
            ))
          ) : (
            <EmptyState message={emptyMessage} />
          )}
        </div>

        <div className="medical-table-wrap mt-5 hidden md:block">
          <table className="medical-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Identifiers</th>
                <th>Contact</th>
                <th>Blood Group</th>
                <th>Registered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState message="Loading registered patients..." />
                  </td>
                </tr>
              ) : data?.results.length ? (
                data.results.map((patient) => (
                  <tr key={patient.id}>
                    <td>
                      <div className="font-semibold text-medical-primary">{patient.full_name}</div>
                      <div className="mt-1 text-sm text-medical-secondary">{patient.gender}</div>
                    </td>
                    <td>
                      <div className="text-medical-primary">{patient.health_id}</div>
                      <div className="mt-1 text-sm text-medical-secondary">{patient.national_id}</div>
                    </td>
                    <td>{patient.phone_number}</td>
                    <td>{patient.blood_group}</td>
                    <td>{formatDate(patient.created_at)}</td>
                    <td>
                      <Link href={`/patients/${patient.id}`} className="medical-button medical-button-ghost">
                        Open chart
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <EmptyState message={emptyMessage} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data && data.num_pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="medical-button medical-button-secondary"
            >
              Previous
            </button>
            <div className="text-sm text-medical-secondary">
              Page {data.page} of {data.num_pages}
            </div>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(data.num_pages, current + 1))}
              disabled={page >= data.num_pages}
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
