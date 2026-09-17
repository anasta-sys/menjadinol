"use client";

import { FormEvent, useState } from "react";
import styles from "./kontak-secure.module.css";

type Status = "idle" | "sending" | "success" | "error";

export default function KontakSecureClient() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      subject: String(data.get("subject") || "").trim(),
      message: String(data.get("message") || "").trim(),
      website: String(data.get("website") || "").trim(),
    };

    try {
      const res = await fetch("/api/kontak-secure/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Pesan belum dapat dikirim.");
      form.reset();
      setStatus("success");
      setMessage("Pesanmu sudah diterima. Terima kasih sudah menghubungi Menjadi Nol.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Pesan belum dapat dikirim.");
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <aside className={styles.intro}>
          <div className={styles.brand}>menjadi nol</div>
          <div className={styles.kicker}>RUANG KONTAK</div>
          <h1>Terhubung dengan tenang.</h1>
          <p>
            Ruang untuk berjeda, menyelami rasa, memahami makna, dan kembali pada diri.
          </p>
          <div className={styles.note}>Perjalanan pulang dalam diri</div>
        </aside>

        <section className={styles.card} aria-labelledby="kontak-title">
          <div className={styles.kicker}>PESAN PRIVAT</div>
          <h2 id="kontak-title">Kirim pesan</h2>
          <p className={styles.sub}>Sampaikan pesanmu melalui formulir berikut.</p>

          <form onSubmit={submit} className={styles.form}>
            <label>Nama<input name="name" required maxLength={100} autoComplete="name" /></label>
            <label>Email<input name="email" type="email" required maxLength={160} autoComplete="email" /></label>
            <label>Subjek<input name="subject" required maxLength={160} /></label>
            <label>Pesan<textarea name="message" required minLength={5} maxLength={4000} rows={7} /></label>
            <input className={styles.trap} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <button disabled={status === "sending"} type="submit">
              {status === "sending" ? "mengirim…" : "kirim pesan →"}
            </button>
            {message && <p className={status === "success" ? styles.success : styles.error} role="status">{message}</p>}
          </form>
        </section>
      </section>
    </main>
  );
}
