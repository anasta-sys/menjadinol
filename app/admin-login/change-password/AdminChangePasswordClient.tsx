"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.6 10.7a2 2 0 002.7 2.7M9.9 4.3A10.7 10.7 0 0112 4c5.5 0 9 5 9 5a15.8 15.8 0 01-3.1 3.6M6.6 6.6C4.3 8.1 3 10 3 10s3.5 5 9 5c1 0 1.9-.2 2.7-.4"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  loading,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  loading: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={8}
          placeholder={placeholder}
          disabled={loading}
          style={{ ...inputStyle, paddingRight: "48px" }}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={loading}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          title={visible ? "Sembunyikan password" : "Tampilkan password"}
          style={eyeButtonStyle}
        >
          <EyeIcon visible={visible} />
        </button>
      </div>
    </>
  );
}

export default function AdminChangePasswordClient() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) throw new Error("Email Admin wajib diisi.");
      if (!currentPassword) throw new Error("Password saat ini wajib diisi.");
      if (newPassword.length < 8) throw new Error("Password baru minimal 8 karakter.");
      if (newPassword !== confirmPassword) {
        throw new Error("Konfirmasi password baru tidak sama.");
      }
      if (currentPassword === newPassword) {
        throw new Error("Password baru harus berbeda dari password saat ini.");
      }

      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: currentPassword,
        });

      if (loginError || !loginData.user) {
        throw new Error("Email atau password saat ini tidak sesuai.");
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("admin_users")
          .select("user_id,role")
          .eq("user_id", loginData.user.id)
          .maybeSingle();

      if (
        profileError ||
        !profile ||
        (profile.role !== "admin" && profile.role !== "superadmin")
      ) {
        await supabase.auth.signOut();
        throw new Error("Akun ini tidak memiliki akses Admin.");
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
          data: {
            password_changed_by_user: true,
            password_changed_at: new Date().toISOString(),
          },
        });

      if (updateError) {
        throw new Error(`Password gagal diganti: ${updateError.message}`);
      }

      await supabase.auth.signOut();

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
      setMessage(
        "Password berhasil diganti. Silakan masuk kembali menggunakan password baru."
      );
    } catch (error) {
      await supabase.auth.signOut();
      setMessage(
        error instanceof Error ? error.message : "Ganti password gagal."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "linear-gradient(180deg,#faf9f5 0%,#f3f1e9 100%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "34px",
          borderRadius: "26px",
          background: "rgba(255,255,255,.9)",
          border: "1px solid rgba(70,91,76,.12)",
          boxShadow: "0 20px 60px rgba(50,60,52,.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          <img
            src="/jalan-pulang-symbol.png"
            alt=""
            style={{
              width: "54px",
              height: "54px",
              objectFit: "contain",
              marginBottom: "12px",
            }}
          />
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              letterSpacing: ".16em",
              textTransform: "uppercase",
              opacity: 0.5,
            }}
          >
            kembali ke nol
          </p>
          <h1 style={{ margin: "9px 0 7px", fontSize: "28px" }}>
            Ganti Password Admin
          </h1>
          <p style={{ margin: 0, fontSize: "14px", opacity: 0.62 }}>
            Gunakan password sementara dari Superadmin, lalu buat password pribadi Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Email Admin</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="Email Admin"
            disabled={loading}
            style={inputStyle}
          />

          <PasswordField
            label="Password saat ini"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="Password sementara"
            autoComplete="current-password"
            loading={loading}
          />

          <PasswordField
            label="Password baru"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Minimal 8 karakter"
            autoComplete="new-password"
            loading={loading}
          />

          <PasswordField
            label="Konfirmasi password baru"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Ulangi password baru"
            autoComplete="new-password"
            loading={loading}
          />

          {message && (
            <div
              style={{
                marginTop: "16px",
                padding: "11px 13px",
                borderRadius: "12px",
                background: success
                  ? "rgba(70,91,76,.08)"
                  : "rgba(150,50,50,.07)",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              minHeight: "47px",
              marginTop: "20px",
              border: 0,
              borderRadius: "14px",
              cursor: loading ? "not-allowed" : "pointer",
              background: "#465b4c",
              color: "white",
              fontWeight: 700,
              opacity: loading ? 0.65 : 1,
            }}
          >
            {loading ? "Menyimpan..." : "Ganti Password"}
          </button>
        </form>

        <div style={{ marginTop: "18px", textAlign: "center", fontSize: "13px" }}>
          <Link
            href="/admin-login"
            style={{ color: "#465b4c", textDecoration: "none", fontWeight: 600 }}
          >
            ← Kembali ke Login Admin
          </Link>
        </div>
      </section>
    </main>
  );
}

const labelStyle = {
  display: "block",
  margin: "15px 0 7px",
  fontSize: "13px",
  fontWeight: 600,
} as const;

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "46px",
  padding: "10px 13px",
  borderRadius: "13px",
  border: "1px solid rgba(70,91,76,.18)",
  background: "#fff",
} as const;

const eyeButtonStyle = {
  position: "absolute",
  top: "50%",
  right: "11px",
  transform: "translateY(-50%)",
  width: "32px",
  height: "32px",
  display: "grid",
  placeItems: "center",
  padding: 0,
  border: 0,
  borderRadius: "50%",
  background: "transparent",
  color: "#667067",
  cursor: "pointer",
} as const;
