import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export type AdminRole = "writer" | "admin" | "superadmin";

export async function requireAdminSession() {
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims?.claims?.sub) {
    throw new Error("ADMIN_SESSION_MISSING");
  }
  if (claims.claims.aal !== "aal2") {
    throw new Error("ADMIN_MFA_REQUIRED");
  }

  const userId = claims.claims.sub as string;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("ADMIN_SERVER_CONFIG_MISSING");
  }

  const adminDb = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: admin, error: adminError } = await adminDb
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (adminError) throw new Error("ADMIN_LOOKUP_FAILED");
  if (!admin) throw new Error("ADMIN_ACCESS_DENIED");

  const role = admin.role as AdminRole;
  if (!(["writer", "admin", "superadmin"] as const).includes(role)) {
    throw new Error("ADMIN_ROLE_INVALID");
  }

  const user = { id: userId };
  return {
    supabase,
    user,
    userId,
    role,
    isWriter: role === "writer",
    isAdmin: role === "admin" || role === "superadmin",
    isSuperAdmin: role === "superadmin",
    claims: claims.claims,
  };
}

export async function requireRole(allowedRoles: AdminRole[]) {
  const session = await requireAdminSession();
  if (!allowedRoles.includes(session.role)) {
    throw new Error("ADMIN_ROLE_NOT_ALLOWED");
  }
  return session;
}

export async function requireAdminOrSuperAdmin() {
  return requireRole(["admin", "superadmin"]);
}

export async function requireSuperAdmin() {
  return requireRole(["superadmin"]);
}
