import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim().slice(0, 100);
    const email = String(body?.email || "").trim().slice(0, 160);
    const subject = String(body?.subject || "").trim().slice(0, 160);
    const message = String(body?.message || "").trim().slice(0, 4000);
    const website = String(body?.website || "").trim();

    // Honeypot: bot mendapat respons netral tanpa memproses pesan.
    if (website) return NextResponse.json({ ok: true });

    if (!name || !email || !subject || message.length < 5 || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Mohon lengkapi data dengan benar." }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const to = process.env.KONTAK_TO_EMAIL;
    const from = process.env.KONTAK_FROM_EMAIL;
    if (!resendKey || !to || !from) {
      return NextResponse.json({ error: "Konfigurasi kontak belum lengkap." }, { status: 503 });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `[Menjadi Nol] ${subject}`,
        text: `Nama: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });

    if (!response.ok) {
      console.error("Kontak Resend error", response.status, await response.text());
      return NextResponse.json({ error: "Pesan belum dapat dikirim. Silakan coba lagi." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }
}
