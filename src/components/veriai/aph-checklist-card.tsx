import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, Upload, ShieldQuestion } from "lucide-react";
import { getAphChecklist, reviewChecklistDocument, overrideChecklistItem } from "@/lib/veriai/checklist.functions";
import { uploadChecklistDocument, openDocumentUrl } from "@/lib/veriai/checklist-upload";
import { useSession } from "@/hooks/use-roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/status";
import {
  CHECKLIST_STATUS_LABELS,
  CHECKLIST_STATUS_BADGE_CLASSES,
  type ChecklistItemStatus,
} from "@/lib/aph/checklist";
import { cn } from "@/lib/utils";

/**
 * SIH26262 — AICTE Approval Document Checklist and Institutional Compliance &
 * Validity Tracker. Generated dynamically per application category; every item
 * shows its APH source. Uploaded documents never auto-accept.
 */
export function AphChecklistCard({
  applicationId,
  canUpload,
  isOfficial,
  onChanged,
}: {
  applicationId: string;
  canUpload: boolean;
  isOfficial: boolean;
  onChanged: () => void;
}) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [progressItem, setProgressItem] = useState<string | null>(null);
  const [reviewItem, setReviewItem] = useState<string | null>(null);

  const checklist = useQuery({
    queryKey: ["app-detail", "aph-checklist", applicationId],
    queryFn: () => getAphChecklist({ data: { applicationId } }),
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ["app-detail", "aph-checklist", applicationId] });
    onChanged();
  }

  async function onUpload(documentCategory: string, aphSource: string | null, classification: string | null, file: File) {
    if (!userId) return;
    setBusyItem(documentCategory);
    setProgressItem("Uploading…");
    try {
      await uploadChecklistDocument({
        applicationId,
        documentCategory,
        aphSource,
        classification,
        file,
        userId,
        onProgress: (m) => setProgressItem(m),
      });
      toast.success("Document uploaded and processed locally. It now awaits authorized review.");
      await invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusyItem(null);
      setProgressItem(null);
    }
  }

  if (checklist.isPending) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Generating the APH checklist…</p>
      </div>
    );
  }
  if (checklist.isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-danger-soft p-4 text-sm text-destructive">
        Could not load the checklist: {(checklist.error as Error).message}
      </div>
    );
  }

  const data = checklist.data;
  const { summary } = data;
  const applicable = data.items.filter((i) => i.applicable);
  const notApplicable = data.items.filter((i) => !i.applicable);

  return (
    <div className="space-y-4">
      {/* A. Approval Application Documents */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-semibold text-foreground">AICTE Approval Document Checklist</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Documents and compliance requirements applicable to this institution's AICTE approval
          application, based on the selected approval category and applicable APH rules.
        </p>

        <div className="mt-3 grid gap-2 rounded-lg border bg-background p-3 text-xs sm:grid-cols-4">
          <div>
            <p className="font-medium text-muted-foreground">Category</p>
            <p className="text-foreground">{data.categoryLabel ?? "—"}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Applicable APH version</p>
            <p className="text-foreground">{data.aphVersion}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Checklist progress</p>
            <p className="text-foreground">
              {summary.progress}% accepted ({summary.accepted}/{summary.total})
            </p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-teal" style={{ width: `${summary.progress}%` }} />
            </div>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Alerts</p>
            <p className="text-destructive">{summary.missing} missing</p>
            <p className="text-warning">{summary.expiring} expired</p>
            <p className="text-info">{summary.pendingReview} awaiting review</p>
          </div>
        </div>

        {data.legacyUnmapped.length > 0 && (
          <div className="mt-3 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-foreground">
            <p className="font-medium">Legacy documents require mapping</p>
            {data.legacyUnmapped.map((note) => (
              <p key={note} className="mt-1">{note}</p>
            ))}
          </div>
        )}

        <ul className="mt-4 space-y-3">
          {applicable.map((item) => {
            const status = item.status as ChecklistItemStatus;
            const isNotApplicable = status === "not_applicable";
            return (
              <li
                key={item.documentCategory}
                className={cn("rounded-lg border bg-background p-3", isNotApplicable && "opacity-70")}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                      Required for: {data.categoryLabel} · Source: {item.aphSource}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      CHECKLIST_STATUS_BADGE_CLASSES[status],
                    )}
                  >
                    {CHECKLIST_STATUS_LABELS[status]}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">{item.applicabilityExplanation}</p>
                {item.authenticationNote && (
                  <p className="mt-1 text-xs text-foreground">{item.authenticationNote}</p>
                )}
                {isNotApplicable && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Marked Not Applicable by an authorized official.
                  </p>
                )}
                {item.linkedFileName && (
                  <p className="mt-1 text-xs text-foreground">
                    Uploaded: {item.linkedFileName}
                    {item.reviewRemarks ? ` · Reviewer: ${item.reviewRemarks}` : ""}
                    {item.correctionReason ? ` · Correction needed: ${item.correctionReason}` : ""}
                  </p>
                )}
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                  Classification: {item.applicability === "mandatory" ? "Mandatory" : item.applicability === "conditional" ? "Conditional" : "Optional"}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {canUpload && !isNotApplicable && (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent">
                      <Upload className="h-3.5 w-3.5" />
                      {item.linkedDocumentId ? "Replace Document" : "Upload Document"}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        disabled={busyItem === item.documentCategory}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.currentTarget.value = "";
                          if (f) void onUpload(item.documentCategory, item.aphSource, item.applicability, f);
                        }}
                      />
                    </label>
                  )}
                  {busyItem === item.documentCategory && progressItem && (
                    <span className="text-xs text-info">{progressItem}</span>
                  )}
                  {item.linkedDocumentId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void (async () => {
                          try {
                            // Resolve the storage path from the documents table.
                            const { getApplication } = await import("@/lib/veriai/applications.functions");
                            await openDocumentUrlViaDetail(applicationId, item.linkedDocumentId!);
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Could not open document.");
                          }
                        })();
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </Button>
                  )}
                  {isOfficial && item.linkedDocumentId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReviewItem(reviewItem === item.documentCategory ? null : item.documentCategory)}
                    >
                      Review status
                    </Button>
                  )}
                  {isOfficial && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void (async () => {
                          const reason = window.prompt(
                            isNotApplicable
                              ? "Remove the Not Applicable override? Enter a short note."
                              : "Why is this item Not Applicable for this application?",
                          );
                          if (!reason) return;
                          try {
                            await overrideChecklistItem({
                              data: {
                                applicationId,
                                documentCategory: item.documentCategory,
                                notApplicable: !isNotApplicable,
                                reason,
                              },
                            });
                            toast.success("Checklist applicability updated.");
                            await invalidate();
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Could not update.");
                          }
                        })();
                      }}
                    >
                      <ShieldQuestion className="h-3.5 w-3.5" />
                      {isNotApplicable ? "Restore requirement" : "Mark Not Applicable"}
                    </Button>
                  )}
                </div>

                {reviewItem === item.documentCategory && isOfficial && item.linkedDocumentId && (
                  <ReviewPanel
                    documentId={item.linkedDocumentId}
                    itemName={item.name}
                    onDone={async () => {
                      setReviewItem(null);
                      await invalidate();
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>

        {notApplicable.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              {notApplicable.length} conditional item(s) whose APH condition is not met
            </summary>
            <ul className="mt-2 space-y-2">
              {notApplicable.map((item) => (
                <li key={item.documentCategory} className="rounded-lg border bg-muted/40 px-3 py-2">
                  <p className="text-xs font-medium text-foreground">{item.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{item.applicabilityExplanation}</p>
                  <p className="mt-0.5 text-[11px] italic text-muted-foreground">Source: {item.aphSource}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* B. Institutional Compliance & Validity Tracker */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-semibold text-foreground">Institutional Compliance & Validity Tracker</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Ongoing institutional obligations and documents that may need renewal or periodic
          submission. These are tracked separately from the approval application uploads above.
        </p>

        <h3 className="mt-4 text-sm font-medium text-foreground">Registered compliance documents</h3>
        {data.complianceRecords.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No compliance records registered yet. Lease validity, Fire Safety Certificate validity,
            Occupancy / Building Certificate details and Structural Stability Certificate validity
            are registered from the Compliance page.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.complianceRecords.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-xs">
                <span className="font-medium text-foreground">
                  {c.documentType}
                  {c.documentNumber ? ` · ${c.documentNumber}` : ""}
                </span>
                <span className="text-muted-foreground">
                  {c.expiryDate ? `Expires ${formatDate(c.expiryDate)}` : "No expiry recorded"} ·{" "}
                  {c.validityStatus.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-4 text-sm font-medium text-foreground">Time-bound AICTE undertakings</h3>
        {data.undertakings.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No undertakings recorded for this application.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.undertakings.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-xs">
                <span className="font-medium text-foreground">{u.title}</span>
                <span className="text-muted-foreground">
                  Due {formatDate(u.dueDate)} · {u.status.replace(/_/g, " ")}
                  {u.verificationStatus ? ` · ${u.verificationStatus.replace(/_/g, " ")}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          Manage renewals and evidence from the Compliance page; officials verify submissions there.
        </p>
      </div>
    </div>
  );
}

async function openDocumentUrlViaDetail(applicationId: string, documentId: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { CONFIG } = await import("@/lib/constants");
  const { data, error } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("application_id", applicationId)
    .single();
  if (error || !data) throw new Error("Could not open the document.");
  await openDocumentUrl(data.storage_path);
}

function ReviewPanel({
  documentId,
  itemName,
  onDone,
}: {
  documentId: string;
  itemName: string;
  onDone: () => void | Promise<void>;
}) {
  const [status, setStatus] = useState<string>("under_review");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-3 space-y-2 rounded-lg border bg-card p-3">
      <p className="text-xs font-medium text-foreground">
        Review “{itemName}” — record an authorized decision with remarks.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`rv-status-${documentId}`}>Status</Label>
          <select
            id={`rv-status-${documentId}`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="under_review">Under Review</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="correction_requested">Correction Requested</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`rv-remarks-${documentId}`}>Verification remarks</Label>
          <Input id={`rv-remarks-${documentId}`} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
      </div>
      {(status === "correction_requested" || status === "rejected") && (
        <div className="space-y-1">
          <Label htmlFor={`rv-reason-${documentId}`}>Correction / rejection reason</Label>
          <Textarea id={`rv-reason-${documentId}`} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
      )}
      <Button
        size="sm"
        disabled={busy || remarks.trim().length < 3}
        onClick={() => {
          void (async () => {
            setBusy(true);
            try {
              await reviewChecklistDocument({
                data: {
                  documentId,
                  status: status as "accepted" | "rejected" | "correction_requested" | "under_review",
                  remarks,
                },
              });
              toast.success("Review recorded. The document status was updated.");
              await onDone();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not record the review.");
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        Save review
      </Button>
    </div>
  );
}
