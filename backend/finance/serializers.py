from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from common.utils.security import normalize_text

from .models import Invoice, Payment
from .services import record_payment


class PaymentSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.username", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id",
            "invoice",
            "amount_paid",
            "payment_method",
            "transaction_reference",
            "payment_date",
            "recorded_by",
            "recorded_by_name",
            "created_at",
        )
        read_only_fields = ("recorded_by", "recorded_by_name", "created_at")

    def validate_amount_paid(self, value):
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value

    def validate_transaction_reference(self, value):
        return normalize_text(value)

    def validate(self, attrs):
        invoice = attrs.get("invoice")
        amount_paid = attrs.get("amount_paid")
        payment_method = attrs.get("payment_method")
        reference = attrs.get("transaction_reference", "").strip()

        if invoice and invoice.status == Invoice.Status.VOID:
            raise serializers.ValidationError({"invoice": "Payments cannot be recorded against a void invoice."})
        if invoice and invoice.balance_due <= Decimal("0.00"):
            raise serializers.ValidationError({"invoice": "This invoice has already been settled."})
        if invoice and amount_paid and amount_paid > invoice.balance_due:
            raise serializers.ValidationError({"amount_paid": "Payment amount exceeds the invoice balance."})
        if payment_method in {Payment.PaymentMethod.MPESA, Payment.PaymentMethod.CARD, Payment.PaymentMethod.INSURANCE} and not reference:
            raise serializers.ValidationError({"transaction_reference": "A transaction reference is required for this payment method."})
        return attrs

    def create(self, validated_data):
        return record_payment(
            invoice=validated_data["invoice"],
            amount_paid=validated_data["amount_paid"],
            payment_method=validated_data["payment_method"],
            transaction_reference=validated_data.get("transaction_reference", ""),
            recorded_by=self.context["request"].user,
        )


class InvoiceSerializer(serializers.ModelSerializer):
    payments = PaymentSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = (
            "id",
            "invoice_number",
            "patient",
            "patient_name",
            "visit",
            "admission",
            "consultation_fee",
            "lab_fee",
            "pharmacy_fee",
            "admission_fee",
            "radiology_fee",
            "total_amount",
            "amount_paid",
            "balance_due",
            "insurance_provider",
            "insurance_policy_number",
            "status",
            "payments",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("invoice_number", "total_amount", "amount_paid", "balance_due", "payments", "created_at", "updated_at")

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def validate(self, attrs):
        patient = attrs.get("patient") or getattr(self.instance, "patient", None)
        visit = attrs.get("visit") if "visit" in attrs else getattr(self.instance, "visit", None)
        admission = attrs.get("admission") if "admission" in attrs else getattr(self.instance, "admission", None)

        for field in ("insurance_provider", "insurance_policy_number"):
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = normalize_text(attrs[field])
        if patient and visit and visit.patient_id != patient.id:
            raise serializers.ValidationError({"visit": "Selected visit does not belong to the selected patient."})
        if patient and admission and admission.patient_id != patient.id:
            raise serializers.ValidationError({"admission": "Selected admission does not belong to the selected patient."})
        return attrs
