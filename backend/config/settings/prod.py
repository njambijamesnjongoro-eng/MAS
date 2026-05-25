from django.core.exceptions import ImproperlyConfigured

from .base import *

DEBUG = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)

if not SECRET_KEY or SECRET_KEY == "unsafe-phase-1-secret-key":
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set to a long random value in production.")

if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must include your deployment hostnames in production.")
