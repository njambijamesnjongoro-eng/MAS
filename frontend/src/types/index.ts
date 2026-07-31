export type RoleCode =
  | "super_admin"
  | "hospital_admin"
  | "clinical_officer"
  | "doctor"
  | "nurse"
  | "lab_technician"
  | "pharmacist"
  | "receptionist"
  | "patient";

export interface Role {
  id: number;
  code: RoleCode;
  name: string;
  description: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  effective_role: RoleCode;
  role: Role | null;
}

export interface PatientSummary {
  id: number;
  health_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  national_id: string;
  date_of_birth: string;
  gender: string;
  phone_number: string;
  blood_group: string;
  created_at: string;
}

export interface PatientHistory {
  summary: string;
  past_medical_history: string;
  surgical_history: string;
  family_history: string;
  social_history: string;
  current_medications: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PatientDetail {
  id: number;
  health_id: string;
  qr_identifier: string;
  qr_code_data_url: string;
  first_name: string;
  last_name: string;
  national_id: string;
  date_of_birth: string;
  gender: string;
  phone_number: string;
  email: string;
  address: string;
  emergency_contact: string;
  blood_group: string;
  allergies: string;
  chronic_conditions: string;
  created_at: string;
  updated_at: string;
  history: PatientHistory;
}

export interface DashboardSummary {
  patient_count: number;
  recent_patients: PatientSummary[];
  role: RoleCode;
}

export type VisitStatus = "open" | "in_progress" | "closed";
export type DiagnosisSeverity = "mild" | "moderate" | "severe" | "critical";
export type PrescriptionStatus = "active" | "dispensed" | "cancelled";
export type LabPriority = "routine" | "urgent" | "stat";
export type LabRequestStatus = "requested" | "in_progress" | "completed" | "cancelled";

export interface VitalSigns {
  id?: number;
  visit?: number;
  patient?: number;
  temperature: number | null;
  blood_pressure: string;
  pulse_rate: number | null;
  respiratory_rate: number | null;
  oxygen_saturation: number | null;
  weight: number | null;
  height: number | null;
  bmi?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Diagnosis {
  id?: number;
  visit?: number;
  patient?: number;
  diagnosed_by?: number;
  diagnosed_by_name?: string;
  primary_diagnosis: string;
  secondary_diagnosis: string;
  icd_code: string;
  severity: DiagnosisSeverity;
  clinical_notes: string;
  created_at?: string;
  updated_at?: string;
}

export interface Prescription {
  id?: number;
  visit?: number;
  patient?: number;
  prescribed_by?: number;
  prescribed_by_name?: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
  status: PrescriptionStatus;
  dispensed_by?: number | null;
  dispensed_by_name?: string;
  dispensed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LabResult {
  id?: number;
  lab_request?: number;
  uploaded_by?: number;
  uploaded_by_name?: string;
  result_text: string;
  remarks: string;
  attachment?: string | null;
  attachment_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LabRequest {
  id?: number;
  visit?: number;
  patient?: number;
  requested_by?: number;
  requested_by_name?: string;
  test_name: string;
  priority: LabPriority;
  clinical_notes: string;
  status: LabRequestStatus;
  result?: LabResult | null;
  created_at?: string;
  updated_at?: string;
}

export interface VisitSummary {
  id: number;
  visit_id: string;
  patient: number;
  patient_name: string;
  doctor: number;
  doctor_name: string;
  visit_date: string;
  chief_complaint: string;
  diagnosis_summary: string;
  status: VisitStatus;
  follow_up_date: string | null;
  created_at: string;
}

export interface VisitDetail {
  id: number;
  visit_id: string;
  patient: number;
  patient_name: string;
  doctor: number;
  doctor_name: string;
  visit_date: string;
  chief_complaint: string;
  symptoms: string;
  diagnosis_summary: string;
  treatment_plan: string;
  follow_up_date: string | null;
  status: VisitStatus;
  vitals?: VitalSigns | null;
  diagnosis?: Diagnosis | null;
  prescriptions: Prescription[];
  lab_requests: LabRequest[];
  created_at: string;
  updated_at: string;
}

export interface TimelineEntry {
  type: "visit" | "vitals" | "diagnosis" | "prescription" | "lab_request" | "lab_result";
  occurred_at: string;
  title: string;
  summary: string;
  patient_id: number;
  visit_id: number | null;
  status: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface DashboardLabRequest {
  id: number;
  test_name: string;
  priority: LabPriority;
  status: LabRequestStatus;
  patient: number;
  patient_name: string;
  created_at: string;
  visit: number;
}

export interface ClinicalDashboardSummary extends DashboardSummary {
  today_visits_count: number;
  today_visits: VisitSummary[];
  pending_lab_results_count: number;
  pending_lab_requests: DashboardLabRequest[];
  open_visits_count: number;
}

export type WardType = "general" | "icu" | "maternity" | "pediatric" | "surgical" | "isolation";
export type BedOccupancyStatus = "available" | "occupied" | "maintenance";
export type AdmissionStatus = "active" | "discharged";
export type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | "void";
export type PaymentMethod = "cash" | "mpesa" | "card" | "insurance";
export type ImagingType = "xray" | "mri" | "ct_scan" | "ultrasound";
export type ImagingRequestStatus = "requested" | "scheduled" | "completed" | "cancelled";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
export type ReminderDeliveryStatus = "pending" | "sent" | "failed" | "skipped" | "retrying";
export type ReminderChannel = "sms" | "email";
export type ReminderProvider = "africas_talking" | "smtp" | "sendgrid" | "system";

export interface Ward {
  id: number;
  ward_name: string;
  ward_type: WardType;
  capacity: number;
  description: string;
  occupied_beds_count: number;
  created_at: string;
  updated_at: string;
}

export interface Bed {
  id: number;
  bed_number: string;
  ward: number;
  ward_name: string;
  occupancy_status: BedOccupancyStatus;
  created_at: string;
  updated_at: string;
}

export interface Admission {
  id: number;
  patient: number;
  patient_name: string;
  admitted_by: number;
  admitted_by_name: string;
  ward: number;
  ward_name: string;
  bed: number;
  bed_number: string;
  admission_reason: string;
  admission_date: string;
  discharge_date: string | null;
  status: AdmissionStatus;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  invoice: number;
  amount_paid: string;
  payment_method: PaymentMethod;
  transaction_reference: string;
  payment_date: string;
  recorded_by?: number | null;
  recorded_by_name?: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  patient: number;
  patient_name: string;
  visit: number | null;
  admission: number | null;
  consultation_fee: string;
  lab_fee: string;
  pharmacy_fee: string;
  admission_fee: string;
  radiology_fee: string;
  total_amount: string;
  amount_paid: string;
  balance_due: string;
  insurance_provider: string;
  insurance_policy_number: string;
  status: InvoiceStatus;
  payments: Payment[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceReceipt {
  invoice: Invoice;
  payments: Payment[];
}

export interface ImagingResultRecord {
  id: number;
  imaging_request: number;
  uploaded_by?: number;
  uploaded_by_name?: string;
  radiologist_report: string;
  remarks: string;
  attachment?: string | null;
  attachment_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImagingRequestRecord {
  id: number;
  patient: number;
  patient_name: string;
  visit: number | null;
  requested_by?: number;
  requested_by_name?: string;
  imaging_type: ImagingType;
  clinical_notes: string;
  status: ImagingRequestStatus;
  result?: ImagingResultRecord | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRecord {
  id: number;
  title: string;
  message: string;
  module: string;
  patient: number | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationSummary {
  unread_count: number;
  recent: NotificationRecord[];
}

export interface OperationsDashboardSummary {
  active_admissions_count: number;
  occupied_beds_count: number;
  available_beds_count: number;
  pending_invoices_count: number;
  revenue_collected_today: string;
  active_admissions: Admission[];
  recent_lab_activity: DashboardLabRequest[];
  pending_invoices: Invoice[];
}

export interface ReportingSummary {
  admissions: number;
  active_admissions: number;
  total_revenue: string;
  pending_invoices: number;
  diagnoses: number;
  lab_requests: number;
  pharmacy_usage: number;
}

export interface DoctorOption {
  id: number;
  username: string;
  full_name: string;
  email: string;
}

export interface AppointmentReferenceData {
  doctors: DoctorOption[];
  statuses: Array<{ code: AppointmentStatus; label: string }>;
}

export interface PatientCommunicationPreferenceRecord {
  id: number;
  patient: number;
  patient_name: string;
  sms_enabled: boolean;
  email_enabled: boolean;
  phone_number: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentRecord {
  id: number;
  patient: number;
  patient_name: string;
  doctor: number;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  appointment_datetime: string;
  status: AppointmentStatus;
  reason: string;
  notes: string;
  reminder_sent: boolean;
  sms_status: ReminderDeliveryStatus;
  email_status: ReminderDeliveryStatus;
  phone_number: string;
  email: string;
  scheduled_by?: number | null;
  scheduled_by_name?: string;
  updated_by?: number | null;
  updated_by_name?: string;
  reminder_last_attempt_at?: string | null;
  reminder_sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderLogRecord {
  id: number;
  appointment: number;
  patient: number;
  patient_name: string;
  doctor_name: string;
  channel: ReminderChannel;
  status: ReminderDeliveryStatus;
  provider: ReminderProvider;
  recipient: string;
  reminder_date: string;
  scheduled_for: string;
  sent_at: string | null;
  last_attempt_at: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  external_message_id: string;
  message_preview: string;
  response_payload: Record<string, unknown>;
  error_message: string;
  triggered_by?: number | null;
  appointment_date: string;
  appointment_time: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentReminderDashboardSummary {
  appointments_tomorrow_count: number;
  reminders_sent_today_count: number;
  reminders_failed_count: number;
  reminders_retrying_count: number;
  sms_sent_count: number;
  email_sent_count: number;
  channel_breakdown: Array<{ channel: ReminderChannel; status: ReminderDeliveryStatus; total: number }>;
  upcoming_appointments: AppointmentRecord[];
  failed_logs: ReminderLogRecord[];
  recent_logs: ReminderLogRecord[];
}

export interface PaginatedResponse<T> {
  count: number;
  page: number;
  page_size: number;
  num_pages: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
