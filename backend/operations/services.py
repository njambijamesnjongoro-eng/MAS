from __future__ import annotations

from decimal import Decimal

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from clinical.models import LabRequest
from finance.models import Invoice
from messaging.tasks import send_internal_notification_task

from .models import Admission, Bed


def set_bed_status(bed: Bed, status: str):
    if bed.occupancy_status != status:
        bed.occupancy_status = status
        bed.save(update_fields=["occupancy_status", "updated_at"])


@transaction.atomic
def transfer_admission(admission: Admission, new_ward, new_bed):
    if admission.status != Admission.Status.ACTIVE:
        raise ValueError("Only active admissions can be transferred.")
    if new_bed.occupancy_status != Bed.OccupancyStatus.AVAILABLE:
        raise ValueError("Selected bed is not available.")

    old_bed = admission.bed
    admission.ward = new_ward
    admission.bed = new_bed
    admission.save(update_fields=["ward", "bed", "updated_at"])

    set_bed_status(old_bed, Bed.OccupancyStatus.AVAILABLE)
    set_bed_status(new_bed, Bed.OccupancyStatus.OCCUPIED)
    cache.delete("operations_dashboard_summary")
    return admission


@transaction.atomic
def discharge_admission(admission: Admission):
    if admission.status != Admission.Status.ACTIVE:
        raise ValueError("Admission is already closed.")
    admission.status = Admission.Status.DISCHARGED
    admission.discharge_date = timezone.now()
    admission.save(update_fields=["status", "discharge_date", "updated_at"])
    set_bed_status(admission.bed, Bed.OccupancyStatus.AVAILABLE)
    cache.delete("operations_dashboard_summary")
    return admission


def build_operations_dashboard_summary():
    cache_key = "operations_dashboard_summary"
    cached = cache.get(cache_key)
    if cached:
        return cached

    active_admissions = Admission.objects.filter(status=Admission.Status.ACTIVE)
    occupied_beds = Bed.objects.filter(occupancy_status=Bed.OccupancyStatus.OCCUPIED)
    pending_invoices = Invoice.objects.exclude(status=Invoice.Status.PAID)
    today = timezone.localdate()
    today_payments = Invoice.objects.filter(updated_at__date=today, status=Invoice.Status.PAID)
    recent_lab_activity = LabRequest.objects.select_related("patient").order_by("-updated_at")[:5]

    summary = {
        "active_admissions_count": active_admissions.count(),
        "occupied_beds_count": occupied_beds.count(),
        "available_beds_count": Bed.objects.filter(occupancy_status=Bed.OccupancyStatus.AVAILABLE).count(),
        "pending_invoices_count": pending_invoices.count(),
        "revenue_collected_today": str(sum((invoice.amount_paid for invoice in today_payments), Decimal("0.00"))),
        "active_admissions": list(active_admissions.select_related("patient", "ward", "bed")[:5]),
        "recent_lab_activity": list(recent_lab_activity),
    }
    cache.set(cache_key, summary, 60)
    return summary


def create_notification(recipient, title: str, message: str, module: str = "operations", patient=None):
    send_internal_notification_task.delay(
        recipient_id=recipient.id,
        title=title,
        message=message,
        module=module,
        patient_id=getattr(patient, "id", None),
    )
