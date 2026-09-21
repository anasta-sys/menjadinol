"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  kind: "image" | "pdf";
  alt?: string;
  className?: string;
};

/**
 * Isolated viewer for wide images/PDFs.
 * It owns its viewport, so wide document content cannot widen the page/card.
 */
export default function ScrollableDocumentViewer({
  src,
  kind,
  alt = "Dokumen",
  className = "",
}: Props) {
  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfPagesRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(kind === "pdf");

  useEffect(() => {
    let cancelled = false;

    async function drawImage() {
      const canvas = imageCanvasRef.current;
      if (!canvas) return;

      const image = new Image();
      image.crossOrigin = "anonymous";

      image.onload = () => {
        if (cancelled) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        ctx.drawImage(image, 0, 0);
      };

      image.onerror = () => {
        if (!cancelled) setError("Gambar tidak dapat ditampilkan.");
      };

      image.src = src;
    }

    async function drawPdf() {
      const host = pdfPagesRef.current;
      if (!host) return;

      try {
        setLoading(true);
        setError("");
        host.innerHTML = "";

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs";

        const task = pdfjs.getDocument({ url: src });
        const pdf = await task.promise;

        for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNo);
          const viewport = page.getViewport({ scale: 1.6 });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) continue;

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.className = "sdv-pdf-page";

          host.appendChild(canvas);

          await page.render({
            canvas,
            canvasContext: ctx,
            viewport,
          }).promise;
        }
      } catch (err) {
        console.error("PDF viewer error:", err);
        if (!cancelled) setError("PDF tidak dapat ditampilkan.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (kind === "image") void drawImage();
    else void drawPdf();

    return () => {
      cancelled = true;
    };
  }, [src, kind]);

  return (
    <div className={`sdv-root ${className}`}>
      <div
        className="sdv-viewport"
        aria-label={kind === "pdf" ? "PDF viewer" : "Image viewer"}
      >
        {kind === "image" ? (
          <canvas
            ref={imageCanvasRef}
            className="sdv-image"
            aria-label={alt}
            onContextMenu={(event) => event.preventDefault()}
          />
        ) : (
          <>
            {loading && <div className="sdv-status">Memuat PDF…</div>}
            <div
              ref={pdfPagesRef}
              className="sdv-pdf-pages"
              onContextMenu={(event) => event.preventDefault()}
            />
          </>
        )}
      </div>

      {error && <div className="sdv-error">{error}</div>}

      <style jsx>{`
        .sdv-root {
          display: block;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          contain: layout;
        }

        .sdv-viewport {
          display: block;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
          touch-action: pan-x pan-y;
          scrollbar-gutter: stable;
        }

        .sdv-image {
          display: block;
          width: auto;
          min-width: 100%;
          max-width: none;
          height: auto;
        }

        .sdv-pdf-pages {
          display: grid;
          gap: 14px;
          width: max-content;
          min-width: 100%;
        }

        .sdv-pdf-pages :global(.sdv-pdf-page) {
          display: block;
          width: auto;
          max-width: none;
          height: auto;
          background: white;
        }

        .sdv-status,
        .sdv-error {
          padding: 12px 14px;
          font-size: 14px;
        }

        .sdv-error {
          color: #9b554d;
        }

        /*
         * On small screens the document gets its own readable canvas width.
         * The OUTER viewport remains 100%, therefore horizontal overflow
         * exists inside this component rather than on the whole page.
         */
        @media (max-width: 899px) {
          .sdv-image {
            width: 900px;
            min-width: 900px;
          }

          .sdv-pdf-pages,
          .sdv-pdf-pages :global(.sdv-pdf-page) {
            width: 900px;
            min-width: 900px;
          }
        }

        @media (min-width: 900px) {
          .sdv-image {
            max-width: 100%;
          }

          .sdv-pdf-pages {
            width: 100%;
          }

          .sdv-pdf-pages :global(.sdv-pdf-page) {
            max-width: 100%;
          }
        }

        @media print {
          .sdv-viewport {
            overflow: visible;
          }
        }
      `}</style>
    </div>
  );
}
