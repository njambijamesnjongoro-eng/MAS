from __future__ import annotations

from messaging.tasks import send_internal_notification_task


def notify_imaging_result_ready(imaging_request, uploaded_by):
    send_internal_notification_task.delay(
        recipient_id=imaging_request.requested_by_id,
        title="Imaging result ready",
        message=f"{imaging_request.get_imaging_type_display()} result is ready for {imaging_request.patient.health_id}.",
        patient_id=imaging_request.patient_id,
        module="imaging",
    )
    return uploaded_by
