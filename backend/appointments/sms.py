from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings

try:
    import africastalking
except ImportError:  # pragma: no cover
    africastalking = None


class ReminderDeliveryError(Exception):
    """Raised when a reminder cannot be delivered."""


class ReminderConfigurationError(ReminderDeliveryError):
    """Raised when reminder delivery is not configured."""


@dataclass
class DeliveryResult:
    provider: str
    external_id: str = ""
    payload: dict | None = None


def send_appointment_sms(*, recipient: str, message: str) -> DeliveryResult:
    if not recipient:
        raise ReminderConfigurationError("SMS recipient is missing.")
    if africastalking is None:
        raise ReminderConfigurationError("africastalking package is not installed.")
    if not getattr(settings, "AFRICASTALKING_USERNAME", "") or not getattr(settings, "AFRICASTALKING_API_KEY", ""):
        raise ReminderConfigurationError("Africa's Talking credentials are not configured.")

    africastalking.initialize(settings.AFRICASTALKING_USERNAME, settings.AFRICASTALKING_API_KEY)
    sms = africastalking.SMS
    response = sms.send(
        message,
        [recipient],
        sender_id=getattr(settings, "AFRICASTALKING_SENDER_ID", None) or None,
        enqueue=False,
    )

    recipients = response.get("SMSMessageData", {}).get("Recipients", [])
    first_recipient = recipients[0] if recipients else {}
    status = str(first_recipient.get("status", "")).lower()
    if "success" not in status:
        raise ReminderDeliveryError(first_recipient.get("status", "SMS delivery failed."))

    return DeliveryResult(
        provider="africas_talking",
        external_id=str(first_recipient.get("messageId", "")),
        payload=response,
    )
