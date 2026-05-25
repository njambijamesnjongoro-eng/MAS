from __future__ import annotations

from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from audit.services import log_audit_event
from common.permissions import CanViewReports

from .services import build_csv_response_content, build_pdf_response_content, report_summary


class ReportingSummaryAPIView(APIView):
    permission_classes = [CanViewReports]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "reports"

    def get(self, request):
        log_audit_event(
            request=request,
            actor=request.user,
            action="report_summary_viewed",
            module="reporting",
            target_type="report_summary",
            target_id="summary",
        )
        return Response(report_summary())


class ReportingExportAPIView(APIView):
    permission_classes = [CanViewReports]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "reports"

    def get(self, request):
        report_type = request.query_params.get("report_type", "admissions")
        export_format = request.query_params.get("format", "csv")
        try:
            if export_format == "csv":
                content = build_csv_response_content(report_type)
                response = HttpResponse(content, content_type="text/csv")
                response["Content-Disposition"] = f'attachment; filename="{report_type}.csv"'
            elif export_format == "pdf":
                content = build_pdf_response_content(report_type)
                response = HttpResponse(content, content_type="application/pdf")
                response["Content-Disposition"] = f'attachment; filename="{report_type}.pdf"'
            else:
                return Response({"detail": "Unsupported export format."}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        log_audit_event(
            request=request,
            actor=request.user,
            action="report_exported",
            module="reporting",
            target_type="report",
            target_id=report_type,
        )
        return response
