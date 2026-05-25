from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError

ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_IMAGING_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".dcm"}


def _validate_size(file_obj):
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_obj.size > max_bytes:
        raise ValidationError(f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB} MB.")


def _validate_extension(file_obj, allowed_extensions: set[str]):
    extension = Path(file_obj.name).suffix.lower()
    if extension not in allowed_extensions:
        raise ValidationError("Unsupported file type.")


def validate_medical_document(file_obj):
    _validate_size(file_obj)
    _validate_extension(file_obj, ALLOWED_DOCUMENT_EXTENSIONS)


def validate_imaging_file(file_obj):
    _validate_size(file_obj)
    _validate_extension(file_obj, ALLOWED_IMAGING_EXTENSIONS)
