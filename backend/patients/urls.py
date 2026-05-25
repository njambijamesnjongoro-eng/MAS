from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DashboardSummaryAPIView, PatientHistoryAPIView, PatientViewSet

router = DefaultRouter()
router.register("", PatientViewSet, basename="patient")

urlpatterns = [
    path("dashboard/summary/", DashboardSummaryAPIView.as_view(), name="dashboard_summary"),
    path("<int:patient_id>/history/", PatientHistoryAPIView.as_view(), name="patient_history"),
    path("", include(router.urls)),
]
