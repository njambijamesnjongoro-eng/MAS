from __future__ import annotations

from celery import shared_task

from .models import Notification


@shared_task
def send_internal_notification_task(*, recipient_id: int, title: str, message: str, module: str = "system", patient_id: int | None = None):
    Notification.objects.create(
        recipient_id=recipient_id,
        title=title,
        message=message,
        module=module,
        patient_id=patient_id,
    )
