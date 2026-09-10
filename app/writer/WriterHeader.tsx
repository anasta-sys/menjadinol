import Link from "next/link";

export type WriterSection =
  | "tentang"
  | "layanan"
  | "ruang-belajar"
  | "sinopsis"
  | "artikel"
  | "kontak";

const links: { href: WriterSection; label: string }[] = [
  { href: "tentang", label: "Tentang" },
  { href: "layanan", label: "Perjalanan" },
  { href: "ruang-belajar", label: "Ruang Belajar" },
  { href: "sinopsis", label: "Sinopsis" },
  { href: "artikel", label: "Artikel" },
  { href: "kontak", label: "Kontak" },
];

export default function WriterHeader({
  activeSection,
}: {
  activeSection: WriterSection;
}) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: "1600px",
          margin: "0 auto",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/writer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "inherit",
            textDecoration: "none",
          }}
        >
          <img
            src="/jalan-pulang-symbol.png"
            alt=""
            aria-hidden="true"
            width={38}
            height={38}
            style={{
              width: "38px",
              height: "38px",
              objectFit: "contain",
            }}
          />

          <span>
            <strong style={{ display: "block", lineHeight: 1.1 }}>
              Jalan Pulang
            </strong>
            <small style={{ opacity: 0.66 }}>ruang penulis</small>
          </span>
        </Link>

        <nav
          aria-label="Navigasi penulis"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {links.map((item) => {
            const active = activeSection === item.href;

            return (
              <Link
                key={item.href}
                href={`/writer?section=${item.href}#content-manager`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  padding: "8px 11px",
                  borderRadius: "999px",
                  border: active
                    ? "1px solid currentColor"
                    : "1px solid transparent",
                  fontWeight: active ? 700 : 500,
                  opacity: active ? 1 : 0.72,
                }}
              >
                {item.label}
              </Link>
            );
          })}

          <Link
            href={`/writer?section=${activeSection}#content-manager`}
            style={{
              textDecoration: "none",
              color: "inherit",
              padding: "8px 12px",
              borderRadius: "999px",
              border: "1px solid currentColor",
              fontWeight: 700,
            }}
          >
            Tulis Konten
          </Link>
        </nav>
      </div>
    </header>
  );
}
