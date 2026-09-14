"use client";

import { useEffect, useRef, useState } from "react";
import EntryInlineAdminActions from "@/app/components/EntryInlineAdminActions";
import type { ContentTableData } from "@/app/components/ContentTableBuilder";

type TableData = ContentTableData | null;

type Entry = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: string | null;
  table_data?: TableData;

  has_attachment?: boolean;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  attachment_url?: string | null;

  status: "draft" | "published";
  created_at?: string | null;
  updated_at?: string | null;
  author_name?: string | null;
  writer_location?: string | null;
};

function formatWib(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);

  const tanggal = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);

  const jam = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(":", ".");

  return `${tanggal} · ${jam} WIB`;
}

function formatBytes(value: number | null | undefined) {
  if (!value || value <= 0) return "";

  if (value < 1024 * 1024) {
    return `${Math.ceil(value / 1024)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}


function SecureImageCanvas({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    const controller = new AbortController();

    async function renderImage() {
      setError("");

      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Gambar tidak dapat dibuka.");
        }

        const blob = await response.blob();

        if (!active) return;

        objectUrl = URL.createObjectURL(blob);

        const image = new Image();

        image.onload = () => {
          if (!active || !canvasRef.current) return;

          const canvas = canvasRef.current;
          const context = canvas.getContext("2d");

          if (!context) {
            setError("Gambar tidak dapat ditampilkan.");
            return;
          }

          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;

          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0);
        };

        image.onerror = () => {
          if (active) {
            setError("Gambar tidak dapat ditampilkan.");
          }
        };

        image.src = objectUrl;
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Gambar tidak dapat dibuka."
          );
        }
      }
    }

    renderImage();

    return () => {
      active = false;
      controller.abort();

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  if (error) {
    return (
      <div className="material-preview-error">
        {error}
      </div>
    );
  }

  return (
    <div
      className="material-preview material-image-wrap"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="material-image-canvas"
        role="img"
        aria-label={title}
      />
    </div>
  );
}

function SecurePdfCanvas({
  url,
}: {
  url: string;
}) {
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let pdfDocument: any = null;
    const controller = new AbortController();

    async function renderPdf() {
      setLoadingPdf(true);
      setError("");

      const pages = pagesRef.current;
      if (!pages) return;

      pages.innerHTML = "";

      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("PDF tidak dapat dibuka.");
        }

        const bytes = await response.arrayBuffer();

        if (!active) return;

        const pdfjs = await import("pdfjs-dist");

        pdfjs.GlobalWorkerOptions.workerSrc =
          "/pdf.worker.min.mjs";

        pdfDocument = await pdfjs.getDocument({
          data: bytes,
        }).promise;

        for (
          let pageNumber = 1;
          pageNumber <= pdfDocument.numPages;
          pageNumber += 1
        ) {
          if (!active) return;

          const page =
            await pdfDocument.getPage(pageNumber);

          const viewport =
            page.getViewport({ scale: 1.6 });

          const canvas =
            document.createElement("canvas");

          canvas.className =
            "material-pdf-page";

          canvas.width =
            Math.ceil(viewport.width);

          canvas.height =
            Math.ceil(viewport.height);

          const context =
            canvas.getContext("2d");

          if (!context) {
            throw new Error(
              "Canvas PDF tidak tersedia."
            );
          }

          pages.appendChild(canvas);

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;
        }
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        console.error("SecurePdfCanvas:", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "PDF tidak dapat ditampilkan."
          );
        }
      } finally {
        if (active) {
          setLoadingPdf(false);
        }
      }
    }

    renderPdf();

    return () => {
      active = false;
      controller.abort();

      try {
        pdfDocument?.destroy?.();
      } catch {}
    };
  }, [url]);

  return (
    <div
      className="material-preview material-pdf-canvas-wrap"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      {loadingPdf && (
        <div className="material-preview-state">
          Membuka PDF...
        </div>
      )}

      {error && (
        <div className="material-preview-error">
          {error}
        </div>
      )}

      <div
        ref={pagesRef}
        className="material-pdf-pages"
      />
    </div>
  );
}

function EntryContent({
  entry,
  isAdmin,
}: {
  entry: Entry;
  isAdmin: boolean;
}) {
  const headers = entry.table_data?.headers ?? [];
  const rows = entry.table_data?.rows ?? [];

  const isImage =
    Boolean(entry.attachment_mime?.startsWith("image/"));

  const isPdf =
    entry.attachment_mime === "application/pdf";

  const isVideo =
    Boolean(entry.attachment_mime?.startsWith("video/"));

  return (
    <article className="folder-entry-card folder-entry-card-full">
      <div className="entry-title-line">
        <h2>{entry.title}</h2>

        {isAdmin && (
          <span
            className={
              entry.status === "published"
                ? "entry-status published"
                : "entry-status draft"
            }
          >
            {entry.status}
          </span>
        )}
      </div>

      <div className="entry-time-meta">
  <span>
    Ditulis oleh{" "}
    <strong>
      {entry.author_name ||
        "Penulis belum tercatat"}
    </strong>

    {entry.created_at
      ? ` · ${formatWib(
          entry.created_at
        )}`
      : ""}
  </span>

  {entry.writer_location && (
    <span>
      📍 {entry.writer_location}
    </span>
  )}

  {entry.updated_at &&
    entry.created_at &&
    new Date(
      entry.updated_at
    ).getTime() >
      new Date(
        entry.created_at
      ).getTime() +
        1000 && (
      <span>
        Diperbarui{" "}
        {formatWib(
          entry.updated_at
        )}
      </span>
    )}
</div>

      {entry.excerpt && (
        <p className="folder-entry-excerpt">
          {entry.excerpt}
        </p>
      )}

      {entry.body && (
        <div
          className="folder-entry-body jp-rich-render"
          dangerouslySetInnerHTML={{
            __html: entry.body,
          }}
        />
      )}

      {/* ==============================
          LAMPIRAN VIEW-ONLY
          IMAGE / PDF / VIDEO
         ============================== */}

      {entry.has_attachment && (
        <section
          className="material-attachment"
          aria-label="Materi lampiran"
        >
          <div className="material-attachment-head">
            <div className="material-info">
              <span className="material-kicker">
                materi lampiran
              </span>

              <strong>
                {entry.attachment_name ?? "Materi"}
              </strong>

              {entry.attachment_size ? (
                <small>
                  {formatBytes(entry.attachment_size)}
                </small>
              ) : null}
            </div>
          </div>

          {!entry.attachment_url ? (
            <div className="material-unavailable">
              materi belum dapat dibuka
            </div>
          ) : isImage ? (
            <SecureImageCanvas
              url={entry.attachment_url}
              title={entry.attachment_name ?? "Materi gambar"}
            />
          ) : isPdf ? (
            <SecurePdfCanvas
              url={entry.attachment_url}
            />
          ) : isVideo ? (
            <div className="material-preview material-video-wrap">
              <video
                src={entry.attachment_url}
                className="material-video"
                controls
                playsInline
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                disableRemotePlayback
                preload="metadata"
                onContextMenu={(event) => event.preventDefault()}
                onDragStart={(event) => event.preventDefault()}
              >
                Browser tidak mendukung video.
              </video>
            </div>
          ) : (
            <div className="material-unavailable">
              format materi belum didukung
            </div>
          )}
        </section>
      )}

      {/* ==============================
          TABEL
         ============================== */}

      {headers.length > 0 && (
        <div className="public-content-table-wrap">
          <table className="public-content-table">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((header, columnIndex) => (
                    <td
                      key={columnIndex}
                      data-label={header}
                    >
                      {row?.[columnIndex] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==============================
          ADMIN
         ============================== */}

      {isAdmin && (
        <EntryInlineAdminActions
          entry={{
            id: entry.id,
            title: entry.title,
            slug: entry.slug,
            excerpt: entry.excerpt ?? "",
            body: entry.body ?? "",
            table_data: entry.table_data ?? null,
            attachment_path:
              entry.has_attachment ? "private" : null,
            attachment_name:
              entry.attachment_name ?? null,
            status: entry.status,
          }}
        />
      )}

      {/* ==============================
          RESPONSIVE PDF / IMAGE
         ============================== */}

      <style jsx>{`
        .material-attachment {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        .material-attachment-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .material-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .material-info strong {
          overflow-wrap: anywhere;
        }

        .material-preview {
          width: 100%;
          max-width: 100%;
          margin-top: 18px;
          box-sizing: border-box;
        }

        .material-image-wrap,
        .material-pdf-canvas-wrap,
        .material-video-wrap {
          overflow: hidden;
        }

        .material-image-canvas {
          display: block;
          width: 100%;
          height: auto;
          max-height: 760px;
          object-fit: contain;
          border-radius: 14px;
          background: white;
          pointer-events: none;
          -webkit-user-select: none;
          user-select: none;
        }

        .material-pdf-pages {
          display: grid;
          gap: 16px;
          width: 100%;
        }

        .material-pdf-pages :global(.material-pdf-page) {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 12px;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          pointer-events: none;
          -webkit-user-select: none;
          user-select: none;
        }

        .material-video {
          display: block;
          width: 100%;
          max-height: 720px;
          border-radius: 14px;
          background: #000;
        }

        .material-preview-state,
        .material-preview-error,
        .material-unavailable {
          padding: 18px 0;
          color: #77766e;
          font-size: 12px;
        }

        .material-preview-error {
          color: #985247;
        }

        @media print {
          .material-attachment,
          .material-attachment * {
            display: none !important;
            visibility: hidden !important;
          }
        }

        @media (max-width: 640px) {
          .material-preview {
            margin-top: 14px;
          }

          .material-image-canvas {
            max-height: none;
          }

          .material-pdf-pages {
            gap: 12px;
          }
        }

      `}</style>
    </article>
  );
}

export default function FolderEntryList({
  entries,
  isAdmin,
}: {
  entries: Entry[];
  isAdmin: boolean;
}) {
  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <p className="inner-lead">
        Folder ini belum memiliki tulisan.
      </p>
    );
  }

  if (entries.length === 1) {
    return (
      <EntryContent
        entry={entries[0]}
        isAdmin={isAdmin}
      />
    );
  }

  const selectedEntry = entries.find(
    (entry) => entry.id === selectedId
  );

  if (selectedEntry) {
    return (
      <div className="folder-entry-reader">
        <button
          type="button"
          className="entry-list-back"
          onClick={() => setSelectedId(null)}
        >
          ← kembali ke daftar tulisan
        </button>

        <EntryContent
          entry={selectedEntry}
          isAdmin={isAdmin}
        />
      </div>
    );
  }

  return (
    <section className="folder-entry-index">
      <div className="entry-index-heading">
        <p className="eyebrow">
          daftar tulisan
        </p>

        <h2>
          Pilih tulisan yang ingin dibaca.
        </h2>

        <p>
          {entries.length} tulisan tersedia di folder ini.
        </p>
      </div>

      <div className="entry-index-list">
        {entries.map((entry, index) => (
          <button
            key={entry.id}
            type="button"
            className="entry-index-item"
            onClick={() => setSelectedId(entry.id)}
          >
            <span className="entry-index-no">
              {String(index + 1).padStart(2, "0")}
            </span>

            <span className="entry-index-text">
              <strong>
                {entry.title}
              </strong>

              {entry.excerpt && (
                <small>
                  {entry.excerpt}
                </small>
              )}

              <span>
                {entry.author_name || "Penulis belum tercatat"}
                {entry.created_at ? ` · ${formatWib(entry.created_at)}` : ""}
              </span>
            </span>

            <span
              className="entry-index-arrow"
              aria-hidden="true"
            >
              →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}