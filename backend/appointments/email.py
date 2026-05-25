from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings
from django.core.mail import EmailMultiAlternatives


class ReminderDeliveryError(Exception):
    """Raised when a reminder cannot be delivered."""


class ReminderConfigurationError(ReminderDeliveryError):
    """Raised when reminder delivery is not configured."""


@dataclass
class DeliveryResult:
    provider: str
    external_id: str = ""
    payload: dict | None = None


def get_email_provider() -> str:
    if getattr(settings, "SENDGRID_API_KEY", ""):
        return "sendgrid"
    return "smtp"


def send_appointment_email(*, recipient: str, subject: str, text_body: str, html_body: str | None = None) -> DeliveryResult:
    if not recipient:
        raise ReminderConfigurationError("Email recipient is missing.")

    if not getattr(settings, "EMAIL_HOST", "") and "console" not in getattr(settings, "EMAIL_BACKEND", ""):
        raise ReminderConfigurationError("Email delivery is not configured.")

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
    )
    if html_body:
        message.attach_alternative(html_body, "text/html")
    message.send(fail_silently=False)
    return DeliveryResult(provider=get_email_provider(), payload={"recipient": recipient})
