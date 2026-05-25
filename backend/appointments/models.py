from __future__ import annotations

from datetime import datetime

from django.conf import settings
from django.core.validators import EmailValidator
from django.db import models
from django.utils import timezone

from patients.models import Patient


class PatientCommunicationPreference(models.Model):
    patient = models.OneToOneField(Patient, related_name="communication_preference", on_delete=models.CASCADE)
    sms_enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=True)
    phone_number = models.CharField(max_length=20, blank=True, validators=[Patient.phone_validator])
    email = models.EmailField(blank=True, validators=[EmailValidator()])
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="communication_preferences_updated",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        ordering = ["patient__last_name", "patient__first_name"]

    def __str__(self) -> str:
        return f"Communication preferences for {self.patient.health_id}"

    @property
    def effective_phone_number(self) -> str:
        return self.phone_number or self.patient.phone_number

    @property
    def effective_email(self) -> str:
        return self.email or self.patient.email


class Appointment(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        CONFIRMED = "confirmed", "Confirmed"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        NO_SHOW = "no_show", "No Show"

    class ReminderStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped"
        RETRYING = "retrying", "Retrying"

    patient = models.ForeignKey(Patient, related_name="appointments", on_delete=models.CASCADE)
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="appointments", on_delete=models.PROTECT)
    appointment_date = models.DateField(db_index=True)
    appointment_time = models.TimeField(db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    reason = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    reminder_sent = models.BooleanField(default=False, db_index=True)
    sms_status = models.CharField(max_length=20, choices=ReminderStatus.choices, default=ReminderStatus.PENDING, db_index=True)
    email_status = models.CharField(max_length=20, choices=ReminderStatus.choices, default=ReminderStatus.PENDING, db_index=True)
    phone_number = models.CharField(max_length=20, validators=[Patient.phone_validator], blank=True)
    email = models.EmailField(blank=True, validators=[EmailValidator()])
    scheduled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="appointments_scheduled",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="appointments_updated",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    reminder_last_attempt_at = models.DateTimeField(null=True, blank=True)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["appointment_date", "appointment_time", "created_at"]
        indexes = [
            models.Index(fields=["appointment_date", "appointment_time", "status"]),
            models.Index(fields=["patient", "appointment_date"]),
            models.Index(fields=["doctor", "appointment_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.patient.health_id} with {self.doctor.username} on {self.appointment_date} {self.appointment_time}"

    @property
    def appointment_datetime(self):
        naive = datetime.combine(self.appointment_date, self.appointment_time)
        if timezone.is_naive(naive):
            return timezone.make_aware(naive, timezone.get_current_timezone())
        return naive


class ReminderLog(models.Model):
    class Channel(models.TextChoices):
        SMS = "sms", "SMS"
        EMAIL = "email", "Email"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        RETRYING = "retrying", "Retrying"
        SKIPPED = "skipped", "Skipped"

    class Provider(models.TextChoices):
        AFRICAS_TALKING = "africas_talking", "Africa's Talking"
        SMTP = "smtp", "SMTP"
        SENDGRID = "sendgrid", "SendGrid"
        SYSTEM = "system", "System"

    appointment = models.ForeignKey(Appointment, related_name="reminder_logs", on_delete=models.CASCADE)
    patient = models.ForeignKey(Patient, related_name="appointment_reminder_logs", on_delete=models.CASCADE)
    channel = models.CharField(max_length=10, choices=Channel.choices, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    provider = models.CharField(max_length=40, choices=Provider.choices, default=Provider.SYSTEM, db_index=True)
    recipient = models.CharField(max_length=255)
    reminder_date = models.DateField(db_index=True)
    scheduled_for = models.DateTimeField(db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    retry_count = models.PositiveSmallIntegerField(default=0)
    max_retries = models.PositiveSmallIntegerField(default=3)
    next_retry_at = models.DateTimeField(null=True, blank=True, db_index=True)
    external_message_id = models.CharField(max_length=120, blank=True)
    message_preview = models.CharField(max_length=255, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    error_message = models.CharField(max_length=255, blank=True)
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="appointment_reminder_logs_triggered",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["appointment", "channel", "reminder_date"], name="unique_appointment_channel_reminder_date"),
        ]
        indexes = [
            models.Index(fields=["status", "next_retry_at"]),
            models.Index(fields=["appointment", "channel", "status"]),
            models.Index(fields=["patient", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_channel_display()} reminder for appointment {self.appointment_id}"
