from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdmissionViewSet, BedViewSet, OperationsDashboardSummaryAPIView, PatientAdmissionHistoryAPIView, WardViewSet

router = DefaultRouter()
router.register("wards", WardViewSet, basename="ward")
router.register("beds", BedViewSet, basename="bed")
router.register("admissions", AdmissionViewSet, basename="admission")

urlpatterns = [
    path("dashboard/summary/", OperationsDashboardSummaryAPIView.as_view(), name="operations_dashboard_summary"),
    path("patients/<int:patient_id>/admissions/", PatientAdmissionHistoryAPIView.as_view(), name="patient_admission_history"),
    path("", include(router.urls)),
]
