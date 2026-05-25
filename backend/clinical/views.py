from __future__ import annotations

from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, parsers, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from audit.services import log_audit_event
from accounts.constants import RoleCode
from common.permissions import (
    CanDispensePrescriptions,
    CanManageDiagnoses,
    CanManageLabRequests,
    CanManagePrescriptions,
    CanManageVisits,
    CanRecordVitals,
    CanUploadLabResults,
    CanViewDiagnoses,
    CanViewLabRequests,
    CanViewPrescriptions,
    CanViewTimeline,
    CanViewVisits,
    CanViewVitals,
)
from common.permissions.roles import get_role_code
from patients.models import Patient
from patients.serializers import PatientListSerializer

from .filters import DiagnosisFilter, LabRequestFilter, PrescriptionFilter, VisitFilter, VitalSignsFilter
from .models import Diagnosis, LabRequest, LabResult, Prescription, Visit, VitalSigns
from .serializers import (
    DashboardLabRequestSerializer,
    DashboardVisitSerializer,
    DiagnosisSerializer,
    LabRequestSerializer,
    LabResultSerializer,
    PrescriptionSerializer,
    TimelineEntrySerializer,
    VisitDetailSerializer,
    VisitListSerializer,
    VisitWriteSerializer,
    VitalSignsSerializer,
)
from .services import build_clinical_dashboard_summary, build_patient_timeline


class ClinicalQuerysetMixin:
    def restrict_for_patient_user(self, queryset):
        if get_role_code(self.request.user) == RoleCode.PATIENT:
            return queryset.filter(patient__linked_user=self.request.user)
        return queryset


class VisitViewSet(ClinicalQuerysetMixin, viewsets.ModelViewSet):
    filterset_class = VisitFilter
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    ordering_fields = ("visit_date", "created_at", "updated_at")
    ordering = ("-visit_date",)

    def get_queryset(self):
        queryset = (
            Visit.objects.select_related("patient", "doctor", "vitals", "diagnosis")
            .prefetch_related(
                "prescriptions",
                Prefetch("lab_requests", queryset=LabRequest.objects.select_related("result")),
            )
            .all()
        )
        queryset = self.restrict_for_patient_user(queryset)

        search_term = self.request.query_params.get("search")
        if search_term:
            queryset = queryset.filter(
                Q(visit_id__icontains=search_term)
                | Q(chief_complaint__icontains=search_term)
                | Q(diagnosis_summary__icontains=search_term)
                | Q(patient__first_name__icontains=search_term)
                | Q(patient__last_name__icontains=search_term)
                | Q(patient__health_id__icontains=search_term)
            )
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return VisitListSerializer
        if self.action in {"create", "update", "partial_update"}:
            return VisitWriteSerializer
        return VisitDetailSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [CanViewVisits()]
        if self.action in {"create", "update", "partial_update", "close"}:
            return [CanManageVisits()]
        return [IsAuthenticated()]

    def get_throttles(self):
        throttle = ScopedRateThrottle()
        throttle.scope = "clinical_read" if self.action in {"list", "retrieve"} else "clinical_write"
        return [throttle]

    def perform_create(self, serializer):
        visit = serializer.save()
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="visit_created",
            target_type="visit",
            target_id=str(visit.id),
            patient=visit.patient,
        )

    def perform_update(self, serializer):
        visit = serializer.save()
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="visit_updated",
            target_type="visit",
            target_id=str(visit.id),
            patient=visit.patient,
        )

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        if request.query_params.get("search") or request.query_params.get("patient"):
            log_audit_event(
                request=request,
                actor=request.user,
                action="visit_search",
                target_type="visit",
                details={"search": request.query_params.get("search", "")[:64], "patient": request.query_params.get("patient")},
            )
        return response

    def retrieve(self, request, *args, **kwargs):
        visit = self.get_object()
        log_audit_event(
            request=request,
            actor=request.user,
            action="visit_viewed",
            target_type="visit",
            target_id=str(visit.id),
            patient=visit.patient,
        )
        return Response(VisitDetailSerializer(visit, context={"request": request}).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        visit = self.get_object()
        visit.status = Visit.Status.CLOSED
        visit.updated_by = request.user
        visit.save(update_fields=["status", "updated_by", "updated_at"])
        log_audit_event(
            request=request,
            actor=request.user,
            action="visit_closed",
            target_type="visit",
            target_id=str(visit.id),
            patient=visit.patient,
        )
        return Response(VisitDetailSerializer(visit, context={"request": request}).data, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        detail_serializer = VisitDetailSerializer(serializer.instance, context={"request": request})
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={"request": request})
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        detail_serializer = VisitDetailSerializer(serializer.instance, context={"request": request})
        return Response(detail_serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)


class VitalSignsViewSet(ClinicalQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = VitalSignsSerializer
    filterset_class = VitalSignsFilter
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    ordering_fields = ("updated_at", "created_at")
    ordering = ("-updated_at",)

    def get_queryset(self):
        return self.restrict_for_patient_user(VitalSigns.objects.select_related("patient", "visit", "recorded_by").all())

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [CanViewVitals()]
        return [CanRecordVitals()]

    def get_throttles(self):
        throttle = ScopedRateThrottle()
        throttle.scope = "clinical_read" if self.action in {"list", "retrieve"} else "clinical_write"
        return [throttle]

    def perform_create(self, serializer):
        visit = serializer.validated_data["visit"]
        vitals = serializer.save(patient=visit.patient, recorded_by=self.request.user)
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="vitals_created",
            target_type="vitals",
            target_id=str(vitals.id),
            patient=vitals.patient,
        )

    def perform_update(self, serializer):
        vitals = serializer.save(recorded_by=self.request.user)
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="vitals_updated",
            target_type="vitals",
            target_id=str(vitals.id),
            patient=vitals.patient,
        )


class DiagnosisViewSet(ClinicalQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = DiagnosisSerializer
    filterset_class = DiagnosisFilter
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("primary_diagnosis", "secondary_diagnosis", "icd_code", "clinical_notes")
    ordering_fields = ("created_at", "updated_at", "severity")
    ordering = ("-created_at",)

    def get_queryset(self):
        return self.restrict_for_patient_user(Diagnosis.objects.select_related("patient", "visit", "diagnosed_by").all())

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [CanViewDiagnoses()]
        return [CanManageDiagnoses()]

    def get_throttles(self):
        throttle = ScopedRateThrottle()
        throttle.scope = "clinical_read" if self.action in {"list", "retrieve"} else "clinical_write"
        return [throttle]

    def perform_create(self, serializer):
        visit = serializer.validated_data["visit"]
        diagnosis = serializer.save(patient=visit.patient, diagnosed_by=self.request.user)
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="diagnosis_created",
            target_type="diagnosis",
            target_id=str(diagnosis.id),
            patient=diagnosis.patient,
        )

    def perform_update(self, serializer):
        diagnosis = serializer.save(diagnosed_by=self.request.user)
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="diagnosis_updated",
            target_type="diagnosis",
            target_id=str(diagnosis.id),
            patient=diagnosis.patient,
        )


class PrescriptionViewSet(ClinicalQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = PrescriptionSerializer
    filterset_class = PrescriptionFilter
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("medication_name", "dosage", "route", "instructions")
    ordering_fields = ("created_at", "updated_at", "status")
    ordering = ("-created_at",)

    def get_queryset(self):
        return self.restrict_for_patient_user(
            Prescription.objects.select_related("patient", "visit", "prescribed_by", "dispensed_by").all()
        )

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [CanViewPrescriptions()]
        if self.action == "dispense":
            return [CanDispensePrescriptions()]
        return [CanManagePrescriptions()]

    def get_throttles(self):
        throttle = ScopedRateThrottle()
        throttle.scope = "prescription_dispense" if self.action == "dispense" else ("clinical_read" if self.action in {"list", "retrieve"} else "clinical_write")
        return [throttle]

    def perform_create(self, serializer):
        visit = serializer.validated_data["visit"]
        prescription = serializer.save(patient=visit.patient, prescribed_by=self.request.user)
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="prescription_created",
            target_type="prescription",
            target_id=str(prescription.id),
            patient=prescription.patient,
        )

    def perform_update(self, serializer):
        prescription = serializer.save()
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="prescription_updated",
            target_type="prescription",
            target_id=str(prescription.id),
            patient=prescription.patient,
        )

    @action(detail=True, methods=["post"])
    def dispense(self, request, pk=None):
        prescription = self.get_object()
        prescription.status = Prescription.Status.DISPENSED
        prescription.dispensed_by = request.user
        prescription.dispensed_at = timezone.now()
        prescription.save(update_fields=["status", "dispensed_by", "dispensed_at", "updated_at"])
        log_audit_event(
            request=request,
            actor=request.user,
            action="prescription_dispensed",
            target_type="prescription",
            target_id=str(prescription.id),
            patient=prescription.patient,
        )
        return Response(PrescriptionSerializer(prescription, context={"request": request}).data, status=status.HTTP_200_OK)


class LabRequestViewSet(ClinicalQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = LabRequestSerializer
    filterset_class = LabRequestFilter
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("test_name", "clinical_notes")
    ordering_fields = ("created_at", "updated_at", "priority", "status")
    ordering = ("-created_at",)

    def get_queryset(self):
        return self.restrict_for_patient_user(
            LabRequest.objects.select_related("patient", "visit", "requested_by", "result").all()
        )

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [CanViewLabRequests()]
        return [CanManageLabRequests()]

    def get_throttles(self):
        throttle = ScopedRateThrottle()
        throttle.scope = "clinical_read" if self.action in {"list", "retrieve"} else "clinical_write"
        return [throttle]

    def perform_create(self, serializer):
        visit = serializer.validated_data["visit"]
        lab_request = serializer.save(patient=visit.patient, requested_by=self.request.user)
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="lab_request_created",
            target_type="lab_request",
            target_id=str(lab_request.id),
            patient=lab_request.patient,
        )

    def perform_update(self, serializer):
        lab_request = serializer.save()
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="lab_request_updated",
            target_type="lab_request",
            target_id=str(lab_request.id),
            patient=lab_request.patient,
        )


class PatientVisitHistoryAPIView(generics.ListAPIView):
    serializer_class = VisitListSerializer
    permission_classes = [CanViewVisits]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "clinical_read"

    def get_queryset(self):
        patient = get_object_or_404(Patient, pk=self.kwargs["patient_id"])
        self.check_object_permissions(self.request, patient)
        queryset = Visit.objects.filter(patient=patient).select_related("patient", "doctor")
        status_value = self.request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(status=status_value)
        return queryset


class PatientTimelineAPIView(APIView):
    permission_classes = [CanViewTimeline]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "clinical_read"

    def get(self, request, patient_id: int):
        patient = get_object_or_404(Patient.objects.select_related("linked_user"), pk=patient_id)
        self.check_object_permissions(request, patient)
        entries = build_patient_timeline(patient)
        serializer = TimelineEntrySerializer(entries, many=True)
        log_audit_event(
            request=request,
            actor=request.user,
            action="patient_timeline_viewed",
            target_type="timeline",
            target_id=str(patient.id),
            patient=patient,
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class LabResultUpsertAPIView(APIView):
    permission_classes = [CanUploadLabResults]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "lab_upload"
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_object(self, request, request_id: int) -> LabRequest:
        lab_request = get_object_or_404(LabRequest.objects.select_related("patient", "result"), pk=request_id)
        self.check_object_permissions(request, lab_request)
        return lab_request

    def get(self, request, request_id: int):
        lab_request = self.get_object(request, request_id)
        if not hasattr(lab_request, "result"):
            return Response({"detail": "No result uploaded yet."}, status=status.HTTP_404_NOT_FOUND)
        return Response(LabResultSerializer(lab_request.result, context={"request": request}).data, status=status.HTTP_200_OK)

    def post(self, request, request_id: int):
        lab_request = self.get_object(request, request_id)
        instance = getattr(lab_request, "result", None)
        serializer = LabResultSerializer(instance, data=request.data, partial=bool(instance), context={"request": request})
        serializer.is_valid(raise_exception=True)
        result = serializer.save(lab_request=lab_request, uploaded_by=request.user)
        lab_request.status = LabRequest.Status.COMPLETED
        lab_request.save(update_fields=["status", "updated_at"])
        log_audit_event(
            request=request,
            actor=request.user,
            action="lab_result_uploaded",
            target_type="lab_result",
            target_id=str(result.id),
            patient=lab_request.patient,
        )
        return Response(LabResultSerializer(result, context={"request": request}).data, status=status.HTTP_200_OK if instance else status.HTTP_201_CREATED)

    def patch(self, request, request_id: int):
        return self.post(request, request_id)


class ClinicalDashboardSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "clinical_read"

    def get(self, request):
        role_code = get_role_code(request.user)
        if role_code is None:
            self.permission_denied(request)

        clinical_summary = build_clinical_dashboard_summary(request.user)

        patient_queryset = Patient.objects.all()
        if role_code == RoleCode.PATIENT:
            patient_queryset = patient_queryset.filter(linked_user=request.user)
        recent_patients = patient_queryset.order_by("-created_at")[:5]

        return Response(
            {
                "role": role_code,
                "patient_count": patient_queryset.count(),
                "recent_patients": PatientListSerializer(recent_patients, many=True).data,
                "today_visits_count": clinical_summary["today_visits_count"],
                "today_visits": DashboardVisitSerializer(clinical_summary["today_visits"], many=True).data,
                "pending_lab_results_count": clinical_summary["pending_lab_results_count"],
                "pending_lab_requests": DashboardLabRequestSerializer(clinical_summary["pending_lab_requests"], many=True).data,
                "open_visits_count": clinical_summary["open_visits_count"],
            },
            status=status.HTTP_200_OK,
        )
