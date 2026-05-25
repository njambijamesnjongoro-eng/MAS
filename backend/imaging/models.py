from __future__ import annotations

from django.conf import settings
from django.db import models

from common.utils.files import validate_imaging_file


def imaging_attachment_path(instance, filename: str) -> str:
    return f"imaging/{instance.imaging_request.patient.health_id}/{instance.imaging_request.imaging_type}/{filename}"


class ImagingRequest(models.Model):
    class ImagingType(models.TextChoices):
        XRAY = "xray", "X-Ray"
        MRI = "mri", "MRI"
        CT_SCAN = "ct_scan", "CT Scan"
        ULTRASOUND = "ultrasound", "Ultrasound"

    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        SCHEDULED = "scheduled", "Scheduled"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    patient = models.ForeignKey("patients.Patient", related_name="imaging_requests", on_delete=models.CASCADE)
    visit = models.ForeignKey("clinical.Visit", related_name="imaging_requests", on_delete=models.SET_NULL, null=True, blank=True)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="imaging_requests_created",
        on_delete=models.PROTECT,
    )
    imaging_type = models.CharField(max_length=30, choices=ImagingType.choices, db_index=True)
    clinical_notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "created_at"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_imaging_type_display()} for {self.patient.health_id}"


class ImagingResult(models.Model):
    imaging_request = models.OneToOneField(ImagingRequest, related_name="result", on_delete=models.CASCADE)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="imaging_results_uploaded",
        on_delete=models.PROTECT,
    )
    radiologist_report = models.TextField(blank=True)
    remarks = models.TextField(blank=True)
    attachment = models.FileField(
        upload_to=imaging_attachment_path,
        validators=[validate_imaging_file],
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def patient(self):
        return self.imaging_request.patient

    def __str__(self) -> str:
        return f"Imaging result for {self.imaging_request_id}"
