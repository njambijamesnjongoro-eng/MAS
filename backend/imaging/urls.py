from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ImagingRequestViewSet, ImagingResultDownloadAPIView, ImagingResultUpsertAPIView

router = DefaultRouter()
router.register("requests", ImagingRequestViewSet, basename="imaging_request")

urlpatterns = [
    path("requests/<int:request_id>/result/", ImagingResultUpsertAPIView.as_view(), name="imaging_result_upsert"),
    path("requests/<int:request_id>/download/", ImagingResultDownloadAPIView.as_view(), name="imaging_result_download"),
    path("", include(router.urls)),
]
