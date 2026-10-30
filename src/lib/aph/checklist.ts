/**
 * AICTE Approval Document Checklist engine (SIH26262).
 *
 * Client-safe, pure module. Builds the applicable document checklist for an
 * application from its AICTE application category, institution type, funding
 * classification and building age. Every item carries its APH source; items
 * that could not be verified against an official published clause are marked
 * with "Pending Official Rule Configuration" — never presented as invented
 * official requirements.
 *
 * Source references come from the configured requirement set (AICTE APH
 * 2024–2027, Annexure-1 / Annexure-2 Clause 2.1) as supplied by the project's
 * rule configuration, which administrators maintain in the APH Rules &
 * Checklist Configuration module.
 */

export type ChecklistApplicability = "mandatory" | "conditional" | "optional";

export interface AicteCategory {
  value: string;
  label: string;
  /** Existing-institution categories use the Annexure-2 self-disclosure base set. */
  baseSet: "annexure_1" | "annexure_2" | "none";
}

export const AICTE_APPLICATION_CATEGORIES: AicteCategory[] = [
  { value: "new_institution", label: "New Technical Institution – Approval", baseSet: "annexure_1" },
  { value: "eoa", label: "Existing Institution – Extension of Approval (EoA)", baseSet: "annexure_2" },
  { value: "eoa_break", label: "EoA after Break / Restoration of Intake", baseSet: "annexure_2" },
  { value: "increase_intake", label: "Increase in Intake", baseSet: "annexure_2" },
  { value: "new_programme", label: "Additional Course / New Programme / New Level", baseSet: "annexure_2" },
  { value: "change_site", label: "Change of Site / Location", baseSet: "annexure_2" },
  { value: "conversion", label: "Conversion of Institution Type", baseSet: "annexure_2" },
  { value: "merger", label: "Merger of Institutions", baseSet: "annexure_2" },
  { value: "other", label: "Other AICTE approval categories", baseSet: "annexure_2" },
];

export const FUNDING_TYPES = ["Government", "Government-aided", "Self-financing"] as const;

const APH_VERSION = "2024-2027";

/** Annexure-2, Clause 2.1 — Extension of Approval on self-disclosure. */
const ANNEXURE_2_CLAUSE_2_1 = "AICTE APH 2024–2027, Annexure-2, Clause 2.1";
const ANNEXURE_1 = "AICTE APH 2024–2027, Annexure-1";
const PENDING = "Pending Official Rule Configuration";

export interface ChecklistItemDef {
  documentCategory: string;
  name: string;
  applicability: ChecklistApplicability;
  /** Why the item applies or is conditional (shown on the card). */
  applicabilityReason?: string;
  aphSource: string;
  /** Only for these application category values (empty = all selected categories). */
  onlyCategories?: string[];
  requiresExpiry?: boolean;
}

const EOA_BASE_SET: ChecklistItemDef[] = [
  {
    documentCategory: "affidavit_2",
    name: "Affidavit 2",
    applicability: "mandatory",
    aphSource: `${APH_VERSION ? `${ANNEXURE_2_CLAUSE_2_1}` : ""} (i)`,
  },
  {
    documentCategory: "payment_receipt",
    name: "AICTE Portal Payment Receipt",
    applicability: "conditional",
    applicabilityReason: "Required if applicable / when the payment has been made.",
    aphSource: `${ANNEXURE_2_CLAUSE_2_1} (ii)`,
  },
  {
    documentCategory: "occupancy_certificate",
    name: "Occupancy Certificate / Completion Certificate / Building License / Form D",
    applicability: "mandatory",
    applicabilityReason: "Valid certificate from the competent authority, as applicable.",
    aphSource: `${ANNEXURE_2_CLAUSE_2_1} (iii)`,
  },
  {
    documentCategory: "structural_stability",
    name: "Structural Stability Certificate",
    applicability: "conditional",
    applicabilityReason:
      "Required only when the building is more than 30 years old from the issue of the Completion Certificate.",
    aphSource: `${ANNEXURE_2_CLAUSE_2_1} (iv)`,
  },
  {
    documentCategory: "fire_safety_certificate",
    name: "Valid Fire Safety Certificate",
    applicability: "mandatory",
    aphSource: `${ANNEXURE_2_CLAUSE_2_1} (v)`,
    requiresExpiry: true,
  },
  {
    documentCategory: "satellite_map",
    name: "Satellite Map with Latitude & Longitude",
    applicability: "mandatory",
    applicabilityReason: "Showing the institution location with latitude and longitude at the entrance of the main building.",
    aphSource: `${ANNEXURE_2_CLAUSE_2_1} (vi)`,
  },
  {
    documentCategory: "audited_accounts",
    name: "Previous Year Audited Statement of Accounts",
    applicability: "mandatory",
    applicabilityReason: "Audited accounts of the Trust / Society / Company for the previous year.",
    aphSource: `${ANNEXURE_2_CLAUSE_2_1} (vii)`,
  },
];

const NEW_INSTITUTION_SET: ChecklistItemDef[] = [
  {
    documentCategory: "approved_building_plan",
    name: "Approved Building Plan",
    applicability: "mandatory",
    applicabilityReason: "Prepared by a qualified Architect / Licensed Surveyor and approved by the competent authority.",
    aphSource: `${ANNEXURE_1} (building plan)`,
  },
  {
    documentCategory: "affidavit_2_new",
    name: "Affidavit 2",
    applicability: "mandatory",
    aphSource: `${ANNEXURE_1} (affidavit)`,
  },
  {
    documentCategory: "organization_resolution_format3",
    name: "Applicant Organization Resolution (Format 3)",
    applicability: "mandatory",
    aphSource: `${ANNEXURE_1} (resolution)`,
  },
  {
    documentCategory: "occupancy_certificate_new",
    name: "Occupancy Certificate / Completion Certificate / Building License / Form D",
    applicability: "mandatory",
    applicabilityReason: "As applicable, from the competent authority.",
    aphSource: `${ANNEXURE_1} (occupancy)`,
  },
  {
    documentCategory: "fire_safety_new",
    name: "Valid Fire Safety Certificate",
    applicability: "mandatory",
    aphSource: `${ANNEXURE_1} (fire safety)`,
    requiresExpiry: true,
  },
  {
    documentCategory: "bank_manager_certificate",
    name: "Bank Manager Certificate",
    applicability: "mandatory",
    applicabilityReason: "Regarding the financial status of the applicant organization.",
    aphSource: `${ANNEXURE_1} (bank certificate)`,
  },
  {
    documentCategory: "aicte_application_copy",
    name: "Complete AICTE Application Copy",
    applicability: "mandatory",
    aphSource: `${ANNEXURE_1} (application copy)`,
  },
  {
    documentCategory: "trust_registration_moa",
    name: "Trust / Society / Company Registration Documents",
    applicability: "mandatory",
    applicabilityReason: "Including MoA and Rules, as applicable.",
    aphSource: `${ANNEXURE_1} (registration)`,
  },
  {
    documentCategory: "land_building_ownership",
    name: "Land / Building Ownership or Registered Lease Documents",
    applicability: "mandatory",
    applicabilityReason: "According to APH requirements; additional documents depend on the type of land/building ownership — lease cases carry the APH lease-condition additions.",
    aphSource: `${ANNEXURE_1} (land / building)`,
    requiresExpiry: true,
  },
  {
    documentCategory: "lease_ownership_additions",
    name: "Additional Documents for Private Lease of Land / Building",
    applicability: "conditional",
    applicabilityReason: "Only when the land/building is held on a private lease — the specific additional documents are listed in the relevant Annexure-1 sub-clauses.",
    aphSource: `${ANNEXURE_1} (lease sub-clauses)`,
    requiresExpiry: true,
  },
];

/** Additional documents generated only for the categories that require them. */
const CATEGORY_ADDITIONS: Record<string, ChecklistItemDef[]> = {
  new_programme: [
    {
      documentCategory: "noc_university_format2",
      name: "NOC from Affiliating University / Board (Format 2)",
      applicability: "conditional",
      applicabilityReason: "Where applicable for a new programme / level.",
      aphSource: "Applicable APH clause — " + PENDING,
    },
    {
      documentCategory: "resolution_additional_course_prog",
      name: "Trust / Society / Company Resolution for New Programme",
      applicability: "mandatory",
      applicabilityReason: "Resolution approving the proposed new programme / level.",
      aphSource: "Applicable APH clause — " + PENDING,
    },
  ],
  change_site: [
    {
      documentCategory: "noc_university_format2_site",
      name: "NOC from Affiliating University / Board (Format 2)",
      applicability: "conditional",
      applicabilityReason: "Where applicable for a change of site / location.",
      aphSource: "Applicable APH clause — " + PENDING,
    },
    {
      documentCategory: "site_building_documents",
      name: "Site / Building Documents for the New Location",
      applicability: "mandatory",
      applicabilityReason: "Relevant site/building documents where the application involves a change of location.",
      aphSource: "Applicable APH clause — " + PENDING,
      requiresExpiry: true,
    },
  ],
  increase_intake: [
    {
      documentCategory: "affidavit_8",
      name: "Affidavit 8",
      applicability: "mandatory",
      applicabilityReason: "Applicable for Increase in Intake; not applicable for Extended EoA.",
      aphSource: "Applicable APH clause — " + PENDING,
    },
    {
      documentCategory: "resolution_additional_course",
      name: "Trust / Society / Company Resolution for Additional Course(s)",
      applicability: "mandatory",
      applicabilityReason: "Approving the proposed additional course(s) / division(s).",
      aphSource: "Applicable APH clause — " + PENDING,
    },
    {
      documentCategory: "faculty_infrastructure_evidence",
      name: "Evidence of Faculty and Infrastructure Availability",
      applicability: "conditional",
      applicabilityReason: "As applicable; EVC-related evidence where the applicable workflow requires it.",
      aphSource: "Applicable APH clause — " + PENDING,
    },
  ],
  other: [
    {
      documentCategory: "other_category_documents",
      name: "Other Category-Specific Documents",
      applicability: "conditional",
      applicabilityReason: "Documents required by the relevant APH clause for this approval category.",
      aphSource: "Applicable APH clause — " + PENDING,
    },
  ],
};

/** Whole building age in years from the Completion Certificate issue date. */
export function buildingAgeYears(
  buildingCompletionDate: string | null | undefined,
  now: number = Date.now(),
): number | null {
  if (!buildingCompletionDate) return null;
  const t = new Date(`${buildingCompletionDate}T00:00:00`).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now - t) / (365.25 * 86_400_000));
}

/** The 30-year Structural Stability condition (Annexure-2, Clause 2.1(iv)). */
export const STRUCTURAL_STABILITY_AGE_YEARS = 30;

export interface ChecklistItem extends ChecklistItemDef {
  applicable: boolean;
  /** Human explanation of why the item does or does not apply here. */
  applicabilityExplanation: string;
  /** Signature guidance for the authorized signatory. */
  authenticationNote?: string;
}

export interface BuildChecklistInput {
  applicationCategory: string | null | undefined;
  fundingType: string | null | undefined;
  buildingCompletionDate: string | null | undefined;
  now?: number;
}

/**
 * Builds the applicable checklist for one application. Conditional items whose
 * condition is not met (e.g. Structural Stability for a building 30 years old
 * or younger) are returned with applicable=false so the UI can explain the
 * condition instead of demanding the document.
 */
export function buildChecklist(input: BuildChecklistInput): ChecklistItem[] {
  const category =
    AICTE_APPLICATION_CATEGORIES.find((c) => c.value === input.applicationCategory) ??
    AICTE_APPLICATION_CATEGORIES.find((c) => c.value === "other")!;

  const defs: ChecklistItemDef[] =
    category.baseSet === "annexure_1"
      ? [...NEW_INSTITUTION_SET]
      : category.baseSet === "annexure_2"
        ? [...EOA_BASE_SET, ...(CATEGORY_ADDITIONS[category.value] ?? [])]
        : [];

  // Category-specific additions also ride on top of the Annexure-1 base set
  // (e.g. a new programme inside a new institution application).
  if (category.baseSet === "annexure_1" && CATEGORY_ADDITIONS[category.value]) {
    defs.push(...CATEGORY_ADDITIONS[category.value]!);
  }

  const age = buildingAgeYears(input.buildingCompletionDate, input.now ?? Date.now());

  const items = defs.map((def): ChecklistItem => {
    let applicable = true;
    let explanation =
      def.applicabilityReason ??
      (def.applicability === "mandatory"
        ? "Required for this application category."
        : "Applicable to this application category.");

    if (def.documentCategory === "structural_stability") {
      if (age === null) {
        applicable = false;
        explanation =
          "Condition not evaluated: the Completion Certificate issue date has not been captured. The certificate is required only when the building is more than 30 years old from the issue of the Completion Certificate.";
      } else if (age <= STRUCTURAL_STABILITY_AGE_YEARS) {
        applicable = false;
        explanation = `Not required: the building is ${age} year${age === 1 ? "" : "s"} old from the issue of the Completion Certificate (condition: more than ${STRUCTURAL_STABILITY_AGE_YEARS} years).`;
      } else {
        explanation = `Required: the building is ${age} years old from the issue of the Completion Certificate (more than ${STRUCTURAL_STABILITY_AGE_YEARS} years).`;
      }
    }

    if (def.documentCategory === "payment_receipt") {
      applicable = true; // conditional applicability decided by the applicant; reviewer verifies
      explanation =
        def.applicabilityReason ??
        explanation;
    }

    const authenticationNote =
      def.documentCategory.startsWith("affidavit") || def.documentCategory.includes("resolution")
        ? input.fundingType === "Self-financing"
          ? "Must be authenticated by the Chairman / Secretary of the Trust, Society or Company (self-financing institution)."
          : input.fundingType === "Government" || input.fundingType === "Government-aided"
            ? "Must be authenticated by the authorized person as applicable for a Government / Government-aided institution."
            : undefined
        : undefined;

    return { ...def, applicable, applicabilityExplanation: explanation, authenticationNote };
  });

  return items;
}

// ============ Checklist document status ============

export type ChecklistItemStatus =
  | "not_uploaded"
  | "uploaded"
  | "under_review"
  | "accepted"
  | "rejected"
  | "correction_requested"
  | "expired"
  | "not_applicable";

export const CHECKLIST_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  not_uploaded: "Not Uploaded",
  uploaded: "Uploaded",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
  correction_requested: "Correction Requested",
  expired: "Expired",
  not_applicable: "Not Applicable",
};

export const CHECKLIST_STATUS_BADGE_CLASSES: Record<ChecklistItemStatus, string> = {
  not_uploaded: "bg-muted text-muted-foreground border-border",
  uploaded: "bg-info-soft text-info border-info/30",
  under_review: "bg-accent text-accent-foreground border-teal/30",
  accepted: "bg-success-soft text-success border-success/40",
  rejected: "bg-danger-soft text-destructive border-destructive/40",
  correction_requested: "bg-warning-soft text-warning border-warning/40",
  expired: "bg-danger-soft text-destructive border-destructive/40",
  not_applicable: "bg-muted text-muted-foreground border-border",
};

export interface UploadedDocumentLike {
  id: string;
  file_name: string;
  verification_status: string | null;
  uploaded_at: string | null;
  review_remarks?: string | null;
  correction_reason?: string | null;
  /** ISO date or null; expiry is only known when extracted/entered. */
  expiry_date?: string | null;
}

/**
 * Derives the checklist status of one item. An uploaded document NEVER
 * auto-accepts: only an authorized reviewer can mark Accepted / Rejected.
 */
export function deriveChecklistStatus(
  doc: UploadedDocumentLike | undefined,
  overrideStatus?: string | null,
): ChecklistItemStatus {
  if (overrideStatus === "not_applicable") return "not_applicable";
  if (!doc) return "not_uploaded";
  if (doc.expiry_date) {
    const days = Math.ceil((new Date(`${doc.expiry_date}T00:00:00`).getTime() - Date.now()) / 86_400_000);
    if (days < 0 && doc.verification_status !== "accepted") return "expired";
    if (days < 0) return "expired";
  }
  switch (doc.verification_status) {
    case "accepted":
    case "verified":
      return "accepted";
    case "rejected":
      return "rejected";
    case "correction_requested":
      return "correction_requested";
    case "under_review":
    case "needs_review":
      return "under_review";
    default:
      return "uploaded";
  }
}

/** Aggregate counters used by the checklist header. */
export function summarizeChecklist(items: { applicable: boolean; status: ChecklistItemStatus }[]) {
  const applicableItems = items.filter((i) => i.applicable && i.status !== "not_applicable");
  const accepted = applicableItems.filter((i) => i.status === "accepted").length;
  const missing = applicableItems.filter(
    (i) => i.status === "not_uploaded" || i.status === "rejected" || i.status === "correction_requested",
  ).length;
  const expiring = applicableItems.filter((i) => i.status === "expired").length;
  const pendingReview = applicableItems.filter(
    (i) => i.status === "uploaded" || i.status === "under_review",
  ).length;
  const progress = applicableItems.length === 0 ? 100 : Math.round((accepted / applicableItems.length) * 100);
  return { total: applicableItems.length, accepted, missing, expiring, pendingReview, progress };
}

/** Legacy uploaded documents that pre-date the APH checklist. */
export const LEGACY_DOCUMENT_MAPPING_NOTE =
  "Legacy Document – Requires Mapping: this upload pre-dates the APH-based checklist. " +
  "An administrator should map it to the applicable requirement or archive it.";
