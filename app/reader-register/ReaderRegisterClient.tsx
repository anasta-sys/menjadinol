"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

export default function ReaderRegisterClient() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

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

    if (loading) return;

    setMessage("");
    setSuccess(false);

    const normalizedName =
      name.trim();

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      normalizedName.length < 2
    ) {
      setMessage(
        "Nama minimal 2 karakter."
      );
      return;
    }

    if (
      normalizedName.length > 100
    ) {
      setMessage(
        "Nama terlalu panjang."
      );
      return;
    }

    if (
      !normalizedEmail ||
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      setMessage(
        "Masukkan alamat email yang valid."
      );
      return;
    }

    if (password.length < 8) {
      setMessage(
        "Password minimal 8 karakter."
      );
      return;
    }

    if (password.length > 128) {
      setMessage(
        "Password terlalu panjang."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setMessage(
        "Konfirmasi password tidak sama."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email:
            normalizedEmail,

          password,

          options: {
            data: {
              name:
                normalizedName,

              role:
                "reader",
            },

            emailRedirectTo:
              `${window.location.origin}/reader-login`,
          },
        });

      if (error) {
        console.error(
          "Reader register error:",
          error
        );

        throw new Error(
          error.message
        );
      }

      /*
       * Jangan buat reader_users
       * dari browser.
       *
       * Profile reader dikelola
       * server/database trigger.
       */

      setSuccess(true);

      setMessage(
        "Pendaftaran berhasil. Silakan cek email untuk memverifikasi akunmu."
      );

      /*
       * Bersihkan password dari state
       * setelah request berhasil.
       */
      setPassword("");
      setConfirmPassword("");

      /*
       * data.user boleh tersedia,
       * tetapi tidak digunakan sebagai
       * bukti bahwa user sudah mendapat
       * akses membaca.
       *
       * Akses tetap ditentukan pada
       * proses login + server.
       */
      void data;
    } catch (error) {
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "Pendaftaran belum berhasil."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="reader-register-page">
      <div className="reader-register-shell">

        {/* =========================
            PANEL KIRI
        ========================== */}
        <section
          className="reader-register-brand"
          aria-label="Menjadi Nol"
        >
          <div className="reader-register-brand-content">

            <img
              src="/jalan-pulang-symbol.png"
              alt=""
              className="reader-register-logo"
              width={112}
              height={112}
            />

            <h1 className="reader-register-wordmark">
              menjadi nol
            </h1>

            <div
              className="reader-register-brand-line"
              aria-hidden="true"
            />

            <p className="reader-register-brand-copy">
              Ruang untuk berhenti, merasa,
              <br />
              memahami, dan menjadi nol.
            </p>

          </div>

          <div
            className="reader-register-landscape"
            aria-hidden="true"
          >
            <span className="reader-register-sun" />
            <span className="reader-register-mountain mountain-one" />
            <span className="reader-register-mountain mountain-two" />
            <span className="reader-register-mountain mountain-three" />
            <span className="reader-register-water" />
          </div>
        </section>


        {/* =========================
            PANEL KANAN
        ========================== */}
        <section className="reader-register-form-card">

          <div className="reader-register-form-inner">

            <header className="reader-register-heading">
              <p className="reader-register-eyebrow">
                RUANG PRIVAT
              </p>

              <h2>
                Buat akunmu
              </h2>

              <p className="reader-register-subtitle">
                Bergabung untuk mengakses ruang
                refleksi dan materi Menjadi Nol.
              </p>
            </header>


            {!success ? (
              <form
                className="reader-register-form"
                onSubmit={handleSubmit}
                noValidate
              >

                {/* NAMA */}
                <label className="reader-register-field">
                  <span>Nama</span>

                  <div className="reader-register-input-wrap">
                    <span
                      className="reader-register-input-icon"
                      aria-hidden="true"
                    >
                      ♙
                    </span>

                    <input
                      type="text"
                      name="name"
                      value={name}
                      onChange={(event) =>
                        setName(
                          event.target.value
                        )
                      }
                      placeholder="Nama lengkap kamu"
                      autoComplete="name"
                      minLength={2}
                      maxLength={100}
                      required
                      disabled={loading}
                    />
                  </div>
                </label>


                {/* EMAIL */}
                <label className="reader-register-field">
                  <span>Email</span>

                  <div className="reader-register-input-wrap">
                    <span
                      className="reader-register-input-icon"
                      aria-hidden="true"
                    >
                      ✉
                    </span>

                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      placeholder="Masukkan email kamu"
                      autoComplete="email"
                      inputMode="email"
                      maxLength={254}
                      required
                      disabled={loading}
                    />
                  </div>
                </label>


                {/* PASSWORD */}
                <label className="reader-register-field">
                  <span>Password</span>

                  <div className="reader-register-input-wrap">
                    <span
                      className="reader-register-input-icon"
                      aria-hidden="true"
                    >
                      ♙
                    </span>

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      name="password"
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder="Minimal 8 karakter"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                      disabled={loading}
                    />

                    <button
                      type="button"
                      className="reader-register-eye"
                      onClick={() =>
                        setShowPassword(
                          (value) =>
                            !value
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                      disabled={loading}
                    >
                      {showPassword
                        ? "◉"
                        : "◎"}
                    </button>
                  </div>
                </label>


                {/* KONFIRMASI */}
                <label className="reader-register-field">
                  <span>
                    Konfirmasi Password
                  </span>

                  <div className="reader-register-input-wrap">
                    <span
                      className="reader-register-input-icon"
                      aria-hidden="true"
                    >
                      ♙
                    </span>

                    <input
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      name="confirmPassword"
                      value={
                        confirmPassword
                      }
                      onChange={(event) =>
                        setConfirmPassword(
                          event.target.value
                        )
                      }
                      placeholder="Ulangi password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                      disabled={loading}
                    />

                    <button
                      type="button"
                      className="reader-register-eye"
                      onClick={() =>
                        setShowConfirmPassword(
                          (value) =>
                            !value
                        )
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Sembunyikan konfirmasi password"
                          : "Tampilkan konfirmasi password"
                      }
                      disabled={loading}
                    >
                      {showConfirmPassword
                        ? "◉"
                        : "◎"}
                    </button>
                  </div>
                </label>


                {message && (
                  <div
                    className="reader-register-message reader-register-message-error"
                    role="alert"
                  >
                    {message}
                  </div>
                )}


                <button
                  type="submit"
                  className="reader-register-primary"
                  disabled={loading}
                >
                  <span>
                    {loading
                      ? "mendaftarkan..."
                      : "daftar sebagai pembaca"}
                  </span>

                  <span
                    className="reader-register-arrow"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </button>


                <div className="reader-register-or">
                  <span>atau</span>
                </div>


                <p className="reader-register-login-link">
                  Sudah punya akun?{" "}
                  <Link href="/reader-login">
                    Masuk
                  </Link>
                  <span aria-hidden="true">
                    {" "}→
                  </span>
                </p>

              </form>
            ) : (
              <div className="reader-register-success">

                <div
                  className="reader-register-success-icon"
                  aria-hidden="true"
                >
                  ✓
                </div>

                <h3>
                  Cek emailmu
                </h3>

                <p>
                  {message}
                </p>

                <Link
                  href="/reader-login"
                  className="reader-register-primary reader-register-primary-link"
                >
                  <span>
                    menuju halaman login
                  </span>

                  <span
                    className="reader-register-arrow"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>

              </div>
            )}


            <div className="reader-register-steps">
              <span>♙ Daftar</span>
              <b>→</b>
              <span>✉ Verifikasi Email</span>
              <b>→</b>
              <span>♢ Login</span>
              <b>→</b>
              <span>✓ OTP</span>
            </div>

          </div>
        </section>

      </div>
    </main>
  );
}