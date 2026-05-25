from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from audit.services import log_audit_event
from accounts.constants import RoleCode
from common.permissions import CanManageBilling, CanRecordPayments, CanViewBilling
from common.permissions.roles import get_role_code

from .filters import InvoiceFilter, PaymentFilter
from .models import Invoice, Payment
from .serializers import InvoiceSerializer, PaymentSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related("patient", "visit", "admission").prefetch_related("payments").all()
    serializer_class = InvoiceSerializer
    filterset_class = InvoiceFilter
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("invoice_number", "patient__health_id", "patient__first_name", "patient__last_name")
    ordering_fields = ("created_at", "updated_at", "total_amount", "balance_due")
    ordering = ("-created_at",)

    def get_permissions(self):
        if self.action in {"list", "retrieve", "receipt"}:
            return [CanViewBilling()]
        return [CanManageBilling()]

    def get_throttles(self):
        throttle = ScopedRateThrottle()
        throttle.scope = "billing_read" if self.action in {"list", "retrieve", "receipt"} else "billing_write"
        return [throttle]

    def get_queryset(self):
        queryset = self.queryset
        if get_role_code(self.request.user) == RoleCode.PATIENT:
            queryset = queryset.filter(patient__linked_user=self.request.user)
        return queryset

    def perform_create(self, serializer):
        invoice = serializer.save(issued_by=self.request.user)
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="invoice_created",
            module="finance",
            target_type="invoice",
            target_id=str(invoice.id),
            patient=invoice.patient,
        )

    def perform_update(self, serializer):
        invoice = serializer.save()
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="invoice_updated",
            module="finance",
            target_type="invoice",
            target_id=str(invoice.id),
            patient=invoice.patient,
        )

    @action(detail=True, methods=["get"])
    def receipt(self, request, pk=None):
        invoice = self.get_object()
        log_audit_event(
            request=request,
            actor=request.user,
            action="invoice_receipt_viewed",
            module="finance",
            target_type="invoice",
            target_id=str(invoice.id),
            patient=invoice.patient,
        )
        return Response(
            {
                "invoice": InvoiceSerializer(invoice).data,
                "payments": PaymentSerializer(invoice.payments.all(), many=True).data,
            }
        )


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related("invoice", "invoice__patient", "recorded_by").all()
    serializer_class = PaymentSerializer
    filterset_class = PaymentFilter
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("invoice__invoice_number", "transaction_reference", "invoice__patient__health_id")
    ordering_fields = ("payment_date", "created_at", "amount_paid")
    ordering = ("-payment_date",)

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [CanViewBilling()]
        return [CanRecordPayments()]

    def get_throttles(self):
        throttle = ScopedRateThrottle()
        throttle.scope = "billing_read" if self.action in {"list", "retrieve"} else "billing_write"
        return [throttle]

    def perform_create(self, serializer):
        payment = serializer.save()
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="payment_recorded",
            module="finance",
            target_type="payment",
            target_id=str(payment.id),
            patient=payment.invoice.patient,
        )
