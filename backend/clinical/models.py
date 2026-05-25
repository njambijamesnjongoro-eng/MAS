from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from common.utils.security import generate_visit_id


def lab_result_attachment_path(instance, filename: str) -> str:
    return f"lab-results/{instance.lab_request.patient.health_id}/{timezone.now():%Y/%m/%d}/{filename}"


class Visit(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        CLOSED = "closed", "Closed"

    visit_id = models.CharField(max_length=40, unique=True, db_index=True, editable=False)
    patient = models.ForeignKey("patients.Patient", related_name="visits", on_delete=models.CASCADE)
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="visits_as_doctor",
        on_delete=models.PROTECT,
    )
    visit_date = models.DateTimeField(default=timezone.now, db_index=True)
    chief_complaint = models.CharField(max_length=255)
    symptoms = models.TextField(blank=True)
    diagnosis_summary = models.TextField(blank=True)
    treatment_plan = models.TextField(blank=True)
    follow_up_date = models.DateField(null=True, blank=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="clinical_visits_created",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="clinical_visits_updated",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-visit_date", "-created_at"]
        indexes = [
            models.Index(fields=["patient", "visit_date"]),
            models.Index(fields=["doctor", "visit_date"]),
            models.Index(fields=["status", "visit_date"]),
        ]

    def save(self, *args, **kwargs):
        if not self.visit_id:
            self.visit_id = generate_visit_id()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.visit_id


class VitalSigns(models.Model):
    patient = models.ForeignKey("patients.Patient", related_name="vitals_records", on_delete=models.CASCADE)
    visit = models.OneToOneField(Visit, related_name="vitals", on_delete=models.CASCADE)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="vitals_recorded",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    temperature = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("30.0")), MaxValueValidator(Decimal("45.0"))],
    )
    systolic_bp = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(40), MaxValueValidator(300)],
    )
    diastolic_bp = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(20), MaxValueValidator(200)],
    )
    pulse_rate = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(20), MaxValueValidator(250)],
    )
    respiratory_rate = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(5), MaxValueValidator(80)],
    )
    oxygen_saturation = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.0")), MaxValueValidator(Decimal("100.0"))],
    )
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.5")), MaxValueValidator(Decimal("500.0"))],
    )
    height = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("20.0")), MaxValueValidator(Decimal("250.0"))],
    )
    bmi = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["patient", "updated_at"]),
        ]

    def save(self, *args, **kwargs):
        if self.weight and self.height:
            height_in_meters = self.height / Decimal("100")
            if height_in_meters > 0:
                self.bmi = self.weight / (height_in_meters * height_in_meters)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"Vitals for {self.visit.visit_id}"


class Diagnosis(models.Model):
    class Severity(models.TextChoices):
        MILD = "mild", "Mild"
        MODERATE = "moderate", "Moderate"
        SEVERE = "severe", "Severe"
        CRITICAL = "critical", "Critical"

    patient = models.ForeignKey("patients.Patient", related_name="diagnoses", on_delete=models.CASCADE)
    visit = models.OneToOneField(Visit, related_name="diagnosis", on_delete=models.CASCADE)
    diagnosed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="diagnoses_made",
        on_delete=models.PROTECT,
    )
    primary_diagnosis = models.CharField(max_length=255, db_index=True)
    secondary_diagnosis = models.CharField(max_length=255, blank=True, db_index=True)
    icd_code = models.CharField(max_length=32, blank=True, db_index=True)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MODERATE)
    clinical_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "created_at"]),
            models.Index(fields=["severity", "created_at"]),
            models.Index(fields=["icd_code", "created_at"]),
        ]

    def __str__(self) -> str:
        return self.primary_diagnosis


class Prescription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DISPENSED = "dispensed", "Dispensed"
        CANCELLED = "cancelled", "Cancelled"

    patient = models.ForeignKey("patients.Patient", related_name="prescriptions", on_delete=models.CASCADE)
    visit = models.ForeignKey(Visit, related_name="prescriptions", on_delete=models.CASCADE)
    prescribed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="prescriptions_written",
        on_delete=models.PROTECT,
    )
    medication_name = models.CharField(max_length=255, db_index=True)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    route = models.CharField(max_length=100)
    instructions = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    dispensed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="prescriptions_dispensed",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    dispensed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "created_at"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["medication_name", "created_at"]),
        ]

    def __str__(self) -> str:
        return self.medication_name


class LabRequest(models.Model):
    class Priority(models.TextChoices):
        ROUTINE = "routine", "Routine"
        URGENT = "urgent", "Urgent"
        STAT = "stat", "STAT"

    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    patient = models.ForeignKey("patients.Patient", related_name="lab_requests", on_delete=models.CASCADE)
    visit = models.ForeignKey(Visit, related_name="lab_requests", on_delete=models.CASCADE)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="lab_requests_created",
        on_delete=models.PROTECT,
    )
    test_name = models.CharField(max_length=255, db_index=True)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.ROUTINE, db_index=True)
    clinical_notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "created_at"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["priority", "created_at"]),
        ]

    def __str__(self) -> str:
        return self.test_name


class LabResult(models.Model):
    lab_request = models.OneToOneField(LabRequest, related_name="result", on_delete=models.CASCADE)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="lab_results_uploaded",
        on_delete=models.PROTECT,
    )
    result_text = models.TextField(blank=True)
    remarks = models.TextField(blank=True)
    attachment = models.FileField(upload_to=lab_result_attachment_path, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def patient(self):
        return self.lab_request.patient

    def __str__(self) -> str:
        return f"Result for {self.lab_request.test_name}"
