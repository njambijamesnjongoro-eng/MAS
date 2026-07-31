from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from accounts.constants import RoleCode
from audit.models import AuditLog
from common.permissions.roles import get_role_code
from common.utils.security import normalize_text
from messaging.tasks import send_internal_notification_task

from .email import ReminderConfigurationError as EmailConfigurationError
from .email import ReminderDeliveryError as EmailDeliveryError
from .email import send_appointment_email
from .models import Appointment, PatientCommunicationPreference, ReminderLog
from .sms import ReminderConfigurationError as SmsConfigurationError
from .sms import ReminderDeliveryError as SmsDeliveryError
from .sms import send_appointment_sms


HOSPITAL_ADMIN_NOTIFICATION_ROLES = {
    RoleCode.SUPER_ADMIN,
    RoleCode.HOSPITAL_ADMIN,
    RoleCode.RECEPTIONIST,
}


@dataclass
class ReminderDispatchPlan:
    channel: str
    recipient: str
    provider: str
    status: str
    error_message: str = ""


def get_patient_communication_preference(patient) -> PatientCommunicationPreference:
    preference, _ = PatientCommunicationPreference.objects.get_or_create(
        patient=patient,
        defaults={
            "phone_number": patient.phone_number,
            "email": patient.email,
        },
    )
    return preference


def resolve_appointment_contacts(appointment: Appointment) -> tuple[str, str]:
    preference = get_patient_communication_preference(appointment.patient)
    phone_number = appointment.phone_number or preference.effective_phone_number
    email = appointment.email or preference.effective_email
    return phone_number, email


def hydrate_appointment_contacts(appointment: Appointment) -> Appointment:
    phone_number, email = resolve_appointment_contacts(appointment)
    dirty_fields: list[str] = []
    if phone_number and appointment.phone_number != phone_number:
        appointment.phone_number = phone_number
        dirty_fields.append("phone_number")
    if email and appointment.email != email:
        appointment.email = email
        dirty_fields.append("email")
    if dirty_fields:
        appointment.save(update_fields=[*dirty_fields, "updated_at"])
    return appointment


def build_appointment_reminder_subject(appointment: Appointment) -> str:
    return f"{settings.HOSPITAL_NAME} appointment reminder"


def build_appointment_reminder_text(appointment: Appointment) -> str:
    local_dt = timezone.localtime(appointment.appointment_datetime)
    return (
        f"Reminder from {settings.HOSPITAL_NAME}: you have an appointment on "
        f"{local_dt.strftime('%d %b %Y')} at {local_dt.strftime('%I:%M %p')}. "
        "Please contact the hospital if you need to reschedule."
    )


def build_appointment_reminder_html(appointment: Appointment) -> str:
    local_dt = timezone.localtime(appointment.appointment_datetime)
    return (
        f"<p>Reminder from <strong>{settings.HOSPITAL_NAME}</strong>.</p>"
        f"<p>You have an appointment on <strong>{local_dt.strftime('%d %b %Y')}</strong> at "
        f"<strong>{local_dt.strftime('%I:%M %p')}</strong>.</p>"
        "<p>If you need to reschedule, please contact the hospital front desk.</p>"
    )


def determine_reminder_plans(appointment: Appointment, reminder_date: date) -> list[ReminderDispatchPlan]:
    preference = get_patient_communication_preference(appointment.patient)
    phone_number, email = resolve_appointment_contacts(appointment)
    plans: list[ReminderDispatchPlan] = []

    if preference.sms_enabled:
        if phone_number:
            plans.append(
                ReminderDispatchPlan(
                    channel=ReminderLog.Channel.SMS,
                    recipient=phone_number,
                    provider=ReminderLog.Provider.AFRICAS_TALKING,
                    status=ReminderLog.Status.PENDING,
                )
            )
        else:
            plans.append(
                ReminderDispatchPlan(
                    channel=ReminderLog.Channel.SMS,
                    recipient="",
                    provider=ReminderLog.Provider.SYSTEM,
                    status=ReminderLog.Status.SKIPPED,
                    error_message=f"No phone number available for {reminder_date.isoformat()} reminder.",
                )
            )
    else:
        plans.append(
            ReminderDispatchPlan(
                channel=ReminderLog.Channel.SMS,
                recipient="",
                provider=ReminderLog.Provider.SYSTEM,
                status=ReminderLog.Status.SKIPPED,
                error_message="Patient has disabled SMS reminders.",
            )
        )

    email_provider = ReminderLog.Provider.SENDGRID if getattr(settings, "SENDGRID_API_KEY", "") else ReminderLog.Provider.SMTP
    if preference.email_enabled:
        if email:
            plans.append(
                ReminderDispatchPlan(
                    channel=ReminderLog.Channel.EMAIL,
                    recipient=email,
                    provider=email_provider,
                    status=ReminderLog.Status.PENDING,
                )
            )
        else:
            plans.append(
                ReminderDispatchPlan(
                    channel=ReminderLog.Channel.EMAIL,
                    recipient="",
                    provider=ReminderLog.Provider.SYSTEM,
                    status=ReminderLog.Status.SKIPPED,
                    error_message=f"No email available for {reminder_date.isoformat()} reminder.",
                )
            )
    else:
        plans.append(
            ReminderDispatchPlan(
                channel=ReminderLog.Channel.EMAIL,
                recipient="",
                provider=ReminderLog.Provider.SYSTEM,
                status=ReminderLog.Status.SKIPPED,
                error_message="Patient has disabled email reminders.",
            )
        )

    return plans


def create_reminder_logs_for_appointment(appointment: Appointment, reminder_date: date, *, triggered_by=None) -> list[ReminderLog]:
    hydrate_appointment_contacts(appointment)
    reminder_time = getattr(settings, "APPOINTMENT_REMINDER_SEND_TIME", time(hour=18, minute=0))
    scheduled_for = timezone.make_aware(datetime.combine(reminder_date - timedelta(days=1), reminder_time))
    message_preview = build_appointment_reminder_text(appointment)[:255]
    created_logs: list[ReminderLog] = []

    with transaction.atomic():
        for plan in determine_reminder_plans(appointment, reminder_date):
            log, created = ReminderLog.objects.get_or_create(
                appointment=appointment,
                channel=plan.channel,
                reminder_date=reminder_date,
                defaults={
                    "patient": appointment.patient,
                    "status": plan.status,
                    "provider": plan.provider,
                    "recipient": plan.recipient,
                    "scheduled_for": scheduled_for,
                    "message_preview": message_preview,
                    "error_message": plan.error_message,
                    "triggered_by": triggered_by,
                },
            )
            if created:
                created_logs.append(log)
        sync_appointment_delivery_state(appointment)
    return created_logs


def sync_appointment_delivery_state(appointment: Appointment) -> Appointment:
    appointment = Appointment.objects.get(pk=appointment.pk)
    channel_statuses: dict[str, str] = {}
    sent_timestamp = None

    for channel in (ReminderLog.Channel.SMS, ReminderLog.Channel.EMAIL):
        logs = appointment.reminder_logs.filter(channel=channel).order_by("-created_at")
        if not logs.exists():
            channel_statuses[channel] = Appointment.ReminderStatus.PENDING
            continue
        if logs.filter(status=ReminderLog.Status.SENT).exists():
            channel_statuses[channel] = Appointment.ReminderStatus.SENT
            latest_sent = logs.filter(status=ReminderLog.Status.SENT).order_by("-sent_at").first()
            if latest_sent and latest_sent.sent_at and (sent_timestamp is None or latest_sent.sent_at > sent_timestamp):
                sent_timestamp = latest_sent.sent_at
        elif logs.filter(status=ReminderLog.Status.RETRYING).exists():
            channel_statuses[channel] = Appointment.ReminderStatus.RETRYING
        elif logs.filter(status=ReminderLog.Status.PENDING).exists():
            channel_statuses[channel] = Appointment.ReminderStatus.PENDING
        elif logs.filter(status=ReminderLog.Status.FAILED).exists():
            channel_statuses[channel] = Appointment.ReminderStatus.FAILED
        else:
            channel_statuses[channel] = Appointment.ReminderStatus.SKIPPED

    reminder_logs_exist = appointment.reminder_logs.exists()
    reminder_completed = reminder_logs_exist and all(
        status_value in {Appointment.ReminderStatus.SENT, Appointment.ReminderStatus.SKIPPED}
        for status_value in channel_statuses.values()
    )

    appointment.sms_status = channel_statuses.get(ReminderLog.Channel.SMS, Appointment.ReminderStatus.PENDING)
    appointment.email_status = channel_statuses.get(ReminderLog.Channel.EMAIL, Appointment.ReminderStatus.PENDING)
    appointment.reminder_sent = reminder_completed
    appointment.reminder_sent_at = sent_timestamp if reminder_completed else None
    appointment.save(update_fields=["sms_status", "email_status", "reminder_sent", "reminder_sent_at", "updated_at"])
    return appointment


def notify_admins_of_reminder_failure(reminder_log: ReminderLog):
    from accounts.models import User

    recipients = User.objects.select_related("role").filter(role__code__in=HOSPITAL_ADMIN_NOTIFICATION_ROLES, is_active=True)
    for recipient in recipients:
        send_internal_notification_task.delay(
            recipient_id=recipient.id,
            title="Appointment reminder failed",
            message=(
                f"Reminder delivery failed for {reminder_log.appointment.patient.health_id} "
                f"({reminder_log.get_channel_display()}). Check the reminder dashboard."
            ),
            module="appointments",
            patient_id=reminder_log.patient_id,
        )


def log_system_reminder_audit(*, action: str, reminder_log: ReminderLog, status: str = "success", details: dict | None = None):
    AuditLog.objects.create(
        actor=reminder_log.triggered_by,
        action=action,
        module="appointments",
        target_type="reminder_log",
        target_id=str(reminder_log.id),
        patient=reminder_log.patient,
        details=details or {},
        status=status,
        user_agent="celery-worker",
        device_info="celery-worker",
    )


def calculate_retry_eta(retry_count: int):
    backoff_minutes = min(15 * max(retry_count, 1), 180)
    return timezone.now() + timedelta(minutes=backoff_minutes)


def process_reminder_log_delivery(reminder_log: ReminderLog) -> ReminderLog:
    appointment = reminder_log.appointment
    reminder_log.retry_count += 1
    reminder_log.last_attempt_at = timezone.now()
    appointment.reminder_last_attempt_at = reminder_log.last_attempt_at
    appointment.save(update_fields=["reminder_last_attempt_at", "updated_at"])

    try:
        if appointment.status in {Appointment.Status.CANCELLED, Appointment.Status.COMPLETED, Appointment.Status.NO_SHOW}:
            reminder_log.status = ReminderLog.Status.SKIPPED
            reminder_log.error_message = f"Appointment is {appointment.status}."
            reminder_log.next_retry_at = None
            reminder_log.save(update_fields=["status", "error_message", "retry_count", "last_attempt_at", "next_retry_at", "updated_at"])
            log_system_reminder_audit(action="appointment_reminder_skipped", reminder_log=reminder_log)
            return reminder_log

        if reminder_log.channel == ReminderLog.Channel.SMS:
            result = send_appointment_sms(recipient=reminder_log.recipient, message=build_appointment_reminder_text(appointment))
        else:
            result = send_appointment_email(
                recipient=reminder_log.recipient,
                subject=build_appointment_reminder_subject(appointment),
                text_body=build_appointment_reminder_text(appointment),
                html_body=build_appointment_reminder_html(appointment),
            )

        reminder_log.provider = result.provider
        reminder_log.status = ReminderLog.Status.SENT
        reminder_log.sent_at = timezone.now()
        reminder_log.next_retry_at = None
        reminder_log.external_message_id = result.external_id
        reminder_log.response_payload = result.payload or {}
        reminder_log.error_message = ""
        reminder_log.save(
            update_fields=[
                "provider",
                "status",
                "sent_at",
                "next_retry_at",
                "external_message_id",
                "response_payload",
                "error_message",
                "retry_count",
                "last_attempt_at",
                "updated_at",
            ]
        )
        log_system_reminder_audit(action="appointment_reminder_sent", reminder_log=reminder_log)
    except (SmsConfigurationError, EmailConfigurationError) as exc:
        reminder_log.status = ReminderLog.Status.FAILED
        reminder_log.next_retry_at = None
        reminder_log.error_message = str(exc)[:255]
        reminder_log.save(update_fields=["status", "next_retry_at", "error_message", "retry_count", "last_attempt_at", "updated_at"])
        log_system_reminder_audit(
            action="appointment_reminder_failed",
            reminder_log=reminder_log,
            status="failed",
            details={"reason": reminder_log.error_message},
        )
        notify_admins_of_reminder_failure(reminder_log)
    except (SmsDeliveryError, EmailDeliveryError) as exc:
        reminder_log.error_message = str(exc)[:255]
        if reminder_log.retry_count < reminder_log.max_retries:
            reminder_log.status = ReminderLog.Status.RETRYING
            reminder_log.next_retry_at = calculate_retry_eta(reminder_log.retry_count)
        else:
            reminder_log.status = ReminderLog.Status.FAILED
            reminder_log.next_retry_at = None
        reminder_log.save(update_fields=["status", "next_retry_at", "error_message", "retry_count", "last_attempt_at", "updated_at"])
        log_system_reminder_audit(
            action="appointment_reminder_retry_scheduled" if reminder_log.status == ReminderLog.Status.RETRYING else "appointment_reminder_failed",
            reminder_log=reminder_log,
            status="failed" if reminder_log.status == ReminderLog.Status.FAILED else "retrying",
            details={"reason": reminder_log.error_message, "next_retry_at": reminder_log.next_retry_at.isoformat() if reminder_log.next_retry_at else None},
        )
        if reminder_log.status == ReminderLog.Status.FAILED:
            notify_admins_of_reminder_failure(reminder_log)
    finally:
        sync_appointment_delivery_state(appointment)

    return reminder_log


def queue_next_day_reminders(*, target_date: date | None = None, triggered_by=None) -> int:
    if target_date is None:
        target_date = timezone.localdate() + timedelta(days=1)

    appointments = (
        Appointment.objects.select_related("patient", "doctor")
        .filter(
            appointment_date=target_date,
            status__in=[Appointment.Status.SCHEDULED, Appointment.Status.CONFIRMED],
        )
        .order_by("appointment_time")
    )

    queued_count = 0
    for appointment in appointments:
        logs = create_reminder_logs_for_appointment(appointment, target_date, triggered_by=triggered_by)
        queued_count += sum(1 for log in logs if log.status == ReminderLog.Status.PENDING)
    cache.delete("appointment_reminder_dashboard_summary")
    return queued_count


def process_pending_reminders_for_date(*, target_date: date, limit: int = 500) -> int:
    pending_logs = list(
        ReminderLog.objects.select_related("appointment", "patient", "appointment__doctor")
        .filter(
            reminder_date=target_date,
            status=ReminderLog.Status.PENDING,
        )
        .order_by("scheduled_for", "created_at")[:limit]
    )
    for reminder_log in pending_logs:
        process_reminder_log_delivery(reminder_log)
    cache.delete("appointment_reminder_dashboard_summary")
    return len(pending_logs)


def process_due_retry_reminders(*, limit: int = 500) -> int:
    due_logs = list(
        ReminderLog.objects.select_related("appointment", "patient", "appointment__doctor")
        .filter(
            status=ReminderLog.Status.RETRYING,
            next_retry_at__isnull=False,
            next_retry_at__lte=timezone.now(),
        )
        .order_by("next_retry_at", "created_at")[:limit]
    )
    for reminder_log in due_logs:
        process_reminder_log_delivery(reminder_log)
    cache.delete("appointment_reminder_dashboard_summary")
    return len(due_logs)


def build_appointment_reminder_dashboard_summary():
    cache_key = "appointment_reminder_dashboard_summary"
    cached = cache.get(cache_key)
    if cached:
        return cached

    today = timezone.localdate()
    tomorrow = today + timedelta(days=1)
    recent_logs = list(
        ReminderLog.objects.select_related("appointment", "patient", "appointment__doctor")
        .order_by("-created_at")[:10]
    )
    failed_logs = list(
        ReminderLog.objects.select_related("appointment", "patient", "appointment__doctor")
        .filter(status=ReminderLog.Status.FAILED)
        .order_by("-updated_at")[:5]
    )
    upcoming_appointments = list(
        Appointment.objects.select_related("patient", "doctor")
        .filter(appointment_date__gte=today, status__in=[Appointment.Status.SCHEDULED, Appointment.Status.CONFIRMED])
        .order_by("appointment_date", "appointment_time")[:8]
    )

    summary = {
        "appointments_tomorrow_count": Appointment.objects.filter(
            appointment_date=tomorrow,
            status__in=[Appointment.Status.SCHEDULED, Appointment.Status.CONFIRMED],
        ).count(),
        "reminders_sent_today_count": ReminderLog.objects.filter(status=ReminderLog.Status.SENT, sent_at__date=today).count(),
        "reminders_failed_count": ReminderLog.objects.filter(status=ReminderLog.Status.FAILED).count(),
        "reminders_retrying_count": ReminderLog.objects.filter(status=ReminderLog.Status.RETRYING).count(),
        "sms_sent_count": ReminderLog.objects.filter(channel=ReminderLog.Channel.SMS, status=ReminderLog.Status.SENT).count(),
        "email_sent_count": ReminderLog.objects.filter(channel=ReminderLog.Channel.EMAIL, status=ReminderLog.Status.SENT).count(),
        "channel_breakdown": list(
            ReminderLog.objects.values("channel", "status").annotate(total=Count("id")).order_by("channel", "status")
        ),
        "upcoming_appointments": upcoming_appointments,
        "failed_logs": failed_logs,
        "recent_logs": recent_logs,
    }
    cache.set(cache_key, summary, 120)
    return summary


def validate_appointment_doctor(user) -> bool:
    role_code = get_role_code(user)
    return role_code in {RoleCode.CLINICAL_OFFICER, RoleCode.DOCTOR} or getattr(user, "is_superuser", False)


def normalize_appointment_payload(validated_data: dict):
    for field in ("reason", "notes"):
        if field in validated_data:
            validated_data[field] = normalize_text(validated_data[field])
    return validated_data
