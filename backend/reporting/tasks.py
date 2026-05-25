from __future__ import annotations

from celery import shared_task

from .services import build_csv_response_content, build_pdf_response_content, report_summary


@shared_task
def generate_report_summary_task():
    return report_summary()


@shared_task
def generate_csv_report_task(report_type: str):
    return build_csv_response_content(report_type).decode("utf-8")


@shared_task
def generate_pdf_report_task(report_type: str):
    return build_pdf_response_content(report_type)
