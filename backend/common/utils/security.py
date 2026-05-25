from __future__ import annotations

import base64
import io
import re
from datetime import datetime
from uuid import uuid4

import qrcode
from django.conf import settings


def normalize_text(value: str) -> str:
    sanitized = re.sub(r"[\x00-\x1f\x7f]", "", value or "")
    sanitized = sanitized.replace("<", "").replace(">", "")
    return re.sub(r"\s+", " ", sanitized).strip()


def generate_health_id() -> str:
    suffix = uuid4().hex[:10].upper()
    return f"{settings.HOSPITAL_CODE}-{suffix}"


def generate_visit_id() -> str:
    timestamp = datetime.utcnow().strftime("%Y%m%d")
    suffix = uuid4().hex[:8].upper()
    return f"VIS-{settings.HOSPITAL_CODE}-{timestamp}-{suffix}"


def generate_invoice_number() -> str:
    timestamp = datetime.utcnow().strftime("%Y%m%d")
    suffix = uuid4().hex[:8].upper()
    return f"INV-{settings.HOSPITAL_CODE}-{timestamp}-{suffix}"


def generate_qr_identifier() -> str:
    return uuid4().hex


def build_patient_qr_payload(patient) -> str:
    return f"{settings.HOSPITAL_CODE}|{patient.health_id}|{patient.qr_identifier}"


def generate_qr_code_data_url(payload: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=4, border=2)
    qr.add_data(payload)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"
