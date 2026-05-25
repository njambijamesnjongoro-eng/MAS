from __future__ import annotations

from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, parsers, status, viewsets
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from audit.services import log_audit_event
from accounts.constants import RoleCode
from common.permissions import CanManageImagingRequests, CanManageImagingResults, CanViewImaging
from common.permissions.roles import get_role_code

from .filters import ImagingRequestFilter
from .models import ImagingRequest, ImagingResult
from .serializers import ImagingRequestSerializer, ImagingResultSerializer
from .services import notify_imaging_result_ready


class ImagingRequestViewSet(viewsets.ModelViewSet):
    queryset = ImagingRequest.objects.select_related("patient", "visit", "requested_by", "result").all()
    serializer_class = ImagingRequestSerializer
    filterset_class = ImagingRequestFilter
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("patient__health_id", "patient__first_name", "patient__last_name", "clinical_notes")
    ordering_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [CanViewImaging()]
        return [CanManageImagingRequests()]

    def get_throttles(self):
        throttle = ScopedRateThrottle()
        throttle.scope = "imaging_read" if self.action in {"list", "retrieve"} else "imaging_write"
        return [throttle]

    def get_queryset(self):
        queryset = self.queryset
        if get_role_code(self.request.user) == RoleCode.PATIENT:
            queryset = queryset.filter(patient__linked_user=self.request.user)
        return queryset

    def perform_create(self, serializer):
        imaging_request = serializer.save(requested_by=self.request.user)
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="imaging_request_created",
            module="imaging",
            target_type="imaging_request",
            target_id=str(imaging_request.id),
            patient=imaging_request.patient,
        )

    def perform_update(self, serializer):
        imaging_request = serializer.save()
        log_audit_event(
            request=self.request,
            actor=self.request.user,
            action="imaging_request_updated",
            module="imaging",
            target_type="imaging_request",
            target_id=str(imaging_request.id),
            patient=imaging_request.patient,
        )


class ImagingResultUpsertAPIView(APIView):
    permission_classes = [CanManageImagingResults]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "imaging_write"
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_object(self, request, request_id: int):
        imaging_request = get_object_or_404(ImagingRequest.objects.select_related("patient", "result"), pk=request_id)
        self.check_object_permissions(request, imaging_request)
        return imaging_request

    def get(self, request, request_id: int):
        imaging_request = self.get_object(request, request_id)
        if not hasattr(imaging_request, "result"):
            return Response({"detail": "No imaging result uploaded yet."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ImagingResultSerializer(imaging_request.result, context={"request": request}).data)

    def post(self, request, request_id: int):
        imaging_request = self.get_object(request, request_id)
        instance = getattr(imaging_request, "result", None)
        serializer = ImagingResultSerializer(instance, data=request.data, partial=bool(instance), context={"request": request})
        serializer.is_valid(raise_exception=True)
        result = serializer.save(imaging_request=imaging_request, uploaded_by=request.user)
        imaging_request.status = ImagingRequest.Status.COMPLETED
        imaging_request.save(update_fields=["status", "updated_at"])
        notify_imaging_result_ready(imaging_request, request.user)
        log_audit_event(
            request=request,
            actor=request.user,
            action="imaging_result_uploaded",
            module="imaging",
            target_type="imaging_result",
            target_id=str(result.id),
            patient=imaging_request.patient,
        )
        return Response(ImagingResultSerializer(result, context={"request": request}).data, status=status.HTTP_200_OK if instance else status.HTTP_201_CREATED)

    def patch(self, request, request_id: int):
        return self.post(request, request_id)


class ImagingResultDownloadAPIView(APIView):
    permission_classes = [CanViewImaging]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "imaging_read"

    def get(self, request, request_id: int):
        imaging_request = get_object_or_404(ImagingRequest.objects.select_related("patient", "result"), pk=request_id)
        self.check_object_permissions(request, imaging_request)
        result = getattr(imaging_request, "result", None)
        if not result or not result.attachment:
            raise Http404("Attachment not found.")

        log_audit_event(
            request=request,
            actor=request.user,
            action="imaging_file_downloaded",
            module="imaging",
            target_type="imaging_result",
            target_id=str(result.id),
            patient=imaging_request.patient,
        )
        return FileResponse(result.attachment.open("rb"), as_attachment=True, filename=result.attachment.name.split("/")[-1])
