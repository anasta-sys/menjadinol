"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

export type ContactVerificationDraft = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string;
};

type Props = {
  draft: ContactVerificationDraft;
  onVerified: () => void | Promise<void>;
  onCancel?: () => void;
};

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function ContactEmailVerification({
  draft,
  onVerified,
  onCancel,
}: Props) {
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"ready" | "sending" | "code" | "verifying" | "done">("ready");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const busyRef = useRef(false);

  const email = String(draft.email || "").trim().toLowerCase();

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((v) => Math.max(0, v - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  async function parse(res: Response) {
    return (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      expiresInSeconds?: number;
    };
  }

  async function sendOtp() {
    if (busyRef.current || !email || cooldown > 0) return;
    busyRef.current = true;
    setStage("sending");
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/contact/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          name: draft.name,
          email,
          subject: draft.subject,
          message: draft.message,
          website: draft.website || "",
        }),
      });

      const data = await parse(res);
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Kode verifikasi belum dapat dikirim.");
      }

      setStage("code");
      setCooldown(RESEND_SECONDS);
      setNotice("Kode 6 digit sudah dikirim. Kode berlaku 10 menit.");
    } catch (e) {
      setStage("ready");
      setError(e instanceof Error ? e.message : "Permintaan tidak dapat diproses.");
    } finally {
      busyRef.current = false;
    }
  }

  async function verifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busyRef.current) return;

    const cleanOtp = otp.replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (cleanOtp.length !== OTP_LENGTH) {
      setError("Kode harus 6 digit.");
      return;
    }

    busyRef.current = true;
    setStage("verifying");
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/contact/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email, otp: cleanOtp }),
      });

      const data = await parse(res);
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Verifikasi belum berhasil.");
      }

      // Backend verify-otp yang ada sudah menyimpan contact_messages.
      // Jangan POST /api/contact lagi agar pesan tidak tersimpan dua kali.
      setStage("done");
      setNotice("Email berhasil diverifikasi dan pesan sudah terkirim.");
      await onVerified();
    } catch (e) {
      setStage("code");
      setError(e instanceof Error ? e.message : "Verifikasi belum berhasil.");
    } finally {
      busyRef.current = false;
    }
  }

  if (stage === "done") {
    return (
      <div className="contact-verify-result" role="status">
        ✓ Email berhasil diverifikasi. Pesanmu sudah terkirim.
        <style jsx>{`
          .contact-verify-result{margin-top:14px;padding:13px 15px;border-radius:12px;background:#edf6ee;color:#356344;font-size:13px;font-weight:700}
        `}</style>
      </div>
    );
  }

  return (
    <section className="contact-verify" aria-labelledby="contact-verify-title">
      <div className="head">
        <span>VERIFIKASI EMAIL</span>
        <h3 id="contact-verify-title">Verifikasi sebelum pesan dikirim</h3>
        <p>Kode akan dikirim ke <strong>{email}</strong>.</p>
      </div>

      {stage === "ready" || stage === "sending" ? (
        <button className="primary" type="button" onClick={sendOtp} disabled={stage === "sending" || !email}>
          {stage === "sending" ? "Mengirim kode..." : "Kirim Kode Verifikasi"}
        </button>
      ) : (
        <form onSubmit={verifyOtp}>
          <label>
            <span>Kode 6 digit</span>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              required
              autoFocus
            />
          </label>

          <button className="primary" type="submit" disabled={stage === "verifying" || otp.length !== 6}>
            {stage === "verifying" ? "Memverifikasi..." : "Verifikasi & Kirim Pesan"}
          </button>

          <div className="actions">
            <button className="secondary" type="button" onClick={sendOtp} disabled={cooldown > 0 || stage === "verifying"}>
              {cooldown > 0 ? `Kirim ulang (${cooldown})` : "Kirim ulang kode"}
            </button>
            {onCancel && (
              <button className="secondary" type="button" onClick={onCancel} disabled={stage === "verifying"}>
                Kembali
              </button>
            )}
          </div>
        </form>
      )}

      {notice && <div className="notice" role="status">{notice}</div>}
      {error && <div className="notice error" role="alert">{error}</div>}

      <style jsx>{`
        .contact-verify{margin-top:16px;padding:20px;border:1px solid rgba(24,76,53,.15);border-radius:16px;background:rgba(248,249,244,.94)}
        .head span{font-size:10px;font-weight:800;letter-spacing:.18em;color:#8a6a23}
        h3{margin:6px 0 7px;font-family:Georgia,serif;font-size:23px;font-weight:500;color:#153f2d}
        p{margin:0;color:#667069;line-height:1.6}
        form{display:grid;gap:12px;margin-top:16px}
        label{display:grid;gap:7px;color:#294b3c;font-size:13px;font-weight:700}
        input{width:100%;box-sizing:border-box;padding:13px 15px;border:1px solid rgba(24,76,53,.2);border-radius:12px;background:#fff;color:#173d2d;font:inherit;font-size:20px;letter-spacing:.28em;text-align:center;outline:none}
        input:focus{border-color:#9b7a2f;box-shadow:0 0 0 3px rgba(155,122,47,.10)}
        button{box-sizing:border-box;min-height:42px;border-radius:12px;padding:10px 16px;font:inherit;font-weight:800;cursor:pointer}
        button:disabled{opacity:.55;cursor:not-allowed}
        .primary{width:100%;margin-top:15px;border:1px solid #17613f;background:#17613f;color:#fff}
        form .primary{margin-top:0}
        .actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
        .secondary{border:1px solid rgba(24,76,53,.18);background:#fff;color:#365647}
        .notice{margin-top:12px;padding:10px 12px;border-radius:10px;background:#edf6ee;color:#356344;font-size:13px}
        .notice.error{background:#fff0ef;color:#a3473d}
      `}</style>
    </section>
  );
}
