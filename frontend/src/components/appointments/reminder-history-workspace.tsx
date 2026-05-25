"use client";

import { useEffect, useState } from "react";

import { ToastNotice } from "@/components/clinical/toast-notice";
import { apiRequest } from "@/lib/client-api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";
import type { PaginatedResponse, ReminderLogRecord } from "@/types";

export function ReminderHistoryWorkspace() {
  const [logs, setLogs] = useState<PaginatedResponse<ReminderLogRecord> | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  async function fetchLogs(currentPage: number, currentStatus: string, currentChannel: string) {
    const params = new URLSearchParams({ page: String(currentPage) });
    if (currentStatus) {
      params.set("status", currentStatus);
    }
    if (currentChannel) {
      params.set("channel", currentChannel);
    }
    const { data } = await apiRequest<PaginatedResponse<ReminderLogRecord>>(`/api/reminders/logs?${params.toString()}`);
    return data;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadLogs() {
      try {
        const data = await fetchLogs(page, statusFilter, channelFilter);
        if (!cancelled) {
          setLogs(data);
        }
      } catch (error) {
        if (!cancelled) {
          setToast({ message: error instanceof Error ? error.message : "Unable to load reminder logs.", tone: "error" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLogs();
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, channelFilter]);

  async function retryLog(logId: number) {
    try {
      const response = await fetch(`/api/reminders/logs/${logId}/retry`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload === "object" && payload !== null && "detail" in payload ? String((payload as { detail: string }).detail) : "Unable to retry reminder.");
      }
      setToast({ message: "Reminder retry queued successfully.", tone: "success" });
      setLogs(await fetchLogs(page, statusFilter, channelFilter));
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Unable to retry reminder.", tone: "error" });
    }
  }

  return (
    <div className="space-y-6">
      {toast && <ToastNotice message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      <section className="medical-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-medical-primary">Reminder history</h3>
            <p className="mt-2 text-sm text-medical-secondary">
              Review reminder outcomes, inspect retries, and requeue failed deliveries without exposing clinical details.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="medical-input"
              value={statusFilter}
              onChange={(event) => {
                setLoading(true);
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="retrying">Retrying</option>
              <option value="skipped">Skipped</option>
            </select>
            <select
              className="medical-input"
              value={channelFilter}
              onChange={(event) => {
                setLoading(true);
                setChannelFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All channels</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
        </div>

        <div className="medical-table-wrap mt-6">
          <table className="medical-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Recipient</th>
                <th>Attempts</th>
                <th>Scheduled</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="medical-empty-state rounded-2xl px-4 py-5 text-sm">Loading reminder logs...</div>
                  </td>
                </tr>
              ) : logs?.results.length ? (
                logs.results.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="font-semibold text-medical-primary">{log.patient_name}</div>
                      <div className="mt-1 text-sm text-medical-secondary">{log.doctor_name}</div>
                    </td>
                    <td>{formatStatusLabel(log.channel)}</td>
                    <td>
                      <span className="medical-badge">{formatStatusLabel(log.status)}</span>
                      {log.error_message && <div className="mt-2 text-xs text-medical-secondary">{log.error_message}</div>}
                    </td>
                    <td>{log.recipient || "Unavailable"}</td>
                    <td>{log.retry_count}/{log.max_retries}</td>
                    <td>{formatDateTime(log.scheduled_for)}</td>
                    <td>
                      {log.status === "failed" || log.status === "retrying" ? (
                        <button type="button" onClick={() => void retryLog(log.id)} className="medical-button medical-button-ghost">
                          Retry
                        </button>
                      ) : (
                        <span className="text-sm text-medical-muted">No action</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="medical-empty-state rounded-2xl px-4 py-5 text-sm">No reminder logs match the current filters.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {logs && logs.num_pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setPage((current) => Math.max(1, current - 1));
              }}
              disabled={page === 1}
              className="medical-button medical-button-secondary"
            >
              Previous
            </button>
            <div className="text-sm text-medical-secondary">
              Page {logs.page} of {logs.num_pages}
            </div>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setPage((current) => Math.min(logs.num_pages, current + 1));
              }}
              disabled={page >= logs.num_pages}
              className="medical-button medical-button-secondary"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
