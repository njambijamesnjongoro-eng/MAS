from __future__ import annotations

import json
from dataclasses import dataclass
from email.utils import parseaddr
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

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


def send_via_sendgrid_api(*, recipient: str, subject: str, text_body: str, html_body: str | None = None) -> DeliveryResult:
    api_key = getattr(settings, "SENDGRID_API_KEY", "")
    if not api_key:
        raise ReminderConfigurationError("SendGrid API key is not configured.")

    from_name, from_email = parseaddr(settings.DEFAULT_FROM_EMAIL)
    if not from_email:
        raise ReminderConfigurationError("DEFAULT_FROM_EMAIL must include a valid sender email address.")

    payload = {
        "personalizations": [
            {
                "to": [{"email": recipient}],
                "subject": subject,
            }
        ],
        "from": {
            "email": from_email,
            **({"name": from_name} if from_name else {}),
        },
        "content": [
            {"type": "text/plain", "value": text_body},
        ],
    }
    if html_body:
        payload["content"].append({"type": "text/html", "value": html_body})

    request = Request(
        "https://api.sendgrid.com/v3/mail/send",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=getattr(settings, "EMAIL_TIMEOUT", 20)) as response:
            message_id = response.headers.get("X-Message-Id", "")
            return DeliveryResult(
                provider="sendgrid",
                external_id=message_id,
                payload={"recipient": recipient, "status_code": response.status},
            )
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise ReminderDeliveryError(f"SendGrid email delivery failed: {exc.code} {error_body[:180]}") from exc
    except URLError as exc:
        raise ReminderDeliveryError(f"SendGrid email delivery failed: {exc.reason}") from exc


def send_appointment_email(*, recipient: str, subject: str, text_body: str, html_body: str | None = None) -> DeliveryResult:
    if not recipient:
        raise ReminderConfigurationError("Email recipient is missing.")

    if getattr(settings, "SENDGRID_API_KEY", ""):
        return send_via_sendgrid_api(
            recipient=recipient,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        )

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
