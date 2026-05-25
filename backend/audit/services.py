from __future__ import annotations

import logging

from .models import AuditLog

logger = logging.getLogger("audit")


def get_client_ip(request) -> str | None:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_audit_event(
    *,
    request,
    actor,
    action: str,
    module: str = "system",
    target_type: str,
    target_id: str = "",
    patient=None,
    status: str = "success",
    details: dict | None = None,
    is_emergency_access: bool = False,
) -> AuditLog:
    event = AuditLog.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        action=action,
        module=module,
        target_type=target_type,
        target_id=target_id,
        patient=patient,
        details=details or {},
        status=status,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent", "")[:255],
        device_info=request.headers.get("User-Agent", "")[:255],
        request_id=getattr(request, "request_id", ""),
        is_emergency_access=is_emergency_access,
    )
    logger.info("%s %s %s %s", module, action, target_type, target_id)
    return event
