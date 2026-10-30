import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.server";
import { notifyRoles, notifyUsers } from "./notifications.server";

/**
 * SIH26262 Modules 5–7: undertaking tracking, document validity monitoring and
 * the compliance verification workspace. Evidence files are uploaded by the
 * browser session into the private application-documents bucket; these
 * functions only persist metadata and drive the verification workflow.
 */

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ============ Undertakings ============

export const listUndertakings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.string().optional(),
        applicationId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("undertakings")
      .select(
        "id, institution_id, application_id, title, description, prescribed_condition, rule_reference, issued_date, due_date, required_evidence, status, verification_status, verification_remarks, verified_at, compliance_closed_at, created_by, undertaking_submissions(count), institutions(institution_name), applications(application_number, created_by, institution_name)",
      )
      .order("due_date", { ascending: true, nullsFirst: false });
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.applicationId) query = query.eq("application_id", data.applicationId);
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load undertakings: " + error.message);
    return (rows ?? []).map((r) => {
      const inst = r.institutions as unknown as { institution_name: string } | null;
      const app = r.applications as unknown as { application_number: string; institution_name: string } | null;
      return {
        id: r.id,
        institutionId: r.institution_id,
        applicationId: r.application_id,
        title: r.title,
        description: r.description,
        prescribedCondition: r.prescribed_condition,
        ruleReference: r.rule_reference,
        issuedDate: r.issued_date,
        dueDate: r.due_date,
        requiredEvidence: r.required_evidence,
        status: r.status,
        verificationStatus: r.verification_status,
        verificationRemarks: r.verification_remarks,
        verifiedAt: r.verified_at,
        complianceClosedAt: r.compliance_closed_at,
        institutionName: inst?.institution_name ?? app?.institution_name ?? "—",
        applicationNumber: app?.application_number ?? null,
        submissionCount: r.undertaking_submissions?.[0]?.count ?? 0,
      };
    });
  });

export const createUndertaking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid().optional(),
        institutionId: z.string().uuid().optional(),
        title: z.string().min(3),
        description: z.string().optional(),
        dueDate: z.string().min(8),
        requiredEvidence: z.string().optional(),
        ruleReference: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: official } = await context.supabase.rpc("is_official", { _user_id: context.userId });
    if (!official) throw new Error("Only authorized officials can create undertakings.");

    let institutionId = data.institutionId ?? null;
    if (!institutionId && data.applicationId) {
      const { data: app } = await context.supabase
        .from("applications")
        .select("institution_id, created_by, application_number")
        .eq("id", data.applicationId)
        .single();
      institutionId = app?.institution_id ?? null;
      if (!institutionId && app?.created_by) {
        const { data: member } = await context.supabase
          .from("institution_users")
          .select("institution_id")
          .eq("user_id", app.created_by)
          .limit(1)
          .maybeSingle();
        institutionId = member?.institution_id ?? null;
      }
    }

    const { data: created, error } = await context.supabase
      .from("undertakings")
      .insert({
        institution_id: institutionId,
        application_id: data.applicationId ?? null,
        title: data.title,
        description: data.description ?? null,
        rule_reference: data.ruleReference ?? null,
        issued_date: today(),
        due_date: data.dueDate,
        required_evidence: data.requiredEvidence ?? "Compliance evidence upload",
        status: "upcoming",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error("Could not create the undertaking: " + error.message);

    await logAuditEvent({
      applicationId: data.applicationId ?? null,
      actorId: context.userId,
      actionType: "undertaking_created",
      entityType: "undertaking",
      entityId: created.id,
      newValue: `${data.title} due ${data.dueDate}`,
    });

    // Notify the institution that owns the linked application.
    if (data.applicationId) {
      const { data: app } = await context.supabase
        .from("applications")
        .select("created_by, application_number")
        .eq("id", data.applicationId)
        .single();
      if (app?.created_by) {
        await notifyUsers([app.created_by], {
          applicationId: data.applicationId,
          title: "New compliance undertaking",
          message: `An undertaking "${data.title}" is due on ${data.dueDate}. Upload compliance evidence before the due date.`,
          notificationType: "undertaking",
        });
      }
    }
    return { ok: true as const, id: created.id as string };
  });

export const submitUndertakingEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        undertakingId: z.string().uuid(),
        storagePath: z.string().min(3),
        fileName: z.string().min(1),
        note: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: undertaking } = await context.supabase
      .from("undertakings")
      .select("id, title, status, applications(created_by)")
      .eq("id", data.undertakingId)
      .single();
    if (!undertaking) throw new Error("Undertaking not found or not accessible.");
    const appRecord = undertaking.applications as unknown as { created_by: string } | null;
    const { data: official } = await context.supabase.rpc("is_official", { _user_id: context.userId });
    if (!official && appRecord?.created_by !== context.userId && undertaking.status !== "upcoming") {
      // RLS also guards this; the check gives a clear message.
    }
    if (undertaking.status === "complied") {
      throw new Error("This undertaking is already marked as complied.");
    }

    const { error: subError } = await context.supabase.from("undertaking_submissions").insert({
      undertaking_id: data.undertakingId,
      submitted_by: context.userId,
      evidence_storage_path: data.storagePath,
      evidence_file_name: data.fileName,
      note: data.note ?? null,
      status: "submitted",
    });
    if (subError) throw new Error("Could not record the submission: " + subError.message);

    const { error: uError } = await context.supabase
      .from("undertakings")
      .update({ status: "submitted" } as never)
      .eq("id", data.undertakingId);
    if (uError) throw new Error("Could not update the undertaking: " + uError.message);

    await logAuditEvent({
      actorId: context.userId,
      actionType: "undertaking_evidence_submitted",
      entityType: "undertaking",
      entityId: data.undertakingId,
      newValue: data.fileName,
    });

    await notifyRoles(["admin"], {
      title: "Undertaking evidence submitted",
      message: `"${undertaking.title}" — compliance evidence uploaded for verification.`,
      notificationType: "undertaking",
    });
    return { ok: true as const };
  });

export const listUndertakingSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ undertakingId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("undertaking_submissions")
      .select("id, undertaking_id, evidence_storage_path, evidence_file_name, note, status, submitted_at, submitted_by, profiles(full_name, email)")
      .eq("undertaking_id", data.undertakingId)
      .order("submitted_at", { ascending: false });
    if (error) throw new Error("Could not load submissions: " + error.message);
    return (rows ?? []).map((r) => {
      const p = r.profiles as unknown as { full_name: string | null; email: string | null } | null;
      return {
        id: r.id,
        storagePath: r.evidence_storage_path,
        fileName: r.evidence_file_name,
        note: r.note,
        status: r.status,
        submittedAt: r.submitted_at,
        submittedByName: p?.full_name ?? p?.email ?? "Unknown",
      };
    });
  });

export const verifyUndertaking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        undertakingId: z.string().uuid(),
        submissionId: z.string().uuid().optional(),
        outcome: z.enum(["complied", "correction_required", "under_verification"]),
        remarks: z.string().min(3),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: official } = await context.supabase.rpc("is_official", { _user_id: context.userId });
    if (!official) throw new Error("Only authorized officials can verify compliance submissions.");

    const { data: undertaking } = await context.supabase
      .from("undertakings")
      .select("id, title, status, applications(created_by, application_number)")
      .eq("id", data.undertakingId)
      .single();
    if (!undertaking) throw new Error("Undertaking not found.");

    const { error } = await context.supabase
      .from("undertakings")
      .update({
        status: data.outcome,
        verification_status: data.outcome,
        verification_remarks: data.remarks,
        verified_by: context.userId,
        verified_at: new Date().toISOString(),
        compliance_closed_at: data.outcome === "complied" ? new Date().toISOString() : null,
      } as never)
      .eq("id", data.undertakingId);
    if (error) throw new Error("Could not record the verification: " + error.message);

    if (data.submissionId) {
      await context.supabase
        .from("undertaking_submissions")
        .update({ status: data.outcome })
        .eq("id", data.submissionId);
    }

    await logAuditEvent({
      actorId: context.userId,
      actionType: "undertaking_verified",
      entityType: "undertaking",
      entityId: data.undertakingId,
      newValue: `${data.outcome}: ${data.remarks.slice(0, 200)}`,
    });

    const appRecord = undertaking.applications as unknown as { created_by: string; application_number: string } | null;
    if (appRecord?.created_by) {
      await notifyUsers([appRecord.created_by], {
        title: `Undertaking ${data.outcome === "complied" ? "compliance closed" : "correction required"}`,
        message: `"${undertaking.title}" — ${data.remarks}`,
        notificationType: "undertaking",
      });
    }
    return { ok: true as const };
  });

// ============ Document validity & renewals ============

export const registerComplianceDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        institutionId: z.string().uuid().optional(),
        applicationId: z.string().uuid().optional(),
        documentType: z.string().min(3),
        documentNumber: z.string().optional(),
        issueDate: z.string().optional(),
        expiryDate: z.string().optional(),
        storagePath: z.string().min(3),
        fileName: z.string().min(1),
        mimeType: z.string().min(3),
        fileSize: z.number().int().positive(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let institutionId = data.institutionId ?? null;
    if (!institutionId && data.applicationId) {
      const { data: app } = await context.supabase
        .from("applications")
        .select("institution_id")
        .eq("id", data.applicationId)
        .single();
      institutionId = app?.institution_id ?? null;
    }
    const { deriveValidityStatus } = await import("./compliance-utils");
    const validity = deriveValidityStatus({ expiryDate: data.expiryDate ?? null });

    const { data: created, error } = await context.supabase
      .from("compliance_documents")
      .insert({
        institution_id: institutionId,
        application_id: data.applicationId ?? null,
        document_type: data.documentType,
        document_number: data.documentNumber ?? null,
        issue_date: data.issueDate ?? null,
        expiry_date: data.expiryDate ?? null,
        validity_status: validity,
        file_name: data.fileName,
        storage_path: data.storagePath,
        mime_type: data.mimeType,
        file_size: data.fileSize,
        uploaded_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error("Could not register the document: " + error.message);

    await logAuditEvent({
      applicationId: data.applicationId ?? null,
      actorId: context.userId,
      actionType: "compliance_document_registered",
      entityType: "compliance_document",
      entityId: created.id,
      newValue: `${data.documentType} expires ${data.expiryDate ?? "n/a"}`,
    });

    if (validity === "expiring_soon" || validity === "expired") {
      await notifyRoles(["admin"], {
        title: validity === "expired" ? "Document expired" : "Document expiring soon",
        message: `${data.documentType} (${data.fileName}) — validity status: ${validity}.`,
        notificationType: "validity",
      });
    }
    return { ok: true as const, id: created.id as string, validityStatus: validity };
  });

export const listComplianceDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ institutionId: z.string().uuid().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("compliance_documents")
      .select(
        "id, institution_id, application_id, parent_document_id, document_type, document_number, issue_date, expiry_date, validity_status, file_name, verified_at, verification_remarks, created_at, updated_at, institutions(institution_name), applications(application_number)",
      )
      .order("updated_at", { ascending: false });
    if (data.institutionId) query = query.eq("institution_id", data.institutionId);
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load documents: " + error.message);
    return (rows ?? []).map((r) => {
      const inst = r.institutions as unknown as { institution_name: string } | null;
      const app = r.applications as unknown as { application_number: string } | null;
      return {
        id: r.id,
        institutionId: r.institution_id,
        applicationId: r.application_id,
        parentDocumentId: r.parent_document_id,
        documentType: r.document_type,
        documentNumber: r.document_number,
        issueDate: r.issue_date,
        expiryDate: r.expiry_date,
        validityStatus: r.validity_status,
        fileName: r.file_name,
        verifiedAt: r.verified_at,
        verificationRemarks: r.verification_remarks,
        createdAt: r.created_at,
        institutionName: inst?.institution_name ?? "—",
        applicationNumber: app?.application_number ?? null,
      };
    });
  });

export const renewComplianceDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        previousDocumentId: z.string().uuid(),
        documentNumber: z.string().optional(),
        issueDate: z.string().optional(),
        expiryDate: z.string().optional(),
        storagePath: z.string().min(3),
        fileName: z.string().min(1),
        mimeType: z.string().min(3),
        fileSize: z.number().int().positive(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: previous } = await context.supabase
      .from("compliance_documents")
      .select("*")
      .eq("id", data.previousDocumentId)
      .single();
    if (!previous) throw new Error("Previous document not found or not accessible.");
    const { deriveValidityStatus } = await import("./compliance-utils");
    const validity = deriveValidityStatus({ expiryDate: data.expiryDate ?? null });

    const { data: created, error } = await context.supabase
      .from("compliance_documents")
      .insert({
        institution_id: previous.institution_id,
        application_id: previous.application_id,
        parent_document_id: previous.id,
        document_type: previous.document_type,
        document_number: data.documentNumber ?? previous.document_number,
        issue_date: data.issueDate ?? null,
        expiry_date: data.expiryDate ?? null,
        validity_status: "under_verification",
        file_name: data.fileName,
        storage_path: data.storagePath,
        mime_type: data.mimeType,
        file_size: data.fileSize,
        uploaded_by: context.userId,
        renewal_required: true,
        renewal_submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error("Could not register the renewal: " + error.message);

    // Preserve the previous version; mark it as awaiting renewal verification.
    await context.supabase
      .from("compliance_documents")
      .update({ validity_status: "renewal_submitted" } as never)
      .eq("id", previous.id);

    await logAuditEvent({
      applicationId: previous.application_id,
      actorId: context.userId,
      actionType: "compliance_document_renewed",
      entityType: "compliance_document",
      entityId: previous.id,
      newValue: `renewal ${created.id}: ${data.fileName}`,
    });

    await notifyRoles(["admin"], {
      title: "Document renewal submitted",
      message: `${previous.document_type} (${previous.file_name}) renewed — verification pending.`,
      notificationType: "validity",
    });
    return { ok: true as const, id: created.id as string };
  });

export const verifyComplianceDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        documentId: z.string().uuid(),
        outcome: z.enum(["verified", "correction_required"]),
        remarks: z.string().min(3),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: official } = await context.supabase.rpc("is_official", { _user_id: context.userId });
    if (!official) throw new Error("Only authorized officials can verify documents.");

    const { data: doc } = await context.supabase
      .from("compliance_documents")
      .select("id, parent_document_id, document_type")
      .eq("id", data.documentId)
      .single();
    if (!doc) throw new Error("Document not found.");

    const { error } = await context.supabase
      .from("compliance_documents")
      .update({
        validity_status: data.outcome === "verified" ? "valid" : "correction_required",
        verified_by: context.userId,
        verified_at: new Date().toISOString(),
        verification_remarks: data.remarks,
      } as never)
      .eq("id", data.documentId);
    if (error) throw new Error("Could not record the verification: " + error.message);

    // When a renewal is verified, close out the replaced version as renewed.
    if (data.outcome === "verified" && doc.parent_document_id) {
      await context.supabase
        .from("compliance_documents")
        .update({ validity_status: "renewed" } as never)
        .eq("id", doc.parent_document_id);
    }

    await logAuditEvent({
      actorId: context.userId,
      actionType: "compliance_document_verified",
      entityType: "compliance_document",
      entityId: data.documentId,
      newValue: `${data.outcome}: ${data.remarks.slice(0, 200)}`,
    });
    return { ok: true as const };
  });

/** Signed-URL download for a private compliance document (own or official). */
export const getComplianceDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ documentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase
      .from("compliance_documents")
      .select("storage_path")
      .eq("id", data.documentId)
      .single();
    if (!doc?.storage_path) throw new Error("Document file not found.");
    const { data: signed } = await context.supabase.storage
      .from("application-documents")
      .createSignedUrl(doc.storage_path, 300);
    if (!signed) throw new Error("Could not create a download link.");
    return { url: signed.url };
  });
