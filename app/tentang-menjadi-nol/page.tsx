"use client";

import Link from "next/link";
import { useState } from "react";
import "../tentang-menjadi-nol.css";

const readingSpaces = [
  { title: "Tentang", href: "/tentang" },
  { title: "Perjalanan", href: "/perjalanan" },
  { title: "Ruang Belajar", href: "/ruang-belajar" },
  { title: "Ruang Jeda", href: "/ruang-jeda" },
  { title: "Cerita & Makna", href: "/cerita-makna" },
];

function Arrow() {
  return <span aria-hidden="true">&rarr;</span>;
}

function BookIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M7 10c7-2 12 0 17 4v26c-5-4-10-6-17-4V10Z" />
      <path d="M41 10c-7-2-12 0-17 4v26c5-4 10-6 17-4V10Z" />
      <path d="M24 14v26" />
    </svg>
  );
}

function StoryIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M9 8h30v25H21l-9 7v-7H9V8Z" />
      <path d="M16 17h16M16 23h11" />
    </svg>
  );
}

function AskIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="18" />
      <path d="M18.5 19c.6-4 3.2-6 7.2-6 4.2 0 7.1 2.4 7.1 5.9 0 3.1-1.7 4.5-4.3 6.1-2.6 1.5-3.5 2.8-3.5 5.5" />
      <circle cx="25" cy="36" r="1.3" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="18" />
      <path d="M6 24h36M24 6c6 5 9 11 9 18s-3 13-9 18M24 6c-6 5-9 11-9 18s3 13 9 18" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="8" y="8" width="32" height="32" rx="9" />
      <circle cx="24" cy="24" r="8" />
      <circle className="fill" cx="34" cy="14" r="2" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="5" y="11" width="38" height="26" rx="8" />
      <path className="fill" d="m20 18 11 6-11 6Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="5" y="10" width="38" height="28" rx="3" />
      <path d="m7 13 17 14 17-14" />
    </svg>
  );
}

export default function TentangMenjadiNolPage() {
  const [readingOpen, setReadingOpen] = useState(false);

  return (
    <main className="tentang-menjadi-nol">
      <section className="tmn-intro">
        <div className="tmn-intro-title">
          <span className="tmn-eyebrow">TENTANG MENJADI NOL</span>

          <h1>
            <span>
              Ruang digital untuk perjalanan <em>lebih sadar</em>
            </span>
            <span>dalam mengenali diri.</span>
          </h1>
        </div>

        <div className="tmn-description">
          <p>
            Menjadi Nol adalah platform digital yang menghadirkan berbagai ruang
            untuk menemani perjalanan personal melalui tulisan, pengalaman
            interaktif, dan konten digital. Sebuah tempat untuk berjeda,
            menyelami rasa, memahami makna, dan kembali pada diri.
          </p>
        </div>
      </section>

      <section className="tmn-spaces">
        <div className="tmn-section-label">
          FITUR YANG ADA DI MENJADI NOL
        </div>

        <div className="tmn-space-grid">
          <button
            type="button"
            className={`tmn-space ${readingOpen ? "is-open" : ""}`}
            onClick={() => setReadingOpen((value) => !value)}
            aria-expanded={readingOpen}
            aria-controls="tmn-reading-panel"
          >
            <span className="tmn-space-icon">
              <BookIcon />
            </span>

            <span className="tmn-space-name">Ruang Baca</span>

            <span className="tmn-space-lead">
              Temukan ruang yang ingin dijelajahi.
            </span>

            <span className="tmn-space-description">
              Tulisan dan berbagai konten Menjadi Nol.
            </span>

            <span className="tmn-circle-arrow">
              <Arrow />
            </span>
          </button>

          <article className="tmn-space">
            <span className="tmn-space-icon">
              <StoryIcon />
            </span>

            <span className="tmn-space-name">Ruang Cerita</span>

            <span className="tmn-space-lead">
              Ada ruang untuk bercerita.
            </span>

            <span className="tmn-space-description">
              Ruang personal untuk bercerita
              <br />
              dan berdialog.
            </span>

            <span className="tmn-space-status">
              Segera hadir
            </span>
          </article>

          <article className="tmn-space">
            <span className="tmn-space-icon">
              <AskIcon />
            </span>

            <span className="tmn-space-name">Ruang Tanya</span>

            <span className="tmn-space-lead">
              Tanyakan yang ingin dipahami.
            </span>

            <span className="tmn-space-description">
              Bertanya, memahami, dan menemukan
              <br />
              bacaan yang berkaitan.
            </span>

            <span className="tmn-space-status">
              Sedang dikembangkan
            </span>
          </article>
        </div>

        <div
          id="tmn-reading-panel"
          className={`tmn-reading-panel ${readingOpen ? "is-open" : ""}`}
        >
          <div className="tmn-reading-inner">
            <div className="tmn-reading-top">
              <div>
                <span>RUANG BACA</span>
                <h2>Pilih ruang yang ingin dijelajahi.</h2>
              </div>

              <button
                type="button"
                className="tmn-reading-close"
                onClick={() => setReadingOpen(false)}
                aria-label="Tutup pilihan Ruang Baca"
              >
                &times;
              </button>
            </div>

            <nav className="tmn-reading-links" aria-label="Pilihan Ruang Baca">
              {readingSpaces.map((item) => (
                <Link
                  href={item.href}
                  className="tmn-reading-link"
                  key={item.href}
                >
                  <span>{item.title}</span>
                  <Arrow />
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </section>

      <section className="tmn-digital">
        <div className="tmn-digital-label">
          TEMUKAN KAMI DI BERBAGAI PLATFORM.
        </div>

        <div className="tmn-digital-grid">
          <a
            href="https://menjadinol.com"
            target="_blank"
            rel="noopener noreferrer"
            className="tmn-digital-item"
          >
            <span className="tmn-digital-icon">
              <GlobeIcon />
            </span>

            <span className="tmn-digital-copy">
              <strong>Website</strong>
              <small>menjadinol.com</small>
            </span>

            <span className="tmn-digital-arrow">
              <Arrow />
            </span>
          </a>

          <a
            href="https://www.instagram.com/menjadi.nol/"
            target="_blank"
            rel="noopener noreferrer"
            className="tmn-digital-item"
          >
            <span className="tmn-digital-icon tmn-instagram">
              <InstagramIcon />
            </span>

            <span className="tmn-digital-copy">
              <strong>Instagram</strong>
              <small>@menjadi.nol</small>
            </span>

            <span className="tmn-digital-arrow">
              <Arrow />
            </span>
          </a>

          <a
            href="https://www.youtube.com/@menjadinol"
            target="_blank"
            rel="noopener noreferrer"
            className="tmn-digital-item"
          >
            <span className="tmn-digital-icon tmn-youtube">
              <YoutubeIcon />
            </span>

            <span className="tmn-digital-copy">
              <strong>YouTube</strong>
              <small>Video dan perjalanan Menjadi Nol.</small>
            </span>

            <span className="tmn-digital-arrow">
              <Arrow />
            </span>
          </a>

          <Link href="/kontak" className="tmn-digital-item">
            <span className="tmn-digital-icon">
              <MailIcon />
            </span>

            <span className="tmn-digital-copy">
              <strong>Email</strong>
              <small>Kontak resmi Menjadi Nol.</small>
            </span>

            <span className="tmn-digital-arrow">
              <Arrow />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}