from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import CurrentUserAPIView, LoginAPIView, LogoutAPIView

urlpatterns = [
    path("login/", LoginAPIView.as_view(), name="login"),
    path("logout/", LogoutAPIView.as_view(), name="logout"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", CurrentUserAPIView.as_view(), name="current_user"),
]
