"use client";

import { useEffect, useRef, useState } from "react";

function SecureRichPdf({ path, name }: { path: string; name?: string }) {
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let pdfDocument: any = null;
    const controller = new AbortController();

    async function renderPdf() {
      const pages = pagesRef.current;
      if (!pages) return;
      pages.innerHTML = "";
      setError("");
      setLoading(true);

      try {
        const response = await fetch(
          `/api/reader/content-pdf?path=${encodeURIComponent(path)}`,
          { credentials: "same-origin", cache: "no-store", signal: controller.signal }
        );

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.error || "PDF tidak dapat dibuka.");
        }

        const bytes = await response.arrayBuffer();
        if (!active) return;

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        pdfDocument = await pdfjs.getDocument({ data: bytes }).promise;

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          if (!active) return;

          const page = await pdfDocument.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.6 });
          const canvas = document.createElement("canvas");

          canvas.className = "material-pdf-page";
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.style.display = "block";
          canvas.style.maxWidth = "none";

          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas PDF tidak tersedia.");

          pages.appendChild(canvas);
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("SecureRichPdf:", err);
        if (active) setError(err instanceof Error ? err.message : "PDF tidak dapat ditampilkan.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void renderPdf();

    return () => {
      active = false;
      controller.abort();
      try { pdfDocument?.destroy?.(); } catch {}
    };
  }, [path]);

  return (
    <section
      className="jp-secure-pdf-viewer"
      aria-label={name || "Dokumen PDF"}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      {name && <div className="jp-secure-pdf-name">📄 {name}</div>}
      {loading && <div className="material-preview-state">Memuat PDF...</div>}
      {error && <div className="material-preview-state">{error}</div>}
      <div
        ref={pagesRef}
        className="jp-secure-pdf-pages"
        style={{ overflowX: "auto", width: "100%" }}
      />
    </section>
  );
}

type Piece =
  | { type: "html"; html: string }
  | { type: "pdf"; path: string; name: string };

function decodeAttr(value: string) {
  if (typeof document === "undefined") return value;
  const el = document.createElement("textarea");
  el.innerHTML = value;
  return el.value;
}

function splitSecurePdf(html: string): Piece[] {
  const pattern =
    /<div\s+class=(?:"|')jp-secure-pdf(?:"|')[^>]*data-path=(?:"|')([^"']+)(?:"|')[^>]*?(?:data-name=(?:"|')([^"']*)(?:"|'))?[^>]*>\s*<\/div>/gi;

  const pieces: Piece[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    if (match.index > last) {
      pieces.push({ type: "html", html: html.slice(last, match.index) });
    }
    pieces.push({
      type: "pdf",
      path: decodeAttr(match[1] || ""),
      name: decodeAttr(match[2] || ""),
    });
    last = pattern.lastIndex;
  }

  if (last < html.length) pieces.push({ type: "html", html: html.slice(last) });
  return pieces;
}

export default function SecureRichTextBody({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  const pieces = splitSecurePdf(html || "");

  return (
    <div className={className}>
      {pieces.map((piece, index) =>
        piece.type === "pdf" ? (
          <SecureRichPdf key={`pdf-${index}-${piece.path}`} path={piece.path} name={piece.name} />
        ) : (
          <div
            key={`html-${index}`}
            className="jp-rich-secure-html"
            dangerouslySetInnerHTML={{ __html: piece.html }}
          />
        )
      )}
    </div>
  );
}
