from __future__ import annotations

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class Ward(models.Model):
    class WardType(models.TextChoices):
        GENERAL = "general", "General"
        ICU = "icu", "ICU"
        MATERNITY = "maternity", "Maternity"
        PEDIATRIC = "pediatric", "Pediatric"
        SURGICAL = "surgical", "Surgical"
        ISOLATION = "isolation", "Isolation"

    ward_name = models.CharField(max_length=120, unique=True)
    ward_type = models.CharField(max_length=40, choices=WardType.choices, db_index=True)
    capacity = models.PositiveIntegerField()
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["ward_name"]

    def __str__(self) -> str:
        return self.ward_name


class Bed(models.Model):
    class OccupancyStatus(models.TextChoices):
        AVAILABLE = "available", "Available"
        OCCUPIED = "occupied", "Occupied"
        MAINTENANCE = "maintenance", "Maintenance"

    bed_number = models.CharField(max_length=40)
    ward = models.ForeignKey(Ward, related_name="beds", on_delete=models.CASCADE)
    occupancy_status = models.CharField(
        max_length=20,
        choices=OccupancyStatus.choices,
        default=OccupancyStatus.AVAILABLE,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["ward__ward_name", "bed_number"]
        constraints = [
            models.UniqueConstraint(fields=["ward", "bed_number"], name="unique_bed_per_ward"),
        ]
        indexes = [
            models.Index(fields=["ward", "occupancy_status"]),
        ]

    def __str__(self) -> str:
        return f"{self.ward.ward_name} - {self.bed_number}"


class Admission(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DISCHARGED = "discharged", "Discharged"

    patient = models.ForeignKey("patients.Patient", related_name="admissions", on_delete=models.CASCADE)
    admitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="admissions_recorded",
        on_delete=models.PROTECT,
    )
    ward = models.ForeignKey(Ward, related_name="admissions", on_delete=models.PROTECT)
    bed = models.ForeignKey(Bed, related_name="admissions", on_delete=models.PROTECT)
    admission_reason = models.TextField()
    admission_date = models.DateTimeField(default=timezone.now, db_index=True)
    discharge_date = models.DateTimeField(null=True, blank=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-admission_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["patient"],
                condition=Q(status="active"),
                name="unique_active_admission_per_patient",
            ),
            models.UniqueConstraint(
                fields=["bed"],
                condition=Q(status="active"),
                name="unique_active_bed_assignment",
            ),
        ]
        indexes = [
            models.Index(fields=["ward", "status"]),
            models.Index(fields=["bed", "status"]),
            models.Index(fields=["patient", "admission_date"]),
        ]

    def __str__(self) -> str:
        return f"Admission for {self.patient.health_id}"
