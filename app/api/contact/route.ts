import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_SUBJECTS = new Set([
  "Saran",
  "Masukan",
  "Pertanyaan",
  "Kerja Sama",
  "Berbagi Cerita",
  "Kendala Website",
  "Lainnya",
]);

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (clean(body.website, 200)) return NextResponse.json({ ok: true });

    const name = clean(body.name, 80);
    const email = clean(body.email, 160).toLowerCase();
    const subject = clean(body.subject, 140);
    const message = clean(body.message, 5000);

    if (!name || !email || !subject || !message)
      return NextResponse.json({ error: "Data belum lengkap." }, { status: 400 });

    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email))
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });

    if (!ALLOWED_SUBJECTS.has(subject))
      return NextResponse.json({ error: "Subjek tidak valid." }, { status: 400 });

    const supabase = await createClient();
    const { error } = await supabase.from("contact_messages").insert({ name, email, subject, message });

    if (error) {
      console.error("contact insert error", error);
      return NextResponse.json({ error: "Pesan gagal disimpan." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }
}
