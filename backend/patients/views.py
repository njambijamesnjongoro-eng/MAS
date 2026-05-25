from __future__ import annotations

from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from rest_framework import filters, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from audit.services import log_audit_event
from accounts.constants import RoleCode
from common.permissions import (
    CanDeletePatients,
    CanEditPatientHistory,
    CanEditPatientRecords,
    CanRegisterPatients,
    CanViewPatientRecords,
)
from common.permissions.roles import STAFF_VIEW_ROLES, get_role_code, has_any_role

from .filters import PatientFilter
from .models import Patient, PatientHistory
from .serializers import (
    PatientDetailSerializer,
    PatientHistorySerializer,
    PatientListSerializer,
    PatientWriteSerializer,
)


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    filterset_class = PatientFilter
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    ordering_fields = ("created_at", "updated_at", "last_name", "date_of_birth")
    ordering = ("-created_at",)

    def get_queryset(self):
        queryset = Patient.objects.select_related("linked_user", "history", "created_by", "updated_by")
        role_code = get_role_code(self.request.user)
        if role_code == RoleCode.PATIENT:
            queryset = queryset.filter(linked_user=self.request.user)

        search_term = self.request.query_params.get("search")
        if search_term:
            queryset = queryset.filter(
                Q(health_id__icontains=search_term)
                | Q(first_name__icontains=search_term)
                | Q(last_name__icontains=search_term)
                | Q(national_id__icontains=search_term)
                | Q(phone_number__icontains=search_term)
            )
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return PatientListSerializer
        if self.action in {"create", "update", "partial_update"}:
            return PatientWriteSerializer
        return PatientDetailSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [CanViewPatientRecords()]
        if self.action == "create":
            return [CanRegisterPatients()]
        if self.action in {"update", "partial_update"}:
            return [CanEditPatientRecords()]
        if self.action == "destroy":
            return [CanDeletePatients()]
        return [IsAuthenticated()]

    def get_throttles(self):
        throttle = ScopedRateThrottle()
        throttle.scope = "patient_search" if self.action in {"list", "retrieve"} else "patient_write"
        return [throttle]

    def perform_create(self, serializer):
        patient = serializer.save(created_by=self.request.user, updated_by=self.request.user)
        history = patient.history
        history.created_by = self.request.user
        history.updated_by = self.request.user
        history.save(update_fields=["created_by", "updated_by", "updated_at"])
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="patient_created",
            target_type="patient",
            target_id=str(patient.id),
            patient=patient,
        )

    def perform_update(self, serializer):
        patient = serializer.save(updated_by=self.request.user)
        if hasattr(patient, "history"):
            patient.history.updated_by = self.request.user
            patient.history.save(update_fields=["updated_by", "updated_at"])
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="patient_updated",
            target_type="patient",
            target_id=str(patient.id),
            patient=patient,
        )

    def retrieve(self, request, *args, **kwargs):
        patient = self.get_object()
        serializer = self.get_serializer(patient)
        log_audit_event(
            request=request,
            actor=request.user,
            action="patient_viewed",
            target_type="patient",
            target_id=str(patient.id),
            patient=patient,
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        search_term = request.query_params.get("search", "")
        if search_term or request.query_params.get("gender") or request.query_params.get("blood_group"):
            log_audit_event(
                request=request,
                actor=request.user,
                action="patient_search",
                target_type="patient",
                details={
                    "search": search_term[:64],
                    "gender": request.query_params.get("gender"),
                    "blood_group": request.query_params.get("blood_group"),
                },
            )
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        detail_serializer = PatientDetailSerializer(serializer.instance)
        headers = self.get_success_headers(detail_serializer.data)
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        detail_serializer = PatientDetailSerializer(serializer.instance)
        return Response(detail_serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        patient_id = instance.id
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="patient_deleted",
            target_type="patient",
            target_id=str(patient_id),
            patient=instance,
        )
        instance.delete()


class PatientHistoryAPIView(APIView):
    def get_patient(self, request, patient_id: int) -> Patient:
        patient = get_object_or_404(Patient.objects.select_related("linked_user", "history"), pk=patient_id)
        can_view = CanViewPatientRecords()
        if not can_view.has_object_permission(request, self, patient):
            self.permission_denied(request, message="You do not have permission to access this patient.")
        return patient

    def get(self, request, patient_id: int):
        patient = self.get_patient(request, patient_id)
        history, _ = PatientHistory.objects.get_or_create(patient=patient)
        log_audit_event(
            request=request,
            actor=request.user,
            action="patient_history_viewed",
            target_type="patient_history",
            target_id=str(history.id),
            patient=patient,
        )
        return Response(PatientHistorySerializer(history).data, status=status.HTTP_200_OK)

    def put(self, request, patient_id: int):
        if not CanEditPatientHistory().has_permission(request, self):
            self.permission_denied(request, message="You do not have permission to modify patient history.")

        patient = self.get_patient(request, patient_id)
        history, _ = PatientHistory.objects.get_or_create(patient=patient)
        serializer = PatientHistorySerializer(history, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user, created_by=history.created_by or request.user)
        log_audit_event(
            request=request,
            actor=request.user,
            action="patient_history_updated",
            target_type="patient_history",
            target_id=str(history.id),
            patient=patient,
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, patient_id: int):
        if not CanEditPatientHistory().has_permission(request, self):
            self.permission_denied(request, message="You do not have permission to modify patient history.")

        patient = self.get_patient(request, patient_id)
        history, _ = PatientHistory.objects.get_or_create(patient=patient)
        serializer = PatientHistorySerializer(history, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user, created_by=history.created_by or request.user)
        log_audit_event(
            request=request,
            actor=request.user,
            action="patient_history_updated",
            target_type="patient_history",
            target_id=str(history.id),
            patient=patient,
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class DashboardSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not has_any_role(request.user, STAFF_VIEW_ROLES | {RoleCode.PATIENT}):
            self.permission_denied(request)

        role_code = get_role_code(request.user)
        patient_count = Patient.objects.count() if role_code != RoleCode.PATIENT else 1
        recent_patients = Patient.objects.order_by("-created_at")[:5]
        if role_code == RoleCode.PATIENT:
            recent_patients = Patient.objects.filter(linked_user=request.user).order_by("-created_at")[:1]

        return Response(
            {
                "patient_count": patient_count,
                "recent_patients": PatientListSerializer(recent_patients, many=True).data,
                "role": role_code,
            },
            status=status.HTTP_200_OK,
        )
