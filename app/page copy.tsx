import Link from "next/link";

const cards = [
  [
    "🌱",
    "Ruang Belajar",
    "Kumpulan pembelajaran untuk perjalanan ini.",
    "/ruang-belajar",
  ],
  [
    "▣",
    "Artikel",
    "Tulisan yang menemani langkahmu.",
    "/artikel",
  ],
  [
    "🌿",
    "Perjalanan",
    "Catatan, panduan, dan refleksi perjalanan diri.",
    "/perjalanan",
  ],
  [
    "●",
    "Sinopsis",
    "Ringkasan pemahaman untuk melihat lebih utuh.",
    "/sinopsis",
  ],
  [
    "♡",
    "Kontak",
    "Terhubung dan berbagi perjalanan.",
    "/kontak",
  ],
];

export default function Home() {
  return (
    <main className="mn-home">
      <section className="mn-hero">
        <div className="mn-hero-overlay" />

        <div className="mn-shell mn-hero-grid">
          <div className="mn-copy">
            <div className="mn-eyebrow">SPIRITUAL JOURNEY</div>

            <h1>
              Perjalanan
              <br />
              pulang <em>dalam diri</em>
            </h1>

            <p>
              Ruang untuk berhenti sejenak, menyelami rasa,
              <br />
              memahami makna, dan kembali pada diri yang sejati.
            </p>

            <div className="mn-actions">
              <Link className="mn-primary" href="/ruang-belajar">
                Mulai Perjalanan →
              </Link>

              <Link className="mn-secondary" href="/tentang">
                Tentang Kami
              </Link>
            </div>
          </div>

          <div className="mn-art">
            <img
              src="/menjadi-nol-symbol.png"
              alt="Simbol Menjadi Nol"
            />

            <blockquote>
              “Semua jawaban
              <br />
              ada di dalam diri.”
            </blockquote>
          </div>
        </div>
      </section>

      <section className="mn-shell mn-cards">
        {cards.map(([icon, title, desc, href]) => (
          <Link
            className="mn-card"
            href={href}
            key={title}
          >
            <span className="mn-icon">{icon}</span>

            <h2>{title}</h2>

            <p>{desc}</p>

            <b>Jelajahi →</b>
          </Link>
        ))}
      </section>
    </main>
  );
}