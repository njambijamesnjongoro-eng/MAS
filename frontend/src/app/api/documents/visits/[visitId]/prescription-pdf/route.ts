import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { formatDateTime, formatStatusLabel } from "@/lib/format";
import { createReceiptPdf, pdfResponse } from "@/lib/pdf-receipt";
import { createProxyResponse, proxyAuthenticatedRequest } from "@/lib/server-api";
import type { PatientDetail, VisitDetail } from "@/types";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ visitId: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { visitId } = await context.params;
  const cookieStore = await cookies();
  const visitResult = await proxyAuthenticatedRequest(cookieStore, `/api/clinical/visits/${visitId}/`);
  const visitResponse = await createProxyResponse(visitResult);

  if (visitResponse.status !== 200) {
    return NextResponse.json(visitResponse.payload, { status: visitResponse.status });
  }

  const visit = visitResponse.payload as VisitDetail;
  const patientResult = await proxyAuthenticatedRequest(cookieStore, `/api/patients/${visit.patient}/`);
  const patientResponse = await createProxyResponse(patientResult);

  if (patientResponse.status !== 200) {
    return NextResponse.json(patientResponse.payload, { status: patientResponse.status });
  }

  const patient = patientResponse.payload as PatientDetail;
  const prescriptions = visit.prescriptions.filter((item) => item.medication_name.trim());
  const buffer = createReceiptPdf({
    title: "Medicine Prescription Slip",
    subtitle: "Use at pharmacy for dispensing prescribed medicines.",
    meta: [
      ["Patient", `${patient.first_name} ${patient.last_name}`],
      ["Health ID", patient.health_id],
      ["Visit", visit.visit_id],
      ["Doctor", visit.doctor_name],
      ["Visit date", formatDateTime(visit.visit_date)],
      ["Generated", formatDateTime(new Date().toISOString())],
    ],
    tables: [
      {
        title: "Prescribed medicines",
        table: {
          headers: ["Medicine", "Dose", "Frequency", "Duration", "Route", "Status"],
          widths: [122, 70, 84, 78, 70, 72],
          rows: prescriptions.length
            ? prescriptions.map((item) => [
                item.medication_name,
                item.dosage,
                item.frequency,
                item.duration,
                item.route,
                formatStatusLabel(item.status),
              ])
            : [["No medicines prescribed", "", "", "", "", ""]],
        },
      },
    ],
    sections: [
      {
        title: "Instructions",
        lines: prescriptions.length
          ? prescriptions.map((item) => `${item.medication_name}: ${item.instructions || "No special instructions recorded."}`)
          : ["No pharmacy instructions recorded."],
      },
    ],
    signatures: ["Doctor signature", "Pharmacy confirmation"],
  });

  return pdfResponse(buffer, `prescription-${visit.visit_id}.pdf`);
}
