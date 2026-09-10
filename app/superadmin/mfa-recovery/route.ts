import "server-only";

import {
  createHash,
  timingSafeEqual,
} from "crypto";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function hashRecoveryCode(value: string) {
  return createHash("sha256")
    .update(value, "utf8")
    .digest();
}

export async function POST(
  request: Request
) {
  try {
    /*
     * =======================================================
     * KONFIGURASI SERVER
     * =======================================================
     */
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const publishableKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const expectedRecoveryHash =
      process.env
        .SUPERADMIN_MFA_RECOVERY_HASH;

    if (
      !supabaseUrl ||
      !publishableKey
    ) {
      return NextResponse.json(
        {
          error:
            "Konfigurasi Supabase belum lengkap.",
        },
        {
          status: 500,
        }
      );
    }

    if (!expectedRecoveryHash) {
      return NextResponse.json(
        {
          error:
            "Recovery MFA belum dikonfigurasi.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =======================================================
     * BACA REQUEST
     * =======================================================
     */
    const body =
      await request.json();

    const accessToken =
      typeof body?.accessToken ===
      "string"
        ? body.accessToken.trim()
        : "";

    const recoveryCode =
      typeof body?.recoveryCode ===
      "string"
        ? body.recoveryCode.trim()
        : "";

    if (
      !accessToken ||
      !recoveryCode
    ) {
      return NextResponse.json(
        {
          error:
            "Session dan recovery code wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Batasi panjang input.
     */
    if (
      recoveryCode.length < 20 ||
      recoveryCode.length > 256
    ) {
      return NextResponse.json(
        {
          error:
            "Recovery code tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =======================================================
     * VALIDASI ACCESS TOKEN
     * =======================================================
     *
     * Gunakan anon/publishable client untuk meminta Supabase
     * memvalidasi JWT dan mendapatkan user pemilik token.
     */
    const authClient =
      createClient(
        supabaseUrl,
        publishableKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    const {
      data: userData,
      error: userError,
    } =
      await authClient.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !userData.user
    ) {
      return NextResponse.json(
        {
          error:
            "Session login tidak valid atau sudah berakhir.",
        },
        {
          status: 401,
        }
      );
    }

    const user =
      userData.user;

    /*
     * =======================================================
     * ADMIN CLIENT
     * =======================================================
     *
     * Service role hanya digunakan di server.
     */
    const admin =
      createAdminClient();

    /*
     * =======================================================
     * VALIDASI ROLE
     * =======================================================
     */
    const {
      data: profile,
      error: profileError,
    } =
      await admin
        .from("admin_users")
        .select("user_id,role")
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.role !==
        "superadmin"
    ) {
      return NextResponse.json(
        {
          error:
            "Akses recovery ditolak.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =======================================================
     * VERIFIKASI RECOVERY CODE
     * =======================================================
     */
    const suppliedHash =
      hashRecoveryCode(
        recoveryCode
      );

    let expectedHash: Buffer;

    try {
      expectedHash =
        Buffer.from(
          expectedRecoveryHash,
          "hex"
        );
    } catch {
      return NextResponse.json(
        {
          error:
            "Konfigurasi recovery server tidak valid.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      expectedHash.length !==
      suppliedHash.length
    ) {
      return NextResponse.json(
        {
          error:
            "Recovery code salah.",
        },
        {
          status: 403,
        }
      );
    }

    const recoveryMatches =
      timingSafeEqual(
        expectedHash,
        suppliedHash
      );

    if (!recoveryMatches) {
      return NextResponse.json(
        {
          error:
            "Recovery code salah.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =======================================================
     * AMBIL FACTOR MFA USER
     * =======================================================
     */
    const {
      data: factorsData,
      error: factorsError,
    } =
      await admin.auth.admin.mfa
        .listFactors({
          userId: user.id,
        });

    if (factorsError) {
      console.error(
        "Superadmin MFA list factors:",
        factorsError
      );

      return NextResponse.json(
        {
          error:
            "Gagal membaca Authenticator lama.",
        },
        {
          status: 500,
        }
      );
    }

    const factors =
      factorsData?.factors ?? [];

    const totpFactors =
      factors.filter(
        (factor) =>
          factor.factor_type ===
          "totp"
      );

    /*
     * =======================================================
     * HAPUS TOTP LAMA
     * =======================================================
     */
    for (
      const factor of
      totpFactors
    ) {
      const {
        error: deleteError,
      } =
        await admin.auth.admin.mfa
          .deleteFactor({
            userId: user.id,
            id: factor.id,
          });

      if (deleteError) {
        console.error(
          "Superadmin MFA delete factor:",
          deleteError
        );

        return NextResponse.json(
          {
            error:
              "Gagal menghapus Authenticator lama.",
          },
          {
            status: 500,
          }
        );
      }
    }

    /*
     * Jangan mengembalikan recovery code,
     * service role, ataupun data sensitif.
     */
    return NextResponse.json(
      {
        ok: true,

        message:
          "Authenticator lama berhasil dilepas. Silakan login kembali untuk memasangkan Authenticator baru.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Superadmin MFA recovery:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Recovery Authenticator gagal diproses.",
      },
      {
        status: 500,
      }
    );
  }
}