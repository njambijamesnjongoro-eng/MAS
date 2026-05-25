"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/client-api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";
import type { NotificationRecord, PaginatedResponse } from "@/types";

import { ToastNotice } from "@/components/clinical/toast-notice";

function extractError(payload: unknown) {
  if (typeof payload === "object" && payload !== null && "detail" in payload) {
    return String((payload as { detail: string }).detail);
  }
  return "Request failed.";
}

export function NotificationsWorkspace() {
  const [notifications, setNotifications] = useState<PaginatedResponse<NotificationRecord> | null>(null);
  const [page, setPage] = useState(1);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  async function fetchNotifications(currentPage: number, unreadOnly: boolean) {
    const params = new URLSearchParams({ page: String(currentPage) });
    if (unreadOnly) {
      params.set("unread", "true");
    }
    const { data } = await apiRequest<PaginatedResponse<NotificationRecord>>(`/api/notifications?${params.toString()}`);
    return data;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        const data = await fetchNotifications(page, showUnreadOnly);
        if (!cancelled) {
          setNotifications(data);
        }
      } catch (error) {
        if (!cancelled) {
          setToast({
            message: error instanceof Error ? error.message : "Unable to load notifications.",
            tone: "error",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [page, showUnreadOnly]);

  async function markRead(notificationId: number) {
    const response = await fetch(`/api/notifications/${notificationId}/read`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToast({ message: extractError(payload), tone: "error" });
      return;
    }
    setToast({ message: "Notification marked as read.", tone: "success" });
    setNotifications(await fetchNotifications(page, showUnreadOnly));
  }

  async function markAllRead() {
    const response = await fetch("/api/notifications/read-all", { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToast({ message: extractError(payload), tone: "error" });
      return;
    }
    setToast({ message: "All notifications marked as read.", tone: "success" });
    setNotifications(await fetchNotifications(page, showUnreadOnly));
  }

  return (
    <div className="space-y-6">
      {toast && <ToastNotice message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      <section className="medical-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Internal notifications</h3>
            <p className="mt-2 text-sm text-slate-600">
              Admission alerts, imaging updates, and billing reminders stay inside the secure hospital workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 rounded-2xl bg-[var(--panel-muted)] px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showUnreadOnly}
              onChange={(event) => {
                  setLoading(true);
                  setShowUnreadOnly(event.target.checked);
                  setPage(1);
                }}
              />
              Unread only
            </label>
            <button type="button" onClick={markAllRead} className="medical-button medical-button-secondary">
              Mark all read
            </button>
          </div>
        </div>
      </section>

      <section className="medical-card rounded-[2rem] p-6">
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-600">Loading notifications...</div>
          ) : notifications?.results.length ? (
            notifications.results.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-[1.5rem] border px-5 py-4 ${
                  notification.is_read ? "border-[var(--border)] bg-white" : "border-teal-200 bg-teal-50"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-slate-900">{notification.title}</h4>
                      <span className="medical-badge">{formatStatusLabel(notification.module)}</span>
                      {!notification.is_read && <span className="medical-badge">Unread</span>}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{notification.message}</p>
                  </div>
                  {!notification.is_read && (
                    <button
                      type="button"
                      onClick={() => markRead(notification.id)}
                      className="medical-button medical-button-primary"
                    >
                      Mark read
                    </button>
                  )}
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                  Created {formatDateTime(notification.created_at)}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No notifications match the current filter.
            </div>
          )}
        </div>

        {notifications && notifications.num_pages > 1 && (
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
            <div className="text-sm text-slate-600">
              Page {notifications.page} of {notifications.num_pages}
            </div>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setPage((current) => Math.min(notifications.num_pages, current + 1));
              }}
              disabled={page >= notifications.num_pages}
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
