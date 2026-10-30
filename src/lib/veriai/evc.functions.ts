import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditEvent } from "./audit.server";
import { notifyRoles, notifyUsers } from "./notifications.server";

/**
 * SIH26262 Module 4 — EVC scheduling and monitoring.
 * Only authorized coordinators (evc_coordinator) or admins schedule and
 * complete EVC visits; an EVC is never auto-marked complete.
 */

async function assertEvcAuthority(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (isAdmin) return;
  const { data: ok } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "evc_coordinator",
  });
  if (!ok) throw new Error("Only EVC coordinators (or administrators) can manage EVC visits.");
}

export const listEvcQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ status: z.string().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: official } = await context.supabase.rpc("is_official", { _user_id: context.userId });
    if (!official) throw new Error("Only authorized officials can view the EVC module.");

    let query = context.supabase
      .from("evc_records")
      .select(
        "id, application_id, requirement, status, due_date, scheduled_date, visit_date, completed_date, committee_members, observations, applications(application_number, institution_name, aicte_permanent_id, region, current_stage)",
      )
      .order("due_date", { ascending: true, nullsFirst: false });
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load the EVC queue: " + error.message);
    return (rows ?? []).map((r) => {
      const app = r.applications as unknown as {
        application_number: string;
        institution_name: string;
        aicte_permanent_id: string | null;
        region: string | null;
        current_stage: string | null;
      } | null;
      return {
        id: r.id,
        applicationId: r.application_id,
        requirement: r.requirement,
        status: r.status,
        dueDate: r.due_date,
        scheduledDate: r.scheduled_date,
        visitDate: r.visit_date,
        completedDate: r.completed_date,
        committeeMembers: (r.committee_members ?? []) as string[],
        observations: r.observations,
        applicationNumber: app?.application_number ?? "",
        institutionName: app?.institution_name ?? "",
        aictePermanentId: app?.aicte_permanent_id ?? null,
        region: app?.region ?? null,
        currentStage: app?.current_stage ?? null,
      };
    });
  });

export const scheduleEvc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        evcId: z.string().uuid(),
        scheduledDate: z.string().min(8),
        visitDate: z.string().optional(),
        committeeMembers: z.array(z.string().min(2)).min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertEvcAuthority(context);
    const supabase = context.supabase;
    const { data: evc } = await supabase
      .from("evc_records")
      .select("id, status, application_id, applications(application_number, created_by, institution_name)")
      .eq("id", data.evcId)
      .single();
    if (!evc) throw new Error("EVC record not found.");
    if (evc.status === "completed") throw new Error("This EVC visit is already completed.");

    const { error } = await supabase
      .from("evc_records")
      .update({
        status: "scheduled",
        scheduled_date: data.scheduledDate,
        visit_date: data.visitDate ?? data.scheduledDate,
        committee_members: data.committeeMembers as never,
        coordinator_id: context.userId,
      } as never)
      .eq("id", data.evcId);
    if (error) throw new Error("Could not schedule the EVC: " + error.message);

    const appRecord = evc.applications as unknown as {
      application_number: string;
      created_by: string;
      institution_name: string;
    } | null;
    await logAuditEvent({
      applicationId: evc.application_id,
      actorId: context.userId,
      actionType: "evc_scheduled",
      entityType: "evc",
      entityId: evc.id,
      newValue: `scheduled=${data.scheduledDate} members=${data.committeeMembers.length}`,
    });
    if (appRecord?.created_by) {
      await notifyUsers([appRecord.created_by], {
        applicationId: evc.application_id,
        title: "EVC visit scheduled",
        message: `${appRecord.application_number} — an Expert Visit Committee visit has been scheduled for ${data.scheduledDate}. Ensure institutional readiness.`,
        notificationType: "evc",
      });
    }
    return { ok: true as const };
  });

export const completeEvc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        evcId: z.string().uuid(),
        completedDate: z.string().min(8),
        observations: z.string().min(10),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertEvcAuthority(context);
    const supabase = context.supabase;
    const { data: evc } = await supabase
      .from("evc_records")
      .select("id, status, visit_date, application_id, applications(application_number, created_by, institution_name)")
      .eq("id", data.evcId)
      .single();
    if (!evc) throw new Error("EVC record not found.");
    if (evc.status === "completed") throw new Error("This EVC visit is already completed.");

    const { error } = await supabase
      .from("evc_records")
      .update({
        status: "completed",
        completed_date: data.completedDate,
        visit_date: evc.visit_date ?? data.completedDate,
        observations: data.observations,
      } as never)
      .eq("id", data.evcId);
    if (error) throw new Error("Could not record the EVC completion: " + error.message);

    const appRecord = evc.applications as unknown as {
      application_number: string;
      created_by: string;
      institution_name: string;
    } | null;
    await logAuditEvent({
      applicationId: evc.application_id,
      actorId: context.userId,
      actionType: "evc_completed",
      entityType: "evc",
      entityId: evc.id,
      newValue: data.observations.slice(0, 200),
    });
    if (appRecord?.created_by) {
      await notifyUsers([appRecord.created_by], {
        applicationId: evc.application_id,
        title: "EVC visit completed",
        message: `${appRecord.application_number} — the EVC visit has been recorded as completed with observations.`,
        notificationType: "evc",
      });
    }
    return { ok: true as const };
  });
