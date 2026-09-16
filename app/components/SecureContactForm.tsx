"use client";

import { FormEvent, useState } from "react";

const SUBJECTS = [
  "Saran",
  "Masukan",
  "Pertanyaan",
  "Kerja Sama",
  "Berbagi Cerita",
  "Kendala Website",
  "Lainnya",
] as const;

export default function SecureContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") || ""),
          email: String(data.get("email") || ""),
          subject: String(data.get("subject") || ""),
          message: String(data.get("message") || ""),
          website: String(data.get("website") || ""),
        }),
      });
      if (!res.ok) throw new Error("Gagal mengirim");
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="contact-secure-card" aria-labelledby="contact-form-title">
      <div className="contact-secure-head">
        <span className="contact-secure-kicker">RUANG PESAN</span>
        <h2 id="contact-form-title">Sampaikan pesanmu</h2>
        <p>Pesan dikirim langsung melalui sistem Menjadi Nol.</p>
      </div>

      <form className="contact-secure-form" onSubmit={submit}>
        <div className="contact-secure-grid">
          <label><span>Nama</span><input name="name" type="text" maxLength={80} required autoComplete="name" /></label>
          <label><span>Email</span><input name="email" type="email" maxLength={160} required autoComplete="email" /></label>
        </div>

        <label>
          <span>Subjek</span>
          <select name="subject" defaultValue="" required>
            <option value="" disabled>Pilih keperluan pesanmu</option>
            {SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </label>

        <label><span>Pesan</span><textarea name="message" rows={7} maxLength={5000} required /></label>

        <label className="contact-secure-hp" aria-hidden="true">
          Website<input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>

        <button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "mengirim..." : "kirim pesan"}
        </button>

        <div className="contact-secure-note" aria-live="polite">
          {status === "sent" && "Pesanmu sudah terkirim. Terima kasih."}
          {status === "error" && "Pesan belum berhasil dikirim. Silakan coba lagi."}
          {status === "idle" && "Privasi dijaga · tanpa pelacak pihak ketiga"}
        </div>
      </form>

      <style jsx>{`
        .contact-secure-card{margin:34px 0;padding:30px;border:1px solid rgba(27,78,55,.14);border-radius:24px;background:rgba(255,255,255,.72);box-shadow:0 18px 50px rgba(31,54,42,.06)}
        .contact-secure-head{margin-bottom:24px}.contact-secure-kicker{font-size:11px;font-weight:800;letter-spacing:.2em;color:#6f835f}
        h2{margin:7px 0 8px;font-family:Georgia,serif;font-size:30px;font-weight:500;color:#153f2d}p{margin:0;color:#667069}
        .contact-secure-form{display:grid;gap:17px}.contact-secure-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        label{display:grid;gap:7px;color:#294b3c;font-size:13px;font-weight:600}
        input,select,textarea{width:100%;box-sizing:border-box;border:1px solid rgba(24,76,53,.2);border-radius:14px;background:rgba(255,255,255,.88);padding:13px 15px;font:inherit;color:#173d2d;outline:none}
        select{cursor:pointer}input:focus,select:focus,textarea:focus{border-color:#9b7a2f;box-shadow:0 0 0 3px rgba(155,122,47,.10)}
        textarea{resize:vertical;min-height:150px}button{justify-self:start;border:0;border-radius:999px;padding:12px 25px;background:#17613f;color:white;font-weight:700;cursor:pointer}
        button:disabled{opacity:.65;cursor:wait}.contact-secure-note{min-height:20px;font-size:12px;color:#6b746e}
        .contact-secure-hp{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important}
        @media(max-width:700px){.contact-secure-card{padding:22px 18px}.contact-secure-grid{grid-template-columns:1fr}}
      `}</style>
    </section>
  );
}
