import Link from "next/link";

const cards = [
  ["✦", "Refleksi Diri", "Menyelami rasa dan mengenal diri lebih dalam.", "/ruang-belajar"],
  ["◌", "Ruang Belajar", "Kumpulan pembelajaran untuk perjalanan ke dalam diri.", "/ruang-belajar"],
  ["✧", "Artikel", "Tulisan yang menemani langkah dan proses kesadaran.", "/artikel"],
  ["⌁", "Layanan", "Ruang dukungan untuk bertumbuh dengan lebih sadar.", "/layanan"],
  ["♡", "Kontak", "Terhubung dan berbagi perjalanan dengan aman.", "/kontak"],
];

export default function Home() {
  return (
    <main className="mn-home">
      <nav className="mn-nav mn-shell">
        <Link className="mn-brand" href="/">
          <img src="/menjadi-nol-symbol.png" alt="Simbol Menjadi Nol" />
          <span><strong>MENJADI NOL</strong><small>Perjalanan pulang dalam diri</small></span>
        </Link>
        <div className="mn-links">
          <Link href="/">Beranda</Link><Link href="/tentang">Tentang</Link>
          <Link href="/layanan">Layanan</Link><Link href="/ruang-belajar">Ruang Belajar</Link>
          <Link href="/artikel">Artikel</Link><Link href="/kontak">Kontak</Link>
        </div>
        <Link className="mn-login" href="/reader-login">Masuk</Link>
      </nav>

      <section className="mn-hero">
        <div className="mn-shell mn-hero-grid">
          <div className="mn-copy">
            <div className="mn-eyebrow">SPIRITUAL JOURNEY</div>
            <h1>Perjalanan<br />pulang <em>dalam diri</em></h1>
            <p>Ruang untuk berjeda, menyelami rasa, memahami makna, dan kembali pada diri.</p>
            <div className="mn-actions">
              <Link className="mn-primary" href="/ruang-belajar">Mulai Perjalanan →</Link>
              <Link className="mn-secondary" href="/tentang">Tentang Menjadi Nol</Link>
            </div>
          </div>
          <div className="mn-art" aria-label="Simbol chakra Menjadi Nol">
            <div className="mn-glow" />
            <img src="/menjadi-nol-symbol.png" alt="Simbol chakra Menjadi Nol" />
          </div>
        </div>
      </section>

      <section className="mn-shell mn-cards">
        {cards.map(([icon,title,desc,href]) => (
          <Link className="mn-card" href={href} key={title}>
            <span className="mn-icon">{icon}</span><h2>{title}</h2><p>{desc}</p><b>Jelajahi →</b>
          </Link>
        ))}
      </section>

      <footer className="mn-footer mn-shell">
        <p>Ruang untuk berjeda, menyelami rasa, memahami makna, dan kembali pada diri.</p>
        <small>Spiritual Journey by Anasta · Privacy-first · no third-party trackers · © {new Date().getFullYear()}</small>
      </footer>
    </main>
  );
}
