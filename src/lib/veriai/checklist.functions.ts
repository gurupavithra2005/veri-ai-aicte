import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.server";
import { notifyUsers } from "./notifications.server";
import {
  buildChecklist,
  categoryCodeFromLabel,
  deriveChecklistStatus,
  summarizeChecklist,
  LEGACY_DOCUMENT_MAPPING_NOTE,
  type ChecklistItem,
  type ChecklistItemStatus,
} from "@/lib/aph/checklist";

/**
 * SIH26262 — AICTE Approval Document Checklist server functions.
 * The checklist is generated dynamically from the application category and APH
 * applicability rules; uploaded documents never auto-accept, and only an
 * authorized official can set Accepted / Rejected / Correction Requested.
 */

export interface ChecklistItemState extends ChecklistItem {
  status: ChecklistItemStatus;
  linkedDocumentId: string | null;
  linkedFileName: string | null;
  reviewRemarks: string | null;
  correctionReason: string | null;
  /** Legacy uploads that pre-date the APH checklist surface here. */
  legacyMappingRequired: boolean;
}

export const getAphChecklist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ applicationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{
    applicationId: string;
    applicationCategory: string | null;
    categoryLabel: string | null;
    fundingType: string | null;
    aphVersion: string | null;
    buildingCompletionDate: string | null;
    buildingAgeYears: number | null;
    items: ChecklistItemState[];
    summary: ReturnType<typeof summarizeChecklist>;
    complianceRecords: {
      id: string;
      documentType: string;
      documentNumber: string | null;
      issueDate: string | null;
      expiryDate: string | null;
      validityStatus: string;
      fileName: string | null;
      isLegacy: boolean;
    }[];
    undertakings: {
      id: string;
      title: string;
      dueDate: string | null;
      status: string;
      verificationStatus: string | null;
    }[];
    legacyUnmapped: string[];
  }> => {
    const supabase = context.supabase;
    const { data: app } = await supabase
      .from("applications")
      .select(
        "id, created_by, institution_id, application_category, funding_type, building_completion_date, aph_version, application_number",
      )
      .eq("id", data.applicationId)
      .single();
    if (!app) throw new Error("Application not found or not accessible.");

    const categoryCode = categoryCodeFromLabel(app.application_category);
    const items = buildChecklist({
      applicationCategory: categoryCode,
      fundingType: app.funding_type,
      buildingCompletionDate: app.building_completion_date,
    });

    const [requirementsRes, documentsRes, overridesRes, complianceRes, undertakingsRes] =
      await Promise.all([
        supabase
          .from("document_requirements")
          .select("document_category, requirement_name, description, aph_version, issue_date_required, expiry_date_required")
          .eq("active", true)
          .eq("applicable_application_type", categoryCode),
        supabase
          .from("documents")
          .select("id, document_category, file_name, verification_status, review_remarks, correction_reason, uploaded_at, is_current")
          .eq("application_id", data.applicationId)
          .order("uploaded_at", { ascending: false }),
        supabase.from("applications").select("checklist_overrides").eq("id", data.applicationId).single(),
        app.institution_id
          ? supabase
              .from("compliance_documents")
              .select("id, document_type, document_number, issue_date, expiry_date, validity_status, file_name, created_at")
              .eq("institution_id", app.institution_id)
              .order("updated_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase
          .from("undertakings")
          .select("id, title, due_date, status, verification_status")
          .eq("application_id", data.applicationId)
          .order("due_date", { ascending: true, nullsFirst: false }),
      ]);

    const overrides = (overridesRes.data?.checklist_overrides ?? {}) as Record<
      string,
      { status?: string; reason?: string }
    >;
    const docs = (documentsRes.data ?? []) as {
      id: string;
      document_category: string;
      file_name: string;
      verification_status: string | null;
      review_remarks: string | null;
      correction_reason: string | null;
      uploaded_at: string | null;
      is_current: boolean;
    }[];

    // Legacy demo categories retired by the APH checklist migration.
    const LEGACY_CATEGORIES = new Set([
      "institution_registration_certificate",
      "society_or_trust_deed",
      "recognition_or_affiliation_approval",
      "annual_report",
    ]);

    const requirementMap = new Map(
      ((requirementsRes.data ?? []) as { document_category: string; requirement_name: string; description: string | null; aph_version: string | null }[]).map((r) => [
        r.document_category,
        r,
      ]),
    );

    // Expiry dates known from the institution's compliance registry, keyed by document type.
    const expiryByType = new Map<string, string>();
    for (const c of (complianceRes.data ?? []) as { document_type: string; expiry_date: string | null }[]) {
      if (c.expiry_date && !expiryByType.has(c.document_type)) expiryByType.set(c.document_type, c.expiry_date);
    }

    const itemStates: ChecklistItemState[] = items.map((item) => {
      // Latest current-version upload for this checklist category.
      const linked = docs.find((d) => d.document_category === item.documentCategory && d.is_current);
      const requirement = requirementMap.get(item.documentCategory);
      const override = overrides[item.documentCategory];
      const status = deriveChecklistStatus(
        linked
          ? {
              id: linked.id,
              file_name: linked.file_name,
              verification_status: linked.verification_status,
              uploaded_at: linked.uploaded_at,
              review_remarks: linked.review_remarks,
              correction_reason: linked.correction_reason,
              expiry_date: expiryByType.get(item.documentCategory) ?? null,
            }
          : undefined,
        override?.status ?? null,
      );
      return {
        ...item,
        name: requirement?.requirement_name ?? item.name,
        status,
        linkedDocumentId: linked?.id ?? null,
        linkedFileName: linked?.file_name ?? null,
        reviewRemarks: linked?.review_remarks ?? null,
        correctionReason: linked?.correction_reason ?? null,
        legacyMappingRequired: false,
      };
    });

    const complianceRecords = ((complianceRes.data ?? []) as {
      id: string;
      document_type: string;
      document_number: string | null;
      issue_date: string | null;
      expiry_date: string | null;
      validity_status: string;
      file_name: string | null;
      created_at: string;
    }[]).map((c) => ({
      id: c.id,
      documentType: c.document_type,
      documentNumber: c.document_number,
      issueDate: c.issue_date,
      expiryDate: c.expiry_date,
      validityStatus: c.validity_status,
      fileName: c.file_name,
      isLegacy: false,
    }));

    // Legacy documents uploaded before the APH checklist: surfaced for admin mapping.
    const legacyDocs = docs.filter((d) => LEGACY_CATEGORIES.has(d.document_category) && d.is_current);
    const legacyUnmapped = legacyDocs.map(
      (d) => `${d.file_name} (${d.document_category}) — ${LEGACY_DOCUMENT_MAPPING_NOTE}`,
    );

    const buildingAge = app.building_completion_date
      ? Math.floor((Date.now() - new Date(`${app.building_completion_date}T00:00:00`).getTime()) / (365.25 * 86_400_000))
      : null;

    return {
      applicationId: app.id,
      applicationCategory: app.application_category,
      categoryLabel: app.application_category,
      fundingType: app.funding_type,
      aphVersion: app.aph_version ?? "2024-2027",
      buildingCompletionDate: app.building_completion_date,
      buildingAgeYears: buildingAge,
      items: itemStates,
      summary: summarizeChecklist(itemStates),
      complianceRecords,
      undertakings: ((undertakingsRes.data ?? []) as {
        id: string;
        title: string;
        due_date: string | null;
        status: string;
        verification_status: string | null;
      }[]).map((u) => ({
        id: u.id,
        title: u.title,
        dueDate: u.due_date,
        status: u.status,
        verificationStatus: u.verification_status,
      })),
      legacyUnmapped,
    };
  });

const REVIEW_STATUSES = ["accepted", "rejected", "correction_requested", "under_review"] as const;

/** Official-only checklist document review action. */
export const reviewChecklistDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        documentId: z.string().uuid(),
        status: z.enum(REVIEW_STATUSES),
        remarks: z.string().min(3),
        correctionReason: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: official } = await context.supabase.rpc("is_official", { _user_id: context.userId });
    if (!official) throw new Error("Only authorized officials can review checklist documents.");

    const { data: doc } = await context.supabase
      .from("documents")
      .select("id, application_id, file_name")
      .eq("id", data.documentId)
      .single();
    if (!doc) throw new Error("Document not found or not accessible.");

    const { error } = await context.supabase
      .from("documents")
      .update({
        verification_status: data.status,
        review_remarks: data.remarks,
        correction_reason: data.correctionReason ?? null,
      } as never)
      .eq("id", data.documentId);
    if (error) throw new Error("Could not record the review: " + error.message);

    await logAuditEvent({
      applicationId: doc.application_id,
      actorId: context.userId,
      actionType: "checklist_document_reviewed",
      entityType: "document",
      entityId: doc.id,
      newValue: `${data.status}: ${data.remarks.slice(0, 200)}`,
    });

    const { data: app } = await context.supabase
      .from("applications")
      .select("created_by, application_number")
      .eq("id", doc.application_id)
      .single();
    if (app?.created_by) {
      await notifyUsers([app.created_by], {
        applicationId: doc.application_id,
        title: `Document ${data.status.replace("_", " ")}`,
        message: `${app.application_number} — "${doc.file_name}" was marked ${data.status.replace("_", " ")}: ${data.remarks}`,
        notificationType: data.status === "correction_requested" ? "correction" : "document_review",
      });
    }
    return { ok: true as const };
  });

/** Official-only Not Applicable override for a checklist item, with reason. */
export const overrideChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        documentCategory: z.string().min(2),
        notApplicable: z.boolean(),
        reason: z.string().min(3),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: official } = await context.supabase.rpc("is_official", { _user_id: context.userId });
    if (!official) throw new Error("Only authorized officials can change checklist applicability.");

    const { data: app } = await context.supabase
      .from("applications")
      .select("checklist_overrides")
      .eq("id", data.applicationId)
      .single();
    if (!app) throw new Error("Application not found or not accessible.");

    const overrides = { ...((app.checklist_overrides ?? {}) as Record<string, unknown>) };
    if (data.notApplicable) {
      overrides[data.documentCategory] = { status: "not_applicable", reason: data.reason };
    } else {
      delete overrides[data.documentCategory];
    }

    const { error } = await context.supabase
      .from("applications")
      .update({ checklist_overrides: overrides } as never)
      .eq("id", data.applicationId);
    if (error) throw new Error("Could not save the override: " + error.message);

    await logAuditEvent({
      applicationId: data.applicationId,
      actorId: context.userId,
      actionType: data.notApplicable ? "checklist_item_marked_not_applicable" : "checklist_override_removed",
      entityType: "checklist_item",
      entityId: data.documentCategory,
      newValue: data.reason,
    });
    return { ok: true as const };
  });
