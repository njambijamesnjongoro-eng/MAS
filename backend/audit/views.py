from rest_framework import generics
from rest_framework.throttling import ScopedRateThrottle

from common.permissions import CanReviewAuditLogs

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListAPIView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [CanReviewAuditLogs]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "audit"
    queryset = AuditLog.objects.select_related("actor", "patient").all()
