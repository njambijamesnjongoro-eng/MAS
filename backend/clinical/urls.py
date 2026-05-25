from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ClinicalDashboardSummaryAPIView,
    DiagnosisViewSet,
    LabRequestViewSet,
    LabResultUpsertAPIView,
    PatientTimelineAPIView,
    PatientVisitHistoryAPIView,
    PrescriptionViewSet,
    VisitViewSet,
    VitalSignsViewSet,
)

router = DefaultRouter()
router.register("visits", VisitViewSet, basename="visit")
router.register("vitals", VitalSignsViewSet, basename="vitals")
router.register("diagnoses", DiagnosisViewSet, basename="diagnosis")
router.register("prescriptions", PrescriptionViewSet, basename="prescription")
router.register("lab-requests", LabRequestViewSet, basename="lab_request")

urlpatterns = [
    path("dashboard/summary/", ClinicalDashboardSummaryAPIView.as_view(), name="clinical_dashboard_summary"),
    path("patients/<int:patient_id>/visits/", PatientVisitHistoryAPIView.as_view(), name="patient_visit_history"),
    path("patients/<int:patient_id>/timeline/", PatientTimelineAPIView.as_view(), name="patient_timeline"),
    path("lab-requests/<int:request_id>/result/", LabResultUpsertAPIView.as_view(), name="lab_result_upsert"),
    path("", include(router.urls)),
]
