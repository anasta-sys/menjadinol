"use client";

import {
  FormEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { savePost, deletePost, signOut } from "./actions";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  status: "draft" |"review" | "published";
  updated_at: string;
};

type FilterStatus = "all" | "draft" | "review" | "published";
type SortMode = "newest" | "oldest" | "title";

const BODY_LIMIT = 100000;
const EXCERPT_LIMIT = 420;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function formatUpdatedAt(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderPreviewBody(body: string) {
  // Preview ringan untuk editor teks/Markdown sederhana.
  // Penyimpanan tetap berupa teks biasa sehingga tidak mengubah struktur database.
  const lines = body.split("\n");

  return lines.map((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return <div className="admin-preview-gap" key={index} />;
    }

    if (trimmed === "---") {
      return <hr key={index} />;
    }

    if (trimmed.startsWith("### ")) {
      return <h3 key={index}>{trimmed.slice(4)}</h3>;
    }

    if (trimmed.startsWith("## ")) {
      return <h2 key={index}>{trimmed.slice(3)}</h2>;
    }

    if (trimmed.startsWith("# ")) {
      return <h1 key={index}>{trimmed.slice(2)}</h1>;
    }

    if (trimmed.startsWith("> ")) {
      return <blockquote key={index}>{trimmed.slice(2)}</blockquote>;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      return <p key={index}>• {trimmed.replace(/^[-*]\s+/, "")}</p>;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      return <p key={index}>{trimmed}</p>;
    }

    return <p key={index}>{line}</p>;
  });
}

export default function AdminClient({
  initialPosts,
}: {
  initialPosts: Post[];
}) {
  const [editing, setEditing] = useState<Post | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Refleksi");

  const [slugTouched, setSlugTouched] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<FilterStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const [saveState, setSaveState] =
    useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  const [isPending, startTransition] = useTransition();

  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const availableCategories = useMemo(() => {
    const base = [
      "Refleksi",
      "Rasa",
      "Hadir",
      "Makna",
      "Penerimaan",
      "Letting Go",
      "Film",
      "Spiritual",
    ];

    return Array.from(
      new Set([...base, ...initialPosts.map((post) => post.category)])
    ).sort((a, b) => a.localeCompare(b, "id"));
  }, [initialPosts]);

  const visiblePosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const result = initialPosts.filter((post) => {
      const matchesQuery =
        !normalizedQuery ||
        post.title.toLowerCase().includes(normalizedQuery) ||
        post.slug.toLowerCase().includes(normalizedQuery) ||
        post.category.toLowerCase().includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "all" || post.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" || post.category === categoryFilter;

      return matchesQuery && matchesStatus && matchesCategory;
    });

    return [...result].sort((a, b) => {
      if (sortMode === "title") {
        return a.title.localeCompare(b.title, "id");
      }

      const aTime = new Date(a.updated_at).getTime() || 0;
      const bTime = new Date(b.updated_at).getTime() || 0;

      return sortMode === "oldest"
        ? aTime - bTime
        : bTime - aTime;
    });
  }, [
    initialPosts,
    query,
    statusFilter,
    categoryFilter,
    sortMode,
  ]);

  function resetEditor() {
    setEditing(null);
    setTitle("");
    setSlug("");
    setExcerpt("");
    setBody("");
    setCategory("Refleksi");
    setSlugTouched(false);
    setPreviewOpen(false);
    setSaveState("idle");
    setSaveMessage("");
  }

  function beginEdit(post: Post) {
    setEditing(post);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt || "");
    setBody(post.body || "");
    setCategory(post.category || "Refleksi");
    setSlugTouched(true);
    setPreviewOpen(false);
    setSaveState("idle");
    setSaveMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleTitleChange(value: string) {
    setTitle(value);

    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function insertFormatting(
    before: string,
    after = "",
    placeholder = "teks"
  ) {
    const textarea = bodyRef.current;

    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const selected = body.slice(start, end) || placeholder;

    const nextValue =
      body.slice(0, start) +
      before +
      selected +
      after +
      body.slice(end);

    if (nextValue.length > BODY_LIMIT) return;

    setBody(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();

      const selectionStart = start + before.length;
      const selectionEnd = selectionStart + selected.length;

      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function insertLinePrefix(prefix: string) {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const selected = body.slice(start, end) || "teks";
    const formatted = selected
      .split("\n")
      .map((line) => `${prefix}${line}`)
      .join("\n");

    const nextValue =
      body.slice(0, start) + formatted + body.slice(end);

    if (nextValue.length > BODY_LIMIT) return;

    setBody(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + formatted.length
      );
    });
  }

  function openPreview() {
    if (!title.trim()) {
      setSaveMessage("Judul wajib diisi sebelum preview.");
      setSaveState("error");
      return;
    }

    if (!body.trim()) {
      setSaveMessage("Isi artikel wajib diisi sebelum preview.");
      setSaveState("error");
      return;
    }

    setSaveState("idle");
    setSaveMessage("");
    setPreviewOpen(true);
  }

  function submitWithStatus(
    event: FormEvent<HTMLFormElement>,
    status: "draft" | "review" | "published"
  ) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    formData.set("status", status);

    setSaveState("saving");
    setSaveMessage(
      status === "published"
        ? "Mempublikasikan artikel…"
        : "Menyimpan draft…"
    );

    startTransition(async () => {
      try {
        await savePost(formData);

        setSaveState("saved");
        setSaveMessage(
          status === "published"
            ? "Cerita & Makna berhasil dipublikasikan."
            : "Draft berhasil disimpan."
        );

        window.setTimeout(() => {
          setSaveState((current) =>
            current === "saved" ? "idle" : current
          );
        }, 3500);
      } catch (error) {
        console.error(error);
        setSaveState("error");
        setSaveMessage(
          "Penyimpanan gagal. Silakan coba lagi."
        );
      }
    });
  }

  const bodyCount = body.length;
  const excerptCount = excerpt.length;

  return (
    <>
      <div className="proper-admin-dashboard">
        <section className="proper-dashboard-card editor-card">
          <div className="dashboard-heading">
            <div>
              <p className="eyebrow">editor</p>

              <h1>
                {editing ? "Edit Cerita & Makna" : "Cerita & Makna baru"}
              </h1>

              {editing && (
                <p className="admin-updated-at">
                  Terakhir diperbarui:{" "}
                  {formatUpdatedAt(editing.updated_at)}
                </p>
              )}
            </div>

            {editing && (
              <button
                type="button"
                className="admin-secondary"
                onClick={resetEditor}
              >
                artikel baru
              </button>
            )}
          </div>

          <form
            className="proper-admin-form"
            onSubmit={(event) =>
              submitWithStatus(event, "draft")
            }
          >
            <input
              type="hidden"
              name="id"
              value={editing?.id || ""}
            />

            <input
              type="hidden"
              name="status"
              value="draft"
            />

            <div className="admin-two-col">
              <label>
                Judul

                <input
                  name="title"
                  value={title}
                  onChange={(event) =>
                    handleTitleChange(event.target.value)
                  }
                  maxLength={180}
                  required
                />
              </label>

              <label>
                Slug

                <input
                  name="slug"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(slugify(event.target.value));
                  }}
                  onBlur={() => {
                    if (!slug.trim()) {
                      setSlugTouched(false);
                      setSlug(slugify(title));
                    }
                  }}
                  pattern="[a-z0-9-]*"
                  placeholder="dibuat otomatis dari judul"
                />

                <small className="admin-field-help">
                  Otomatis dari judul, tetapi tetap bisa diedit.
                </small>
              </label>
            </div>

            <label>
              Kategori

              <select
                name="category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
              >
                {availableCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="admin-field-label-row">
                <span>Ringkasan</span>
                <span
                  className={
                    excerptCount >= EXCERPT_LIMIT
                      ? "admin-character-count limit"
                      : "admin-character-count"
                  }
                >
                  {excerptCount.toLocaleString("id-ID")} /{" "}
                  {EXCERPT_LIMIT.toLocaleString("id-ID")}
                </span>
              </span>

              <textarea
                name="excerpt"
                className="summary-field"
                value={excerpt}
                onChange={(event) =>
                  setExcerpt(event.target.value)
                }
                maxLength={EXCERPT_LIMIT}
              />
            </label>

            <label>
              <span className="admin-field-label-row">
                <span>Isi artikel</span>
                <span
                  className={
                    bodyCount >= BODY_LIMIT
                      ? "admin-character-count limit"
                      : "admin-character-count"
                  }
                >
                  {bodyCount.toLocaleString("id-ID")} /{" "}
                  {BODY_LIMIT.toLocaleString("id-ID")}
                </span>
              </span>

              <div className="admin-editor-toolbar">
                <button
                  type="button"
                  onClick={() =>
                    insertFormatting("## ", "", "Subjudul")
                  }
                  title="Subjudul"
                >
                  H2
                </button>

                <button
                  type="button"
                  onClick={() =>
                    insertFormatting("### ", "", "Subjudul kecil")
                  }
                  title="Subjudul kecil"
                >
                  H3
                </button>

                <button
                  type="button"
                  onClick={() =>
                    insertFormatting("**", "**", "teks tebal")
                  }
                  title="Tebal"
                >
                  B
                </button>

                <button
                  type="button"
                  onClick={() =>
                    insertFormatting("_", "_", "teks miring")
                  }
                  title="Miring"
                >
                  I
                </button>

                <button
                  type="button"
                  onClick={() => insertLinePrefix("> ")}
                  title="Quote"
                >
                  ❝
                </button>

                <button
                  type="button"
                  onClick={() => insertLinePrefix("- ")}
                  title="Bullet list"
                >
                  • List
                </button>

                <button
                  type="button"
                  onClick={() => insertLinePrefix("1. ")}
                  title="Numbered list"
                >
                  1. List
                </button>

                <button
                  type="button"
                  onClick={() =>
                    insertFormatting(
                      "[",
                      "](https://)",
                      "teks link"
                    )
                  }
                  title="Link"
                >
                  Link
                </button>

                <button
                  type="button"
                  onClick={() =>
                    insertFormatting("\n---\n", "", "")
                  }
                  title="Pemisah"
                >
                  ―
                </button>
              </div>

              <textarea
                ref={bodyRef}
                name="body"
                className="body-field admin-long-editor"
                value={body}
                onChange={(event) =>
                  setBody(event.target.value)
                }
                maxLength={BODY_LIMIT}
                required
              />

              <small className="admin-field-help">
                Toolbar memakai format Markdown sederhana. Data
                tetap disimpan sebagai teks.
              </small>
            </label>

            {saveMessage && (
              <div
                className={`admin-save-feedback ${saveState}`}
                role={saveState === "error" ? "alert" : "status"}
              >
                {saveMessage}
              </div>
            )}

            <div className="admin-actions">
              <button
                type="button"
                className="admin-secondary"
                onClick={openPreview}
                disabled={isPending}
              >
                preview
              </button>

              <button
                className="admin-secondary"
                type="submit"
                disabled={isPending}
              >
                {saveState === "saving"
                  ? "menyimpan…"
                  : "simpan draft"}
              </button>

              <button
                className="login-submit admin-save"
                type="button"
                disabled={isPending}
                onClick={(event) => {
                  const form = event.currentTarget.form;
                  if (!form) return;

                  submitWithStatus(
                    {
                      preventDefault() {},
                      currentTarget: form,
                    } as FormEvent<HTMLFormElement>,
                    "published"
                  );
                }}
              >
                {saveState === "saving"
                  ? "memproses…"
                  : "publikasikan"}
              </button>

              {(editing ||
                title ||
                excerpt ||
                body ||
                slugTouched) && (
                <button
                  className="admin-secondary"
                  type="button"
                  onClick={resetEditor}
                  disabled={isPending}
                >
                  batal
                </button>
              )}
            </div>
          </form>
        </section>

        <aside className="proper-dashboard-card list-card">
          <div className="dashboard-list-head">
            <div>
              <p className="eyebrow">content</p>
              <h2>Daftar artikel</h2>
            </div>

            <form action={signOut}>
              <button
                className="admin-secondary"
                type="submit"
              >
                keluar
              </button>
            </form>
          </div>

          <div className="admin-list-tools">
            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Cari judul, slug, atau kategori…"
              aria-label="Cari artikel"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as FilterStatus
                )
              }
              aria-label="Filter status"
            >
              <option value="all">Semua status</option>
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="published">Published</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value)
              }
              aria-label="Filter kategori"
            >
              <option value="all">Semua kategori</option>

              {availableCategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={sortMode}
              onChange={(event) =>
                setSortMode(event.target.value as SortMode)
              }
              aria-label="Urutkan artikel"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="title">Judul A–Z</option>
            </select>
          </div>

          <p className="admin-result-count">
            {visiblePosts.length.toLocaleString("id-ID")} artikel
          </p>

          <div className="article-admin-list">
            {visiblePosts.length === 0 && (
              <div className="empty-admin">
                Tidak ada artikel yang cocok.
              </div>
            )}

            {visiblePosts.map((post) => (
              <article className="admin-row" key={post.id}>
                <div className="admin-row-copy">
                  <strong>{post.title}</strong>

                <span>
                  {post.category} ·{" "}
                  {post.status === "published"
                  ? "Published"
                  : post.status === "review"
                  ? "Review"
                  : "Draft"}
                </span>

                  <small>
                    Diperbarui{" "}
                    {formatUpdatedAt(post.updated_at)}
                  </small>
                </div>

                <div className="admin-row-actions">
                  <button
                    className="admin-mini"
                    type="button"
                    onClick={() => beginEdit(post)}
                  >
                    edit
                  </button>

                  <form
                    action={deletePost}
                    onSubmit={(event) => {
                      const confirmed = window.confirm(
                        `Yakin ingin menghapus "${post.title}"? Tindakan ini tidak dapat dibatalkan.`
                      );

                      if (!confirmed) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input
                      type="hidden"
                      name="id"
                      value={post.id}
                    />

                    <button
                      className="admin-mini danger"
                      type="submit"
                    >
                      hapus
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>

      {previewOpen && (
        <div
          className="admin-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Preview artikel"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewOpen(false);
            }
          }}
        >
          <article className="admin-preview-modal">
            <div className="admin-preview-header">
              <div>
                <p className="eyebrow">preview artikel</p>
                <span>
                  Preview saja — belum mengubah status artikel
                </span>
              </div>

              <button
                type="button"
                className="admin-secondary"
                onClick={() => setPreviewOpen(false)}
              >
                tutup
              </button>
            </div>

            <div className="admin-preview-article">
              <p className="eyebrow">{category}</p>

              <h1>{title || "Tanpa judul"}</h1>

              {excerpt && (
                <p className="admin-preview-excerpt">
                  {excerpt}
                </p>
              )}

              <div className="admin-preview-body">
                {renderPreviewBody(body)}
              </div>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
