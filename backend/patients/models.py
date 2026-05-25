from __future__ import annotations

from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models

from common.utils.security import generate_health_id, generate_qr_identifier


class Patient(models.Model):
    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"
        PREFER_NOT_TO_SAY = "prefer_not_to_say", "Prefer not to say"

    class BloodGroup(models.TextChoices):
        A_POSITIVE = "A+", "A+"
        A_NEGATIVE = "A-", "A-"
        B_POSITIVE = "B+", "B+"
        B_NEGATIVE = "B-", "B-"
        AB_POSITIVE = "AB+", "AB+"
        AB_NEGATIVE = "AB-", "AB-"
        O_POSITIVE = "O+", "O+"
        O_NEGATIVE = "O-", "O-"
        UNKNOWN = "unknown", "Unknown"

    phone_validator = RegexValidator(regex=r"^\+?[0-9]{7,15}$", message="Enter a valid phone number.")
    national_id_validator = RegexValidator(
        regex=r"^[A-Za-z0-9\-]{5,32}$",
        message="National ID must be 5-32 letters, numbers, or dashes.",
    )

    linked_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name="patient_record",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    health_id = models.CharField(max_length=32, unique=True, db_index=True, editable=False)
    qr_identifier = models.CharField(max_length=64, unique=True, editable=False)
    first_name = models.CharField(max_length=120, db_index=True)
    last_name = models.CharField(max_length=120, db_index=True)
    national_id = models.CharField(max_length=32, unique=True, validators=[national_id_validator], db_index=True)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=20, choices=Gender.choices)
    phone_number = models.CharField(max_length=20, validators=[phone_validator], db_index=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255)
    emergency_contact = models.CharField(max_length=255)
    blood_group = models.CharField(max_length=10, choices=BloodGroup.choices, default=BloodGroup.UNKNOWN)
    allergies = models.TextField(blank=True)
    chronic_conditions = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="patients_created",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="patients_updated",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["last_name", "first_name"]),
            models.Index(fields=["health_id"]),
            models.Index(fields=["national_id"]),
            models.Index(fields=["phone_number"]),
            models.Index(fields=["created_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self.health_id:
            self.health_id = generate_health_id()
        if not self.qr_identifier:
            self.qr_identifier = generate_qr_identifier()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.health_id} - {self.first_name} {self.last_name}"


class PatientHistory(models.Model):
    patient = models.OneToOneField(Patient, related_name="history", on_delete=models.CASCADE)
    summary = models.TextField(blank=True)
    past_medical_history = models.TextField(blank=True)
    surgical_history = models.TextField(blank=True)
    family_history = models.TextField(blank=True)
    social_history = models.TextField(blank=True)
    current_medications = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="patient_histories_created",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="patient_histories_updated",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"History for {self.patient.health_id}"
