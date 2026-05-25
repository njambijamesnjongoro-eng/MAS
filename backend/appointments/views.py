from __future__ import annotations

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.constants import RoleCode
from audit.services import log_audit_event
from common.permissions import (
    CanManageAppointmentCommunicationPreferences,
    CanManageAppointments,
    CanViewAppointmentReminderDashboard,
    CanViewAppointmentReminderLogs,
    CanViewAppointments,
)
from common.permissions.roles import get_role_code
from patients.models import Patient
from accounts.models import User

from .filters import AppointmentFilter, ReminderLogFilter
from .models import Appointment, ReminderLog
from .serializers import AppointmentSerializer, PatientCommunicationPreferenceSerializer, ReminderLogSerializer
from .services import build_appointment_reminder_dashboard_summary, create_reminder_logs_for_appointment, get_patient_communication_preference
from .tasks import process_appointment_reminder_log_task, schedule_next_day_appointment_reminders_task


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.select_related("patient", "doctor", "scheduled_by", "updated_by").all()
    serializer_class = AppointmentSerializer
    filterset_class = AppointmentFilter
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("patient__health_id", "patient__first_name", "patient__last_name", "doctor__username", "phone_number", "email")
    ordering_fields = ("appointment_date", "appointment_time", "created_at", "updated_at")
    ordering = ("appointment_date", "appointment_time")

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [CanViewAppointments()]
        return [CanManageAppointments()]

    def get_throttles(self):
        throttle = ScopedRateThrottle()
        throttle.scope = "appointments_read" if self.action in {"list", "retrieve"} else "appointments_write"
        return [throttle]

    def get_queryset(self):
        queryset = self.queryset
        role_code = get_role_code(self.request.user)
        if role_code == RoleCode.PATIENT:
            queryset = queryset.filter(patient__linked_user=self.request.user)
        elif role_code == RoleCode.DOCTOR:
            queryset = queryset.filter(doctor=self.request.user)
        return queryset

    def perform_create(self, serializer):
        appointment = serializer.save(scheduled_by=self.request.user, updated_by=self.request.user)
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="appointment_created",
            module="appointments",
            target_type="appointment",
            target_id=str(appointment.id),
            patient=appointment.patient,
        )

    def perform_update(self, serializer):
        appointment = serializer.save(updated_by=self.request.user)
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="appointment_updated",
            module="appointments",
            target_type="appointment",
            target_id=str(appointment.id),
            patient=appointment.patient,
        )

    @action(detail=True, methods=["post"])
    def send_reminder(self, request, pk=None):
        appointment = self.get_object()
        reminder_logs = create_reminder_logs_for_appointment(appointment, appointment.appointment_date, triggered_by=request.user)
        for reminder_log in reminder_logs:
            if reminder_log.status == ReminderLog.Status.PENDING:
                process_appointment_reminder_log_task.delay(reminder_log.id)
        log_audit_event(
            request=request,
            actor=request.user,
            action="appointment_reminder_triggered",
            module="appointments",
            target_type="appointment",
            target_id=str(appointment.id),
            patient=appointment.patient,
        )
        return Response({"queued": len(reminder_logs)}, status=status.HTTP_202_ACCEPTED)


class PatientAppointmentHistoryAPIView(APIView):
    permission_classes = [CanViewAppointments]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "appointments_read"

    def get(self, request, patient_id: int):
        patient = get_object_or_404(Patient.objects.select_related("linked_user"), pk=patient_id)
        self.check_object_permissions(request, patient)
        appointments = Appointment.objects.filter(patient=patient).select_related("doctor", "scheduled_by", "updated_by")
        log_audit_event(
            request=request,
            actor=request.user,
            action="appointment_history_viewed",
            module="appointments",
            target_type="patient",
            target_id=str(patient.id),
            patient=patient,
        )
        return Response(AppointmentSerializer(appointments, many=True).data, status=status.HTTP_200_OK)


class PatientCommunicationPreferenceAPIView(APIView):
    permission_classes = [CanManageAppointmentCommunicationPreferences]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "appointments_write"

    def get_object(self, request, patient_id: int):
        patient = get_object_or_404(Patient.objects.select_related("linked_user"), pk=patient_id)
        self.check_object_permissions(request, patient)
        return get_patient_communication_preference(patient)

    def get(self, request, patient_id: int):
        preference = self.get_object(request, patient_id)
        log_audit_event(
            request=request,
            actor=request.user,
            action="communication_preferences_viewed",
            module="appointments",
            target_type="patient",
            target_id=str(preference.patient_id),
            patient=preference.patient,
        )
        return Response(PatientCommunicationPreferenceSerializer(preference).data, status=status.HTTP_200_OK)

    def put(self, request, patient_id: int):
        preference = self.get_object(request, patient_id)
        serializer = PatientCommunicationPreferenceSerializer(preference, data=request.data)
        serializer.is_valid(raise_exception=True)
        preference = serializer.save(updated_by=request.user)
        log_audit_event(
            request=request,
            actor=request.user,
            action="communication_preferences_updated",
            module="appointments",
            target_type="patient",
            target_id=str(preference.patient_id),
            patient=preference.patient,
        )
        return Response(PatientCommunicationPreferenceSerializer(preference).data, status=status.HTTP_200_OK)


class ReminderLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ReminderLog.objects.select_related("appointment", "patient", "appointment__doctor", "triggered_by").all()
    serializer_class = ReminderLogSerializer
    permission_classes = [CanViewAppointmentReminderLogs]
    filterset_class = ReminderLogFilter
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("recipient", "appointment__patient__health_id", "appointment__patient__first_name", "appointment__patient__last_name", "error_message")
    ordering_fields = ("scheduled_for", "sent_at", "created_at", "updated_at", "retry_count")
    ordering = ("-created_at",)

    def get_throttles(self):
        throttle = ScopedRateThrottle()
        throttle.scope = "reminders_admin"
        return [throttle]

    @action(detail=True, methods=["post"], permission_classes=[CanManageAppointments])
    def retry(self, request, pk=None):
        reminder_log = self.get_object()
        reminder_log.status = ReminderLog.Status.RETRYING
        reminder_log.next_retry_at = timezone.now()
        reminder_log.triggered_by = request.user
        reminder_log.error_message = ""
        reminder_log.save(update_fields=["status", "next_retry_at", "triggered_by", "error_message", "updated_at"])
        process_appointment_reminder_log_task.delay(reminder_log.id)
        log_audit_event(
            request=request,
            actor=request.user,
            action="appointment_reminder_retry_requested",
            module="appointments",
            target_type="reminder_log",
            target_id=str(reminder_log.id),
            patient=reminder_log.patient,
        )
        return Response(ReminderLogSerializer(reminder_log).data, status=status.HTTP_202_ACCEPTED)


class AppointmentReminderDashboardAPIView(APIView):
    permission_classes = [CanViewAppointmentReminderDashboard]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "reminders_admin"

    def get(self, request):
        summary = build_appointment_reminder_dashboard_summary()
        return Response(
            {
                "appointments_tomorrow_count": summary["appointments_tomorrow_count"],
                "reminders_sent_today_count": summary["reminders_sent_today_count"],
                "reminders_failed_count": summary["reminders_failed_count"],
                "reminders_retrying_count": summary["reminders_retrying_count"],
                "sms_sent_count": summary["sms_sent_count"],
                "email_sent_count": summary["email_sent_count"],
                "channel_breakdown": summary["channel_breakdown"],
                "upcoming_appointments": AppointmentSerializer(summary["upcoming_appointments"], many=True).data,
                "failed_logs": ReminderLogSerializer(summary["failed_logs"], many=True).data,
                "recent_logs": ReminderLogSerializer(summary["recent_logs"], many=True).data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        task_target_date = request.data.get("target_date")
        task_id = schedule_next_day_appointment_reminders_task.delay(task_target_date).id
        log_audit_event(
            request=request,
            actor=request.user,
            action="appointment_daily_scheduler_triggered",
            module="appointments",
            target_type="scheduler",
            target_id=task_id,
            details={"target_date": task_target_date or "tomorrow"},
        )
        return Response({"task_id": task_id}, status=status.HTTP_202_ACCEPTED)


class AppointmentReferenceDataAPIView(APIView):
    permission_classes = [CanViewAppointments]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "appointments_read"

    def get(self, request):
        doctors = (
            User.objects.select_related("role")
            .filter(role__code=RoleCode.DOCTOR, is_active=True)
            .order_by("first_name", "last_name", "username")
        )
        return Response(
            {
                "doctors": [
                    {
                        "id": doctor.id,
                        "username": doctor.username,
                        "full_name": f"{doctor.first_name} {doctor.last_name}".strip() or doctor.username,
                        "email": doctor.email,
                    }
                    for doctor in doctors
                ],
                "statuses": [{"code": code, "label": label} for code, label in Appointment.Status.choices],
            },
            status=status.HTTP_200_OK,
        )
