import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function WelcomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/reader-login");
  }

  const { data: reader } = await supabase
    .from("reader_users")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();

  const name =
    reader?.name?.trim() ||
    String(user.user_metadata?.name || "").trim() ||
    "Teman";

  return (
    <main className="reader-welcome-page">
      <section className="reader-welcome-card">
        <img
          src="/jalan-pulang-symbol.png"
          alt=""
          className="reader-welcome-logo"
        />

        <p className="reader-welcome-small">
          SELAMAT DATANG
        </p>

        <h1>
          Selamat datang,
          <br />
          <span>{name}</span>
        </h1>

        <p>
          Terima kasih telah hadir di ruang ini.
          <br />
          Silakan jelajahi materi, artikel, dan refleksi
          yang tersedia.
        </p>

        <p>
          Ambil waktu untuk berhenti, merasa, memahami,
          dan kembali ke nol.
        </p>

        <a href="/" className="reader-welcome-button">
          Mulai Menjelajah →
        </a>
      </section>
    </main>
  );
}