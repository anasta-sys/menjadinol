"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function SuperAdminMfa() {
  const router = useRouter();

  const [code, setCode] = useState("");

  const [factorId, setFactorId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [verifying, setVerifying] =
    useState(false);

  const [error, setError] =
    useState("");

  const [secondsLeft, setSecondsLeft] =
    useState(30);

  /*
   * =========================================================
   * TOTP COUNTDOWN
   * =========================================================
   *
   * Authenticator umumnya menggunakan periode 30 detik.
   * Countdown ini mengikuti waktu perangkat sehingga tidak
   * dimulai dari 30 setiap kali halaman dibuka.
   */
  useEffect(() => {
    function updateCountdown() {
      const now =
        Math.floor(Date.now() / 1000);

      const elapsed =
        now % 30;

      const remaining =
        30 - elapsed;

      setSecondsLeft(remaining);
    }

    updateCountdown();

    const timer =
      window.setInterval(
        updateCountdown,
        1000
      );

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  /*
   * =========================================================
   * ENSURE SESSION
   * =========================================================
   */
  async function ensureFreshSession() {
    const {
      data: currentSession,
      error: sessionError,
    } =
      await supabase.auth.getSession();

    if (
      !sessionError &&
      currentSession.session
    ) {
      return currentSession.session;
    }

    const {
      data: refreshed,
      error: refreshError,
    } =
      await supabase.auth.refreshSession();

    if (
      refreshError ||
      !refreshed.session
    ) {
      throw new Error(
        "SESSION_EXPIRED"
      );
    }

    return refreshed.session;
  }

  /*
   * =========================================================
   * SYNC SESSION KE SERVER
   * =========================================================
   */
  async function syncSession() {
    let session;

    try {
      session =
        await ensureFreshSession();
    } catch {
      throw new Error(
        "Sesi sudah berakhir dan tidak dapat diperbarui."
      );
    }

    const response =
      await fetch(
        "/auth/sync",
        {
          method: "POST",
          credentials: "same-origin",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            access_token:
              session.access_token,

            refresh_token:
              session.refresh_token,
          }),
        }
      );

    if (!response.ok) {
      /*
       * Bila token berubah/expired ketika proses sync,
       * refresh sekali lalu coba kembali.
       */
      const {
        data: refreshed,
        error: refreshError,
      } =
        await supabase.auth.refreshSession();

      if (
        refreshError ||
        !refreshed.session
      ) {
        throw new Error(
          "Sesi sudah berakhir dan tidak dapat diperbarui."
        );
      }

      const retryResponse =
        await fetch(
          "/auth/sync",
          {
            method: "POST",
            credentials: "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              access_token:
                refreshed.session
                  .access_token,

              refresh_token:
                refreshed.session
                  .refresh_token,
            }),
          }
        );

      if (!retryResponse.ok) {
        throw new Error(
          "Gagal menyinkronkan session."
        );
      }
    }
  }

  /*
   * =========================================================
   * PREPARE MFA
   * =========================================================
   */
  useEffect(() => {
    let cancelled = false;

    async function prepareMfa() {
      setLoading(true);
      setError("");

      /*
       * Pastikan session masih aktif.
       */
      try {
        await ensureFreshSession();
      } catch {
        if (cancelled) {
          return;
        }

        setError(
          "Sesi login sudah berakhir dan tidak dapat diperbarui. Silakan login kembali."
        );

        setLoading(false);
        return;
      }

      /*
       * Ambil user aktif.
       */
      let {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      /*
       * Bila gagal, coba refresh session satu kali.
       */
      if (
        userError ||
        !userData.user
      ) {
        try {
          await supabase.auth
            .refreshSession();

          const retry =
            await supabase.auth
              .getUser();

          userData = retry.data;
          userError = retry.error;
        } catch {
          if (cancelled) {
            return;
          }

          setError(
            "Sesi pengguna tidak valid. Silakan login kembali."
          );

          setLoading(false);
          return;
        }
      }

      if (
        userError ||
        !userData.user
      ) {
        setError(
          "Sesi pengguna tidak valid. Silakan login kembali."
        );

        setLoading(false);
        return;
      }

      /*
       * =====================================================
       * VALIDASI ROLE SUPERADMIN
       * =====================================================
       */
      const {
        data: profile,
        error: profileError,
      } =
        await supabase
          .from("admin_users")
          .select("role")
          .eq(
            "user_id",
            userData.user.id
          )
          .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        profileError ||
        profile?.role !==
          "superadmin"
      ) {
        await supabase.auth.signOut();

        router.replace(
          "/superadmin-login"
        );

        return;
      }

      /*
       * =====================================================
       * CEK AAL
       * =====================================================
       *
       * Bila session sudah AAL2,
       * tidak perlu meminta kode lagi.
       */
      const {
        data: aal,
        error: aalError,
      } =
        await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel();

      if (cancelled) {
        return;
      }

      if (
        !aalError &&
        aal.currentLevel === "aal2"
      ) {
        try {
          await syncSession();

          window.location.replace(
            "/admin/superadmin"
          );
        } catch (err) {
          if (cancelled) {
            return;
          }

          setError(
            err instanceof Error
              ? err.message
              : "Gagal menyinkronkan session."
          );

          setLoading(false);
        }

        return;
      }

      /*
       * =====================================================
       * AMBIL FACTOR TOTP VERIFIED
       * =====================================================
       */
      const {
        data: factors,
        error: factorsError,
      } =
        await supabase.auth.mfa
          .listFactors();

      if (cancelled) {
        return;
      }

      if (factorsError) {
        setError(
          "Gagal membaca konfigurasi MFA."
        );

        setLoading(false);
        return;
      }

      const totp =
        factors.totp.find(
          (factor) =>
            factor.status ===
            "verified"
        );

      if (!totp) {
        setError(
          "Authenticator belum terdaftar pada akun Super Admin."
        );

        setLoading(false);
        return;
      }

      setFactorId(totp.id);
      setLoading(false);
    }

    prepareMfa();

    return () => {
      cancelled = true;
    };
  }, [router]);

  /*
   * =========================================================
   * VERIFY MFA
   * =========================================================
   */
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      verifying ||
      !factorId
    ) {
      return;
    }

    const normalizedCode =
      code
        .replace(/\D/g, "")
        .slice(0, 6);

    if (
      normalizedCode.length !== 6
    ) {
      setError(
        "Masukkan 6 digit kode authenticator."
      );

      return;
    }

    /*
     * Hindari verifikasi tepat ketika kode
     * hampir berganti.
     */
    if (secondsLeft <= 3) {
      setError(
        "Kode hampir diperbarui. Tunggu kode baru dari Authenticator lalu masukkan kembali."
      );

      return;
    }

    setVerifying(true);
    setError("");

    try {
      /*
       * Pastikan session fresh.
       */
      await ensureFreshSession();

      /*
       * Buat challenge MFA baru.
       */
      const {
        data: challenge,
        error: challengeError,
      } =
        await supabase.auth.mfa
          .challenge({
            factorId,
          });

      if (
        challengeError ||
        !challenge
      ) {
        throw new Error(
          "Gagal membuat challenge MFA."
        );
      }

      /*
       * Verifikasi kode Authenticator.
       */
      const {
        error: verifyError,
      } =
        await supabase.auth.mfa
          .verify({
            factorId,

            challengeId:
              challenge.id,

            code:
              normalizedCode,
          });

      if (verifyError) {
        setCode("");

        setError(
          "Kode authenticator salah atau sudah kedaluwarsa. Gunakan kode terbaru yang sedang tampil di aplikasi Authenticator."
        );

        setVerifying(false);
        return;
      }

      /*
       * Pastikan session sudah menjadi AAL2.
       */
      const {
        data: aal,
        error: aalError,
      } =
        await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel();

      if (
        aalError ||
        aal.currentLevel !== "aal2"
      ) {
        throw new Error(
          "MFA belum mencapai AAL2."
        );
      }

      /*
       * Sinkronkan session ke cookie server.
       */
      await syncSession();

      /*
       * Full navigation supaya Server Component
       * membaca cookie session terbaru.
       */
      window.location.replace(
        "/admin/superadmin"
      );
    } catch (err) {
      console.error(
        "Super Admin MFA error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Verifikasi MFA gagal."
      );

      setVerifying(false);
    }
  }

  /*
   * =========================================================
   * LOGOUT
   * =========================================================
   */
  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace(
      "/superadmin-login"
    );

    router.refresh();
  }

  /*
   * =========================================================
   * UI
   * =========================================================
   */
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "linear-gradient(135deg, #f7f1e8 0%, #f4ede4 100%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "38px",
          borderRadius: "28px",

          background:
            "rgba(255,255,255,.82)",

          border:
            "1px solid rgba(41,76,59,.12)",

          boxShadow:
            "0 24px 70px rgba(55,45,34,.10)",
        }}
      >
        <div
          style={{
            marginBottom: "28px",
          }}
        >
          <p
            style={{
              margin:
                "0 0 10px",

              fontSize: "12px",

              fontWeight: 700,

              letterSpacing:
                ".16em",

              textTransform:
                "uppercase",

              color: "#b07935",
            }}
          >
            Superadmin Access
          </p>

          <h1
            style={{
              margin: 0,

              color: "#204b38",

              fontSize:
                "clamp(30px, 5vw, 42px)",

              lineHeight: 1.05,

              fontFamily:
                "Georgia, serif",

              fontWeight: 500,
            }}
          >
            Verifikasi keamanan
          </h1>

          <p
            style={{
              margin:
                "15px 0 0",

              color: "#66726b",

              lineHeight: 1.7,

              fontSize: "14px",
            }}
          >
            Masukkan kode 6 digit
            dari aplikasi authenticator
            untuk melanjutkan ke Super
            Admin Control Center.
          </p>
        </div>

        {loading ? (
          <p
            style={{
              color: "#66726b",
              fontSize: "14px",
            }}
          >
            Memeriksa konfigurasi
            keamanan...
          </p>
        ) : (
          <form
            onSubmit={
              handleSubmit
            }
          >
            <label
              htmlFor="mfa-code"
              style={{
                display: "block",

                marginBottom:
                  "8px",

                color:
                  "#31483c",

                fontSize:
                  "13px",

                fontWeight: 600,
              }}
            >
              Kode authenticator
            </label>

            <input
              id="mfa-code"
              value={code}
              onChange={(event) => {
                setCode(
                  event.target.value
                    .replace(
                      /\D/g,
                      ""
                    )
                    .slice(
                      0,
                      6
                    )
                );

                if (error) {
                  setError("");
                }
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              autoFocus
              disabled={
                verifying
              }
              style={{
                boxSizing:
                  "border-box",

                width: "100%",

                height: "56px",

                padding:
                  "0 16px",

                borderRadius:
                  "15px",

                border:
                  "1px solid #d7ddd8",

                outline: "none",

                background:
                  verifying
                    ? "#f7f7f5"
                    : "#fff",

                color:
                  "#234536",

                fontSize:
                  "22px",

                letterSpacing:
                  ".28em",

                textAlign:
                  "center",
              }}
            />

            {/* ================================
                TOTP COUNTDOWN
            ================================= */}
            <div
              style={{
                marginTop: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "space-between",

                  gap: "12px",

                  marginBottom:
                    "7px",

                  fontSize:
                    "12px",

                  color:
                    "#788078",
                }}
              >
                <span>
                  Kode diperbarui dalam
                </span>

                <strong
                  style={{
                    minWidth: "58px",

                    textAlign:
                      "right",

                    fontWeight: 700,

                    color:
                      secondsLeft <= 5
                        ? "#a13f37"
                        : "#5f7d52",
                  }}
                >
                  {secondsLeft} detik
                </strong>
              </div>

              <div
                style={{
                  width: "100%",

                  height: "5px",

                  overflow:
                    "hidden",

                  borderRadius:
                    "999px",

                  background:
                    "#e5e9e5",
                }}
              >
                <div
                  style={{
                    width: `${
                      (secondsLeft /
                        30) *
                      100
                    }%`,

                    height:
                      "100%",

                    borderRadius:
                      "999px",

                    background:
                      secondsLeft <=
                      5
                        ? "#b86a61"
                        : "#6d8d5d",

                    transition:
                      "width .35s linear",
                  }}
                />
              </div>

              {secondsLeft <= 5 && (
                <p
                  style={{
                    margin:
                      "7px 0 0",

                    color:
                      "#a13f37",

                    fontSize:
                      "12px",

                    lineHeight:
                      1.5,
                  }}
                >
                  Kode akan segera
                  berganti. Tunggu
                  kode baru sebelum
                  memverifikasi.
                </p>
              )}
            </div>

            {error && (
              <div
                style={{
                  marginTop:
                    "13px",

                  padding:
                    "11px 13px",

                  borderRadius:
                    "12px",

                  background:
                    "#fff1ef",

                  color:
                    "#a13f37",

                  fontSize:
                    "13px",

                  lineHeight:
                    1.5,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                verifying ||
                !factorId ||
                code.length !== 6 ||
                secondsLeft <= 3
              }
              style={{
                width: "100%",

                height: "52px",

                marginTop:
                  "18px",

                border: 0,

                borderRadius:
                  "999px",

                cursor:
                  verifying
                    ? "wait"
                    : code.length !==
                          6 ||
                        secondsLeft <=
                          3
                      ? "not-allowed"
                      : "pointer",

                background:
                  "#6d8d5d",

                color: "#fff",

                fontSize:
                  "14px",

                fontWeight: 700,

                opacity:
                  verifying ||
                  !factorId ||
                  code.length !==
                    6 ||
                  secondsLeft <= 3
                    ? 0.55
                    : 1,
              }}
            >
              {verifying
                ? "Memverifikasi..."
                : "Verifikasi & masuk"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={
            handleLogout
          }
          style={{
            width: "100%",

            marginTop:
              "15px",

            border: 0,

            background:
              "transparent",

            color: "#788078",

            cursor:
              "pointer",

            fontSize:
              "13px",
          }}
        >
          Kembali ke login
        </button>
      </section>
    </main>
  );
}