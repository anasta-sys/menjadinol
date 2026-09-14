"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from
  "@/lib/supabase/client";

export default function ReaderRegisterClient() {
  const supabase = createClient();

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);


  async function handleRegister(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanName =
      name.trim();

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();


    if (cleanName.length < 2) {
      setError(
        "Nama minimal 2 karakter."
      );

      return;
    }


    if (password.length < 8) {
      setError(
        "Password minimal 8 karakter."
      );

      return;
    }


    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Konfirmasi password tidak sama."
      );

      return;
    }


    setLoading(true);


    try {

      const {
        data,
        error: signUpError,
      } =
        await supabase.auth.signUp({
          email:
            normalizedEmail,

          password,

          options: {
            data: {
              name:
                cleanName,

              role:
                "reader",
            },

            emailRedirectTo:
              `${window.location.origin}/reader-login`,
          },
        });


      if (signUpError) {
        throw new Error(
          signUpError.message
        );
      }


      if (!data.user) {
        throw new Error(
          "Akun gagal dibuat. Silakan coba kembali."
        );
      }


      /*
       * Tidak perlu INSERT / UPSERT
       * reader_users dari browser.
       *
       * Trigger Supabase
       * handle_new_reader()
       * yang akan membuat profil
       * reader_users otomatis.
       */


      setSuccess(true);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Pendaftaran gagal. Silakan coba kembali."
      );

    } finally {

      setLoading(false);

    }
  }


  /*
   * ======================================
   * PENDAFTARAN BERHASIL
   * ======================================
   */

  if (success) {

    return (

      <main className="reader-login-page">

        <section className="reader-login-card">

          <div className="reader-login-logo">

            <img
              src="/jalan-pulang-symbol.png"
              alt="Menjadi Nol"
            />

          </div>


          <p className="reader-login-eyebrow">
            PENDAFTARAN BERHASIL
          </p>


          <h1>
            Cek email kamu
          </h1>


          <p className="reader-login-description">

            Akun pembaca berhasil dibuat.

            Kami telah mengirimkan
            verifikasi akun ke

            <strong>
              {" "}
              {email}
            </strong>.

          </p>


          <p className="reader-login-description">

            Setelah email terverifikasi,
            kembali ke halaman masuk
            menggunakan email dan password.

            Selanjutnya kamu akan melakukan
            verifikasi OTP sebelum dapat
            membaca konten.

          </p>


          <Link
            href="/reader-login"
            className="reader-register-link-button"
          >
            kembali ke halaman masuk
          </Link>


          <div className="reader-login-privacy">

            🔒 Verifikasi Email
            {" → "}
            Login
            {" → "}
            OTP
            {" → "}
            Akses Konten

          </div>

        </section>

      </main>

    );
  }


  /*
   * ======================================
   * FORM DAFTAR
   * ======================================
   */

  return (

    <main className="reader-login-page">

      <section className="reader-login-card">


        <div className="reader-login-logo">

          <img
            src="/jalan-pulang-symbol.png"
            alt="Menjadi Nol"
          />

        </div>


        <p className="reader-login-eyebrow">
          DAFTAR PEMBACA
        </p>


        <h1>
          Menjadi Nol
        </h1>


        <p className="reader-login-description">

          Buat akun terlebih dahulu
          untuk mengakses ruang dan
          materi Menjadi Nol.

        </p>


        <form
          className="reader-login-form"
          onSubmit={handleRegister}
        >


          <label>

            Nama

            <input
              type="text"

              value={name}

              onChange={(event) =>
                setName(
                  event.target.value
                )
              }

              maxLength={100}

              autoComplete="name"

              placeholder="Nama kamu"

              required

              disabled={loading}
            />

          </label>


          <label>

            Email

            <input
              type="email"

              value={email}

              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }

              autoComplete="email"

              placeholder="nama@email.com"

              required

              disabled={loading}
            />

          </label>


          <label>

            Password

            <input
              type="password"

              value={password}

              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }

              minLength={8}

              autoComplete="new-password"

              placeholder="Minimal 8 karakter"

              required

              disabled={loading}
            />

          </label>


          <label>

            Konfirmasi Password

            <input
              type="password"

              value={confirmPassword}

              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }

              minLength={8}

              autoComplete="new-password"

              placeholder="Ulangi password"

              required

              disabled={loading}
            />

          </label>


          {error && (

            <div
              className="reader-login-error"
              role="alert"
            >
              {error}
            </div>

          )}


          <button
            type="submit"
            disabled={loading}
          >

            {loading
              ? "membuat akun..."
              : "daftar sebagai pembaca"}

          </button>


        </form>


        <div className="reader-login-switch">

          Sudah memiliki akun?{" "}

          <Link href="/reader-login">
            Masuk
          </Link>

        </div>


        <div className="reader-login-privacy">

          🔒 Daftar
          {" → "}
          Verifikasi Email
          {" → "}
          Login
          {" → "}
          OTP

        </div>


      </section>

    </main>

  );
}