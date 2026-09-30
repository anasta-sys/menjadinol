"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishEntry, unpublishEntry, deleteEntry } from "../actions";


function SectionLeaf({ slug, size = 76 }: { slug: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 120 120",
    "aria-hidden": true,
  } as const;

  if (slug === "tentang") {
    return (
      <svg {...common}>
        <path d="M23 98C18 59 43 27 99 14c-1 48-27 78-76 84Z" fill="#4f8b49" />
        <path d="M25 97C43 67 64 45 89 25" fill="none" stroke="#dcebd7" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M45 71 40 50M59 56 57 35M43 72l23-4M58 56l22-5" fill="none" stroke="#dcebd7" strokeWidth="1.2" opacity=".7" />
      </svg>
    );
  }

  if (slug === "perjalanan") {
    return (
      <svg {...common}>
        <path d="M20 101C37 72 59 44 93 20" fill="none" stroke="#356f38" strokeWidth="3" strokeLinecap="round" />
        <path d="M31 83C13 77 9 63 14 49c18 3 26 14 17 34Z" fill="#5e9850" />
        <path d="M49 63C34 50 38 35 49 25c14 11 15 24 0 38Z" fill="#3f813f" />
        <path d="M67 47C58 29 67 17 81 12c9 15 4 28-14 35Z" fill="#70a75a" />
        <path d="M55 79C70 65 84 67 94 78c-13 13-27 13-39 1Z" fill="#4c8b45" />
        <path d="M75 57C91 47 103 52 109 64c-15 9-27 6-34-7Z" fill="#76a963" />
      </svg>
    );
  }

  if (slug === "ruang-belajar") {
    return (
      <svg {...common}>
        <path d="M25 103C43 78 59 53 83 21" fill="none" stroke="#356f38" strokeWidth="3" strokeLinecap="round" />
        <path d="M36 84C19 81 14 69 18 56c16 2 24 12 18 28Z" fill="#6ca15a" />
        <path d="M45 72C51 57 63 53 75 59c-7 14-18 19-30 13Z" fill="#3f7e3f" />
        <path d="M52 61C37 55 35 43 41 32c14 5 19 15 11 29Z" fill="#4b8845" />
        <path d="M61 51C69 37 81 35 91 42c-8 13-19 16-30 9Z" fill="#75a966" />
        <path d="M70 38C60 27 64 17 74 11c10 10 9 20-4 27Z" fill="#568d49" />
      </svg>
    );
  }

  if (slug === "ruang-jeda") {
    return (
      <svg {...common}>
        <path d="M24 103C22 70 37 36 83 17c15 31 3 68-36 84Z" fill="#438141" />
        <path d="M27 101C44 73 59 52 76 30" fill="none" stroke="#dcebd7" strokeWidth="2.3" />
        <path d="M42 78c-12-12-17-24-16-35M54 61c-8-14-9-26-6-36M41 79c17-1 29-5 40-12M54 61c14-3 24-8 33-16" fill="none" stroke="#dcebd7" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (slug === "artikel") {
    return (
      <svg {...common}>
        <path d="M22 101C42 74 60 50 86 20" fill="none" stroke="#356f38" strokeWidth="3" strokeLinecap="round" />
        <circle cx="31" cy="83" r="15" fill="#6e9d73" />
        <circle cx="47" cy="67" r="16" fill="#527f5c" />
        <circle cx="64" cy="50" r="15" fill="#82a987" />
        <circle cx="80" cy="31" r="14" fill="#5b8c64" />
        <circle cx="69" cy="79" r="15" fill="#8eaf8e" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M24 102C43 75 60 51 87 20" fill="none" stroke="#356f38" strokeWidth="3" strokeLinecap="round" />
      <path d="M35 83C17 78 13 64 18 51c17 3 25 14 17 32Z" fill="#4d8745" />
      <path d="M50 65C38 50 43 36 55 28c12 13 10 26-5 37Z" fill="#6ca05a" />
      <path d="M66 48C60 31 69 20 83 17c6 15 0 27-17 31Z" fill="#3e7b3d" />
      <path d="M58 77C73 65 88 68 96 80c-14 11-27 9-38-3Z" fill="#7ca76c" />
      <path d="M77 58C91 47 104 51 111 62c-13 10-26 8-34-4Z" fill="#568d49" />
    </svg>
  );
}

export type ContentEntry = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string | null;
  folder_id: string | null;
  author_id: string | null;
  updated_by: string | null;
  last_published_by: string | null;
  excerpt: string | null;
  body: string | null;
};

export type ContentFolder = {
  id: string;
  section: string;
  title: string;
  slug: string;
};

export type ContentAuthor = {
  user_id: string;
  display_name: string | null;
  email: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta", day: "2-digit", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function safePreviewHtml(raw?: string | null) {
  if (!raw || typeof window === "undefined") return "";
  const doc = new DOMParser().parseFromString(raw, "text/html");
  doc.querySelectorAll("script,iframe,object,embed,style,form").forEach((node) => node.remove());
  doc.body.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attr) => {
      if (/^on/i.test(attr.name)) element.removeAttribute(attr.name);
      if (attr.name === "href" || attr.name === "src") {
        const unsafeValue = attr.value.trim().toLowerCase();
        if (
          unsafeValue.startsWith("javascript:") ||
          unsafeValue.startsWith("data:text/html")
        ) {
          element.removeAttribute(attr.name);
        }
      }
    });
  });
  return doc.body.innerHTML;
}

export default function SectionContentManager({
  sectionSlug, sectionLabel, entries, folders, authors,
}: {
  sectionSlug: string;
  sectionLabel: string;
  entries: ContentEntry[];
  folders: ContentFolder[];
  authors: ContentAuthor[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [folderId, setFolderId] = useState("all");
  const [preview, setPreview] = useState<ContentEntry | null>(null);
  const [message, setMessage] = useState("");

  const [publishedPage, setPublishedPage] = useState(1);
  const [draftPage, setDraftPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);

  const PAGE_SIZE = 10;

  const folderMap = useMemo(
    () => new Map(folders.map((f) => [f.id, f])),
    [folders]
  );

  const authorMap = useMemo(
    () => new Map(authors.map((a) => [a.user_id, a])),
    [authors]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return entries.filter((entry) => {
      if (folderId !== "all" && entry.folder_id !== folderId) return false;

      if (!needle) return true;

      const owner = entry.author_id
        ? authorMap.get(entry.author_id)
        : undefined;

      return [
        entry.title,
        entry.slug,
        owner?.display_name,
        owner?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [entries, folderId, query, authorMap]);

  const publishedEntries = filtered.filter(
    (entry) => entry.status === "published"
  );

  const draftEntries = filtered.filter(
    (entry) => entry.status === "draft"
  );

  const reviewEntries = filtered.filter(
    (entry) => entry.status === "review"
  );

  function paginate(items: ContentEntry[], requestedPage: number) {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, requestedPage), totalPages);
    const pageStart = (safePage - 1) * PAGE_SIZE;

    return {
      totalPages,
      safePage,
      pageStart,
      items: items.slice(pageStart, pageStart + PAGE_SIZE),
    };
  }

  const published = paginate(publishedEntries, publishedPage);
  const draft = paginate(draftEntries, draftPage);
  const review = paginate(reviewEntries, reviewPage);

  function resetPages() {
    setPublishedPage(1);
    setDraftPage(1);
    setReviewPage(1);
  }

  function renderPagination(
    totalItems: number,
    totalPages: number,
    safePage: number,
    setPage: (page: number) => void,
    label: string
  ) {
    if (totalItems <= PAGE_SIZE) return null;

    const buttonStyle = (active = false) => ({
      width: 34,
      minWidth: 34,
      height: 34,
      minHeight: 34,
      padding: 0,
      borderRadius: 9,
      border: active
        ? "1px solid #17663f"
        : "1px solid #dfe3dc",
      background: active ? "#17663f" : "#fff",
      color: active ? "#fff" : "#465b4c",
      fontWeight: 800,
      cursor: "pointer",
    });

    return (
      <div
        aria-label={`Navigasi halaman ${label}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          flexWrap: "wrap",
          marginTop: 16,
          paddingTop: 14,
          borderTop: "1px solid #eef0eb",
        }}
      >
        <button
          type="button"
          onClick={() => setPage(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
          style={{
            ...buttonStyle(),
            cursor: safePage === 1 ? "not-allowed" : "pointer",
            opacity: safePage === 1 ? .4 : 1,
          }}
        >
          ‹
        </button>

        {Array.from({ length: totalPages }, (_, index) => index + 1).map(
          (pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
              aria-current={safePage === pageNumber ? "page" : undefined}
              style={buttonStyle(safePage === pageNumber)}
            >
              {pageNumber}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => setPage(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
          style={{
            ...buttonStyle(),
            cursor:
              safePage === totalPages ? "not-allowed" : "pointer",
            opacity: safePage === totalPages ? .4 : 1,
          }}
        >
          ›
        </button>
      </div>
    );
  }

  function renderStatusSection(
    label: string,
    items: ContentEntry[],
    paginated: {
      totalPages: number;
      safePage: number;
      pageStart: number;
      items: ContentEntry[];
    },
    setPage: (page: number) => void,
    accent: string,
    softBackground: string
  ) {
    return (
      <section
        style={{
          marginTop: 18,
          border: "1px solid rgba(70,91,76,.12)",
          borderRadius: 18,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 16px",
            background: softBackground,
            borderBottom: "1px solid rgba(70,91,76,.10)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: accent,
              }}
            />

            <strong
              style={{
                color: "#294b37",
                fontSize: 13,
                letterSpacing: ".08em",
              }}
            >
              {label}
            </strong>
          </div>

          <span
            style={{
              padding: "5px 10px",
              borderRadius: 999,
              background: "#fff",
              border: "1px solid rgba(70,91,76,.10)",
              color: "#5c6f63",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {items.length} konten
          </span>
        </div>

        {renderStatusSection(
          "PUBLISHED",
          publishedEntries,
          published,
          setPublishedPage,
          "#17663f",
          "#eef7f1"
        )}

        {renderStatusSection(
          "DRAFT",
          draftEntries,
          draft,
          setDraftPage,
          "#a97813",
          "#fbf5e7"
        )}

        {renderStatusSection(
          "REVIEW",
          reviewEntries,
          review,
          setReviewPage,
          "#526d88",
          "#f0f4f8"
        )}
      </section>
    );
  }
  function togglePublish(entry: ContentEntry) {
    const published = entry.status === "published";
    if (!window.confirm(published ? "Tarik tulisan ini menjadi Draft?" : "Publish tulisan ini sekarang?")) return;
    setMessage("");
    startTransition(async () => {
      try {
        if (published) await unpublishEntry(entry.id);
        else await publishEntry(entry.id);
        setMessage(published ? `“${entry.title}” ditarik menjadi Draft.` : `“${entry.title}” berhasil dipublish.`);
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Tindakan publikasi gagal.");
      }
    });
  }

  function remove(entry: ContentEntry) {
    const owner = entry.author_id ? authorMap.get(entry.author_id) : undefined;
    const authorName = owner?.display_name || owner?.email || (entry.author_id ? "Admin" : "Konten lama");
    if (!window.confirm(`Hapus permanen tulisan “${entry.title}” milik ${authorName}?\\n\\nTulisan dan lampiran terkait akan dihapus. Tindakan ini tidak dapat dibatalkan.`)) return;
    setMessage("");
    startTransition(async () => {
      try {
        await deleteEntry(entry.id);
        if (preview?.id === entry.id) setPreview(null);
        setMessage(`“${entry.title}” berhasil dihapus.`);
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Gagal menghapus tulisan.");
      }
    });
  }

  return (
    <main style={{ maxWidth: 1500, margin: "0 auto", padding: "28px 18px 70px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 22,
          flexWrap: "wrap",
          marginBottom: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
          <div
            style={{
              width: 88,
              height: 88,
              flex: "0 0 88px",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "rgba(226,239,218,.62)",
            }}
          >
            <SectionLeaf slug={sectionSlug} size={76} />
          </div>

          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                opacity: .55,
                fontSize: 11,
                letterSpacing: ".14em",
                textTransform: "uppercase",
              }}
            >
              CONTENT MANAGER
            </p>
            <h1 style={{ margin: "5px 0 4px", fontSize: 32, lineHeight: 1.1 }}>
              {sectionLabel}
            </h1>
            <p style={{ margin: 0, opacity: .65, fontSize: 14 }}>
              {entries.length} konten dalam bagian ini.
            </p>
          </div>
        </div>

        <nav
          aria-label="Navigasi Content Manager"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/admin/superadmin/content-manager"
            style={{
              boxSizing: "border-box",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "auto",
              minWidth: 0,
              height: 38,
              minHeight: 38,
              maxHeight: 38,
              margin: 0,
              padding: "0 13px",
              borderRadius: 10,
              border: "1px solid rgba(70,91,76,.18)",
              background: "rgba(255,255,255,.88)",
              color: "#465b4c",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
              lineHeight: "36px",
              whiteSpace: "nowrap",
              boxShadow: "none",
            }}
          >
            <span aria-hidden="true" style={{ marginRight: 6, fontSize: 15, lineHeight: 1 }}>←</span>
            Semua Fitur
          </Link>

          <Link
            href="/admin/superadmin"
            style={{
              boxSizing: "border-box",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "auto",
              minWidth: 0,
              height: 38,
              minHeight: 38,
              maxHeight: 38,
              margin: 0,
              padding: "0 13px",
              borderRadius: 10,
              border: "1px solid rgba(23,102,63,.18)",
              background: "rgba(238,247,241,.92)",
              color: "#17663f",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
              lineHeight: "36px",
              whiteSpace: "nowrap",
              boxShadow: "none",
            }}
          >
            Superadmin
          </Link>
        </nav>
      </div>

      <section style={{ border: "1px solid rgba(70,91,76,.14)", borderRadius: 22, background: "#fff", padding: 20 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPages();
            }}
            placeholder="Cari judul / slug / penulis..."
            style={{
              minHeight: 42,
              minWidth: 270,
              padding: "0 14px",
              borderRadius: 999,
              border: "1px solid rgba(72,105,79,.18)",
              background: "rgba(255,253,247,.96)",
              color: "#294b37",
              outline: "none",
              boxShadow: "0 4px 14px rgba(55,80,60,.04)",
            }}
          />

          <select
            value={folderId}
            onChange={(e) => {
              setFolderId(e.target.value);
              resetPages();
            }}
            style={{
              minHeight: 42,
              padding: "0 38px 0 14px",
              borderRadius: 999,
              border: "1px solid rgba(72,105,79,.18)",
              background: "rgba(247,249,240,.96)",
              color: "#294b37",
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
              boxShadow: "0 4px 14px rgba(55,80,60,.04)",
            }}
          >
            <option value="all">Semua Fitur</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
          </select>
        </div>
        {message && <div style={{ marginBottom: 14, padding: "11px 13px", borderRadius: 12, background: "#f4f7f2", fontSize: 12 }}>{message}</div>}

        {renderStatusSection(
          "PUBLISHED",
          publishedEntries,
          published,
          setPublishedPage,
          "#17663f",
          "#eef7f1"
        )}

        {renderStatusSection(
          "DRAFT",
          draftEntries,
          draft,
          setDraftPage,
          "#a97813",
          "#fbf5e7"
        )}

        {renderStatusSection(
          "REVIEW",
          reviewEntries,
          review,
          setReviewPage,
          "#526d88",
          "#f0f4f8"
        )}
      </section>

      {preview && (
        <div onClick={()=>setPreview(null)} style={{ position:"fixed", inset:0, background:"rgba(20,25,22,.52)", zIndex:1000, padding:20, overflowY:"auto" }}>
          <div onClick={(e)=>e.stopPropagation()} style={{ maxWidth:900, margin:"30px auto", background:"#fff", borderRadius:20, padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:12 }}>
              <div><h2 style={{ marginTop:0 }}>{preview.title}</h2><p style={{ opacity:.58 }}>{preview.excerpt || "Tanpa excerpt"}</p></div>
              <button onClick={()=>setPreview(null)} style={{ minHeight:36, padding:"0 15px", borderRadius:999, border:"1px solid rgba(70,91,76,.18)", background:"#f3f6ee", color:"#365441", fontSize:12, fontWeight:700, cursor:"pointer" }}>Tutup</button>
            </div>
            <hr style={{ border:0, borderTop:"1px solid #eee" }}/>
            <div dangerouslySetInnerHTML={{ __html: safePreviewHtml(preview.body) }} />
          </div>
        </div>
      )}
    </main>
  );
}
