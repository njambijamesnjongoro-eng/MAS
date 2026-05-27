"use client";

import type { AuthUser } from "@/types";

const STORAGE_KEY = "hospital-ehr-auth-user";

let memoryUser: AuthUser | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getCachedAuthUser(): AuthUser | null {
  if (memoryUser) {
    return memoryUser;
  }

  if (!isBrowser()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    memoryUser = JSON.parse(raw) as AuthUser;
    return memoryUser;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function setCachedAuthUser(user: AuthUser) {
  memoryUser = user;
  if (isBrowser()) {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
}

export function clearCachedAuthUser() {
  memoryUser = null;
  if (isBrowser()) {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}
