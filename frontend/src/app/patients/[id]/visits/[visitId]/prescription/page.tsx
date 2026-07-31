import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/documents/print-button";
import { createProxyResponse, proxyAuthenticatedRequest } from "@/lib/server-api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";
import type { PatientDetail, VisitDetail } from "@/types";

type PageProps = {
  params: Promise<{ id: string; visitId: string }>;
};

async function loadDocument(patientId: string, visitId: string) {
  const cookieStore = await cookies();
  const [patientResult, visitResult] = await Promise.all([
    proxyAuthenticatedRequest(cookieStore, `/api/patients/${patientId}/`),
    proxyAuthenticatedRequest(cookieStore, `/api/clinical/visits/${visitId}/`),
  ]);
  const patientResponse = await createProxyResponse(patientResult);
  const visitResponse = await createProxyResponse(visitResult);

  if (patientResponse.status !== 200 || visitResponse.status !== 200) {
    return null;
  }

  const patient = patientResponse.payload as PatientDetail;
  const visit = visitResponse.payload as VisitDetail;
  if (visit.patient !== Number(patientId)) {
    return null;
  }

  return { patient, visit };
}

export default async function PrescriptionReceiptPage({ params }: PageProps) {
  const { id, visitId } = await params;
  const documentData = await loadDocument(id, visitId);

  if (!documentData) {
    notFound();
  }

  const { patient, visit } = documentData;
  const prescriptions = visit.prescriptions.filter((item) => item.medication_name.trim());

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:p-0">
      <section className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Hospital EHR</div>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Medicine Prescription Slip</h1>
            <p className="mt-2 text-sm text-slate-600">Use at pharmacy for dispensing prescribed medicines.</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Link href={`/patients/${id}/visits/${visitId}`} className="medical-button medical-button-secondary">
              Back to visit
            </Link>
            <a href={`/api/documents/visits/${visitId}/prescription-pdf`} className="medical-button medical-button-secondary">
              Download PDF
            </a>
            <PrintButton label="Print medicine slip" />
          </div>
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 text-sm sm:grid-cols-2">
          <div>
            <div className="text-slate-500">Patient</div>
            <div className="mt-1 font-semibold">{patient.first_name} {patient.last_name}</div>
          </div>
          <div>
            <div className="text-slate-500">Health ID</div>
            <div className="mt-1 font-semibold">{patient.health_id}</div>
          </div>
          <div>
            <div className="text-slate-500">Visit</div>
            <div className="mt-1 font-semibold">{visit.visit_id}</div>
          </div>
          <div>
            <div className="text-slate-500">Doctor</div>
            <div className="mt-1 font-semibold">{visit.doctor_name}</div>
          </div>
          <div>
            <div className="text-slate-500">Visit date</div>
            <div className="mt-1 font-semibold">{formatDateTime(visit.visit_date)}</div>
          </div>
          <div>
            <div className="text-slate-500">Printed</div>
            <div className="mt-1 font-semibold">{formatDateTime(new Date().toISOString())}</div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Medicine</th>
                <th className="px-4 py-3">Dose</th>
                <th className="px-4 py-3">Frequency</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.length ? (
                prescriptions.map((prescription) => (
                  <tr key={prescription.id ?? prescription.medication_name} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-semibold">{prescription.medication_name}</td>
                    <td className="px-4 py-3">{prescription.dosage}</td>
                    <td className="px-4 py-3">{prescription.frequency}</td>
                    <td className="px-4 py-3">{prescription.duration}</td>
                    <td className="px-4 py-3">{prescription.route}</td>
                    <td className="px-4 py-3">{formatStatusLabel(prescription.status)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-5 text-slate-600" colSpan={6}>No medicines were prescribed for this visit.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-semibold text-slate-950">Instructions</div>
          <div className="mt-2 space-y-2">
            {prescriptions.length ? (
              prescriptions.map((prescription) => (
                <p key={`instructions-${prescription.id ?? prescription.medication_name}`}>
                  <span className="font-semibold">{prescription.medication_name}:</span>{" "}
                  {prescription.instructions || "No special instructions recorded."}
                </p>
              ))
            ) : (
              <p>No pharmacy instructions recorded.</p>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-8 text-sm sm:grid-cols-2">
          <div className="border-t border-slate-300 pt-3">Doctor signature</div>
          <div className="border-t border-slate-300 pt-3">Pharmacy confirmation</div>
        </div>
      </section>
    </main>
  );
}
