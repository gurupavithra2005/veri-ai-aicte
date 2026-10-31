import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, CalendarClock, ExternalLink, Flag } from "lucide-react";
import {
  completeStage,
  getWorkflowDetail,
  recordApprovalDecision,
  respondToClarification,
  returnForClarification,
  submitApprovalApplication,
} from "@/lib/veriai/workflow.functions";
import type { AppRole } from "@/lib/status";
import { APPROVAL_STATE_BADGE_CLASSES, APPROVAL_STATE_LABELS, STAGE_LABELS, formatDate } from "@/lib/status";
import type { ApprovalState } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * SIH26262 — approval workflow panel on the application detail page.
 * Shows the configured route, the stage timeline and the actions available to
 * the signed-in role. All authorization is re-verified server-side; this UI
 * only hides actions the user could never perform.
 */

const OFFICIAL_ROLES: AppRole[] = ["admin", "reviewer", "regional_officer", "evc_coordinator", "competent_authority"];

export function isOfficialRole(roles: AppRole[] | null): boolean {
  return !!roles && roles.some((r) => OFFICIAL_ROLES.includes(r));
}

interface StageRow {
  id: string;
  stage_order: number;
  stage_code: string;
  stage_name: string;
  responsible_role: string | null;
  responsible_bureau: string | null;
  timeline_days: number | null;
}

interface HistoryRow {
  id: string;
  stage_order: number;
  stage_code: string;
  stage_name: string;
  due_at: string | null;
  entered_at: string;
  exited_at: string | null;
  status: string;
  action_remarks: string | null;
}

interface ClarificationRow {
  id: string;
  reason: string;
  required_correction: string | null;
  status: string;
  response_note: string | null;
  created_at: string;
}

interface EvcRow {
  id: string;
  status: string;
  scheduled_date: string | null;
  visit_date: string | null;
  requirement: string | null;
}

export function ApprovalWorkflowCard({
  applicationId,
  isOwner,
  statusEditable,
  roles,
  onChanged,
}: {
  applicationId: string;
  isOwner: boolean;
  statusEditable: boolean;
  roles: AppRole[] | null;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const official = isOfficialRole(roles);
  const canDecide = !!roles && (roles.includes("admin") || roles.includes("competent_authority"));

  const workflow = useQuery({
    queryKey: ["app-detail", "workflow", applicationId],
    queryFn: () => getWorkflowDetail({ data: { applicationId } }),
  });

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      await queryClient.invalidateQueries({ queryKey: ["app-detail", "workflow", applicationId] });
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  if (workflow.isPending) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Loading approval workflow…</p>
      </div>
    );
  }
  if (workflow.isError) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <p className="text-sm text-destructive">{(workflow.error as Error).message}</p>
      </div>
    );
  }

  const detail = workflow.data;
  const application = detail.application as unknown as {
    workflow_template_id: string | null;
    approval_state: ApprovalState | null;
    current_stage: string | null;
    processing_route: string | null;
    assigned_bureau: string | null;
    stage_due_at: string | null;
    stage_entered_at: string | null;
    application_number: string;
    status: string;
  };
  const stages = detail.templateStages as unknown as StageRow[];
  const history = detail.stageHistory as unknown as HistoryRow[];
  const clarifications = detail.clarifications as unknown as ClarificationRow[];
  const evcRecords = detail.evcRecords as unknown as EvcRow[];
  const openClarification = clarifications.find((c) => c.status === "open");
  const hasTemplate = !!application.workflow_template_id;
  const inProgress = application.approval_state === "in_progress";
  const overdue =
    application.stage_due_at && new Date(application.stage_due_at).getTime() < Date.now();

  // Officer actions: match the responsible role of the active stage (admin passes all).
  const currentStageRow = stages.find((s) => s.stage_code === application.current_stage);
  const activeHistory = history.find((h) => h.exited_at === null);
  const responsibleRole = currentStageRow?.responsible_role ?? "";
  const canActOnStage =
    official &&
    inProgress &&
    (roles!.includes("admin") || (responsibleRole !== "" && roles!.includes(responsibleRole as never)));

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">Approval Workflow</h2>
          <p className="text-xs text-muted-foreground">
            {hasTemplate
              ? `Route: ${application.processing_route ?? "configured"}`
              : "Not yet submitted for approval processing."}
          </p>
        </div>
        {hasTemplate && application.approval_state && (
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-semibold",
              APPROVAL_STATE_BADGE_CLASSES[application.approval_state],
            )}
          >
            {APPROVAL_STATE_LABELS[application.approval_state]}
          </span>
        )}
      </div>

      {!hasTemplate && isOwner && statusEditable && (
        <SubmitForApproval
          applicationId={applicationId}
          busy={busy === "submit"}
          onRun={(fn, msg) => run("submit", fn, msg)}
        />
      )}

      {hasTemplate && (
        <>
          <div className="mb-4 grid gap-2 rounded-lg bg-secondary/50 p-3 text-xs sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Current stage</p>
              <p className="font-semibold text-foreground">
                {application.current_stage
                  ? STAGE_LABELS[application.current_stage] ?? application.current_stage
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Responsible bureau</p>
              <p className="font-semibold text-foreground">{application.assigned_bureau ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Stage due</p>
              <p className={cn("font-semibold", overdue ? "text-destructive" : "text-foreground")}>
                {formatDate(application.stage_due_at)}
                {overdue ? " (overdue)" : ""}
              </p>
            </div>
          </div>

          <StageTimeline stages={stages} history={history} />

          {activeHistory && inProgress && (
            <div className="mt-4 space-y-3">
              {openClarification ? (
                <ClarificationBanner clarification={openClarification} />
              ) : null}
              {canActOnStage && !openClarification && (
                <OfficerActions
                  stageName={
                    application.current_stage
                      ? STAGE_LABELS[application.current_stage] ?? application.current_stage
                      : "stage"
                  }
                  busy={busy !== null}
                  onComplete={(remarks, observation) =>
                    run(
                      "complete",
                      () =>
                        completeStage({
                          data: {
                            applicationId,
                            remarks,
                            observation: observation || undefined,
                          },
                        }),
                      "Stage completed — the application moved to the next stage.",
                    )
                  }
                  onReturn={(reason, correction) =>
                    run(
                      "return",
                      () =>
                        returnForClarification({
                          data: {
                            applicationId,
                            reason,
                            requiredCorrection: correction || undefined,
                          },
                        }),
                      "Application returned to the institution for clarification.",
                    )
                  }
                />
              )}
            </div>
          )}

          {isOwner && openClarification && application.approval_state === "returned" && (
            <RespondClarification
              busy={busy === "respond"}
              onRespond={(note) =>
                run(
                  "respond",
                  () => respondToClarification({ data: { applicationId, responseNote: note } }),
                  "Response sent — the application is back in processing.",
                )
              }
            />
          )}

          {currentStageRow?.stage_code === "evc" && evcRecords.length > 0 && (
            <div className="mt-4 rounded-lg border p-3 text-sm">
              <p className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <CalendarClock className="h-4 w-4 text-teal" /> Expert Visit Committee
              </p>
              {evcRecords.slice(0, 2).map((e) => (
                <p key={e.id} className="text-xs text-muted-foreground">
                  {e.status} · scheduled {formatDate(e.scheduled_date)} · visit {formatDate(e.visit_date)}
                </p>
              ))}
              <a href="/evc" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline">
                Open the EVC module <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {canDecide && inProgress && !openClarification && (
            <DecisionForm
              applicationId={applicationId}
              busy={busy === "decide"}
              onDecide={(decision, reason, uTitle, uDue) =>
                run(
                  "decide",
                  () =>
                    recordApprovalDecision({
                      data: {
                        applicationId,
                        decision,
                        reason,
                        undertakingTitle: uTitle || undefined,
                        undertakingDueDate: uDue || undefined,
                      },
                    }),
                  decision === "approved"
                    ? "Approval recorded — compliance undertakings created."
                    : "Rejection recorded.",
                )
              }
            />
          )}
        </>
      )}
    </div>
  );
}

function StageTimeline({ stages, history }: { stages: StageRow[]; history: HistoryRow[] }) {
  const completedCodes = new Set(history.filter((h) => h.exited_at).map((h) => h.stage_code));
  return (
    <ol className="space-y-2">
      {stages.map((s) => {
        const h = history.find((x) => x.stage_code === s.stage_code && x.exited_at === null);
        const done = completedCodes.has(s.stage_code);
        const active = !!h;
        return (
          <li
            key={s.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-3 py-2 text-sm",
              active ? "border-teal/40 bg-teal-soft/50" : done ? "bg-secondary/30" : "",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                active ? "bg-teal text-primary-foreground" : done ? "bg-success text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {done ? "✓" : s.stage_order}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-foreground">{s.stage_name}</p>
              <p className="text-xs text-muted-foreground">
                {s.responsible_role ?? "—"}
                {s.responsible_bureau ? ` · ${s.responsible_bureau}` : ""}
                {s.timeline_days ? ` · SLA ${s.timeline_days} days` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SubmitForApproval({
  applicationId,
  busy,
  onRun,
}: {
  applicationId: string;
  busy: boolean;
  onRun: (fn: () => Promise<unknown>, success: string) => void;
}) {
  const [result, setResult] = useState<{ missingFields: string[]; missingDocuments: string[] } | null>(null);
  return (
    <div className="mb-4 rounded-lg border border-teal/30 bg-teal-soft/40 p-3">
      <p className="text-sm text-foreground">
        This application is ready for approval processing. Submitting assigns the configured
        processing route and opens the first stage.
      </p>
      <Button
        className="mt-2"
        disabled={busy}
        onClick={() =>
          onRun(async () => {
            const res = await submitApprovalApplication({ data: { applicationId } });
            if (!res.ok) {
              setResult({ missingFields: res.missingFields, missingDocuments: res.missingDocuments });
              throw new Error("Missing details or documents — see the list below.");
            }
            setResult(null);
          }, "Submitted for approval processing.")
        }
      >
        {busy ? "Submitting…" : "Submit for approval"} <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
      {result && (
        <ul className="mt-2 list-inside list-disc text-xs text-destructive">
          {result.missingFields.map((f) => (
            <li key={f}>Missing detail: {f}</li>
          ))}
          {result.missingDocuments.map((d) => (
            <li key={d}>Missing document: {d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OfficerActions({
  stageName,
  busy,
  onComplete,
  onReturn,
}: {
  stageName: string;
  busy: boolean;
  onComplete: (remarks: string, observation: string) => void;
  onReturn: (reason: string, correction: string) => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [observation, setObservation] = useState("");
  const [returnMode, setReturnMode] = useState(false);
  const [reason, setReason] = useState("");
  const [correction, setCorrection] = useState("");

  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <Flag className="h-4 w-4 text-teal" /> Officer actions — {stageName}
      </p>
      {!returnMode ? (
        <div className="space-y-2">
          <div>
            <Label htmlFor="stage-remarks">Completion remarks</Label>
            <Textarea
              id="stage-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="What was reviewed and concluded at this stage"
              className="min-h-16"
            />
          </div>
          <div>
            <Label htmlFor="stage-observation">Observation (optional, recorded for the record)</Label>
            <Input
              id="stage-observation"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="e.g. Land documents verified against records"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || remarks.trim().length < 3}
              onClick={() => {
                onComplete(remarks, observation);
                setRemarks("");
                setObservation("");
              }}
            >
              Complete stage & move forward
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setReturnMode(true)}>
              Return for clarification
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <Label htmlFor="return-reason">Reason for returning</Label>
            <Textarea
              id="return-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-16"
              placeholder="Explain what the institution must clarify or correct"
            />
          </div>
          <div>
            <Label htmlFor="return-correction">Required correction (optional)</Label>
            <Input
              id="return-correction"
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              placeholder="e.g. Re-upload the lease deed with signatures"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={busy || reason.trim().length < 10}
              onClick={() => {
                onReturn(reason, correction);
                setReason("");
                setCorrection("");
                setReturnMode(false);
              }}
            >
              Send back to institution
            </Button>
            <Button variant="ghost" onClick={() => setReturnMode(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClarificationBanner({ clarification }: { clarification: ClarificationRow }) {
  return (
    <div className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm">
      <p className="font-medium text-foreground">Clarification requested</p>
      <p className="text-foreground/90">{clarification.reason}</p>
      {clarification.required_correction && (
        <p className="mt-1 text-xs text-foreground/80">Required correction: {clarification.required_correction}</p>
      )}
    </div>
  );
}

function RespondClarification({
  busy,
  onRespond,
}: {
  busy: boolean;
  onRespond: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="rounded-lg border p-3">
      <Label htmlFor="clarification-response">Your response to the clarification request</Label>
      <Textarea
        id="clarification-response"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mt-1 min-h-16"
        placeholder="Explain the correction made or provide the clarification"
      />
      <Button className="mt-2" disabled={busy || note.trim().length < 5} onClick={() => onRespond(note)}>
        {busy ? "Sending…" : "Send response & resume processing"}
      </Button>
    </div>
  );
}

function DecisionForm({
  applicationId,
  busy,
  onDecide,
}: {
  applicationId: string;
  busy: boolean;
  onDecide: (
    decision: "approved" | "rejected",
    reason: string,
    undertakingTitle: string,
    undertakingDueDate: string,
  ) => void;
}) {
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [reason, setReason] = useState("");
  const [undertakingTitle, setUndertakingTitle] = useState("");
  const [undertakingDueDate, setUndertakingDueDate] = useState("");
  return (
    <div className="mt-4 rounded-lg border border-teal/30 bg-teal-soft/30 p-3">
      <p className="mb-2 text-sm font-medium text-foreground">Authorized decision (competent authority)</p>
      <div className="mb-2 flex gap-2">
        <Button
          size="sm"
          variant={decision === "approved" ? "default" : "outline"}
          onClick={() => setDecision("approved")}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant={decision === "rejected" ? "destructive" : "outline"}
          onClick={() => setDecision("rejected")}
        >
          Reject
        </Button>
      </div>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="min-h-16"
        placeholder="Reason for the recorded decision (min 10 characters)"
      />
      {decision === "approved" && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="undertaking-title">Undertaking to impose (optional)</Label>
            <Input
              id="undertaking-title"
              value={undertakingTitle}
              onChange={(e) => setUndertakingTitle(e.target.value)}
              placeholder="e.g. Submit audited utilization certificate"
            />
          </div>
          <div>
            <Label htmlFor="undertaking-due">Undertaking due date</Label>
            <Input
              id="undertaking-due"
              type="date"
              value={undertakingDueDate}
              onChange={(e) => setUndertakingDueDate(e.target.value)}
            />
          </div>
        </div>
      )}
      <Button
        className="mt-2"
        disabled={busy || reason.trim().length < 10}
        onClick={() => {
          onDecide(decision, reason, undertakingTitle, undertakingDueDate);
          setReason("");
          setUndertakingTitle("");
          setUndertakingDueDate("");
        }}
      >
        {busy ? "Recording…" : `Record ${decision === "approved" ? "approval" : "rejection"}`}
      </Button>
    </div>
  );
}
