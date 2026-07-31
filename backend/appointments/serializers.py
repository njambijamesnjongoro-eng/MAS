from __future__ import annotations

from datetime import datetime

from django.utils import timezone
from rest_framework import serializers

from accounts.models import User
from common.utils.security import normalize_text

from .models import Appointment, PatientCommunicationPreference, ReminderLog
from .services import get_patient_communication_preference, normalize_appointment_payload, validate_appointment_doctor


class PatientCommunicationPreferenceSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PatientCommunicationPreference
        fields = (
            "id",
            "patient",
            "patient_name",
            "sms_enabled",
            "email_enabled",
            "phone_number",
            "email",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "patient_name")

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def validate_phone_number(self, value):
        return normalize_text(value)

    def validate(self, attrs):
        preference = self.instance
        patient = getattr(preference, "patient", None)
        sms_enabled = attrs.get("sms_enabled", getattr(preference, "sms_enabled", True))
        email_enabled = attrs.get("email_enabled", getattr(preference, "email_enabled", True))
        phone_number = attrs.get("phone_number", getattr(preference, "phone_number", "") if preference else "")
        email = attrs.get("email", getattr(preference, "email", "") if preference else "")

        if patient:
            phone_number = phone_number or patient.phone_number
            email = email or patient.email

        if sms_enabled and not phone_number:
            raise serializers.ValidationError({"phone_number": "A phone number is required when SMS reminders are enabled."})
        if email_enabled and not email:
            raise serializers.ValidationError({"email": "An email address is required when email reminders are enabled."})
        return attrs


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    scheduled_by_name = serializers.CharField(source="scheduled_by.username", read_only=True)
    updated_by_name = serializers.CharField(source="updated_by.username", read_only=True)
    appointment_datetime = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id",
            "patient",
            "patient_name",
            "doctor",
            "doctor_name",
            "appointment_date",
            "appointment_time",
            "appointment_datetime",
            "status",
            "reason",
            "notes",
            "reminder_sent",
            "sms_status",
            "email_status",
            "phone_number",
            "email",
            "scheduled_by",
            "scheduled_by_name",
            "updated_by",
            "updated_by_name",
            "reminder_last_attempt_at",
            "reminder_sent_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "reminder_sent",
            "sms_status",
            "email_status",
            "scheduled_by",
            "updated_by",
            "scheduled_by_name",
            "updated_by_name",
            "reminder_last_attempt_at",
            "reminder_sent_at",
            "created_at",
            "updated_at",
            "appointment_datetime",
        )

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_doctor_name(self, obj):
        return f"{obj.doctor.first_name} {obj.doctor.last_name}".strip() or obj.doctor.username

    def get_appointment_datetime(self, obj):
        return timezone.localtime(obj.appointment_datetime).isoformat()

    def validate_doctor(self, value: User):
        if not validate_appointment_doctor(value):
            raise serializers.ValidationError("Selected user is not configured as a clinician.")
        return value

    def validate_phone_number(self, value):
        return normalize_text(value)

    def validate_reason(self, value):
        return normalize_text(value)

    def validate_notes(self, value):
        return normalize_text(value)

    def validate(self, attrs):
        attrs = normalize_appointment_payload(attrs)
        patient = attrs.get("patient") or getattr(self.instance, "patient", None)
        appointment_date = attrs.get("appointment_date") or getattr(self.instance, "appointment_date", None)
        appointment_time = attrs.get("appointment_time") or getattr(self.instance, "appointment_time", None)
        status_value = attrs.get("status") or getattr(self.instance, "status", Appointment.Status.SCHEDULED)

        if appointment_date and appointment_time and status_value in {Appointment.Status.SCHEDULED, Appointment.Status.CONFIRMED} and not self.instance:
            appointment_dt = timezone.make_aware(datetime.combine(appointment_date, appointment_time), timezone.get_current_timezone())
            if appointment_dt <= timezone.now():
                raise serializers.ValidationError("Appointments must be scheduled in the future.")

        if patient:
            preference = get_patient_communication_preference(patient)
            resolved_phone = attrs.get("phone_number") or getattr(self.instance, "phone_number", "") or preference.effective_phone_number
            resolved_email = attrs.get("email") or getattr(self.instance, "email", "") or preference.effective_email
            if not attrs.get("phone_number") and resolved_phone:
                attrs["phone_number"] = resolved_phone
            if not attrs.get("email") and resolved_email:
                attrs["email"] = resolved_email
            if preference.sms_enabled and not attrs.get("phone_number"):
                raise serializers.ValidationError({"phone_number": "The patient has SMS reminders enabled but no phone number is available."})
            if preference.email_enabled and not attrs.get("email"):
                raise serializers.ValidationError({"email": "The patient has email reminders enabled but no email is available."})

        return attrs


class ReminderLogSerializer(serializers.ModelSerializer):
    appointment_date = serializers.DateField(source="appointment.appointment_date", read_only=True)
    appointment_time = serializers.TimeField(source="appointment.appointment_time", read_only=True)
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = ReminderLog
        fields = (
            "id",
            "appointment",
            "patient",
            "patient_name",
            "doctor_name",
            "channel",
            "status",
            "provider",
            "recipient",
            "reminder_date",
            "scheduled_for",
            "sent_at",
            "last_attempt_at",
            "retry_count",
            "max_retries",
            "next_retry_at",
            "external_message_id",
            "message_preview",
            "response_payload",
            "error_message",
            "triggered_by",
            "appointment_date",
            "appointment_time",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_doctor_name(self, obj):
        doctor = obj.appointment.doctor
        return f"{doctor.first_name} {doctor.last_name}".strip() or doctor.username
