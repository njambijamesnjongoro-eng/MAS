from django.contrib import admin

from .models import Appointment, PatientCommunicationPreference, ReminderLog


@admin.register(PatientCommunicationPreference)
class PatientCommunicationPreferenceAdmin(admin.ModelAdmin):
    list_display = ("patient", "sms_enabled", "email_enabled", "updated_at")
    search_fields = ("patient__health_id", "patient__first_name", "patient__last_name", "phone_number", "email")
    list_filter = ("sms_enabled", "email_enabled")


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "patient",
        "doctor",
        "appointment_date",
        "appointment_time",
        "status",
        "reminder_sent",
        "sms_status",
        "email_status",
    )
    search_fields = ("patient__health_id", "patient__first_name", "patient__last_name", "doctor__username", "phone_number", "email")
    list_filter = ("status", "reminder_sent", "sms_status", "email_status", "appointment_date")


@admin.register(ReminderLog)
class ReminderLogAdmin(admin.ModelAdmin):
    list_display = ("id", "appointment", "channel", "status", "provider", "recipient", "retry_count", "reminder_date", "sent_at")
    search_fields = ("appointment__patient__health_id", "appointment__patient__first_name", "appointment__patient__last_name", "recipient", "external_message_id")
    list_filter = ("channel", "status", "provider", "reminder_date")
