"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminActivateClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const hash = new URLSearchParams(
            window.location.hash.replace(/^#/, "")
          );
          const accessToken = hash.get("access_token");
          const refreshToken = hash.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
          }
        }

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          throw new Error(
            "Link aktivasi tidak valid atau sudah kedaluwarsa."
          );
        }

        if (!cancelled) {
          setEmail(user.email ?? "");
          setReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Link aktivasi tidak dapat diproses."
          );
        }
      }
    }

    prepare();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setMessage("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Konfirmasi password belum sama.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        account_type: "admin",
        admin_password_set: true,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/admin-login?activated=1");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#f7f5ef",
      }}
    >
      <section
        style={{
          width: "min(460px,100%)",
          padding: "32px",
          borderRadius: "24px",
          background: "#fff",
          border: "1px solid rgba(70,91,76,.12)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <img
            src="/jalan-pulang-symbol.png"
            alt=""
            style={{
              width: "48px",
              height: "48px",
              objectFit: "contain",
              marginBottom: "10px",
            }}
          />
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              letterSpacing: ".14em",
              color: "#a1845b",
            }}
          >
            ADMIN ACTIVATION
          </p>
          <h1
            style={{
              margin: "8px 0",
              color: "#29412f",
              fontSize: "30px",
            }}
          >
            Buat Password Admin
          </h1>
          <p style={{ margin: 0, opacity: .62, fontSize: "13px" }}>
            Password dibuat sendiri oleh pemilik akun Admin.
          </p>
        </div>

        {!ready ? (
          <div
            role="status"
            style={{
              padding: "12px",
              borderRadius: "12px",
              background: "#f5f6f1",
              fontSize: "13px",
            }}
          >
            {message || "Memeriksa link aktivasi..."}
          </div>
        ) : (
          <form onSubmit={submit}>
            <label style={{ display: "block", marginBottom: "14px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700 }}>
                Email Admin
              </span>
              <input
                value={email}
                readOnly
                style={{
                  width: "100%",
                  minHeight: "44px",
                  marginTop: "7px",
                  padding: "9px 12px",
                  borderRadius: "12px",
                  border: "1px solid rgba(70,91,76,.16)",
                  background: "#f7f7f3",
                  boxSizing: "border-box",
                }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "14px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700 }}>
                Password baru
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                style={{
                  width: "100%",
                  minHeight: "44px",
                  marginTop: "7px",
                  padding: "9px 12px",
                  borderRadius: "12px",
                  border: "1px solid rgba(70,91,76,.16)",
                  boxSizing: "border-box",
                }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "14px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700 }}>
                Konfirmasi password
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                minLength={8}
                required
                autoComplete="new-password"
                placeholder="Ulangi password"
                style={{
                  width: "100%",
                  minHeight: "44px",
                  marginTop: "7px",
                  padding: "9px 12px",
                  borderRadius: "12px",
                  border: "1px solid rgba(70,91,76,.16)",
                  boxSizing: "border-box",
                }}
              />
            </label>

            {message && (
              <div
                role="alert"
                style={{
                  marginBottom: "12px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  background: "#fff4f2",
                  fontSize: "12px",
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
                minHeight: "46px",
                border: 0,
                borderRadius: "12px",
                background: "#465b4c",
                color: "#fff",
                fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? .6 : 1,
              }}
            >
              {loading
                ? "Mengaktifkan..."
                : "Aktifkan Akun Admin"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
