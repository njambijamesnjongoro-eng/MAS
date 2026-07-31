import type { RoleCode } from "@/types";

export const clinicianRoles = new Set<RoleCode>(["clinical_officer", "doctor"]);

export function isClinicianRole(role: RoleCode | undefined) {
  return Boolean(role && clinicianRoles.has(role));
}

export function canStartEncounterRole(role: RoleCode | undefined) {
  return Boolean(role && ["clinical_officer", "doctor", "hospital_admin", "super_admin"].includes(role));
}

export function canEditVitalsRole(role: RoleCode | undefined) {
  return Boolean(role && ["clinical_officer", "doctor", "nurse", "hospital_admin", "super_admin"].includes(role));
}

export function canCreateImagingRequestRole(role: RoleCode | undefined) {
  return Boolean(role && ["clinical_officer", "doctor", "hospital_admin", "super_admin"].includes(role));
}
