import { createClient as createAdminClient } from "@supabase/supabase-js";

export type SystemLogSeverity =
  | "info"
  | "warning"
  | "error"
  | "critical";

export type SystemErrorLogInput = {
  severity?: SystemLogSeverity;
  module: string;
  action?: string;
  errorCode?: string;
  technicalMessage?: string;
  userMessage?: string;
  userId?: string | null;
  userEmail?: string | null;
  userType?: "reader" | "writer" | "admin" | "superadmin" | "system" | null;
  requestPath?: string;
  metadata?: Record<string, unknown>;
};

function sanitizeMetadata(
  metadata: Record<string, unknown> = {}
) {
  const blockedKeys = [
    "password",
    "otp",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "cookie",
    "secret",
    "api_key",
    "apikey",
  ];

  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => {
      const normalized = key.toLowerCase();

      return !blockedKeys.some((blocked) =>
        normalized.includes(blocked)
      );
    })
  );
}

export async function logSystemError(
  input: SystemErrorLogInput
): Promise<void> {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "[SYSTEM MONITORING] Supabase server configuration missing."
      );
      return;
    }

    const admin = createAdminClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { error } = await admin
      .from("system_error_logs")
      .insert({
        severity: input.severity ?? "error",
        module: input.module.slice(0, 100),
        action: input.action?.slice(0, 150) ?? null,
        error_code:
          input.errorCode?.slice(0, 100) ?? null,
        technical_message:
          input.technicalMessage?.slice(0, 4000) ?? null,
        user_message:
          input.userMessage?.slice(0, 1000) ?? null,
        user_id: input.userId ?? null,
        user_type: input.userType ?? null,
        user_email:
          input.userEmail?.slice(0, 320) ?? null,
        request_path:
          input.requestPath?.slice(0, 500) ?? null,
        metadata: sanitizeMetadata(input.metadata),
        status: "new",
      });

    if (error) {
      console.error(
        "[SYSTEM MONITORING] Gagal menyimpan log:",
        error.message
      );
    }
  } catch (error) {
    /*
     * Logger tidak boleh membuat proses utama aplikasi gagal.
     * Jika monitoring sendiri bermasalah, cukup catat ke server log.
     */
    console.error(
      "[SYSTEM MONITORING] Logger failure:",
      error instanceof Error
        ? error.message
        : "Unknown monitoring error"
    );
  }
}