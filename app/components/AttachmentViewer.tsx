"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type AttachmentViewerProps = {
  filePath: string;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
};

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function normalizeStoragePath(value: string) {
  let path = String(value ?? "").trim();

  if (!path) return "";

  path = path.split("?")[0].split("#")[0];

  try {
    const url = new URL(path);
    path = decodeURIComponent(url.pathname);

    const markers = [
      "/storage/v1/object/public/learning-materials/",
      "/storage/v1/object/sign/learning-materials/",
      "/storage/v1/object/authenticated/learning-materials/",
      "/storage/v1/object/learning-materials/",
    ];

    for (const marker of markers) {
      const index = path.indexOf(marker);

      if (index >= 0) {
        return path
          .slice(index + marker.length)
          .replace(/^\/+/, "");
      }
    }
  } catch {
    // Bukan URL penuh.
  }

  try {
    path = decodeURIComponent(path);
  } catch {}

  path = path.replace(/^\/+/, "");

  if (path.startsWith("learning-materials/")) {
    path = path.slice("learning-materials/".length);
  }

  return path;
}

function ImageCanvasViewer({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const image = new Image();

    image.onload = () => {
      if (!active || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) {
        setError("Gambar tidak dapat ditampilkan.");
        return;
      }

      const availableWidth = Math.max(
        1,
        wrapRef.current?.clientWidth || window.innerWidth
      );
      const cssWidth = Math.min(image.naturalWidth, availableWidth);
      const cssHeight =
        (image.naturalHeight / image.naturalWidth) * cssWidth;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
      canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, cssWidth, cssHeight);
      context.drawImage(image, 0, 0, cssWidth, cssHeight);
    };

    image.onerror = () => {
      if (active) {
        setError("Gambar tidak dapat ditampilkan.");
      }
    };

    image.src = src;

    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  if (error) {
    return (
      <div className="secure-attachment-error">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="secure-canvas-wrap"
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      onDragStart={(event) => {
        event.preventDefault();
      }}
    >
      <canvas
        ref={canvasRef}
        className="secure-image-canvas"
        role="img"
        aria-label={title}
      />
    </div>
  );
}

function PdfCanvasViewer({
  src,
}: {
  src: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let pdfDocument: any = null;

    async function renderPdf() {
      setRendering(true);
      setError("");

      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";

      try {
        const pdfjs = await import("pdfjs-dist");

        pdfjs.GlobalWorkerOptions.workerSrc =
          "/pdf.worker.min.mjs";

        pdfDocument = await pdfjs.getDocument({
          url: src,
        }).promise;

        for (
          let pageNumber = 1;
          pageNumber <= pdfDocument.numPages;
          pageNumber += 1
        ) {
          if (cancelled) return;

          const page =
            await pdfDocument.getPage(pageNumber);

          const baseViewport =
            page.getViewport({
              scale: 1,
            });

          const availableWidth =
            Math.max(
              1,
              container.clientWidth || window.innerWidth
            );

          const cssScale =
            Math.min(
              1.6,
              availableWidth /
                baseViewport.width
            );

          const pixelRatio =
            Math.min(
              window.devicePixelRatio || 1,
              2
            );

          const viewport =
            page.getViewport({
              scale:
                cssScale *
                pixelRatio,
            });

          const canvas =
            document.createElement("canvas");

          canvas.className =
            "secure-pdf-page";

          canvas.width =
            Math.ceil(viewport.width);

          canvas.height =
            Math.ceil(viewport.height);

          canvas.style.width =
            `${Math.floor(
              baseViewport.width *
                cssScale
            )}px`;

          canvas.style.height =
            "auto";

          canvas.style.maxWidth =
            "100%";

          const context =
            canvas.getContext("2d");

          if (!context) {
            throw new Error(
              "Canvas PDF tidak tersedia."
            );
          }

          container.appendChild(canvas);

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;
        }
      } catch (err) {
        console.error(
          "PdfCanvasViewer:",
          err
        );

        if (!cancelled) {
          setError(
            "PDF tidak dapat ditampilkan."
          );
        }
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    }

    renderPdf();

    return () => {
      cancelled = true;

      try {
        pdfDocument?.destroy?.();
      } catch {}
    };
  }, [src]);

  return (
    <div
      className="secure-pdf-canvas-shell"
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      onDragStart={(event) => {
        event.preventDefault();
      }}
    >
      {rendering && (
        <div className="secure-attachment-state">
          Membuka PDF...
        </div>
      )}

      {error && (
        <div className="secure-attachment-error">
          {error}
        </div>
      )}

      <div
        ref={containerRef}
        className="secure-pdf-pages"
      />
    </div>
  );
}

export default function AttachmentViewer({
  filePath,
  fileName,
  fileType,
  fileSize,
}: AttachmentViewerProps) {
  const [fileUrl, setFileUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizedPath = useMemo(
    () => normalizeStoragePath(filePath),
    [filePath]
  );

  const displayName = useMemo(() => {
    if (fileName?.trim()) {
      return fileName.trim();
    }

    return (
      normalizedPath.split("/").pop() ||
      "Lampiran"
    );
  }, [fileName, normalizedPath]);

  const extension = getExtension(displayName);

  const isImage =
    Boolean(fileType?.startsWith("image/")) ||
    [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
      "avif",
    ].includes(extension);

  const isPdf =
    fileType === "application/pdf" ||
    extension === "pdf";

  const isVideo =
    Boolean(fileType?.startsWith("video/")) ||
    [
      "mp4",
      "webm",
      "mov",
      "m4v",
    ].includes(extension);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    const controller =
      new AbortController();

    async function loadAttachment() {
      setLoading(true);
      setError("");
      setFileUrl("");

      if (!normalizedPath) {
        setError(
          "Path lampiran tidak valid."
        );
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/material/view?path=${encodeURIComponent(
            normalizedPath
          )}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const result =
            await response
              .json()
              .catch(() => null);

          throw new Error(
            result?.error ||
              "Lampiran tidak dapat dibuka."
          );
        }

        const blob =
          await response.blob();

        if (!active) return;

        objectUrl =
          URL.createObjectURL(blob);

        setFileUrl(objectUrl);
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "AttachmentViewer:",
          err
        );

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Lampiran tidak dapat dibuka."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAttachment();

    return () => {
      active = false;
      controller.abort();

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [normalizedPath]);

  if (!filePath) {
    return null;
  }

  return (
    <div
      className="secure-attachment"
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      onDragStart={(event) => {
        event.preventDefault();
      }}
    >
      <div className="secure-attachment-header">
        <div className="secure-attachment-info">
          <p className="secure-attachment-label">
            Lampiran
          </p>

          <p className="secure-attachment-name">
            {displayName}
          </p>

          {fileSize ? (
            <span className="secure-attachment-size">
              {formatFileSize(fileSize)}
            </span>
          ) : null}
        </div>
      </div>

      {loading && (
        <div className="secure-attachment-state">
          Membuka lampiran...
        </div>
      )}

      {!loading && error && (
        <div className="secure-attachment-error">
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        fileUrl &&
        isImage && (
          <ImageCanvasViewer
            src={fileUrl}
            title={displayName}
          />
        )}

      {!loading &&
        !error &&
        fileUrl &&
        isPdf && (
          <PdfCanvasViewer
            src={fileUrl}
          />
        )}

      {!loading &&
        !error &&
        fileUrl &&
        isVideo && (
          <div className="secure-video-wrap">
            <video
              src={fileUrl}
              className="secure-video"
              controls
              playsInline
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              disableRemotePlayback
              preload="metadata"
              onContextMenu={(event) => {
                event.preventDefault();
              }}
              onDragStart={(event) => {
                event.preventDefault();
              }}
            >
              Browser tidak mendukung video.
            </video>
          </div>
        )}

      {!loading &&
        !error &&
        fileUrl &&
        !isImage &&
        !isPdf &&
        !isVideo && (
          <div className="secure-attachment-state">
            Format lampiran tidak didukung.
          </div>
        )}

      <style jsx>{`
        .secure-attachment {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          margin-top: 24px;
          border: 1px solid #deddd5;
          border-radius: 20px;
          overflow: hidden;
          background: #fbfaf5;
          box-sizing: border-box;
          -webkit-user-select: none;
          user-select: none;
        }

        .secure-attachment-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 20px;
        }

        .secure-attachment-info {
          min-width: 0;
        }

        .secure-attachment-label {
          margin: 0 0 5px;
          color: #768361;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .secure-attachment-name {
          margin: 0;
          color: #063f35;
          font-size: 15px;
          font-weight: 700;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .secure-attachment-size {
          display: block;
          margin-top: 4px;
          color: #77766e;
          font-size: 11px;
        }

        .secure-attachment-state,
        .secure-attachment-error {
          padding: 20px;
          color: #666;
          font-size: 14px;
        }

        .secure-attachment-error {
          color: #8b3a35;
        }

        .secure-canvas-wrap,
        .secure-pdf-canvas-shell {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          padding: 0 18px 18px;
          box-sizing: border-box;
          overflow: hidden;
        }

        .secure-image-canvas {
          display: block;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          height: auto;
          max-height: 720px;
          object-fit: contain;
          border-radius: 14px;
          background: white;
          pointer-events: none;
        }

        .secure-pdf-pages {
          display: grid;
          gap: 16px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
        }

        .secure-pdf-pages :global(.secure-pdf-page) {
          display: block;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0;
          height: auto !important;
          border-radius: 12px;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          pointer-events: none;
        }

        .secure-video-wrap {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          padding: 0 18px 18px;
          box-sizing: border-box;
          overflow: hidden;
        }

        .secure-video {
          display: block;
          width: 100%;
          max-height: 720px;
          border-radius: 14px;
          background: #000;
          -webkit-user-select: none;
          user-select: none;
        }

        @media print {
          .secure-attachment,
          .secure-attachment * {
            display: none !important;
            visibility: hidden !important;
          }
        }

        @media (max-width: 768px) {
          .secure-attachment {
            width: calc(100vw - 32px);
            max-width: calc(100vw - 32px);
            min-width: 0;
            box-sizing: border-box;
            margin-left: auto;
            margin-right: auto;
            border-radius: 16px;
            overflow: hidden;
          }

          .secure-attachment-header {
            min-width: 0;
            padding: 15px;
          }

          .secure-canvas-wrap,
          .secure-pdf-canvas-shell,
          .secure-video-wrap {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            padding: 0 10px 10px;
            overflow: hidden;
          }

          .secure-image-canvas,
          .secure-video,
          .secure-pdf-pages,
          .secure-pdf-pages :global(.secure-pdf-page) {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0;
            height: auto !important;
          }

          .secure-pdf-pages {
            gap: 10px;
          }
        }

        @media (max-width: 420px) {
          .secure-attachment {
            width: calc(100vw - 20px);
            max-width: calc(100vw - 20px);
          }

          .secure-canvas-wrap,
          .secure-pdf-canvas-shell,
          .secure-video-wrap {
            padding: 0 8px 8px;
          }

          .secure-attachment-header {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
}
