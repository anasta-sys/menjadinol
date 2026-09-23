import Link from "next/link";
import LatestContentNotice from "@/app/components/LatestContentNotice";

const cards = [
  {
    title: "Ruang Belajar",
    desc: "Kumpulan pembelajaran, materi, dan ruang refleksi untuk menemani perjalanan ke dalam diri.",
    href: "/ruang-belajar",
    tone: "sage",
    icon: "book",
  },
  {
    title: "Cerita & Makna",
    desc: "Tulisan tentang rasa, kesadaran, penerimaan, dan makna dalam perjalanan hidup.",
    href: "/cerita-makna",
    tone: "cream",
    icon: "article",
  },
  {
    title: "Perjalanan",
    desc: "Catatan, panduan, dan refleksi untuk memahami setiap proses perjalanan diri.",
    href: "/perjalanan",
    tone: "green",
    icon: "journey",
  },
  {
    title: "Ruang Jeda",
    desc: "Ringkasan pembelajaran dan pemahaman untuk melihat perjalanan dengan lebih utuh.",
    href: "/ruang-jeda",
    tone: "blue",
    icon: "summary",
  },
  {
    title: "Kontak",
    desc: "Ruang untuk terhubung, berbagi perjalanan, dan menyampaikan pesan kepada kami.",
    href: "/kontak",
    tone: "peach",
    icon: "contact",
  },
];

function CardIcon({ type }: { type: string }) {
  if (type === "book") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M8 15c9-3 17-1 24 5v31c-7-6-15-8-24-5V15Z" />
        <path d="M56 15c-9-3-17-1-24 5v31c7-6 15-8 24-5V15Z" />
        <path d="M32 20v31" />
        <path d="M18 27c4 0 7 1 10 3" />
        <path d="M46 27c-4 0-7 1-10 3" />
      </svg>
    );
  }

  if (type === "article") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M15 8h25l10 10v38H15V8Z" />
        <path d="M40 8v11h10" />
        <path d="M23 29h19" />
        <path d="M23 37h19" />
        <path d="M23 45h12" />
        <path d="M43 49l10-10" />
      </svg>
    );
  }

  if (type === "journey") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M7 49 21 30l9 11 8-13 19 21H7Z" />
        <path d="M22 49c6-4 9-2 13-8 3-4 2-8 8-13" />
        <path d="M40 17c3-6 8-9 14-9-1 7-6 11-14 9Z" />
      </svg>
    );
  }

  if (type === "summary") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M11 20h32v34H11V20Z" />
        <path d="M20 11h33v34H43" />
        <path d="M19 29h17" />
        <path d="M19 37h17" />
        <path d="M19 45h11" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M8 18h48v34H8V18Z" />
      <path d="m9 20 23 18 23-18" />
      <path d="M32 51s-13-7-13-17c0-7 9-9 13-3 4-6 13-4 13 3 0 10-13 17-13 17Z" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="mn-home">
      <section className="mn-hero">
        <div className="mn-hero-overlay" />

        <div className="mn-shell mn-hero-grid">
          <div className="mn-copy">
            <div className="mn-eyebrow">
              SPIRITUAL JOURNEY
            </div>

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
              <Link
                className="mn-primary"
                href="/ruang-belajar"
              >
                Mulai Perjalanan →
              </Link>

              <Link
                className="mn-secondary"
                href="/tentang"
              >
                Tentang Kami
              </Link>
              <LatestContentNotice />
            </div>
          </div>

          <div className="mn-art">
            <img
              src="/menjadi-nol-symbol-transparent.png"
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
        {cards.map((card) => (
          <Link
            className={`mn-card mn-card-${card.tone}`}
            href={card.href}
            key={card.title}
          >
            <div className="mn-card-icon">
              <CardIcon type={card.icon} />
            </div>

            <div className="mn-card-content">
              <h2>{card.title}</h2>
              <p>{card.desc}</p>
            </div>

            <span className="mn-card-link">
              Jelajahi
              <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}



