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

type ScreenMode =
  | "checking"
  | "verify"
  | "recovery"
  | "enroll";

export default function SuperAdminMfa() {
  const router = useRouter();

  const [mode, setMode] =
    useState<ScreenMode>("checking");

  const [code, setCode] =
    useState("");

  const [factorId, setFactorId] =
    useState<string | null>(null);

  const [secondsLeft, setSecondsLeft] =
    useState(30);

  const [loading, setLoading] =
    useState(true);

  const [verifying, setVerifying] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * ==============================
   * RECOVERY
   * ==============================
   */
  const [recoveryCode, setRecoveryCode] =
    useState("");

  const [
    recovering,
    setRecovering,
  ] = useState(false);

  /*
   * ==============================
   * ENROLLMENT BARU
   * ==============================
   */
  const [
    enrollmentStarted,
    setEnrollmentStarted,
  ] = useState(false);

  const [
    enrollFactorId,
    setEnrollFactorId,
  ] = useState<string | null>(null);

  const [qrCode, setQrCode] =
    useState("");

  const [totpSecret, setTotpSecret] =
    useState("");

  const [enrollCode, setEnrollCode] =
    useState("");

  /*
   * ==============================
   * TOTP COUNTDOWN
   * ==============================
   */
  useEffect(() => {
    function updateCountdown() {
      const now =
        Math.floor(Date.now() / 1000);

      const remaining =
        30 - (now % 30);

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
   * ==============================
   * SESSION
   * ==============================
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
   * ==============================
   * SYNC SESSION SERVER
   * ==============================
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

    async function sendSync(
      accessToken: string,
      refreshToken: string
    ) {
      return fetch(
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
              accessToken,

            refresh_token:
              refreshToken,
          }),
        }
      );
    }

    let response =
      await sendSync(
        session.access_token,
        session.refresh_token
      );

    if (!response.ok) {
      const {
        data: refreshed,
        error: refreshError,
      } =
        await supabase.auth
          .refreshSession();

      if (
        refreshError ||
        !refreshed.session
      ) {
        throw new Error(
          "Sesi sudah berakhir dan tidak dapat diperbarui."
        );
      }

      response =
        await sendSync(
          refreshed.session
            .access_token,

          refreshed.session
            .refresh_token
        );

      if (!response.ok) {
        throw new Error(
          "Gagal menyinkronkan session."
        );
      }
    }
  }

  /*
   * ==============================
   * CEK USER + ROLE
   * ==============================
   */
  async function getSuperAdminUser() {
    await ensureFreshSession();

    const {
      data,
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !data.user
    ) {
      throw new Error(
        "Sesi pengguna tidak valid."
      );
    }

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("admin_users")
        .select("role")
        .eq(
          "user_id",
          data.user.id
        )
        .maybeSingle();

    if (
      profileError ||
      profile?.role !==
        "superadmin"
    ) {
      throw new Error(
        "Akun ini bukan Super Admin."
      );
    }

    return data.user;
  }

  /*
   * ==============================
   * PREPARE MFA
   * ==============================
   */
  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      setLoading(true);
      setError("");

      try {
        await getSuperAdminUser();

        if (cancelled) {
          return;
        }

        const {
          data: aal,
          error: aalError,
        } =
          await supabase.auth.mfa
            .getAuthenticatorAssuranceLevel();

        if (cancelled) {
          return;
        }

        /*
         * Sudah AAL2 → langsung dashboard.
         */
        if (
          !aalError &&
          aal.currentLevel ===
            "aal2"
        ) {
          await syncSession();

          window.location.replace(
            "/admin/superadmin"
          );

          return;
        }

        /*
         * Cari TOTP verified.
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
          throw new Error(
            "Gagal membaca konfigurasi MFA."
          );
        }

        const verifiedTotp =
          factors.totp.find(
            (factor) =>
              factor.status ===
              "verified"
          );

        /*
         * Ada Authenticator lama.
         * → mode verifikasi normal.
         */
        if (verifiedTotp) {
          setFactorId(
            verifiedTotp.id
          );

          setMode("verify");
          setLoading(false);

          return;
        }

        /*
         * Tidak ada factor verified.
         * → enrollment Authenticator.
         */
        setMode("enroll");
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Gagal memeriksa MFA."
        );

        setLoading(false);
      }
    }

    prepare();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ==============================
   * VERIFY MFA NORMAL
   * ==============================
   */
  async function handleVerify(
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

    if (secondsLeft <= 3) {
      setError(
        "Kode hampir diperbarui. Tunggu kode baru lalu coba kembali."
      );

      return;
    }

    setVerifying(true);
    setError("");

    try {
      await ensureFreshSession();

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

        throw new Error(
          "Kode authenticator salah atau sudah kedaluwarsa."
        );
      }

      const {
        data: aal,
        error: aalError,
      } =
        await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel();

      if (
        aalError ||
        aal.currentLevel !==
          "aal2"
      ) {
        throw new Error(
          "MFA belum mencapai AAL2."
        );
      }

      await syncSession();

      window.location.replace(
        "/admin/superadmin"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Verifikasi MFA gagal."
      );

      setVerifying(false);
    }
  }

  /*
   * ==============================
   * RECOVERY AUTHENTICATOR
   * ==============================
   */
  async function handleRecovery(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      recovering ||
      !recoveryCode.trim()
    ) {
      return;
    }

    setRecovering(true);
    setError("");

    try {
      /*
       * Recovery hanya boleh dilakukan
       * oleh session login yang valid.
       */
      await getSuperAdminUser();

      const session =
        await ensureFreshSession();

      const response =
        await fetch(
          "/api/superadmin/mfa-recovery",
          {
            method: "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              accessToken:
                session.access_token,

              recoveryCode:
                recoveryCode.trim(),
            }),
          }
        );

      let result:
        | {
            ok?: boolean;
            error?: string;
            message?: string;
          }
        | undefined;

      try {
        result =
          await response.json();
      } catch {
        result = undefined;
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Recovery Authenticator gagal."
        );
      }

      /*
       * deleteFactor verified akan
       * mengakhiri session aktif.
       *
       * Bersihkan browser session juga.
       */
      try {
        await supabase.auth.signOut();
      } catch {
        // session mungkin sudah dicabut server
      }

      window.alert(
        result?.message ||
          "Authenticator lama berhasil dilepas. Silakan login kembali untuk memasangkan Authenticator baru."
      );

      window.location.replace(
        "/superadmin-login"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Recovery Authenticator gagal."
      );

      setRecovering(false);
    }
  }

  /*
   * ==============================
   * START ENROLLMENT
   * ==============================
   */
  async function startEnrollment() {
    if (
      enrollmentStarted ||
      verifying
    ) {
      return;
    }

    setEnrollmentStarted(true);
    setError("");

    try {
      await getSuperAdminUser();

      /*
       * Bersihkan factor UNVERIFIED
       * dari percobaan enrollment lama
       * menggunakan API user biasa.
       *
       * Verified factor tidak akan ada
       * pada mode enrollment ini.
       */
      const {
        data: factors,
        error: factorsError,
      } =
        await supabase.auth.mfa
          .listFactors();

      if (factorsError) {
        throw new Error(
          "Gagal membaca factor MFA."
        );
      }

      /*
       * Bila ada factor verified tiba-tiba,
       * jangan enroll factor baru.
       */
      const verified =
        factors.totp.find(
          (factor) =>
            factor.status ===
            "verified"
        );

      if (verified) {
        setFactorId(verified.id);
        setMode("verify");
        setEnrollmentStarted(false);

        return;
      }

      /*
       * Enroll TOTP baru.
       */
      const {
        data,
        error: enrollError,
      } =
        await supabase.auth.mfa
          .enroll({
            factorType: "totp",

            friendlyName:
              "Menjadi Nol Superadmin",
          });

      if (
        enrollError ||
        !data
      ) {
        throw new Error(
          enrollError?.message ||
            "Gagal membuat Authenticator baru."
        );
      }

      setEnrollFactorId(
        data.id
      );

      setQrCode(
        data.totp.qr_code
      );

      setTotpSecret(
        data.totp.secret
      );
    } catch (err) {
      setEnrollmentStarted(false);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuat Authenticator baru."
      );
    }
  }

  /*
   * ==============================
   * VERIFY ENROLLMENT BARU
   * ==============================
   */
  async function handleEnrollVerify(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      verifying ||
      !enrollFactorId
    ) {
      return;
    }

    const normalizedCode =
      enrollCode
        .replace(/\D/g, "")
        .slice(0, 6);

    if (
      normalizedCode.length !== 6
    ) {
      setError(
        "Masukkan 6 digit kode dari Authenticator baru."
      );

      return;
    }

    if (secondsLeft <= 3) {
      setError(
        "Kode hampir berganti. Tunggu kode baru lalu verifikasi kembali."
      );

      return;
    }

    setVerifying(true);
    setError("");

    try {
      await ensureFreshSession();

      const {
        data: challenge,
        error: challengeError,
      } =
        await supabase.auth.mfa
          .challenge({
            factorId:
              enrollFactorId,
          });

      if (
        challengeError ||
        !challenge
      ) {
        throw new Error(
          "Gagal membuat challenge Authenticator baru."
        );
      }

      const {
        error: verifyError,
      } =
        await supabase.auth.mfa
          .verify({
            factorId:
              enrollFactorId,

            challengeId:
              challenge.id,

            code:
              normalizedCode,
          });

      if (verifyError) {
        setEnrollCode("");

        throw new Error(
          "Kode Authenticator baru tidak cocok. Gunakan kode terbaru yang tampil di aplikasi."
        );
      }

      /*
       * Setelah verify berhasil, Supabase
       * menaikkan current session ke AAL2.
       */
      const {
        data: aal,
        error: aalError,
      } =
        await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel();

      if (
        aalError ||
        aal.currentLevel !==
          "aal2"
      ) {
        throw new Error(
          "Authenticator berhasil diverifikasi tetapi session belum mencapai AAL2."
        );
      }

      await syncSession();

      window.location.replace(
        "/admin/superadmin"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Verifikasi Authenticator baru gagal."
      );

      setVerifying(false);
    }
  }

  /*
   * ==============================
   * LOGOUT
   * ==============================
   */
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch {
      // abaikan
    }

    router.replace(
      "/superadmin-login"
    );

    router.refresh();
  }

  /*
   * ==============================
   * SHARED COMPONENTS
   * ==============================
   */
  const ErrorBox = () =>
    error ? (
      <div
        style={{
          marginTop: "13px",
          padding: "11px 13px",
          borderRadius: "12px",
          background: "#fff1ef",
          color: "#a13f37",
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        {error}
      </div>
    ) : null;

  const Countdown = () => (
    <div
      style={{
        marginTop: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: "12px",
          marginBottom: "7px",
          fontSize: "12px",
          color: "#788078",
        }}
      >
        <span>
          Kode diperbarui dalam
        </span>

        <strong
          style={{
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
          height: "5px",
          overflow: "hidden",
          borderRadius: "999px",
          background: "#e5e9e5",
        }}
      >
        <div
          style={{
            width: `${
              (secondsLeft / 30) *
              100
            }%`,

            height: "100%",

            borderRadius:
              "999px",

            background:
              secondsLeft <= 5
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
            margin: "7px 0 0",
            color: "#a13f37",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          Kode akan segera berganti.
          Tunggu kode baru sebelum
          memverifikasi.
        </p>
      )}
    </div>
  );

  const inputStyle = {
    boxSizing:
      "border-box" as const,

    width: "100%",

    height: "56px",

    padding: "0 16px",

    borderRadius: "15px",

    border:
      "1px solid #d7ddd8",

    outline: "none",

    background: "#fff",

    color: "#234536",

    fontSize: "18px",
  };

  const primaryButtonStyle = {
    width: "100%",

    height: "52px",

    marginTop: "18px",

    border: 0,

    borderRadius: "999px",

    background: "#6d8d5d",

    color: "#fff",

    fontSize: "14px",

    fontWeight: 700,
  };

  /*
   * ==============================
   * UI
   * ==============================
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
              margin: "0 0 10px",

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
            {mode === "recovery"
              ? "Pulihkan Authenticator"
              : mode === "enroll"
                ? "Pasangkan Authenticator"
                : "Verifikasi keamanan"}
          </h1>

          <p
            style={{
              margin: "15px 0 0",

              color: "#66726b",

              lineHeight: 1.7,

              fontSize: "14px",
            }}
          >
            {mode === "recovery"
              ? "Masukkan recovery code Super Admin untuk melepas Authenticator lama."
              : mode === "enroll"
                ? "Pasangkan aplikasi Authenticator sebelum masuk ke Super Admin Control Center."
                : "Masukkan kode 6 digit dari aplikasi authenticator untuk melanjutkan ke Super Admin Control Center."}
          </p>
        </div>

        {loading ||
        mode === "checking" ? (
          <p
            style={{
              color: "#66726b",
              fontSize: "14px",
            }}
          >
            Memeriksa konfigurasi
            keamanan...
          </p>
        ) : null}

        {/* =========================
            VERIFY NORMAL
        ========================== */}
        {!loading &&
          mode === "verify" && (
            <>
              <form
                onSubmit={
                  handleVerify
                }
              >
                <label
                  htmlFor="mfa-code"
                  style={{
                    display: "block",
                    marginBottom:
                      "8px",
                    color: "#31483c",
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
                        .slice(0, 6)
                    );

                    setError("");
                  }}
                  inputMode="numeric"
                  autoComplete=
                    "one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  disabled={
                    verifying
                  }
                  style={{
                    ...inputStyle,

                    fontSize:
                      "22px",

                    letterSpacing:
                      ".28em",

                    textAlign:
                      "center",
                  }}
                />

                <Countdown />

                <ErrorBox />

                <button
                  type="submit"
                  disabled={
                    verifying ||
                    code.length !==
                      6 ||
                    secondsLeft <= 3
                  }
                  style={{
                    ...primaryButtonStyle,

                    cursor:
                      verifying
                        ? "wait"
                        : "pointer",

                    opacity:
                      verifying ||
                      code.length !==
                        6 ||
                      secondsLeft <=
                        3
                        ? 0.55
                        : 1,
                  }}
                >
                  {verifying
                    ? "Memverifikasi..."
                    : "Verifikasi & masuk"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setRecoveryCode("");
                  setMode(
                    "recovery"
                  );
                }}
                style={{
                  width: "100%",

                  marginTop:
                    "17px",

                  padding: "0",

                  border: 0,

                  background:
                    "transparent",

                  color: "#a06b2e",

                  cursor:
                    "pointer",

                  fontSize:
                    "13px",

                  fontWeight: 600,
                }}
              >
                Tidak bisa mengakses
                Authenticator?
              </button>
            </>
          )}

        {/* =========================
            RECOVERY
        ========================== */}
        {!loading &&
          mode === "recovery" && (
            <form
              onSubmit={
                handleRecovery
              }
            >
              <label
                htmlFor=
                  "recovery-code"
                style={{
                  display: "block",

                  marginBottom:
                    "8px",

                  color: "#31483c",

                  fontSize:
                    "13px",

                  fontWeight: 600,
                }}
              >
                Recovery code
              </label>

              <input
                id="recovery-code"
                type="password"
                value={
                  recoveryCode
                }
                onChange={(event) => {
                  setRecoveryCode(
                    event.target.value
                  );

                  setError("");
                }}
                autoComplete="off"
                placeholder=
                  "Masukkan recovery code"
                disabled={
                  recovering
                }
                style={
                  inputStyle
                }
              />

              <p
                style={{
                  margin:
                    "10px 0 0",

                  color: "#788078",

                  fontSize:
                    "12px",

                  lineHeight: 1.6,
                }}
              >
                Recovery akan
                melepas Authenticator
                lama. Setelah itu
                kamu harus login ulang
                dan memasangkan
                Authenticator baru.
              </p>

              <ErrorBox />

              <button
                type="submit"
                disabled={
                  recovering ||
                  !recoveryCode.trim()
                }
                style={{
                  ...primaryButtonStyle,

                  cursor:
                    recovering
                      ? "wait"
                      : "pointer",

                  opacity:
                    recovering ||
                    !recoveryCode.trim()
                      ? 0.55
                      : 1,
                }}
              >
                {recovering
                  ? "Memulihkan..."
                  : "Pulihkan Authenticator"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setRecoveryCode("");
                  setMode(
                    "verify"
                  );
                }}
                disabled={
                  recovering
                }
                style={{
                  width: "100%",

                  marginTop:
                    "14px",

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
                Kembali ke
                verifikasi
              </button>
            </form>
          )}

        {/* =========================
            ENROLL AUTHENTICATOR
        ========================== */}
        {!loading &&
          mode === "enroll" && (
            <>
              {!qrCode ? (
                <>
                  <div
                    style={{
                      padding:
                        "14px",

                      borderRadius:
                        "14px",

                      background:
                        "#f6f3ed",

                      color:
                        "#66726b",

                      fontSize:
                        "13px",

                      lineHeight: 1.7,
                    }}
                  >
                    Akun Super Admin
                    belum memiliki
                    Authenticator aktif.
                    Pasangkan
                    Authenticator
                    sebelum melanjutkan.
                  </div>

                  <ErrorBox />

                  <button
                    type="button"
                    onClick={
                      startEnrollment
                    }
                    disabled={
                      enrollmentStarted
                    }
                    style={{
                      ...primaryButtonStyle,

                      cursor:
                        enrollmentStarted
                          ? "wait"
                          : "pointer",

                      opacity:
                        enrollmentStarted
                          ? 0.6
                          : 1,
                    }}
                  >
                    {enrollmentStarted
                      ? "Menyiapkan..."
                      : "Pasangkan Authenticator baru"}
                  </button>
                </>
              ) : (
                <form
                  onSubmit={
                    handleEnrollVerify
                  }
                >
                  <div
                    style={{
                      display:
                        "grid",

                      placeItems:
                        "center",

                      marginBottom:
                        "18px",
                    }}
                  >
                    <div
                      style={{
                        padding:
                          "14px",

                        borderRadius:
                          "18px",

                        background:
                          "#fff",

                        border:
                          "1px solid #e2e5e1",
                      }}
                    >
                      <img
                        src={qrCode}
                        alt=
                          "QR Authenticator Super Admin"
                        style={{
                          display:
                            "block",

                          width:
                            "220px",

                          maxWidth:
                            "100%",

                          height:
                            "auto",
                        }}
                      />
                    </div>
                  </div>

                  <p
                    style={{
                      margin:
                        "0 0 10px",

                      color:
                        "#66726b",

                      fontSize:
                        "13px",

                      lineHeight:
                        1.6,
                    }}
                  >
                    Scan QR di atas
                    menggunakan Google
                    Authenticator,
                    Microsoft
                    Authenticator,
                    Authy, atau
                    aplikasi TOTP
                    lainnya.
                  </p>

                  {totpSecret && (
                    <details
                      style={{
                        marginBottom:
                          "18px",

                        padding:
                          "11px 13px",

                        borderRadius:
                          "12px",

                        background:
                          "#f6f3ed",

                        color:
                          "#66726b",

                        fontSize:
                          "12px",
                      }}
                    >
                      <summary
                        style={{
                          cursor:
                            "pointer",

                          fontWeight:
                            600,

                          color:
                            "#31483c",
                        }}
                      >
                        Tidak bisa scan
                        QR?
                      </summary>

                      <p
                        style={{
                          margin:
                            "10px 0 5px",

                          lineHeight:
                            1.5,
                        }}
                      >
                        Masukkan secret
                        ini secara manual
                        di aplikasi
                        Authenticator:
                      </p>

                      <code
                        style={{
                          display:
                            "block",

                          padding:
                            "8px",

                          borderRadius:
                            "8px",

                          background:
                            "#fff",

                          wordBreak:
                            "break-all",

                          userSelect:
                            "all",
                        }}
                      >
                        {totpSecret}
                      </code>
                    </details>
                  )}

                  <label
                    htmlFor=
                      "enroll-code"
                    style={{
                      display:
                        "block",

                      marginBottom:
                        "8px",

                      color:
                        "#31483c",

                      fontSize:
                        "13px",

                      fontWeight:
                        600,
                    }}
                  >
                    Kode dari
                    Authenticator baru
                  </label>

                  <input
                    id="enroll-code"
                    value={
                      enrollCode
                    }
                    onChange={(
                      event
                    ) => {
                      setEnrollCode(
                        event.target
                          .value
                          .replace(
                            /\D/g,
                            ""
                          )
                          .slice(
                            0,
                            6
                          )
                      );

                      setError("");
                    }}
                    inputMode=
                      "numeric"
                    autoComplete=
                      "one-time-code"
                    placeholder=
                      "000000"
                    maxLength={6}
                    disabled={
                      verifying
                    }
                    style={{
                      ...inputStyle,

                      fontSize:
                        "22px",

                      letterSpacing:
                        ".28em",

                      textAlign:
                        "center",
                    }}
                  />

                  <Countdown />

                  <ErrorBox />

                  <button
                    type="submit"
                    disabled={
                      verifying ||
                      enrollCode.length !==
                        6 ||
                      secondsLeft <=
                        3
                    }
                    style={{
                      ...primaryButtonStyle,

                      cursor:
                        verifying
                          ? "wait"
                          : "pointer",

                      opacity:
                        verifying ||
                        enrollCode.length !==
                          6 ||
                        secondsLeft <=
                          3
                          ? 0.55
                          : 1,
                    }}
                  >
                    {verifying
                      ? "Memverifikasi..."
                      : "Aktifkan & masuk"}
                  </button>
                </form>
              )}
            </>
          )}

        {/* =========================
            LOGOUT
        ========================== */}
        {!loading &&
          mode !== "recovery" && (
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
          )}
      </section>
    </main>
  );
}