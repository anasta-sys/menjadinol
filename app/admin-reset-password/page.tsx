"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

export default function AdminResetPasswordPage() {
  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      password.length < 10
    ) {
      setMessage(
        "Password minimal 10 karakter."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setMessage(
        "Konfirmasi password belum sama."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const supabase =
        createClient();

      const {
        data: {
          session,
        },
      } =
        await supabase.auth
          .getSession();

      if (!session) {
        throw new Error(
          "Tautan pemulihan tidak valid atau sudah kedaluwarsa."
        );
      }

      const {
        error,
      } =
        await supabase.auth
          .updateUser({
            password,
          });

      if (error) {
        throw error;
      }

      await supabase.auth
        .signOut();

      setSuccess(true);

      setMessage(
        "Password Admin berhasil diperbarui."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Password belum dapat diperbarui."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "32px",
        background:
          'linear-gradient(rgba(248,247,239,.70),rgba(248,247,239,.70)),url("/menjadi-nol-nature.png") center/cover no-repeat',
      }}
    >
      <section
        style={{
          width:
            "min(520px,100%)",

          padding: "48px",

          borderRadius: "28px",

          background: "#fff",

          boxShadow:
            "0 24px 70px rgba(73,68,57,.08)",
        }}
      >
        <h1>
          Buat password baru
        </h1>

        {!success ? (
          <form
            onSubmit={
              handleSubmit
            }
            style={{
              display: "grid",
              gap: "18px",
            }}
          >
            <input
              type="password"
              placeholder="Password baru"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              minLength={10}
              required
            />

            <input
              type="password"
              placeholder="Ulangi password baru"
              value={
                confirmPassword
              }
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              minLength={10}
              required
            />

            {message && (
              <p>{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "menyimpan..."
                : "simpan password baru"}
            </button>
          </form>
        ) : (
          <>
            <p>{message}</p>

            <a href="/admin-login">
              masuk kembali →
            </a>
          </>
        )}
      </section>
    </main>
  );
}