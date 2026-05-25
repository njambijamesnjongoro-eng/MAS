from django.urls import path

from .views import NotificationListAPIView, NotificationMarkAllReadAPIView, NotificationMarkReadAPIView, NotificationSummaryAPIView

urlpatterns = [
    path("", NotificationListAPIView.as_view(), name="notification_list"),
    path("summary/", NotificationSummaryAPIView.as_view(), name="notification_summary"),
    path("<int:notification_id>/read/", NotificationMarkReadAPIView.as_view(), name="notification_mark_read"),
    path("read-all/", NotificationMarkAllReadAPIView.as_view(), name="notification_mark_all_read"),
]
