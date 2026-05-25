from __future__ import annotations

from django.utils import timezone

from accounts.constants import RoleCode
from common.permissions.roles import get_role_code

from .models import Diagnosis, LabRequest, LabResult, Prescription, Visit, VitalSigns


def timeline_entry(*, entry_type: str, occurred_at, title: str, summary: str, patient_id: int, visit_id: int | None = None, status: str = "", metadata: dict | None = None):
    return {
        "type": entry_type,
        "occurred_at": occurred_at,
        "title": title,
        "summary": summary,
        "patient_id": patient_id,
        "visit_id": visit_id,
        "status": status,
        "metadata": metadata or {},
    }


def build_patient_timeline(patient):
    entries = []

    visits = (
        Visit.objects.filter(patient=patient)
        .select_related("doctor")
        .order_by("-visit_date")
    )
    diagnoses = Diagnosis.objects.filter(patient=patient).select_related("visit", "diagnosed_by")
    prescriptions = Prescription.objects.filter(patient=patient).select_related("visit", "prescribed_by", "dispensed_by")
    lab_requests = LabRequest.objects.filter(patient=patient).select_related("visit", "requested_by", "result")
    lab_results = LabResult.objects.filter(lab_request__patient=patient).select_related("lab_request", "uploaded_by")
    vitals_records = VitalSigns.objects.filter(patient=patient).select_related("visit", "recorded_by")

    for visit in visits:
        entries.append(
            timeline_entry(
                entry_type="visit",
                occurred_at=visit.visit_date,
                title=f"Visit {visit.visit_id}",
                summary=visit.chief_complaint,
                patient_id=patient.id,
                visit_id=visit.id,
                status=visit.status,
                metadata={"doctor": visit.doctor.get_full_name() or visit.doctor.username},
            )
        )

    for vitals in vitals_records:
        summary_parts = []
        if vitals.temperature:
            summary_parts.append(f"Temp {vitals.temperature} C")
        if vitals.systolic_bp and vitals.diastolic_bp:
            summary_parts.append(f"BP {vitals.systolic_bp}/{vitals.diastolic_bp}")
        if vitals.pulse_rate:
            summary_parts.append(f"Pulse {vitals.pulse_rate}")
        entries.append(
            timeline_entry(
                entry_type="vitals",
                occurred_at=vitals.updated_at,
                title="Vitals recorded",
                summary=", ".join(summary_parts) or "Vitals updated",
                patient_id=patient.id,
                visit_id=vitals.visit_id,
                metadata={"recorded_by": getattr(vitals.recorded_by, "username", "")},
            )
        )

    for diagnosis in diagnoses:
        entries.append(
            timeline_entry(
                entry_type="diagnosis",
                occurred_at=diagnosis.updated_at,
                title=diagnosis.primary_diagnosis,
                summary=diagnosis.secondary_diagnosis or diagnosis.clinical_notes[:120],
                patient_id=patient.id,
                visit_id=diagnosis.visit_id,
                status=diagnosis.severity,
                metadata={"icd_code": diagnosis.icd_code},
            )
        )

    for prescription in prescriptions:
        entries.append(
            timeline_entry(
                entry_type="prescription",
                occurred_at=prescription.dispensed_at or prescription.created_at,
                title=prescription.medication_name,
                summary=f"{prescription.dosage} • {prescription.frequency} • {prescription.duration}",
                patient_id=patient.id,
                visit_id=prescription.visit_id,
                status=prescription.status,
                metadata={"route": prescription.route},
            )
        )

    for lab_request in lab_requests:
        entries.append(
            timeline_entry(
                entry_type="lab_request",
                occurred_at=lab_request.created_at,
                title=lab_request.test_name,
                summary=lab_request.clinical_notes[:120] or "Lab test requested",
                patient_id=patient.id,
                visit_id=lab_request.visit_id,
                status=lab_request.status,
                metadata={"priority": lab_request.priority},
            )
        )

    for lab_result in lab_results:
        entries.append(
            timeline_entry(
                entry_type="lab_result",
                occurred_at=lab_result.updated_at,
                title=f"Result: {lab_result.lab_request.test_name}",
                summary=lab_result.result_text[:120] or lab_result.remarks[:120] or "Lab result uploaded",
                patient_id=patient.id,
                visit_id=lab_result.lab_request.visit_id,
                status=lab_result.lab_request.status,
            )
        )

    return sorted(entries, key=lambda item: item["occurred_at"], reverse=True)


def build_clinical_dashboard_summary(user):
    role = get_role_code(user)
    today = timezone.localdate()

    summary = {
        "role": role,
        "today_visits_count": 0,
        "today_visits": [],
        "pending_lab_results_count": 0,
        "pending_lab_requests": [],
        "open_visits_count": 0,
    }

    if role == RoleCode.PATIENT:
        patient = getattr(user, "patient_record", None)
        if patient:
            summary["today_visits_count"] = Visit.objects.filter(patient=patient, visit_date__date=today).count()
            summary["open_visits_count"] = Visit.objects.filter(patient=patient, status__in=[Visit.Status.OPEN, Visit.Status.IN_PROGRESS]).count()
        return summary

    visit_queryset = Visit.objects.select_related("patient", "doctor")
    pending_lab_queryset = LabRequest.objects.select_related("patient", "visit")

    if role == RoleCode.DOCTOR:
        visit_queryset = visit_queryset.filter(doctor=user)
        pending_lab_queryset = pending_lab_queryset.filter(requested_by=user)

    today_visits = visit_queryset.filter(visit_date__date=today).order_by("visit_date")[:6]
    pending_labs = pending_lab_queryset.exclude(status=LabRequest.Status.COMPLETED).order_by("-created_at")[:6]

    summary["today_visits_count"] = visit_queryset.filter(visit_date__date=today).count()
    summary["open_visits_count"] = visit_queryset.filter(status__in=[Visit.Status.OPEN, Visit.Status.IN_PROGRESS]).count()
    summary["pending_lab_results_count"] = pending_lab_queryset.exclude(status=LabRequest.Status.COMPLETED).count()
    summary["today_visits"] = today_visits
    summary["pending_lab_requests"] = pending_labs
    return summary
