import type { Database } from "@/integrations/supabase/types";

/**
 * Trusted backend notification helper. Uses the service-role client, which is
 * loaded inside the function body only (never at module scope).
 */
export async function notifyUsers(
  userIds: string[],
  payload: {
    applicationId?: string | null;
    title: string;
    message: string;
    notificationType?: string;
  },
) {
  if (userIds.length === 0) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows = userIds.map((userId) => ({
    user_id: userId,
    application_id: payload.applicationId ?? null,
    title: payload.title,
    message: payload.message,
    notification_type: payload.notificationType ?? "general",
  }));
  const { error } = await supabaseAdmin.from("notifications").insert(rows);
  if (error) {
    console.error("Failed to create notifications", error);
  }
}

/** Notify every admin (used e.g. when a reviewer submits a recommendation). */
export async function notifyAdmins(payload: {
  applicationId?: string | null;
  title: string;
  message: string;
  notificationType?: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  await notifyUsers(
    (data ?? []).map((r) => r.user_id),
    payload,
  );
}

/** Notify every user holding one of the given workflow roles (e.g. the officer responsible for a stage). */
export async function notifyRoles(
  roles: string[],
  payload: {
    applicationId?: string | null;
    title: string;
    message: string;
    notificationType?: string;
  },
) {
  if (roles.length === 0) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const dbRoles = roles.filter((r): r is Database["public"]["Enums"]["app_role"] =>
    (["institution_user", "reviewer", "admin", "regional_officer", "evc_coordinator", "competent_authority"] as const).includes(
      r as Database["public"]["Enums"]["app_role"],
    ),
  );
  if (dbRoles.length === 0) return;
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .in("role", dbRoles);
  const ids = [...new Set((data ?? []).map((r) => r.user_id))];
  await notifyUsers(ids, payload);
}
