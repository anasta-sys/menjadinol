import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  READER_ACCESS_COOKIE,
  verifyReaderAccessToken,
  hashReaderSessionId,
} from "@/lib/reader-access";
import { createRuangTanyaAdminDb } from "./database";

export type RuangTanyaUser = {
  readerId: string | null;
  userId: string;
  name: string;
  ownerType: "reader" | "writer" | "admin" | "superadmin";
};

export async function requireRuangTanyaReader(
  request: NextRequest
): Promise<RuangTanyaUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("RT AUTH FAIL 1 - Supabase user", userError);
    return null;
  }

  console.log("RT AUTH OK 1 - user:", user.id);

  const adminDb = createRuangTanyaAdminDb();

  /*
   * Writer / Admin / Superadmin
   */
  const {
    data: adminUser,
    error: adminError,
  } = await adminDb
    .from("admin_users")
    .select("user_id,role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("RT AUTH FAIL 2 - admin lookup:", adminError);
    return null;
  }

  console.log("RT AUTH CHECK 2 - admin:", {
    found: !!adminUser,
    role: adminUser?.role ?? null,
  });

  if (adminUser) {
    const role = String(
      adminUser.role || ""
    ).toLowerCase();

    if (
      role !== "writer" &&
      role !== "admin" &&
      role !== "superadmin"
    ) {
      return null;
    }

    /*
     * Admin area menggunakan MFA.
     * Pastikan session Supabase saat ini sudah AAL2.
     */
    const { data: claimsData } =
      await supabase.auth.getClaims();

    const aal =
      claimsData?.claims?.aal;

    if (aal !== "aal2") {
      console.error("Ruang Tanya AAL check:", {
        userId: user.id,
        role,
        aal,
        claims: claimsData?.claims,
      });

      return null;
    }

    return {
      readerId: null,
      userId: String(user.id),
      name:
        String(user.user_metadata?.name || "").trim() ||
        "Admin",
      ownerType: role as
        | "writer"
        | "admin"
        | "superadmin",
    };
  }

  /*
   * Reader
   */
  const token =
    request.cookies.get(
      READER_ACCESS_COOKIE
    )?.value;

  const access =
    await verifyReaderAccessToken(token);

  if (
    !access ||
    access.userId !== user.id
  ) {
    return null;
  }

  const {
    data: reader,
    error: readerError,
  } = await adminDb
    .from("reader_users")
    .select(
      "id,user_id,full_name,is_active,status"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    readerError ||
    !reader ||
    !reader.is_active ||
    reader.status === "blocked"
  ) {
    return null;
  }

  const sessionHash =
    await hashReaderSessionId(
      access.sessionId
    );

  const {
    data: activeSession,
    error: sessionError,
  } = await adminDb
    .from("reader_active_sessions")
    .select("session_hash,expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    sessionError ||
    !activeSession ||
    activeSession.session_hash !==
      sessionHash ||
    !activeSession.expires_at ||
    new Date(
      activeSession.expires_at
    ).getTime() <= Date.now()
  ) {
    return null;
  }

  return {
    readerId: String(reader.id),
    userId: String(reader.user_id),
    name:
      String(reader.full_name || "").trim() ||
      String(
        user.user_metadata?.name || ""
      ).trim() ||
      "Pembaca",
    ownerType: "reader",
  };
}