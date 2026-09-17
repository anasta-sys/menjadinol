"use client";

import Link from "next/link";

type SectionItem = {
  slug: string;
  dbSection: string;
  label: string;
  folderCount: number;
};

function LeafIcon({ slug }: { slug: string }) {
  const common = {
    width: 82,
    height: 82,
    viewBox: "0 0 96 96",
    "aria-hidden": true,
  } as const;

  if (slug === "tentang") {
    return <svg {...common}><path d="M21 76C19 45 38 20 76 12c1 37-19 61-55 64Z" fill="#3f843e"/><path d="M23 76c12-23 27-39 46-54" fill="none" stroke="#dcebd6" strokeWidth="2.3" strokeLinecap="round"/></svg>;
  }
  if (slug === "perjalanan") {
    return <svg {...common}><path d="M29 78c10-25 23-43 43-58" fill="none" stroke="#356f38" strokeWidth="3" strokeLinecap="round"/><ellipse cx="36" cy="57" rx="9" ry="17" transform="rotate(-28 36 57)" fill="#4d9145"/><ellipse cx="52" cy="42" rx="9" ry="17" transform="rotate(34 52 42)" fill="#397c39"/><ellipse cx="66" cy="28" rx="8" ry="15" transform="rotate(40 66 28)" fill="#5b9847"/><ellipse cx="57" cy="61" rx="8" ry="15" transform="rotate(62 57 61)" fill="#44833d"/></svg>;
  }
  if (slug === "ruang-belajar") {
    return <svg {...common}><path d="M48 79V39" stroke="#356f38" strokeWidth="3" strokeLinecap="round"/><path d="M48 42C25 42 20 27 24 17c15 0 24 7 24 25Z" fill="#659d4c"/><path d="M48 42c23 0 28-15 24-25-15 0-24 7-24 25Z" fill="#3d7e3b"/><path d="M48 49c-18 0-25-10-25-20 15 0 22 6 25 20Z" fill="#4e8d42" opacity=".8"/></svg>;
  }
  if (slug === "sinopsis") {
    return <svg {...common}><path d="M49 82C34 64 24 47 21 23c26-8 48 4 54 26-10 20-17 28-26 33Z" fill="#3d823d"/><path d="M27 29c10 8 17 16 22 27M39 20c4 12 7 24 8 37M58 23c-2 12-5 22-10 32" fill="none" stroke="#dbead5" strokeWidth="2.2" strokeLinecap="round"/><path d="M22 45c8-3 16-3 24 0M28 59c7-2 13-1 19 2" fill="none" stroke="#dbead5" strokeWidth="2.2" strokeLinecap="round"/></svg>;
  }
  if (slug === "artikel") {
    return <svg {...common}><path d="M26 76 69 20" stroke="#356f38" strokeWidth="3" strokeLinecap="round"/><circle cx="33" cy="65" r="13" fill="#5b8d64"/><circle cx="45" cy="51" r="13" fill="#739b75"/><circle cx="58" cy="36" r="13" fill="#4f8257"/><circle cx="65" cy="61" r="12" fill="#87a982"/></svg>;
  }
  return <svg {...common}><path d="M26 79c8-25 21-45 44-62" fill="none" stroke="#356f38" strokeWidth="3" strokeLinecap="round"/><path d="M35 63c-13-2-18-10-17-20 12 1 19 7 17 20Z" fill="#4d8745"/><path d="M45 50c-5-13 1-22 10-27 5 12 1 21-10 27Z" fill="#39783b"/><path d="M52 57c12-5 22-2 28 6-11 7-21 5-28-6Z" fill="#679852"/><path d="M58 37c8-10 17-11 26-6-6 11-15 14-26 6Z" fill="#4b843f"/></svg>;
}

export default function ContentManager({
  sections,
}: {
  sections: SectionItem[];
}) {
  return (
    <main style={{ maxWidth: "1450px", margin: "0 auto", padding: "28px 18px 70px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, opacity: .55, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase" }}>
            menjadi nol
          </p>
          <h1 style={{ margin: "7px 0 5px", fontSize: 32 }}>Content Manager</h1>
          <p style={{ margin: 0, opacity: .65 }}>
            Konten dipisahkan per bagian agar tetap rapi saat jumlah tulisan bertambah.
          </p>
        </div>

        <Link href="/admin/superadmin" style={{
          textDecoration: "none", color: "#fff", padding: "10px 16px",
          borderRadius: 999, background: "#17663f", border: "1px solid #17663f", fontWeight: 800
        }}>
          ← Super Admin
        </Link>
      </div>

      <section style={{
        border: "1px solid rgba(70,91,76,.14)", borderRadius: 22,
        background: "rgba(255,255,255,.82)", padding: 20,
        boxShadow: "0 14px 40px rgba(60,70,62,.06)"
      }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", opacity: .52 }}>
          FOLDER KONTEN
        </p>
        <h2 style={{ margin: "6px 0 18px", fontSize: 20 }}>Pilih Bagian</h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14
        }}>
          {sections.map((section) => (
            <Link key={section.slug} href={`/admin/superadmin/content-manager/${section.slug}`} style={{
              textDecoration: "none", color: "inherit", border: "1px solid rgba(70,91,76,.13)",
              borderRadius: 18, padding: 20, background: "#fff", minHeight: 150,
              display: "flex", flexDirection: "column", justifyContent: "space-between"
            }}>
              <div style={{
                width: 96, height: 96, borderRadius: "50%",
                display: "grid", placeItems: "center",
                background: "rgba(226,239,218,.62)", marginBottom: 10
              }}>
                <LeafIcon slug={section.slug} />
              </div>
              <div>
                <strong style={{ fontSize: 17 }}>{section.label}</strong>
                <div style={{ marginTop: 5, opacity: .58, fontSize: 12 }}>
                  {section.folderCount} folder
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
