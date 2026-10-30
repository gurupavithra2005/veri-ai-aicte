export type AppStatus =
  | "draft"
  | "submitted"
  | "processing"
  | "action_required"
  | "manual_review"
  | "verified"
  | "rejected";

export const STATUS_LABELS: Record<AppStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  processing: "Processing",
  action_required: "Action Required",
  manual_review: "Under Manual Review",
  verified: "Verified",
  rejected: "Rejected",
};

/** Tailwind classes per status, built from semantic design tokens. */
export const STATUS_BADGE_CLASSES: Record<AppStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  submitted: "bg-info-soft text-info border-info/30",
  processing: "bg-accent text-accent-foreground border-teal/30",
  action_required: "bg-warning-soft text-warning border-warning/40",
  manual_review: "bg-info-soft text-info border-info/40",
  verified: "bg-success-soft text-success border-success/40",
  rejected: "bg-danger-soft text-destructive border-destructive/40",
};

export type OcrStatus =
  | "not_processed"
  | "processing"
  | "completed"
  | "needs_review"
  | "failed";

export const OCR_STATUS_LABELS: Record<OcrStatus, string> = {
  not_processed: "Not Processed",
  processing: "Processing",
  completed: "Completed",
  needs_review: "Needs Review",
  failed: "Failed",
};

export type FindingCategory =
  | "missing_document"
  | "missing_information"
  | "information_mismatch"
  | "date_inconsistency"
  | "ocr_review_required"
  | "duplicate_file"
  | "metadata_anomaly";

export const FINDING_CATEGORY_LABELS: Record<FindingCategory, string> = {
  missing_document: "Missing Document",
  missing_information: "Missing Information",
  information_mismatch: "Information Mismatch",
  date_inconsistency: "Date Inconsistency",
  ocr_review_required: "OCR Review Required",
  duplicate_file: "Duplicate File",
  metadata_anomaly: "Metadata Anomaly",
};

export type Severity = "low" | "medium" | "high";

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const SEVERITY_BADGE_CLASSES: Record<Severity, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-warning-soft text-warning border-warning/40",
  high: "bg-danger-soft text-destructive border-destructive/40",
};

export type FindingStatus = "open" | "resolved";

// ============ SIH26262 approval workflow labels ============

export type AppRole =
  | "institution_user"
  | "reviewer"
  | "admin"
  | "regional_officer"
  | "evc_coordinator"
  | "competent_authority";

export const ROLE_LABELS: Record<AppRole, string> = {
  institution_user: "Institution User",
  reviewer: "Scrutiny Officer",
  admin: "Administrator",
  regional_officer: "Regional Officer",
  evc_coordinator: "EVC Coordinator",
  competent_authority: "Competent Authority",
};

/** Approval workflow states (separate from the legacy verification `status`). */
export type ApprovalState =
  | "in_progress"
  | "returned"
  | "with_committee"
  | "approved"
  | "rejected"
  | "withdrawn";

export const APPROVAL_STATE_LABELS: Record<ApprovalState, string> = {
  in_progress: "In Progress",
  returned: "Returned for Clarification",
  with_committee: "With Competent Authority",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const APPROVAL_STATE_BADGE_CLASSES: Record<ApprovalState, string> = {
  in_progress: "bg-info-soft text-info border-info/30",
  returned: "bg-warning-soft text-warning border-warning/40",
  with_committee: "bg-accent text-accent-foreground border-teal/30",
  approved: "bg-success-soft text-success border-success/40",
  rejected: "bg-danger-soft text-destructive border-destructive/40",
  withdrawn: "bg-muted text-muted-foreground border-border",
};

export const STAGE_LABELS: Record<string, string> = {
  initial_scrutiny: "Initial Scrutiny",
  re_scrutiny: "Re-scrutiny",
  evc: "Expert Visit Committee (EVC)",
  committee_review: "Committee Review (SAC/SHC)",
  competent_authority: "Competent Authority Decision",
  compliance_verification: "Compliance Verification",
};

export const EVC_STATUS_LABELS: Record<string, string> = {
  pending_scheduling: "Pending Scheduling",
  scheduled: "Scheduled",
  in_progress: "Visit In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  overdue: "Overdue",
};

export const EVC_STATUS_BADGE_CLASSES: Record<string, string> = {
  pending_scheduling: "bg-warning-soft text-warning border-warning/40",
  scheduled: "bg-info-soft text-info border-info/30",
  in_progress: "bg-accent text-accent-foreground border-teal/30",
  completed: "bg-success-soft text-success border-success/40",
  cancelled: "bg-muted text-muted-foreground border-border",
  overdue: "bg-danger-soft text-destructive border-destructive/40",
};

export const UNDERTAKING_STATUS_LABELS: Record<string, string> = {
  upcoming: "Upcoming",
  due_soon: "Due Soon",
  pending_submission: "Pending Submission",
  submitted: "Submitted",
  under_verification: "Under Verification",
  correction_required: "Correction Required",
  complied: "Complied",
  overdue: "Overdue",
  escalated: "Escalated",
};

export const UNDERTAKING_STATUS_BADGE_CLASSES: Record<string, string> = {
  upcoming: "bg-muted text-muted-foreground border-border",
  due_soon: "bg-warning-soft text-warning border-warning/40",
  pending_submission: "bg-warning-soft text-warning border-warning/40",
  submitted: "bg-info-soft text-info border-info/30",
  under_verification: "bg-accent text-accent-foreground border-teal/30",
  correction_required: "bg-danger-soft text-destructive border-destructive/40",
  complied: "bg-success-soft text-success border-success/40",
  overdue: "bg-danger-soft text-destructive border-destructive/40",
  escalated: "bg-danger-soft text-destructive border-destructive/40",
};

export const VALIDITY_STATUS_LABELS: Record<string, string> = {
  valid: "Valid",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  renewal_pending: "Renewal Pending",
  renewal_submitted: "Renewal Submitted",
  under_verification: "Under Verification",
  renewed: "Renewed",
  correction_required: "Correction Required",
};

export const VALIDITY_STATUS_BADGE_CLASSES: Record<string, string> = {
  valid: "bg-success-soft text-success border-success/40",
  expiring_soon: "bg-warning-soft text-warning border-warning/40",
  expired: "bg-danger-soft text-destructive border-destructive/40",
  renewal_pending: "bg-warning-soft text-warning border-warning/40",
  renewal_submitted: "bg-info-soft text-info border-info/30",
  under_verification: "bg-accent text-accent-foreground border-teal/30",
  renewed: "bg-success-soft text-success border-success/40",
  correction_required: "bg-danger-soft text-destructive border-destructive/40",
};

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Whole days between now and a date (negative = past). */
export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}
