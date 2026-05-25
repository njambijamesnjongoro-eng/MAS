from django_filters import rest_framework as filters

from .models import Appointment, ReminderLog


class AppointmentFilter(filters.FilterSet):
    appointment_date_from = filters.DateFilter(field_name="appointment_date", lookup_expr="gte")
    appointment_date_to = filters.DateFilter(field_name="appointment_date", lookup_expr="lte")

    class Meta:
        model = Appointment
        fields = {
            "patient": ["exact"],
            "doctor": ["exact"],
            "status": ["exact"],
            "reminder_sent": ["exact"],
            "sms_status": ["exact"],
            "email_status": ["exact"],
        }


class ReminderLogFilter(filters.FilterSet):
    scheduled_for_from = filters.DateTimeFilter(field_name="scheduled_for", lookup_expr="gte")
    scheduled_for_to = filters.DateTimeFilter(field_name="scheduled_for", lookup_expr="lte")

    class Meta:
        model = ReminderLog
        fields = {
            "appointment": ["exact"],
            "patient": ["exact"],
            "channel": ["exact"],
            "status": ["exact"],
            "provider": ["exact"],
            "reminder_date": ["exact"],
        }
