from django.urls import path

from .views import ReportingExportAPIView, ReportingSummaryAPIView

urlpatterns = [
    path("summary/", ReportingSummaryAPIView.as_view(), name="reporting_summary"),
    path("export/", ReportingExportAPIView.as_view(), name="reporting_export"),
]
