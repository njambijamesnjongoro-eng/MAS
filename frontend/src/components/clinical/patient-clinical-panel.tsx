"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/client-api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";
import type { PaginatedResponse, TimelineEntry, VisitSummary } from "@/types";
import { PatientJourneyGuide } from "@/components/workflow/patient-journey-guide";

type PatientClinicalPanelProps = {
  patientId: string;
  canStartEncounter: boolean;
};

export function PatientClinicalPanel({ patientId, canStartEncounter }: PatientClinicalPanelProps) {
  const [visits, setVisits] = useState<VisitSummary[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadClinicalHistory() {
      try {
        const [{ data: visitData }, { data: timelineData }] = await Promise.all([
          apiRequest<PaginatedResponse<VisitSummary>>(`/api/clinical/patients/${patientId}/visits`),
          apiRequest<TimelineEntry[]>(`/api/clinical/patients/${patientId}/timeline`),
        ]);

        if (!cancelled) {
          setVisits(visitData.results);
          setTimeline(timelineData);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load clinical history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadClinicalHistory();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const activeVisit = visits.find((visit) => visit.status === "open" || visit.status === "in_progress");
  const activeJourneyStep = activeVisit ? 3 : 2;

  if (loading) {
    return <div className="medical-card rounded-[2rem] p-6 text-sm text-slate-600">Loading visit history...</div>;
  }

  if (error) {
    return <div className="rounded-[2rem] bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <PatientJourneyGuide
        activeStep={activeJourneyStep}
        canStartEncounter={canStartEncounter}
        compact
        patientId={patientId}
      />

      <section className="medical-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">What to do next for this patient</h3>
            <p className="mt-2 text-sm text-slate-600">
              Start a doctor visit, resume the active visit, or review the full patient history before making decisions.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {activeVisit && (
              <Link href={`/patients/${patientId}/visits/${activeVisit.id}`} className="medical-button medical-button-secondary">
                Continue active visit
              </Link>
            )}
            {canStartEncounter && (
              <Link href={`/patients/${patientId}/visits/new`} className="medical-button medical-button-primary">
                Start doctor visit
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <article className="medical-card rounded-[2rem] p-6">
          <h3 className="text-xl font-semibold text-slate-900">Previous doctor visits</h3>
          <div className="mt-5 space-y-3">
            {visits.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No visits recorded yet.
              </div>
            ) : (
              visits.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/patients/${patientId}/visits/${visit.id}`}
                  className="block rounded-[1.4rem] border border-[var(--border)] bg-white px-4 py-4 transition hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-900">{visit.chief_complaint}</div>
                      <div className="mt-1 text-sm text-slate-600">{visit.visit_id}</div>
                    </div>
                    <div className="medical-badge">{formatStatusLabel(visit.status)}</div>
                  </div>
                  <div className="mt-3 text-sm text-slate-600">
                    {formatDateTime(visit.visit_date)}
                    {visit.diagnosis_summary ? ` • ${visit.diagnosis_summary}` : ""}
                  </div>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="medical-card rounded-[2rem] p-6">
          <h3 className="text-xl font-semibold text-slate-900">Full patient timeline</h3>
          <p className="mt-2 text-sm text-slate-600">
            One timeline for visits, vital signs, diagnoses, medicines, lab requests, and uploaded results.
          </p>
          <div className="mt-5 space-y-3">
            {timeline.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No clinical timeline events yet.
              </div>
            ) : (
              timeline.map((entry, index) => (
                <div key={`${entry.type}-${entry.visit_id ?? "none"}-${index}`} className="rounded-[1.4rem] border border-[var(--border)] bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-900">{entry.title}</div>
                      <div className="mt-1 text-sm text-slate-600">{entry.summary}</div>
                    </div>
                    <div className="medical-badge">{formatStatusLabel(entry.type)}</div>
                  </div>
                  <div className="mt-3 text-sm text-slate-500">
                    {formatDateTime(entry.occurred_at)}
                    {entry.status ? ` • ${formatStatusLabel(entry.status)}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
