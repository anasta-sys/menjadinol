"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  publishEntry,
  unpublishEntry,
  reviewEntry,
  deleteEntry,
} from "../actions";

type Status = "published" | "draft" | "review";

type Row = {
  id: string;
  title: string;
  status: Status;
  createdAt: string | null;
  publishedAt: string | null;
  excerpt: string | null;
  body: string;
  folderTitle: string;
  sectionLabel: string;
  sectionSlug: string;
};

const PAGE_SIZE = 20;

function statusLabel(status: Status) {
  if (status === "published") return "Published";
  if (status === "review") return "Review";
  return "Draft";
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function safePreviewHtml(raw?: string | null) {
  if (!raw || typeof window === "undefined") return "";

  const doc = new DOMParser().parseFromString(raw, "text/html");

  doc
    .querySelectorAll("script,iframe,object,embed,style,form")
    .forEach((node) => node.remove());

  doc.body.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attr) => {
      if (/^on/i.test(attr.name)) {
        element.removeAttribute(attr.name);
      }

      if (attr.name === "href" || attr.name === "src") {
        const value = attr.value.trim().toLowerCase();

        if (
          value.startsWith("javascript:") ||
          value.startsWith("data:text/html")
        ) {
          element.removeAttribute(attr.name);
        }
      }
    });
  });

  return doc.body.innerHTML;
}

export default function RekapContentManager({
  rows,
}: {
  rows: Row[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] =
    useState<"all" | Status>("all");

  const [section, setSection] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Row | null>(null);
  const [message, setMessage] = useState("");

  const published = rows.filter(
    (row) => row.status === "published"
  ).length;

  const draft = rows.filter(
    (row) => row.status === "draft"
  ).length;

  const review = rows.filter(
    (row) => row.status === "review"
  ).length;

  const sections = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.sectionLabel))
      ).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (status !== "all" && row.status !== status) {
        return false;
      }

      if (
        section !== "all" &&
        row.sectionLabel !== section
      ) {
        return false;
      }

      if (
        q &&
        !row.title.toLowerCase().includes(q) &&
        !row.folderTitle.toLowerCase().includes(q)
      ) {
        return false;
      }

      return true;
    });
  }, [rows, status, section, search]);

  const pageCount = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const safePage = Math.min(page, pageCount);

  const visibleRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function resetPage() {
    setPage(1);
  }

  function changeStatus(row: Row, next: Status) {
    if (row.status === next || isPending) return;

    const label = statusLabel(next);

    if (
      !window.confirm(
        `Ubah status tulisan "${row.title}" menjadi ${label}?`
      )
    ) {
      return;
    }

    setMessage("");

    startTransition(async () => {
      try {
        if (next === "published") {
          await publishEntry(row.id);
        } else if (next === "review") {
          await reviewEntry(row.id);
        } else {
          await unpublishEntry(row.id);
        }

        setMessage(
          `"${row.title}" berhasil diubah menjadi ${label}.`
        );

        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Gagal mengubah status tulisan."
        );
      }
    });
  }

  function remove(row: Row) {
    if (isPending) return;

    if (
      !window.confirm(
        `Hapus permanen tulisan "${row.title}"?\n\nTulisan dan lampiran terkait akan dihapus. Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }

    setMessage("");

    startTransition(async () => {
      try {
        await deleteEntry(row.id);

        if (preview?.id === row.id) {
          setPreview(null);
        }

        setMessage(`"${row.title}" berhasil dihapus.`);
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Gagal menghapus tulisan."
        );
      }
    });
  }

  const statStyle = {
    border: "1px solid rgba(11,85,60,.14)",
    borderRadius: 16,
    padding: "14px 18px",
    background: "rgba(255,255,255,.72)",
  } as const;

  const buttonStyle = {
    minHeight: 34,
    padding: "0 10px",
    borderRadius: 9,
    border: "1px solid rgba(11,85,60,.18)",
    background: "#fff",
    color: "#0b553c",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  } as const;

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div style={statStyle}>
          <strong>{rows.length}</strong>
          <div>Semua Tulisan</div>
        </div>

        <div style={statStyle}>
          <strong>{published}</strong>
          <div>Published</div>
        </div>

        <div style={statStyle}>
          <strong>{draft}</strong>
          <div>Draft</div>
        </div>

        <div style={statStyle}>
          <strong>{review}</strong>
          <div>Review</div>
        </div>
      </div>

      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 15px",
            borderRadius: 12,
            background: "rgba(11,85,60,.07)",
            color: "#0b553c",
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            resetPage();
          }}
          placeholder="Cari judul atau folder..."
          style={{
            minWidth: 260,
            flex: "1 1 300px",
            padding: "11px 14px",
            borderRadius: 12,
            border: "1px solid rgba(11,85,60,.18)",
          }}
        />

        <select
          value={status}
          onChange={(event) => {
            setStatus(
              event.target.value as "all" | Status
            );
            resetPage();
          }}
        >
          <option value="all">Semua status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
        </select>

        <select
          value={section}
          onChange={(event) => {
            setSection(event.target.value);
            resetPage();
          }}
        >
          <option value="all">Semua bagian</option>

          {sections.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          overflowX: "auto",
          border: "1px solid rgba(11,85,60,.14)",
          borderRadius: 18,
          background: "rgba(255,255,255,.8)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 1180,
          }}
        >
          <thead>
            <tr>
              {[
                "No.",
                "Judul",
                "Bagian",
                "Folder / Fitur",
                "Status",
                "Tanggal",
                "Aksi",
              ].map((heading) => (
                <th
                  key={heading}
                  style={{
                    textAlign: "left",
                    padding: 14,
                    borderBottom:
                      "1px solid rgba(11,85,60,.14)",
                    fontSize: 12,
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={row.id}>
                <td style={{ padding: 14 }}>
                  {(safePage - 1) * PAGE_SIZE +
                    index +
                    1}
                </td>

                <td
                  style={{
                    padding: 14,
                    fontWeight: 700,
                  }}
                >
                  {row.title}
                </td>

                <td style={{ padding: 14 }}>
                  {row.sectionLabel}
                </td>

                <td style={{ padding: 14 }}>
                  {row.folderTitle}
                </td>

                <td style={{ padding: 14 }}>
                  <strong>{statusLabel(row.status)}</strong>
                </td>

                <td style={{ padding: 14 }}>
                  {formatDate(
                    row.status === "published"
                      ? row.publishedAt ?? row.createdAt
                      : row.createdAt
                  )}
                </td>

                <td style={{ padding: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setPreview(row)}
                      style={buttonStyle}
                    >
                      Preview
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        changeStatus(row, "draft")
                      }
                      disabled={
                        isPending || row.status === "draft"
                      }
                      style={{
                        ...buttonStyle,
                        opacity:
                          row.status === "draft" ? 0.4 : 1,
                      }}
                    >
                      Draft
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        changeStatus(row, "review")
                      }
                      disabled={
                        isPending || row.status === "review"
                      }
                      style={{
                        ...buttonStyle,
                        opacity:
                          row.status === "review" ? 0.4 : 1,
                      }}
                    >
                      Review
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        changeStatus(row, "published")
                      }
                      disabled={
                        isPending ||
                        row.status === "published"
                      }
                      style={{
                        ...buttonStyle,
                        opacity:
                          row.status === "published"
                            ? 0.4
                            : 1,
                      }}
                    >
                      Publish
                    </button>

                    <button
                      type="button"
                      onClick={() => remove(row)}
                      disabled={isPending}
                      style={{
                        ...buttonStyle,
                        color: "#8b2525",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {visibleRows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    opacity: 0.6,
                  }}
                >
                  Tidak ada konten yang sesuai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginTop: 18,
          flexWrap: "wrap",
        }}
      >
        <span>
          Menampilkan {filtered.length} tulisan
        </span>

        <div style={{ display: "flex", gap: 6 }}>
          {Array.from(
            { length: pageCount },
            (_, index) => index + 1
          ).map((number) => (
            <button
              key={number}
              type="button"
              onClick={() => setPage(number)}
              disabled={number === safePage}
              style={{
                minWidth: 36,
                height: 36,
                borderRadius: 10,
                border:
                  "1px solid rgba(11,85,60,.18)",
                fontWeight: 800,
              }}
            >
              {number}
            </button>
          ))}
        </div>
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(20,25,22,.52)",
            padding: 20,
            overflowY: "auto",
          }}
        >
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              maxWidth: 900,
              margin: "30px auto",
              background: "#fff",
              borderRadius: 20,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ marginTop: 0 }}>
                  {preview.title}
                </h2>

                <p style={{ opacity: 0.58 }}>
                  {preview.excerpt || "Tanpa excerpt"}
                </p>

                <strong>
                  {statusLabel(preview.status)}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => setPreview(null)}
                style={buttonStyle}
              >
                Tutup
              </button>
            </div>

            <hr
              style={{
                border: 0,
                borderTop: "1px solid #eee",
                margin: "20px 0",
              }}
            />

            <div
              dangerouslySetInnerHTML={{
                __html: safePreviewHtml(preview.body),
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
