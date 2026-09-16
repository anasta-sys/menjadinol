"use client";

import { FormEvent, useEffect, useState } from "react";

const SUBJECTS = [
  "Saran",
  "Masukan",
  "Pertanyaan",
  "Kerja Sama",
  "Berbagi Cerita",
  "Kendala Website",
  "Lainnya",
];

export default function ContactEmailVerification() {
  const [step, setStep] = useState<"form" | "otp" | "sent">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [contactPayload, setContactPayload] =
    useState<Record<string, FormDataEntryValue> | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const activeEmail = String(payload.email || "")
      .trim()
      .toLowerCase();

    setEmail(activeEmail);
    setContactPayload(payload);

    if (!activeEmail) {
      setError("Masukkan email aktif Anda.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/contact/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            "Kode verifikasi belum dapat dikirim. Silakan coba kembali."
        );
      }

      setStep("otp");
      setResendSeconds(60);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kode verifikasi belum dapat dikirim. Silakan coba kembali."
      );
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    if (busy || resendSeconds > 0 || !contactPayload) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/contact/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            "Kode verifikasi belum dapat dikirim ulang. Silakan coba kembali."
        );
      }

      setOtp("");
      setResendSeconds(60);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kode verifikasi belum dapat dikirim ulang. Silakan coba kembali."
      );
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/contact/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Verifikasi gagal.");
      }

      setStep("sent");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Verifikasi gagal. Silakan coba kembali."
      );
    } finally {
      setBusy(false);
    }
  }

  if (step === "sent") {
    return (
      <div className="cv">
        <h3>Pesanmu sudah terkirim ✓</h3>
        <p>
          Email berhasil diverifikasi. Terima kasih sudah menghubungi
          Menjadi Nol.
        </p>

        <style jsx>{css}</style>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <form className="cv" onSubmit={verify}>
        <small>VERIFIKASI EMAIL</small>

        <h3>Periksa emailmu</h3>

        <p>
          Kode 6 digit telah dikirim ke <b>{email}</b>.
          Kode berlaku selama 10 menit.
        </p>

        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={otp}
          onChange={(e) =>
            setOtp(e.target.value.replace(/\D/g, ""))
          }
          placeholder="000000"
          required
        />

        {error && <div className="err">{error}</div>}

        <button
          type="submit"
          disabled={busy || otp.length !== 6}
        >
          {busy
            ? "Memverifikasi..."
            : "Verifikasi & Kirim Pesan"}
        </button>

        <button
          type="button"
          className="resend"
          onClick={resendOtp}
          disabled={busy || resendSeconds > 0 || !contactPayload}
        >
          {busy
            ? "Memproses..."
            : resendSeconds > 0
              ? `Kirim ulang kode dalam ${resendSeconds} detik`
              : "Kirim Ulang Kode"}
        </button>

        <button
          type="button"
          className="back"
          onClick={() => {
            setStep("form");
            setOtp("");
            setError("");
          }}
        >
          ← Ubah email / pesan
        </button>

        <style jsx>{css}</style>
      </form>
    );
  }

  return (
    <form className="cv" onSubmit={send}>
      <small>HUBUNGI KAMI</small>

      <h3>Kirim Pesan</h3>

      <div className="two">
        <input
          name="name"
          placeholder="Nama"
          maxLength={120}
          required
        />

        <input
          name="email"
          type="email"
          placeholder="Masukkan email aktif Anda"
          maxLength={254}
          autoComplete="email"
          required
        />
      </div>

      <select name="subject" defaultValue="" required>
        <option value="" disabled>
          Pilih subjek
        </option>

        {SUBJECTS.map((subject) => (
          <option key={subject} value={subject}>
            {subject}
          </option>
        ))}
      </select>

      <textarea
        name="message"
        placeholder="Tulis pesanmu..."
        maxLength={5000}
        rows={7}
        required
      />

      <input
        className="hp"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {error && <div className="err">{error}</div>}

      <button type="submit" disabled={busy}>
        {busy
          ? "Mengirim kode..."
          : "Lanjut Verifikasi Email"}
      </button>

      <p>
        Pesan baru disimpan setelah email berhasil diverifikasi.
      </p>

      <style jsx>{css}</style>
    </form>
  );
}

const css = `
  .cv {
    display: grid;
    gap: 14px;
    padding: 24px;
    border: 1px solid rgba(23, 97, 63, .14);
    border-radius: 20px;
    background: rgba(255, 255, 255, .88);
    color: #173d2d;
  }

  .cv small {
    font-weight: 800;
    letter-spacing: .15em;
    color: #9b7a2f;
  }

  .cv h3 {
    font: 500 28px Georgia, serif;
    margin: 0;
  }

  .cv p {
    margin: 0;
    color: #68736d;
    line-height: 1.6;
  }

  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .cv input,
  .cv select,
  .cv textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #dbe4de;
    border-radius: 12px;
    padding: 13px 14px;
    background: #fff;
    font: inherit;
    outline: none;
  }

  .cv input:focus,
  .cv select:focus,
  .cv textarea:focus {
    border-color: #17613f;
    box-shadow: 0 0 0 3px rgba(23, 97, 63, .08);
  }

  .cv button {
    border: 0;
    border-radius: 999px;
    padding: 12px 18px;
    background: #17613f;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
  }

  .cv button:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  .cv .resend {
    background: #f3eee2;
    color: #17613f;
  }

  .cv .resend:disabled {
    opacity: .72;
  }

  .cv .back {
    background: transparent;
    color: #17613f;
  }

  .hp {
    position: absolute !important;
    left: -9999px !important;
    width: 1px !important;
    height: 1px !important;
  }

  .err {
    padding: 11px;
    background: #fff0f0;
    color: #a53333;
    border-radius: 10px;
  }

  @media (max-width: 650px) {
    .two {
      grid-template-columns: 1fr;
    }
  }
`;