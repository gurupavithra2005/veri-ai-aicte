import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REQUIRED_APPLICATION_FIELDS } from "@/lib/constants";
import { logAuditEvent } from "./audit.server";
import { notifyRoles, notifyUsers } from "./notifications.server";

/**
 * SIH26262 approval workflow engine.
 *
 * Stages come from administrator-managed workflow templates — never hardcoded.
 * Legacy verification statuses on `applications.status` are untouched; the
 * approval workflow uses `approval_state`, `current_stage` and the stage
 * history tables. No stage is ever auto-approved: the final decision belongs
 * to an authorized competent authority / admin.
 */

function addDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/** Server-side required field + document validation shared by both submission paths. */
async function validateForSubmission(
  supabase: any,
  applicationId: string,
): Promise<{ missingFields: string[]; missingDocuments: string[] }> {
  const { data: app } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .single();
  const record = (app ?? {}) as unknown as Record<string, unknown>;
  const missingFields = REQUIRED_APPLICATION_FIELDS.filter((f) => {
    const v = record[f.key];
    return typeof v !== "string" || v.trim() === "";
  }).map((f) => f.label);

  const [{ data: reqs }, { data: docs }] = await Promise.all([
    supabase
      .from("document_requirements")
      .select("document_category, requirement_name")
      .eq("active", true)
      .eq("required", true),
    supabase
      .from("documents")
      .select("document_category")
      .eq("application_id", applicationId)
      .eq("is_current", true),
  ]);
  const uploaded = new Set(
    ((docs ?? []) as { document_category: string }[]).map((d) => d.document_category),
  );
  const missingDocuments = ((reqs ?? []) as { document_category: string; requirement_name: string }[])
    .filter((r) => !uploaded.has(r.document_category))
    .map((r) => r.requirement_name);
  return { missingFields, missingDocuments };
}

/** Find or create the institution profile from application data (duplicate-safe). */
async function resolveInstitutionId(
  supabase: any,
  app: Record<string, unknown>,
  userId: string,
): Promise<string | null> {
  const aicteId = (app["aicte_permanent_id"] as string | null)?.trim() || null;
  const name = (app["institution_name"] as string | null)?.trim() || null;
  if (aicteId) {
    const { data: existing } = await supabase
      .from("institutions")
      .select("id")
      .eq("aicte_permanent_id", aicteId)
      .maybeSingle();
    if (existing) return existing.id;
  }
  if (name) {
    const { data: byName } = await supabase
      .from("institutions")
      .select("id")
      .ilike("institution_name", name)
      .limit(1)
      .maybeSingle();
    if (byName) return byName.id;
  }
  const { data: created } = await supabase
    .from("institutions")
    .insert({
      aicte_permanent_id: aicteId,
      institution_name: name ?? "Unnamed Institution",
      institution_type: (app["institution_type"] as string | null) ?? null,
      address: (app["institution_address"] as string | null) ?? null,
      state: (app["state"] as string | null) ?? null,
      district: (app["district"] as string | null) ?? null,
      region: (app["region"] as string | null) ?? null,
      official_email: (app["contact_email"] as string | null) ?? null,
      contact_number: (app["contact_phone"] as string | null) ?? null,
      created_by: userId,
    })
    .select("id")
    .single();
  return created?.id ?? null;
}

export const submitApprovalApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        workflowTemplateId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: app, error } = await supabase
      .from("applications")
      .select("*")
      .eq("id", data.applicationId)
      .single();
    if (error || !app) throw new Error("Application not found or not accessible.");
    if (app.created_by !== context.userId) {
      throw new Error("Only the owning institution can submit this application.");
    }
    if (app.workflow_template_id) {
      throw new Error("This application has already been submitted for approval processing.");
    }

    const validation = await validateForSubmission(supabase, data.applicationId);
    if (validation.missingFields.length > 0 || validation.missingDocuments.length > 0) {
      return {
        ok: false as const,
        missingFields: validation.missingFields,
        missingDocuments: validation.missingDocuments,
      };
    }

    // Resolve the configured processing route.
    const { data: template } = data.workflowTemplateId
      ? await supabase.from("workflow_templates").select("*").eq("id", data.workflowTemplateId).maybeSingle()
      : await supabase
          .from("workflow_templates")
          .select("*")
          .eq("active", true)
          .eq("application_type", app.application_type ?? "")
          .limit(1)
          .maybeSingle();
    if (!template) {
      throw new Error(
        "No processing route is configured for this application type. Ask an administrator to configure a workflow route.",
      );
    }
    const { data: stages } = await supabase
      .from("workflow_stages")
      .select("*")
      .eq("template_id", template.id)
      .order("stage_order");
    const first = stages?.[0];
    if (!first) {
      throw new Error("The selected processing route has no processing stages configured.");
    }

    const institutionId = await resolveInstitutionId(supabase, app as unknown as Record<string, unknown>, context.userId);
    const dueAt = first.timeline_days ? addDays(first.timeline_days) : null;

    const { error: updateError } = await supabase
      .from("applications")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        approval_state: "in_progress",
        workflow_template_id: template.id,
        processing_route: template.name,
        aph_version: template.aph_version,
        processing_year: app.academic_year,
        current_stage: first.stage_code,
        assigned_bureau: first.responsible_bureau,
        stage_entered_at: new Date().toISOString(),
        stage_due_at: dueAt,
        institution_id: institutionId,
      } as never)
      .eq("id", data.applicationId);
    if (updateError) throw new Error("Submission failed: " + updateError.message);

    const { error: historyError } = await supabase.from("application_stage_history").insert({
      application_id: data.applicationId,
      stage_order: first.stage_order,
      stage_code: first.stage_code,
      stage_name: first.stage_name,
      due_at: dueAt,
      status: "active",
    });
    if (historyError) throw new Error("Could not start the workflow: " + historyError.message);

    await logAuditEvent({
      applicationId: data.applicationId,
      actorId: context.userId,
      actionType: "approval_application_submitted",
      entityType: "application",
      entityId: data.applicationId,
      newValue: `route=${template.name} stage=${first.stage_code}`,
    });

    await notifyRoles([first.responsible_role, "admin"], {
      applicationId: data.applicationId,
      title: "New approval application received",
      message: `${app.application_number} — ${app.institution_name} entered ${first.stage_name}. Route: ${template.name}.`,
      notificationType: "stage_assigned",
    });

    return { ok: true as const, routeName: template.name as string, firstStage: first.stage_name as string };
  });

async function assertStageAuthority(
  context: { supabase: any; userId: string },
  responsibleRole: string,
): Promise<void> {
  if (responsibleRole === "admin") return;
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (isAdmin) return;
  const { data: allowed } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: responsibleRole as never,
  });
  if (!allowed) {
    throw new Error(
      `This stage is handled by the "${responsibleRole}" role. You are not authorized to complete it.`,
    );
  }
}

export const completeStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        remarks: z.string().min(3),
        observation: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: app } = await supabase
      .from("applications")
      .select("*")
      .eq("id", data.applicationId)
      .single();
    if (!app) throw new Error("Application not found or not accessible.");
    if (app.approval_state !== "in_progress" || !app.current_stage) {
      throw new Error("This application is not currently in an active processing stage.");
    }

    const { data: stages } = await supabase
      .from("workflow_stages")
      .select("*")
      .eq("template_id", app.workflow_template_id)
      .order("stage_order");
    const current = stages?.find((s) => s.stage_code === app.current_stage);
    if (!current) throw new Error("Current stage is not configured on the processing route.");

    await assertStageAuthority({ supabase, userId: context.userId }, current.responsible_role);

    const { data: activeHistory } = await supabase
      .from("application_stage_history")
      .select("*")
      .eq("application_id", data.applicationId)
      .eq("stage_code", current.stage_code)
      .is("exited_at", null)
      .maybeSingle();
    if (!activeHistory) throw new Error("No active stage record found for this application.");

    // EVC stage completes only through an authorized EVC completion record.
    if (current.stage_code === "evc") {
      const { data: evc } = await supabase
        .from("evc_records")
        .select("status")
        .eq("application_id", data.applicationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!evc || evc.status !== "completed") {
        throw new Error(
          "The EVC stage can only be completed after the EVC visit has been recorded as completed.",
        );
      }
    }

    const next = stages?.find((s) => s.stage_order > current.stage_order);
    if (!next) {
      throw new Error(
        "This is the final processing stage. Use the authorized decision action to record the outcome.",
      );
    }

    const { error: closeError } = await supabase
      .from("application_stage_history")
      .update({
        exited_at: new Date().toISOString(),
        completed_by: context.userId,
        completed_at: new Date().toISOString(),
        status: "completed",
        action_remarks: data.remarks,
      })
      .eq("id", activeHistory.id);
    if (closeError) throw new Error("Could not close the stage: " + closeError.message);

    if (data.observation && data.observation.trim() !== "") {
      await supabase.from("stage_observations").insert({
        application_id: data.applicationId,
        stage_history_id: activeHistory.id,
        officer_id: context.userId,
        observation: data.observation,
      });
    }

    const dueAt = next.timeline_days ? addDays(next.timeline_days) : null;
    const { error: historyError } = await supabase.from("application_stage_history").insert({
      application_id: data.applicationId,
      stage_order: next.stage_order,
      stage_code: next.stage_code,
      stage_name: next.stage_name,
      due_at: dueAt,
      status: "active",
    });
    if (historyError) throw new Error("Could not open the next stage: " + historyError.message);

    const { error: appUpdateError } = await supabase
      .from("applications")
      .update({
        current_stage: next.stage_code,
        assigned_bureau: next.responsible_bureau,
        stage_entered_at: new Date().toISOString(),
        stage_due_at: dueAt,
      } as never)
      .eq("id", data.applicationId);
    if (appUpdateError) throw new Error("Could not move the application: " + appUpdateError.message);

    if (next.stage_code === "evc") {
      const { error: evcError } = await supabase.from("evc_records").insert({
        application_id: data.applicationId,
        requirement: next.entry_conditions ?? "EVC required per configured route",
        status: "pending_scheduling",
        due_date: dueAt ? dueAt.slice(0, 10) : null,
      });
      if (evcError) throw new Error("Could not create the EVC queue entry: " + evcError.message);
    }

    await logAuditEvent({
      applicationId: data.applicationId,
      actorId: context.userId,
      actionType: "stage_completed",
      entityType: "stage",
      entityId: activeHistory.id,
      previousValue: current.stage_code,
      newValue: next.stage_code,
    });

    await notifyRoles([next.responsible_role, "admin"], {
      applicationId: data.applicationId,
      title: "Application moved to your queue",
      message: `${app.application_number} — ${app.institution_name} moved to ${next.stage_name}.`,
      notificationType: "stage_assigned",
    });
    if (app.created_by) {
      await notifyUsers([app.created_by], {
        applicationId: data.applicationId,
        title: "Application status update",
        message: `${app.application_number} completed ${current.stage_name} and moved to ${next.stage_name}.`,
        notificationType: "stage_progress",
      });
    }

    return { ok: true as const, nextStage: next.stage_name as string };
  });

export const returnForClarification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        reason: z.string().min(10),
        requiredCorrection: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: app } = await supabase
      .from("applications")
      .select("application_number, institution_name, created_by, approval_state")
      .eq("id", data.applicationId)
      .single();
    if (!app) throw new Error("Application not found or not accessible.");
    if (app.approval_state !== "in_progress") {
      throw new Error("Only applications in an active processing stage can be returned.");
    }

    const { error } = await supabase
      .from("applications")
      .update({ approval_state: "returned" } as never)
      .eq("id", data.applicationId);
    if (error) throw new Error("Could not return the application: " + error.message);

    await supabase.from("clarification_requests").insert({
      application_id: data.applicationId,
      requested_by: context.userId,
      reason: data.reason,
      required_correction: data.requiredCorrection ?? null,
      status: "open",
    });

    await logAuditEvent({
      applicationId: data.applicationId,
      actorId: context.userId,
      actionType: "application_returned",
      entityType: "application",
      entityId: data.applicationId,
      newValue: data.reason,
    });

    if (app.created_by) {
      await notifyUsers([app.created_by], {
        applicationId: data.applicationId,
        title: "Clarification requested",
        message: `${app.application_number} was returned: ${data.reason}`,
        notificationType: "clarification",
      });
    }
    return { ok: true as const };
  });

export const respondToClarification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        responseNote: z.string().min(5),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: app } = await supabase
      .from("applications")
      .select("application_number, created_by, current_stage, approval_state")
      .eq("id", data.applicationId)
      .single();
    if (!app) throw new Error("Application not found or not accessible.");
    if (app.created_by !== context.userId) {
      throw new Error("Only the owning institution can respond to a clarification request.");
    }
    if (app.approval_state !== "returned") {
      throw new Error("This application is not waiting for clarification.");
    }

    const { error: clarError } = await supabase
      .from("clarification_requests")
      .update({
        status: "responded",
        response_note: data.responseNote,
        responded_by: context.userId,
        responded_at: new Date().toISOString(),
      })
      .eq("application_id", data.applicationId)
      .eq("status", "open");
    if (clarError) throw new Error("Could not save the response: " + clarError.message);

    const { error } = await supabase
      .from("applications")
      .update({ approval_state: "in_progress" } as never)
      .eq("id", data.applicationId);
    if (error) throw new Error("Could not re-submit the application: " + error.message);

    await logAuditEvent({
      applicationId: data.applicationId,
      actorId: context.userId,
      actionType: "clarification_responded",
      entityType: "application",
      entityId: data.applicationId,
    });

    await notifyRoles(["admin"], {
      applicationId: data.applicationId,
      title: "Clarification response received",
      message: `${app.application_number} — the institution responded to the clarification request.`,
      notificationType: "resubmission",
    });
    return { ok: true as const };
  });

export const recordApprovalDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        reason: z.string().min(10),
        undertakingTitle: z.string().optional(),
        undertakingDescription: z.string().optional(),
        undertakingDueDate: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    let authorized = isAdmin;
    if (!authorized) {
      const { data: isCA } = await supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "competent_authority",
      });
      authorized = isCA;
    }
    if (!authorized) {
      throw new Error(
        "Only the authorized competent authority (or an administrator) can record approval decisions.",
      );
    }

    const { data: app } = await supabase
      .from("applications")
      .select("*")
      .eq("id", data.applicationId)
      .single();
    if (!app) throw new Error("Application not found or not accessible.");
    if (app.approval_state === "approved" || app.approval_state === "rejected") {
      throw new Error("A final decision has already been recorded for this application.");
    }

    const { data: activeHistory } = await supabase
      .from("application_stage_history")
      .select("id")
      .eq("application_id", data.applicationId)
      .is("exited_at", null)
      .maybeSingle();
    if (activeHistory) {
      await supabase
        .from("application_stage_history")
        .update({
          exited_at: new Date().toISOString(),
          completed_by: context.userId,
          completed_at: new Date().toISOString(),
          status: "completed",
          action_remarks: data.reason,
        })
        .eq("id", activeHistory.id);
    }

    const { error } = await supabase
      .from("applications")
      .update({ approval_state: data.decision } as never)
      .eq("id", data.applicationId);
    if (error) throw new Error("Could not record the decision: " + error.message);

    // An approved application may create time-bound compliance undertakings.
    if (data.decision === "approved" && data.undertakingTitle && data.undertakingTitle.trim() !== "") {
      const { error: uError } = await supabase.from("undertakings").insert({
        institution_id: app.institution_id,
        application_id: data.applicationId,
        title: data.undertakingTitle,
        description: data.undertakingDescription ?? null,
        prescribed_condition: data.reason,
        rule_reference: "Configured at decision time (prototype)",
        issued_date: new Date().toISOString().slice(0, 10),
        due_date: data.undertakingDueDate ?? null,
        required_evidence: "Compliance evidence upload",
        status: "upcoming",
        created_by: context.userId,
      });
      if (uError) throw new Error("Could not create the undertaking: " + uError.message);
    }

    await logAuditEvent({
      applicationId: data.applicationId,
      actorId: context.userId,
      actionType: "approval_decision_recorded",
      entityType: "application",
      entityId: data.applicationId,
      previousValue: app.approval_state,
      newValue: data.decision,
    });

    if (app.created_by) {
      await notifyUsers([app.created_by], {
        applicationId: data.applicationId,
        title: data.decision === "approved" ? "Application approved" : "Application rejected",
        message: `${app.application_number} — authorized decision recorded: ${data.decision.toUpperCase()}. ${data.reason}`,
        notificationType: "decision",
      });
    }
    return { ok: true as const };
  });

// ============ Queues & pendency ============

export const listApprovalQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        stage: z.string().optional(),
        approvalState: z.string().optional(),
        region: z.string().optional(),
        overdueOnly: z.boolean().optional(),
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(15),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: official } = await context.supabase.rpc("is_official", {
      _user_id: context.userId,
    });
    if (!official) throw new Error("Only authorized officials can view processing queues.");

    let query = context.supabase
      .from("applications")
      .select(
        "id, application_number, institution_name, aicte_permanent_id, region, application_type, processing_route, current_stage, approval_state, assigned_bureau, stage_entered_at, stage_due_at, submitted_at, created_by, assigned_reviewer_id, documents(count)",
        { count: "exact" },
      )
      .not("workflow_template_id", "is", null)
      .order("stage_due_at", { ascending: true, nullsFirst: false });

    if (data.stage && data.stage !== "all") query = query.eq("current_stage", data.stage);
    if (data.approvalState && data.approvalState !== "all") {
      query = query.eq("approval_state", data.approvalState);
    }
    if (data.region && data.region !== "all") query = query.eq("region", data.region);
    if (data.overdueOnly) {
      query = query.lt("stage_due_at", new Date().toISOString());
    }
    if (data.search && data.search.trim() !== "") {
      const term = data.search.trim().replace(/[%,()]/g, "");
      query = query.or(
        `application_number.ilike.%${term}%,institution_name.ilike.%${term}%,aicte_permanent_id.ilike.%${term}%`,
      );
    }

    const from = (data.page - 1) * data.pageSize;
    const { data: rows, count, error } = await query.range(from, from + data.pageSize - 1);
    if (error) throw new Error("Could not load the queue: " + error.message);

    return {
      rows: (rows ?? []).map((r) => ({
        id: r.id,
        applicationNumber: r.application_number,
        institutionName: r.institution_name,
        aictePermanentId: r.aicte_permanent_id,
        region: r.region,
        applicationType: r.application_type,
        processingRoute: r.processing_route,
        currentStage: r.current_stage,
        approvalState: r.approval_state,
        assignedBureau: r.assigned_bureau,
        stageEnteredAt: r.stage_entered_at,
        stageDueAt: r.stage_due_at,
        submittedAt: r.submitted_at,
        documentCount: r.documents?.[0]?.count ?? 0,
        createdBy: r.created_by,
      })),
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

export const getApprovalPendency = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: official } = await context.supabase.rpc("is_official", {
      _user_id: context.userId,
    });
    if (!official) throw new Error("Only authorized officials can view pendency analytics.");

    const { data: rows } = await context.supabase
      .from("applications")
      .select(
        "id, current_stage, approval_state, region, stage_due_at, stage_entered_at, application_type",
      )
      .not("workflow_template_id", "is", null);
    const list = rows ?? [];
    const now = Date.now();
    const byStage: Record<string, number> = {};
    const byState: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let overdue = 0;
    for (const r of list) {
      if (r.approval_state === "approved" || r.approval_state === "rejected") continue;
      if (r.current_stage) byStage[r.current_stage] = (byStage[r.current_stage] ?? 0) + 1;
      if (r.approval_state) byState[r.approval_state] = (byState[r.approval_state] ?? 0) + 1;
      if (r.region) byRegion[r.region] = (byRegion[r.region] ?? 0) + 1;
      if (r.application_type) byType[r.application_type] = (byType[r.application_type] ?? 0) + 1;
      if (r.stage_due_at && new Date(r.stage_due_at).getTime() < now) overdue += 1;
    }
    return {
      total: list.length,
      overdue,
      byStage,
      byState,
      byRegion,
      byType,
      completed: list.filter((r) => r.approval_state === "approved" || r.approval_state === "rejected").length,
    };
  });

export const getWorkflowDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ applicationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: app, error } = await supabase
      .from("applications")
      .select("*")
      .eq("id", data.applicationId)
      .single();
    if (error || !app) throw new Error("Application not found or not accessible.");

    const [stagesRes, historyRes, observationsRes, clarificationsRes, evcRes] = await Promise.all([
      app.workflow_template_id
        ? supabase.from("workflow_stages").select("*").eq("template_id", app.workflow_template_id).order("stage_order")
        : Promise.resolve({ data: [] }),
      supabase
        .from("application_stage_history")
        .select("*")
        .eq("application_id", data.applicationId)
        .order("entered_at"),
      supabase
        .from("stage_observations")
        .select("id, observation, created_at, stage_history_id, officer_id, profiles(full_name, email)")
        .eq("application_id", data.applicationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("clarification_requests")
        .select("*")
        .eq("application_id", data.applicationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("evc_records")
        .select("*")
        .eq("application_id", data.applicationId)
        .order("created_at", { ascending: false }),
    ]);

    return {
      application: app,
      templateStages: stagesRes.data ?? [],
      stageHistory: historyRes.data ?? [],
      observations: observationsRes.data ?? [],
      clarifications: clarificationsRes.data ?? [],
      evcRecords: evcRes.data ?? [],
    };
  });

/** Legacy SIH26261 verification records — admin-only archive view. */
export const listLegacyApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(15),
        search: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Legacy verification records are visible to administrators only.");

    let query = context.supabase
      .from("applications")
      .select(
        "id, application_number, institution_name, application_title, status, submitted_at, created_at, updated_at, verification_findings(count)",
        { count: "exact" },
      )
      .is("workflow_template_id", null)
      .order("updated_at", { ascending: false });
    if (data.search && data.search.trim() !== "") {
      const term = data.search.trim().replace(/[%,()]/g, "");
      query = query.or(
        `application_title.ilike.%${term}%,application_number.ilike.%${term}%,institution_name.ilike.%${term}%`,
      );
    }
    const from = (data.page - 1) * data.pageSize;
    const { data: rows, count, error } = await query.range(from, from + data.pageSize - 1);
    if (error) throw new Error("Could not load legacy records: " + error.message);
    return {
      rows: (rows ?? []).map((r) => ({
        id: r.id,
        applicationNumber: r.application_number,
        institutionName: r.institution_name,
        applicationTitle: r.application_title,
        status: r.status,
        submittedAt: r.submitted_at,
        updatedAt: r.updated_at,
        findingsCount: r.verification_findings?.[0]?.count ?? 0,
      })),
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });
