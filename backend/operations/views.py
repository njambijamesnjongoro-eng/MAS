from __future__ import annotations

from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from audit.services import log_audit_event
from accounts.constants import RoleCode
from common.permissions import CanManageAdmissions, CanManageWards, CanViewAdmissions
from common.permissions.roles import get_role_code
from clinical.serializers import DashboardLabRequestSerializer
from finance.models import Invoice
from finance.serializers import InvoiceSerializer
from patients.models import Patient

from .filters import AdmissionFilter, BedFilter, WardFilter
from .models import Admission, Bed, Ward
from .serializers import AdmissionSerializer, BedSerializer, TransferAdmissionSerializer, WardSerializer
from .services import build_operations_dashboard_summary, create_notification, discharge_admission, set_bed_status, transfer_admission


class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.annotate(occupied_beds=Count("beds", filter=Q(beds__occupancy_status=Bed.OccupancyStatus.OCCUPIED)))
    serializer_class = WardSerializer
    filterset_class = WardFilter
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("ward_name", "description")
    ordering_fields = ("ward_name", "capacity", "created_at")
    ordering = ("ward_name",)

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [CanManageAdmissions()]
        return [CanManageWards()]

    def get_throttles(self):
        throttle = ScopedRateThrottle()
        throttle.scope = "operations_read" if self.action in {"list", "retrieve"} else "operations_write"
        return [throttle]


class BedViewSet(viewsets.ModelViewSet):
    queryset = Bed.objects.select_related("ward").all()
    serializer_class = BedSerializer
    filterset_class = BedFilter
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("bed_number", "ward__ward_name")
    ordering_fields = ("bed_number", "updated_at")
    ordering = ("ward__ward_name", "bed_number")

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [CanManageAdmissions()]
        return [CanManageWards()]

    def get_throttles(self):
        throttle = ScopedRateThrottle()
        throttle.scope = "operations_read" if self.action in {"list", "retrieve"} else "operations_write"
        return [throttle]


class AdmissionViewSet(viewsets.ModelViewSet):
    queryset = Admission.objects.select_related("patient", "admitted_by", "ward", "bed").all()
    serializer_class = AdmissionSerializer
    filterset_class = AdmissionFilter
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("patient__health_id", "patient__first_name", "patient__last_name", "admission_reason")
    ordering_fields = ("admission_date", "discharge_date", "created_at")
    ordering = ("-admission_date",)

    def get_permissions(self):
        if self.action in {"list", "retrieve", "patient_history"}:
            return [CanViewAdmissions()]
        return [CanManageAdmissions()]

    def get_throttles(self):
        throttle = ScopedRateThrottle()
        throttle.scope = "operations_read" if self.action in {"list", "retrieve", "patient_history"} else "operations_write"
        return [throttle]

    def get_queryset(self):
        queryset = self.queryset
        if get_role_code(self.request.user) == RoleCode.PATIENT:
            queryset = queryset.filter(patient__linked_user=self.request.user)
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        admission = serializer.save(admitted_by=self.request.user)
        set_bed_status(admission.bed, Bed.OccupancyStatus.OCCUPIED)
        create_notification(self.request.user, "Patient admitted", f"{admission.patient.health_id} admitted to {admission.ward.ward_name}.", patient=admission.patient)
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="admission_created",
            module="operations",
            target_type="admission",
            target_id=str(admission.id),
            patient=admission.patient,
        )

    def perform_update(self, serializer):
        admission = serializer.save()
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="admission_updated",
            module="operations",
            target_type="admission",
            target_id=str(admission.id),
            patient=admission.patient,
        )

    @action(detail=True, methods=["post"])
    def transfer(self, request, pk=None):
        admission = self.get_object()
        serializer = TransferAdmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            updated = transfer_admission(admission, serializer.validated_data["ward"], serializer.validated_data["bed"])
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(
            request=request,
            actor=request.user,
            action="admission_transferred",
            module="operations",
            target_type="admission",
            target_id=str(updated.id),
            patient=updated.patient,
            details={"ward": updated.ward.ward_name, "bed": updated.bed.bed_number},
        )
        return Response(AdmissionSerializer(updated).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def discharge(self, request, pk=None):
        admission = self.get_object()
        try:
            updated = discharge_admission(admission)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(
            request=request,
            actor=request.user,
            action="admission_discharged",
            module="operations",
            target_type="admission",
            target_id=str(updated.id),
            patient=updated.patient,
        )
        return Response(AdmissionSerializer(updated).data, status=status.HTTP_200_OK)


class OperationsDashboardSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "operations_read"

    def get(self, request):
        if get_role_code(request.user) not in {
            RoleCode.SUPER_ADMIN,
            RoleCode.HOSPITAL_ADMIN,
            RoleCode.CLINICAL_OFFICER,
            RoleCode.DOCTOR,
            RoleCode.NURSE,
            RoleCode.RECEPTIONIST,
        }:
            self.permission_denied(request)
        summary = build_operations_dashboard_summary()
        pending_invoices = Invoice.objects.exclude(status=Invoice.Status.PAID).select_related("patient").order_by("-created_at")[:5]
        return Response(
            {
                "active_admissions_count": summary["active_admissions_count"],
                "occupied_beds_count": summary["occupied_beds_count"],
                "available_beds_count": summary["available_beds_count"],
                "pending_invoices_count": summary["pending_invoices_count"],
                "revenue_collected_today": summary["revenue_collected_today"],
                "active_admissions": AdmissionSerializer(summary["active_admissions"], many=True).data,
                "recent_lab_activity": DashboardLabRequestSerializer(summary["recent_lab_activity"], many=True).data,
                "pending_invoices": InvoiceSerializer(pending_invoices, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class PatientAdmissionHistoryAPIView(APIView):
    permission_classes = [CanViewAdmissions]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "operations_read"

    def get(self, request, patient_id: int):
        patient = get_object_or_404(Patient.objects.select_related("linked_user"), pk=patient_id)
        self.check_object_permissions(request, patient)
        admissions = Admission.objects.filter(patient=patient).select_related("ward", "bed", "admitted_by")
        log_audit_event(
            request=request,
            actor=request.user,
            action="admission_history_viewed",
            module="operations",
            target_type="patient",
            target_id=str(patient.id),
            patient=patient,
        )
        return Response(AdmissionSerializer(admissions, many=True).data, status=status.HTTP_200_OK)
