from __future__ import annotations

from decimal import Decimal

from django.db import transaction

from messaging.tasks import send_internal_notification_task

from .models import Invoice, Payment


@transaction.atomic
def record_payment(*, invoice: Invoice, amount_paid: Decimal, payment_method: str, transaction_reference: str, recorded_by):
    if invoice.status == Invoice.Status.VOID:
        raise ValueError("Payments cannot be recorded against a void invoice.")
    if invoice.balance_due <= Decimal("0.00"):
        raise ValueError("This invoice has already been settled.")
    if amount_paid > invoice.balance_due:
        raise ValueError("Payment amount exceeds the outstanding invoice balance.")

    payment = Payment.objects.create(
        invoice=invoice,
        amount_paid=amount_paid,
        payment_method=payment_method,
        transaction_reference=transaction_reference,
        recorded_by=recorded_by,
    )
    invoice.amount_paid += amount_paid
    invoice.save()
    send_internal_notification_task.delay(
        recipient_id=recorded_by.id,
        title="Payment recorded",
        message=f"Payment of {amount_paid} has been recorded for {invoice.invoice_number}.",
        patient_id=invoice.patient_id,
        module="finance",
    )
    return payment
