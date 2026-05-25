from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

from common.utils.security import generate_invoice_number


class Invoice(models.Model):
    class Status(models.TextChoices):
        UNPAID = "unpaid", "Unpaid"
        PARTIALLY_PAID = "partially_paid", "Partially Paid"
        PAID = "paid", "Paid"
        VOID = "void", "Void"

    invoice_number = models.CharField(max_length=40, unique=True, db_index=True, editable=False)
    patient = models.ForeignKey("patients.Patient", related_name="invoices", on_delete=models.CASCADE)
    visit = models.ForeignKey("clinical.Visit", related_name="invoices", on_delete=models.SET_NULL, null=True, blank=True)
    admission = models.ForeignKey("operations.Admission", related_name="invoices", on_delete=models.SET_NULL, null=True, blank=True)
    consultation_fee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    lab_fee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    pharmacy_fee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    admission_fee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    radiology_fee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    balance_due = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    insurance_provider = models.CharField(max_length=120, blank=True)
    insurance_policy_number = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UNPAID, db_index=True)
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="invoices_issued",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "created_at"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def recalculate(self):
        self.total_amount = (
            self.consultation_fee
            + self.lab_fee
            + self.pharmacy_fee
            + self.admission_fee
            + self.radiology_fee
        )
        self.balance_due = self.total_amount - self.amount_paid
        if self.status == self.Status.VOID:
            return
        if self.balance_due <= Decimal("0.00"):
            self.status = self.Status.PAID
            self.balance_due = Decimal("0.00")
        elif self.amount_paid > Decimal("0.00"):
            self.status = self.Status.PARTIALLY_PAID
        else:
            self.status = self.Status.UNPAID

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = generate_invoice_number()
        self.recalculate()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.invoice_number


class Payment(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Cash"
        MPESA = "mpesa", "M-Pesa"
        CARD = "card", "Card"
        INSURANCE = "insurance", "Insurance"

    invoice = models.ForeignKey(Invoice, related_name="payments", on_delete=models.CASCADE)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, db_index=True)
    transaction_reference = models.CharField(max_length=120, blank=True, db_index=True)
    payment_date = models.DateTimeField(default=timezone.now, db_index=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="payments_recorded",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-payment_date", "-created_at"]
        indexes = [
            models.Index(fields=["invoice", "payment_date"]),
        ]

    def __str__(self) -> str:
        return f"Payment for {self.invoice.invoice_number}"
