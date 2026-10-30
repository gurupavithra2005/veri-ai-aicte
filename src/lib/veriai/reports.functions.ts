import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CSV_DISCLAIMER } from "./compliance-utils";

/**
 * SIH26262 Module 12 — downloadable monitoring reports (CSV). All reports use
 * actual authorized database records and carry a generated-at disclaimer.
 * PDF application summaries reuse the existing PDF report generator on the
 * application detail page.
 */

function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const esc = (v: string | number | null) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

function wrap(name: string, csv: string) {
  return { filename: `${name}-${new Date().toISOString().slice(0, 10)}.csv`, csv: csv + "\n\n" + CSV_DISCLAIMER + new Date().toISOString() };
}

async function assertOfficial(context: { supabase: any; userId: string }) {
  const { data: official } = await context.supabase.rpc("is_official", { _user_id: context.userId });
  if (!official) throw new Error("Only authorized officials can generate reports.");
}

export const exportPendencyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOfficial(context);
    const { data: rows } = await context.supabase
      .from("applications")
      .select("application_number, institution_name, region, application_type, processing_route, current_stage, approval_state, stage_entered_at, stage_due_at, submitted_at")
      .not("workflow_template_id", "is", null)
      .order("stage_due_at", { ascending: true, nullsFirst: false });
    const now = Date.now();
    const csv = toCsv(
      ["Application ID", "Institution", "Region", "Application Type", "Route", "Current Stage", "Approval State", "Stage Entered", "Stage Due", "Ageing (days)", "Overdue"],
      (rows ?? []).map((r) => [
        r.application_number,
        r.institution_name,
        r.region,
        r.application_type,
        r.processing_route,
        r.current_stage,
        r.approval_state,
        r.stage_entered_at?.slice(0, 10) ?? "",
        r.stage_due_at?.slice(0, 10) ?? "",
        r.stage_entered_at ? Math.floor((now - new Date(r.stage_entered_at).getTime()) / 86_400_000) : "",
        r.stage_due_at && new Date(r.stage_due_at).getTime() < now ? "YES" : "NO",
      ]),
    );
    return wrap("application-pendency-report", csv);
  });

export const exportEvcReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOfficial(context);
    const { data: rows } = await context.supabase
      .from("evc_records")
      .select("status, due_date, scheduled_date, visit_date, completed_date, applications(application_number, institution_name, region)")
      .order("due_date", { ascending: true, nullsFirst: false });
    const csv = toCsv(
      ["Application ID", "Institution", "Region", "EVC Status", "Due Date", "Scheduled", "Visit Date", "Completed"],
      (rows ?? []).map((r) => {
        const app = r.applications as unknown as { application_number: string; institution_name: string; region: string | null } | null;
        return [
          app?.application_number ?? "",
          app?.institution_name ?? "",
          app?.region ?? "",
          r.status,
          r.due_date ?? "",
          r.scheduled_date ?? "",
          r.visit_date ?? "",
          r.completed_date ?? "",
        ];
      }),
    );
    return wrap("evc-report", csv);
  });

export const exportUndertakingReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOfficial(context);
    const { data: rows } = await context.supabase
      .from("undertakings")
      .select("title, issued_date, due_date, status, verification_status, verification_remarks, verified_at, compliance_closed_at, institutions(institution_name), applications(application_number)")
      .order("due_date", { ascending: true, nullsFirst: false });
    const csv = toCsv(
      ["Undertaking", "Institution", "Application", "Issued", "Due", "Status", "Verification", "Verified At", "Compliance Closed"],
      (rows ?? []).map((r) => {
        const inst = r.institutions as unknown as { institution_name: string } | null;
        const app = r.applications as unknown as { application_number: string } | null;
        return [
          r.title,
          inst?.institution_name ?? "",
          app?.application_number ?? "",
          r.issued_date ?? "",
          r.due_date ?? "",
          r.status,
          r.verification_status ?? "",
          r.verified_at?.slice(0, 10) ?? "",
          r.compliance_closed_at?.slice(0, 10) ?? "",
        ];
      }),
    );
    return wrap("undertaking-compliance-report", csv);
  });

export const exportExpiryReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOfficial(context);
    const { data: rows } = await context.supabase
      .from("compliance_documents")
      .select("document_type, document_number, issue_date, expiry_date, validity_status, file_name, institutions(institution_name)")
      .order("expiry_date", { ascending: true, nullsFirst: false });
    const csv = toCsv(
      ["Document Type", "Document Number", "Institution", "Issue Date", "Expiry Date", "Validity Status", "File"],
      (rows ?? []).map((r) => {
        const inst = r.institutions as unknown as { institution_name: string } | null;
        return [
          r.document_type,
          r.document_number ?? "",
          inst?.institution_name ?? "",
          r.issue_date ?? "",
          r.expiry_date ?? "",
          r.validity_status,
          r.file_name ?? "",
        ];
      }),
    );
    return wrap("document-expiry-report", csv);
  });

export const exportWorkloadReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOfficial(context);
    const { data: rows } = await context.supabase
      .from("applications")
      .select("assigned_reviewer_id, current_stage, approval_state")
      .not("workflow_template_id", "is", null);
    const byOfficer = new Map<string, number>();
    for (const r of rows ?? []) {
      if (!r.assigned_reviewer_id) continue;
      byOfficer.set(r.assigned_reviewer_id, (byOfficer.get(r.assigned_reviewer_id) ?? 0) + 1);
    }
    const ids = [...byOfficer.keys()];
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      for (const p of profiles ?? []) names.set(p.id, p.full_name ?? p.email ?? p.id);
    }
    const csv = toCsv(
      ["Officer", "Active Approval Applications"],
      ids.map((id) => [names.get(id) ?? id, byOfficer.get(id) ?? 0]),
    );
    return wrap("officer-workload-report", csv);
  });

export const exportEscalationReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({}).parse(input))
  .handler(async ({ context }) => {
    await assertOfficial(context);
    const { data: rows } = await context.supabase
      .from("escalation_records")
      .select("level, reason, triggered_at, resolved_at, applications(application_number, institution_name)")
      .order("triggered_at", { ascending: false });
    const csv = toCsv(
      ["Level", "Application", "Institution", "Reason", "Triggered", "Resolved"],
      (rows ?? []).map((r) => {
        const app = r.applications as unknown as { application_number: string; institution_name: string } | null;
        return [
          r.level,
          app?.application_number ?? "",
          app?.institution_name ?? "",
          r.reason,
          r.triggered_at?.slice(0, 10) ?? "",
          r.resolved_at?.slice(0, 10) ?? "",
        ];
      }),
    );
    return wrap("escalation-report", csv);
  });
