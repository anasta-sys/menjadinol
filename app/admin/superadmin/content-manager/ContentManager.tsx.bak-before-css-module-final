"use client";

import Link from "next/link";
import styles from "./ContentManager.module.css";

type SectionItem = {
  slug: string;
  dbSection: string;
  label: string;
  folderCount: number;
};

function SectionIcon({ slug }: { slug: string }) {
  const common = {
    width: 42,
    height: 42,
    viewBox: "0 0 48 48",
    fill: "none",
    "aria-hidden": true,
  } as const;

  if (slug === "tentang") {
    return (
      <svg {...common}>
        <path d="M8 10.5c6.2-2 11.5-.7 16 3.7v25c-4.5-4.4-9.8-5.7-16-3.7v-25Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M40 10.5c-6.2-2-11.5-.7-16 3.7v25c4.5-4.4 9.8-5.7 16-3.7v-25Z" stroke="currentColor" strokeWidth="2"/>
      </svg>
    );
  }

  if (slug === "perjalanan") {
    return (
      <svg {...common}>
        <path d="M7 37 18 19l6 8 5-7 12 17H7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M12 38c7-10 13-7 17-13 3-4 5-8 8-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }

  if (slug === "ruang-belajar") {
    return (
      <svg {...common}>
        <path d="M8 12c6-2 11.5-.5 16 4v24c-4.5-4.5-10-6-16-4V12Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M40 12c-6-2-11.5-.5-16 4v24c4.5-4.5 10-6 16-4V12Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M24 7v5M18 9l2 4M30 9l-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }

  if (slug === "ruang-jeda") {
    return (
      <svg {...common}>
        <ellipse cx="24" cy="34" rx="15" ry="4" stroke="currentColor" strokeWidth="1.7"/>
        <ellipse cx="24" cy="29" rx="11" ry="5" stroke="currentColor" strokeWidth="1.7"/>
        <ellipse cx="24" cy="23" rx="8" ry="5" stroke="currentColor" strokeWidth="1.7"/>
        <ellipse cx="24" cy="16" rx="5" ry="4" stroke="currentColor" strokeWidth="1.7"/>
      </svg>
    );
  }

  if (slug === "artikel") {
    return (
      <svg {...common}>
        <path d="M11 37c10-2 20-10 27-28-14 3-24 11-27 28Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M13 35c8-8 14-13 23-22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="7" y="12" width="34" height="25" rx="3" stroke="currentColor" strokeWidth="2"/>
      <path d="m9 15 15 12 15-12" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

export default function ContentManager({
  sections,
}: {
  sections: SectionItem[];
}) {
  const descriptions: Record<string, string> = {
    tentang: "Identitas, filosofi, dan dasar perjalanan Menjadi Nol.",
    perjalanan: "Tahapan perjalanan dan ruang pendampingan.",
    "ruang-belajar": "Materi, pengetahuan, dan pembelajaran batin.",
    "ruang-jeda": "Ruang untuk berhenti, bernapas, dan menyadari.",
    artikel: "Tulisan, cerita, refleksi, dan pemaknaan.",
    kontak: "Informasi dan ruang untuk terhubung.",
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            MENJADI NOL
            <span className={styles.eyebrowLine} />
            CONTENT MANAGER
          </p>

          <h1 className={styles.title}>Content Manager</h1>

          <p className={styles.intro}>
            Kelola ruang, tulisan, dan materi Menjadi Nol dalam satu tempat
            yang tenang dan terstruktur.
          </p>
        </div>

        <Link href="/admin/superadmin" className={styles.back}>
          ← Super Admin
        </Link>
      </header>

      <section>
        <div className={styles.libraryHead}>
          <div>
            <p className={styles.libraryKicker}>RUANG KONTEN</p>
            <h2 className={styles.libraryTitle}>
              Pilih bagian yang ingin dikelola
            </h2>
          </div>

          <span className={styles.total}>
            {sections.length} bagian
          </span>
        </div>

        <div className={styles.grid}>
          {sections.map((section, index) => {
            const green = index % 2 === 1;

            return (
              <Link
                key={section.slug}
                href={`/admin/superadmin/content-manager/${section.slug}`}
                className={`${styles.card} ${
                  green ? styles.green : ""
                }`}
              >
                <span className={styles.number}>
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className={styles.icon}>
                  <SectionIcon slug={section.slug} />
                </div>

                <div className={styles.copy}>
                  <h3 className={styles.cardTitle}>
                    {section.label}
                  </h3>

                  <p className={styles.description}>
                    {descriptions[section.slug]}
                  </p>

                  <span className={styles.folder}>
                    <span className={styles.folderIcon}>▣</span>
                    {section.folderCount} folder
                  </span>
                </div>

                <div className={styles.action}>
                  <span>Kelola {section.label}</span>
                  <span className={styles.arrow}>›</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
