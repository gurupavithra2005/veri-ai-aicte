import { supabase } from "@/integrations/supabase/client";
import { CONFIG } from "@/lib/constants";
import { extractDocumentText } from "@/lib/extraction/extract-document";
import { extractFields, toStoredFields } from "@/lib/extraction/field-extractor";
import { sha256Hash } from "@/lib/extraction/hash";

export function mimeForFile(file: File): string {
  if (file.type) return file.type;
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  return "image/jpeg";
}

export interface UploadChecklistResult {
  documentId: string;
  ocrStatus: string;
  confidence: number | null;
}

/**
 * Uploads one checklist document into the private bucket, records its metadata
 * and runs the local in-browser extraction (PDF text / OCR). Nothing leaves the
 * browser; low-confidence extraction is flagged for human review.
 */
export async function uploadChecklistDocument(options: {
  applicationId: string;
  documentCategory: string;
  aphSource: string | null;
  classification: string | null;
  file: File;
  userId: string;
  onProgress?: (message: string) => void;
}): Promise<UploadChecklistResult> {
  const { applicationId, documentCategory, aphSource, classification, file, userId, onProgress } = options;
  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  if (!CONFIG.allowedExtensions.includes(ext)) {
    throw new Error("Unsupported file type. Upload a PDF, JPG or PNG document.");
  }
  if (file.size > CONFIG.maxFileSizeBytes) {
    throw new Error(`File is too large. The limit is ${CONFIG.maxFileSizeLabel} per file.`);
  }

  onProgress?.("Uploading…");
  const hash = await sha256Hash(file);
  const path = `${applicationId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from(CONFIG.storageBucket)
    .upload(path, file, { upsert: false, contentType: mimeForFile(file) });
  if (uploadError) throw new Error("Upload failed: " + uploadError.message);

  const { data: inserted, error: insertError } = await supabase
    .from("documents")
    .insert({
      application_id: applicationId,
      file_name: file.name,
      storage_path: path,
      mime_type: mimeForFile(file),
      file_size: file.size,
      document_category: documentCategory,
      uploaded_by: userId,
      sha256_hash: hash,
      ocr_status: "processing",
      aph_clause_reference: aphSource,
      requirement_classification: classification,
    } as never)
    .select("id")
    .single();
  if (insertError || !inserted) throw new Error("Could not record the document metadata.");

  onProgress?.("Starting extraction…");
  await supabase.from("documents").update({ ocr_status: "processing" }).eq("id", inserted.id);
  const result = await extractDocumentText(file, (stage, percent) =>
    onProgress?.(`${stage} (${Math.round(percent)}%)`),
  );
  const fields = extractFields(result.text);
  await supabase
    .from("documents")
    .update({
      ocr_status: result.ok ? (result.needsReview ? "needs_review" : "completed") : "failed",
      extracted_text: result.text || null,
      extracted_fields: toStoredFields(fields),
      extraction_confidence: result.confidence,
      extraction_error: result.error,
      pages_processed: result.pagesProcessed,
    } as never)
    .eq("id", inserted.id);

  return { documentId: inserted.id, ocrStatus: result.ok ? "completed" : "failed", confidence: result.confidence };
}

/** Opens a short-lived signed URL for a stored document. */
export async function openDocumentUrl(storagePath: string): Promise<void> {
  const { data, error } = await supabase.storage.from(CONFIG.storageBucket).createSignedUrl(storagePath, 300);
  if (error || !data) throw new Error("Could not open the document: " + (error?.message ?? "no signed URL"));
  window.open(data.signedUrl, "_blank", "noopener");
}
