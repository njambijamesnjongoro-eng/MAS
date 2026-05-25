from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AppointmentReminderCronAPIView,
    AppointmentReminderDashboardAPIView,
    AppointmentReferenceDataAPIView,
    AppointmentViewSet,
    PatientAppointmentHistoryAPIView,
    PatientCommunicationPreferenceAPIView,
    ReminderLogViewSet,
)

router = DefaultRouter()
router.register("appointments", AppointmentViewSet, basename="appointment")
router.register("reminder-logs", ReminderLogViewSet, basename="appointment-reminder-log")

urlpatterns = [
    path("cron/run/", AppointmentReminderCronAPIView.as_view(), name="appointment_reminder_cron"),
    path("dashboard/summary/", AppointmentReminderDashboardAPIView.as_view(), name="appointment_reminder_dashboard_summary"),
    path("reference-data/", AppointmentReferenceDataAPIView.as_view(), name="appointment_reference_data"),
    path("patients/<int:patient_id>/history/", PatientAppointmentHistoryAPIView.as_view(), name="patient_appointment_history"),
    path("patients/<int:patient_id>/communication-preferences/", PatientCommunicationPreferenceAPIView.as_view(), name="patient_communication_preferences"),
    path("", include(router.urls)),
]
