from __future__ import annotations

from django.http import JsonResponse


class ApiSecurityMiddleware:
    public_prefixes = {
        "/api/auth/login/",
        "/api/auth/refresh/",
        "/api/health/",
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            return self.get_response(request)

        if request.path.startswith("/api/") and request.path not in self.public_prefixes:
            has_bearer = request.headers.get("Authorization", "").startswith("Bearer ")
            if not has_bearer:
                return JsonResponse(
                    {"detail": "Authentication credentials were not provided."},
                    status=401,
                )

        return self.get_response(request)
