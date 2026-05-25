from __future__ import annotations

from datetime import date, timedelta

from celery import shared_task
from django.utils import timezone

from .models import ReminderLog
from .services import process_reminder_log_delivery, queue_next_day_reminders


@shared_task
def schedule_next_day_appointment_reminders_task(target_date_iso: str | None = None):
    target_date = date.fromisoformat(target_date_iso) if target_date_iso else timezone.localdate() + timedelta(days=1)
    return queue_next_day_reminders(target_date=target_date)


@shared_task
def process_appointment_reminder_log_task(reminder_log_id: int):
    reminder_log = ReminderLog.objects.select_related("appointment", "patient", "appointment__doctor").get(pk=reminder_log_id)
    processed = process_reminder_log_delivery(reminder_log)
    if processed.status == ReminderLog.Status.RETRYING and processed.next_retry_at:
        process_appointment_reminder_log_task.apply_async(kwargs={"reminder_log_id": processed.id}, eta=processed.next_retry_at)
    return processed.status


@shared_task
def retry_due_appointment_reminders_task():
    due_logs = list(
        ReminderLog.objects.select_related("appointment", "patient", "appointment__doctor")
        .filter(status=ReminderLog.Status.RETRYING, next_retry_at__isnull=False, next_retry_at__lte=timezone.now())
        .order_by("next_retry_at")[:100]
    )
    for reminder_log in due_logs:
        process_appointment_reminder_log_task.delay(reminder_log.id)
    return len(due_logs)
