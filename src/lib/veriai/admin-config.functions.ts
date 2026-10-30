import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.server";
import { notifyUsers } from "./notifications.server";

/**
 * SIH26262 system-administration functions: users & roles, institution
 * registry, workflow configuration, APH rule configuration and audit access.
 * Every function re-verifies authorization server-side.
 */

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Only administrators can perform this action.");
}

async function assertOfficial(context: { supabase: any; userId: string }) {
  const { data: official } = await context.supabase.rpc("is_official", { _user_id: context.userId });
  if (!official) throw new Error("Only authorized officials can perform this action.");
}

// ============ Users & roles ============

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("id, full_name, email, created_at").order("created_at", { ascending: false }),
      context.supabase.from("user_roles").select("user_id, role, created_at"),
    ]);
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
    }
    return (profiles ?? []).map((p) => ({
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      createdAt: p.created_at,
      roles: roleMap.get(p.id) ?? [],
    }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum([
          "institution_user",
          "reviewer",
          "admin",
          "regional_officer",
          "evc_coordinator",
          "competent_authority",
        ]),
        grant: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("Administrators cannot change their own roles.");
    }
    if (data.grant) {
      const { error } = await context.supabase
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (error && !error.message.includes("duplicate key")) {
        throw new Error("Could not grant the role: " + error.message);
      }
    } else {
      const { error } = await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error("Could not revoke the role: " + error.message);
    }
    await logAuditEvent({
      actorId: context.userId,
      actorRole: "admin",
      actionType: data.grant ? "role_granted" : "role_revoked",
      entityType: "user",
      entityId: data.userId,
      newValue: data.role,
    });
    await notifyUsers([data.userId], {
      title: data.grant ? "Role granted" : "Role revoked",
      message: `Your platform role "${data.role}" was ${data.grant ? "granted" : "revoked"} by an administrator.`,
      notificationType: "role",
    });
    return { ok: true as const };
  });

// ============ Institutions ============

export const listInstitutions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOfficial(context);
    const { data: rows, error } = await context.supabase
      .from("institutions")
      .select("*")
      .order("institution_name");
    if (error) throw new Error("Could not load institutions: " + error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      aictePermanentId: r.aicte_permanent_id,
      institutionName: r.institution_name,
      institutionType: r.institution_type,
      address: r.address,
      state: r.state,
      district: r.district,
      region: r.region,
      officialEmail: r.official_email,
      contactNumber: r.contact_number,
      accountStatus: r.account_status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  });

export const updateInstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        institutionId: z.string().uuid(),
        patch: z
          .object({
            institution_name: z.string().min(1).optional(),
            aicte_permanent_id: z.string().nullable().optional(),
            institution_type: z.string().nullable().optional(),
            address: z.string().nullable().optional(),
            state: z.string().nullable().optional(),
            district: z.string().nullable().optional(),
            region: z.string().nullable().optional(),
            official_email: z.string().nullable().optional(),
            contact_number: z.string().nullable().optional(),
            account_status: z.string().optional(),
          })
          .parse,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOfficial(context);
    const clean = Object.fromEntries(
      Object.entries(data.patch).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(clean).length === 0) return { ok: true as const };
    const { error } = await context.supabase
      .from("institutions")
      .update(clean as never)
      .eq("id", data.institutionId);
    if (error) throw new Error("Could not update the institution: " + error.message);
    await logAuditEvent({
      actorId: context.userId,
      actionType: "institution_updated",
      entityType: "institution",
      entityId: data.institutionId,
      newValue: JSON.stringify(Object.keys(clean)),
    });
    return { ok: true as const };
  });

// ============ Workflow configuration ============

export const listWorkflowConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: templates }, { data: stages }] = await Promise.all([
      context.supabase.from("workflow_templates").select("*").order("created_at", { ascending: false }),
      context.supabase.from("workflow_stages").select("*").order("stage_order"),
    ]);
    return (templates ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      applicationType: t.application_type,
      institutionCategory: t.institution_category,
      aphVersion: t.aph_version,
      effectiveFrom: t.effective_from,
      active: t.active,
      configStatus: t.config_status,
      stages: (stages ?? [])
        .filter((s) => s.template_id === t.id)
        .map((s) => ({
          stageOrder: s.stage_order,
          stageCode: s.stage_code,
          stageName: s.stage_name,
          responsibleRole: s.responsible_role,
          responsibleBureau: s.responsible_bureau,
          timelineDays: s.timeline_days,
          entryConditions: s.entry_conditions,
          completionConditions: s.completion_conditions,
        })),
    }));
  });

export const createWorkflowTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(3),
        applicationType: z.string().min(1),
        aphVersion: z.string().optional(),
        configStatus: z.enum(["official", "prototype_demo", "pending_source"]).default("prototype_demo"),
        stages: z
          .array(
            z.object({
              stageOrder: z.number().int().min(1),
              stageCode: z.string().min(2),
              stageName: z.string().min(2),
              responsibleRole: z.string().min(2),
              responsibleBureau: z.string().optional(),
              timelineDays: z.number().int().min(1).max(365).optional(),
            }),
          )
          .min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOfficial(context);
    const { data: template, error } = await context.supabase
      .from("workflow_templates")
      .insert({
        name: data.name,
        application_type: data.applicationType,
        aph_version: data.aphVersion ?? null,
        config_status: data.configStatus,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error("Could not create the route: " + error.message);
    const { error: stagesError } = await context.supabase.from("workflow_stages").insert(
      data.stages.map((s) => ({
        template_id: template.id,
        stage_order: s.stageOrder,
        stage_code: s.stageCode,
        stage_name: s.stageName,
        responsible_role: s.responsibleRole,
        responsible_bureau: s.responsibleBureau ?? null,
        timeline_days: s.timelineDays ?? null,
      })),
    );
    if (stagesError) throw new Error("Could not save the stages: " + stagesError.message);
    await logAuditEvent({
      actorId: context.userId,
      actionType: "workflow_template_created",
      entityType: "workflow_template",
      entityId: template.id,
      newValue: `${data.name} (${data.stages.length} stages)`,
    });
    return { ok: true as const, id: template.id as string };
  });

export const toggleWorkflowTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ templateId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOfficial(context);
    const { error } = await context.supabase
      .from("workflow_templates")
      .update({ active: data.active })
      .eq("id", data.templateId);
    if (error) throw new Error("Could not update the route: " + error.message);
    await logAuditEvent({
      actorId: context.userId,
      actionType: "workflow_template_toggled",
      entityType: "workflow_template",
      entityId: data.templateId,
      newValue: data.active ? "active" : "inactive",
    });
    return { ok: true as const };
  });

// ============ Regulatory rules & SLA ============

export const listRegulatoryRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("regulatory_rules")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load rules: " + error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      ruleName: r.rule_name,
      description: r.description,
      sourceDocument: r.source_document,
      sourceSection: r.source_section,
      aphVersion: r.aph_version,
      applicableApplicationType: r.applicable_application_type,
      timelineDays: r.timeline_days,
      configStatus: r.config_status,
      active: r.active,
    }));
  });

export const upsertRegulatoryRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        ruleName: z.string().min(3),
        description: z.string().optional(),
        sourceDocument: z.string().optional(),
        sourceSection: z.string().optional(),
        aphVersion: z.string().optional(),
        applicableApplicationType: z.string().optional(),
        timelineDays: z.number().int().min(1).max(3650).optional(),
        configStatus: z.enum(["official", "prototype_demo", "pending_source"]).default("pending_source"),
        active: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOfficial(context);
    const payload = {
      rule_name: data.ruleName,
      description: data.description ?? null,
      source_document: data.sourceDocument ?? null,
      source_section: data.sourceSection ?? null,
      aph_version: data.aphVersion ?? null,
      applicable_application_type: data.applicableApplicationType ?? null,
      timeline_days: data.timelineDays ?? null,
      config_status: data.configStatus,
      active: data.active,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("regulatory_rules")
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw new Error("Could not update the rule: " + error.message);
      await logAuditEvent({
        actorId: context.userId,
        actionType: "regulatory_rule_updated",
        entityType: "regulatory_rule",
        entityId: data.id,
        newValue: data.ruleName,
      });
      return { ok: true as const };
    }
    const { data: created, error } = await context.supabase
      .from("regulatory_rules")
      .insert({ ...payload, created_by: context.userId } as never)
      .select("id")
      .single();
    if (error) throw new Error("Could not create the rule: " + error.message);
    await logAuditEvent({
      actorId: context.userId,
      actionType: "regulatory_rule_created",
      entityType: "regulatory_rule",
      entityId: created.id,
      newValue: data.ruleName,
    });
    return { ok: true as const, id: created.id as string };
  });

export const listSlaConfigurations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("sla_configurations")
      .select("*")
      .order("created_at");
    if (error) throw new Error("Could not load SLA configuration: " + error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      scope: r.scope,
      timelineDays: r.timeline_days,
      alertBeforeDays: r.alert_before_days,
      escalationLevels: r.escalation_levels,
      active: r.active,
    }));
  });

// ============ Audit & escalations ============

export const listAuditEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("audit_events")
      .select("id, application_id, actor_id, actor_role, action_type, entity_type, previous_value, new_value, outcome, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error("Could not load audit events: " + error.message);
    return rows ?? [];
  });

export const listEscalations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOfficial(context);
    const { data: rows, error } = await context.supabase
      .from("escalation_records")
      .select("id, application_id, undertaking_id, level, reason, triggered_at, resolved_at, notes, applications(application_number, institution_name)")
      .order("triggered_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Could not load escalations: " + error.message);
    return (rows ?? []).map((r) => {
      const app = r.applications as unknown as { application_number: string; institution_name: string } | null;
      return {
        id: r.id,
        applicationId: r.application_id,
        undertakingId: r.undertaking_id,
        level: r.level,
        reason: r.reason,
        triggeredAt: r.triggered_at,
        resolvedAt: r.resolved_at,
        applicationNumber: app?.application_number ?? null,
        institutionName: app?.institution_name ?? null,
      };
    });
  });

/** Officer workload snapshot (officials). */
export const getOfficerWorkload = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOfficial(context);
    const { data: rows } = await context.supabase
      .from("application_stage_history")
      .select("stage_code, assigned_to, completed_by, status, entered_at, due_at")
      .is("exited_at", null);
    const workload: Record<string, { active: number; overdue: number }> = {};
    const now = Date.now();
    for (const r of rows ?? []) {
      const key = r.stage_code ?? "unknown";
      workload[key] = workload[key] ?? { active: 0, overdue: 0 };
      workload[key]!.active += 1;
      if (r.due_at && new Date(r.due_at).getTime() < now) workload[key]!.overdue += 1;
    }
    return workload;
  });
