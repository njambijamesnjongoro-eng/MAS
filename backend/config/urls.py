"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from patients.views import DashboardSummaryAPIView


def health_check(_request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health_check"),
    path("api/schema/", SpectacularAPIView.as_view(), name="api_schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="api_schema"), name="api_docs"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="api_schema"), name="api_redoc"),
    path("api/dashboard/summary/", DashboardSummaryAPIView.as_view(), name="dashboard_summary"),
    path("api/auth/", include("accounts.urls")),
    path("api/patients/", include("patients.urls")),
    path("api/audit-logs/", include("audit.urls")),
    path("api/clinical/", include("clinical.urls")),
    path("api/operations/", include("operations.urls")),
    path("api/finance/", include("finance.urls")),
    path("api/imaging/", include("imaging.urls")),
    path("api/notifications/", include("messaging.urls")),
    path("api/reports/", include("reporting.urls")),
    path("api/appointments/", include("appointments.urls")),
]
