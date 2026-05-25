from __future__ import annotations

import csv
import io
from decimal import Decimal

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from clinical.models import Diagnosis, LabRequest, Prescription
from finance.models import Invoice
from operations.models import Admission
from patients.models import Patient


def get_report_rows(report_type: str):
    if report_type == "admissions":
        return [
            ["Patient", "Ward", "Bed", "Status", "Admission Date"],
            *[
                [admission.patient.health_id, admission.ward.ward_name, admission.bed.bed_number, admission.status, admission.admission_date.isoformat()]
                for admission in Admission.objects.select_related("patient", "ward", "bed").order_by("-admission_date")[:200]
            ],
        ]
    if report_type == "revenue":
        return [
            ["Invoice", "Patient", "Total", "Paid", "Balance", "Status"],
            *[
                [invoice.invoice_number, invoice.patient.health_id, str(invoice.total_amount), str(invoice.amount_paid), str(invoice.balance_due), invoice.status]
                for invoice in Invoice.objects.select_related("patient").order_by("-created_at")[:200]
            ],
        ]
    if report_type == "patient_statistics":
        return [
            ["Metric", "Value"],
            ["Total Patients", str(Patient.objects.count())],
            ["Active Admissions", str(Admission.objects.filter(status=Admission.Status.ACTIVE).count())],
        ]
    if report_type == "diagnoses":
        return [
            ["Patient", "Primary Diagnosis", "ICD Code", "Severity", "Created At"],
            *[
                [diagnosis.patient.health_id, diagnosis.primary_diagnosis, diagnosis.icd_code, diagnosis.severity, diagnosis.created_at.isoformat()]
                for diagnosis in Diagnosis.objects.select_related("patient").order_by("-created_at")[:200]
            ],
        ]
    if report_type == "lab_activity":
        return [
            ["Patient", "Test", "Priority", "Status", "Created At"],
            *[
                [request.patient.health_id, request.test_name, request.priority, request.status, request.created_at.isoformat()]
                for request in LabRequest.objects.select_related("patient").order_by("-created_at")[:200]
            ],
        ]
    if report_type == "pharmacy_usage":
        return [
            ["Patient", "Medication", "Status", "Created At"],
            *[
                [prescription.patient.health_id, prescription.medication_name, prescription.status, prescription.created_at.isoformat()]
                for prescription in Prescription.objects.select_related("patient").order_by("-created_at")[:200]
            ],
        ]
    raise ValueError("Unsupported report type.")


def report_summary():
    return {
        "admissions": Admission.objects.count(),
        "active_admissions": Admission.objects.filter(status=Admission.Status.ACTIVE).count(),
        "total_revenue": str(sum((invoice.amount_paid for invoice in Invoice.objects.all()), Decimal("0.00"))),
        "pending_invoices": Invoice.objects.exclude(status=Invoice.Status.PAID).count(),
        "diagnoses": Diagnosis.objects.count(),
        "lab_requests": LabRequest.objects.count(),
        "pharmacy_usage": Prescription.objects.count(),
    }


def build_csv_response_content(report_type: str) -> bytes:
    rows = get_report_rows(report_type)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerows(rows)
    return buffer.getvalue().encode("utf-8")


def build_pdf_response_content(report_type: str) -> bytes:
    rows = get_report_rows(report_type)
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 40
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, f"Hospital EHR Report: {report_type.replace('_', ' ').title()}")
    y -= 30
    pdf.setFont("Helvetica", 9)
    for row in rows:
        pdf.drawString(40, y, " | ".join(str(item)[:30] for item in row))
        y -= 16
        if y < 50:
            pdf.showPage()
            y = height - 40
            pdf.setFont("Helvetica", 9)
    pdf.save()
    return buffer.getvalue()
