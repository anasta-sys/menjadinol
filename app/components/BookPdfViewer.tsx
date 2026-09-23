"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
} from "react";

import HTMLFlipBook from "react-pageflip";

type BookPdfViewerProps = {
  src?: string;
  data?: ArrayBuffer | Uint8Array;
  title?: string;
};

type PdfPage = {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
};

const BookPage = forwardRef<
  HTMLDivElement,
  {
    page: PdfPage;
    title: string;
  }
>(function BookPage({ page, title }, ref) {
  return (
    <div ref={ref} className="mn-book-page">
      <div className="mn-book-paper">
        <img
          src={page.imageUrl}
          alt={`${title} — halaman ${page.pageNumber}`}
          draggable={false}
        />

        <span className="mn-book-page-number">
          {page.pageNumber}
        </span>
      </div>
    </div>
  );
});

export default function BookPdfViewer({
  src,
  data,
  title = "Dokumen",
}: BookPdfViewerProps) {
  const flipBookRef = useRef<any>(null);

  const [pages, setPages] = useState<PdfPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreen();

    window.addEventListener("resize", checkScreen);

    return () => {
      window.removeEventListener("resize", checkScreen);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let pdfDocument: any = null;
    const objectUrls: string[] = [];

    async function loadPdf() {
      setLoading(true);
      setError("");
      setPages([]);
      setCurrentPage(0);

      try {
        const pdfjs = await import("pdfjs-dist");

        pdfjs.GlobalWorkerOptions.workerSrc =
          "/pdf.worker.min.mjs";

        let source: any;

        if (data) {
          const copied =
            data instanceof Uint8Array
              ? new Uint8Array(data)
              : new Uint8Array(data.slice(0));

          source = { data: copied };
        } else if (src) {
          source = { url: src };
        } else {
          throw new Error("Sumber PDF tidak tersedia.");
        }

        pdfDocument =
          await pdfjs.getDocument(source).promise;

        const renderedPages: PdfPage[] = [];

        for (
          let pageNumber = 1;
          pageNumber <= pdfDocument.numPages;
          pageNumber += 1
        ) {
          if (!active) return;

          const page =
            await pdfDocument.getPage(pageNumber);

          const viewport =
            page.getViewport({ scale: 1.55 });

          const canvas =
            document.createElement("canvas");

          const context =
            canvas.getContext("2d");

          if (!context) {
            throw new Error(
              "Canvas PDF tidak tersedia."
            );
          }

          canvas.width =
            Math.ceil(viewport.width);

          canvas.height =
            Math.ceil(viewport.height);

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;

          const blob =
            await new Promise<Blob | null>(
              (resolve) =>
                canvas.toBlob(
                  resolve,
                  "image/webp",
                  0.92
                )
            );

          if (!blob) {
            throw new Error(
              `Halaman ${pageNumber} gagal dirender.`
            );
          }

          const imageUrl =
            URL.createObjectURL(blob);

          objectUrls.push(imageUrl);

          renderedPages.push({
            pageNumber,
            imageUrl,
            width: viewport.width,
            height: viewport.height,
          });

          page.cleanup?.();
        }

        if (active) {
          setPages(renderedPages);
        }
      } catch (err) {
        console.error("BookPdfViewer:", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "PDF tidak dapat ditampilkan."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPdf();

    return () => {
      active = false;

      try {
        pdfDocument?.destroy?.();
      } catch {}

      objectUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [src, data]);

  function previousPage() {
    flipBookRef.current
      ?.pageFlip()
      ?.flipPrev();
  }

  function nextPage() {
    flipBookRef.current
      ?.pageFlip()
      ?.flipNext();
  }

  function zoomOut() {
    setZoom((value) =>
      Math.max(0.75, value - 0.1)
    );
  }

  function zoomIn() {
    setZoom((value) =>
      Math.min(1.5, value + 0.1)
    );
  }

  if (loading) {
    return (
      <div className="mn-book-state">
        Membuka buku...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mn-book-error">
        {error}
      </div>
    );
  }

  if (!pages.length) {
    return (
      <div className="mn-book-error">
        PDF tidak memiliki halaman.
      </div>
    );
  }

  return (
    <section
      className="mn-book-root"
      aria-label={`Buku PDF: ${title}`}
      onContextMenu={(event) =>
        event.preventDefault()
      }
    >
      <div style={{textAlign:"center",fontWeight:700,padding:"8px",background:"#eef2e6"}}>📖 MODE BUKU AKTIF</div><div className="mn-book-toolbar">
        <button
          type="button"
          onClick={previousPage}
          aria-label="Halaman sebelumnya"
        >
          ←
        </button>

        <span className="mn-book-counter">
          {Math.min(
            currentPage + 1,
            pages.length
          )} / {pages.length}
        </span>

        <button
          type="button"
          onClick={nextPage}
          aria-label="Halaman berikutnya"
        >
          →
        </button>

        <span className="mn-book-divider" />

        <button
          type="button"
          onClick={zoomOut}
          aria-label="Perkecil"
        >
          −
        </button>

        <span className="mn-book-zoom">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={zoomIn}
          aria-label="Perbesar"
        >
          +
        </button>
      </div>

      <div className="mn-book-viewport">
        <div
          className="mn-book-scale"
          style={{
            transform: `scale(${zoom})`,
          }}
        >
          <HTMLFlipBook
            ref={flipBookRef}
            width={isMobile ? 330 : 470}
            height={isMobile ? 467 : 665}
            size="stretch"
            minWidth={280}
            maxWidth={520}
            minHeight={396}
            maxHeight={735}
            showCover={false}
            mobileScrollSupport={true}
            usePortrait={isMobile}
            drawShadow={true}
            flippingTime={700}
            maxShadowOpacity={0.22}
            showPageCorners={true}
            disableFlipByClick={false}
            clickEventForward={true}
            useMouseEvents={true}
            swipeDistance={20}
            startPage={0}
            startZIndex={0}
            autoSize={true}
            style={{}}
            className="mn-flipbook"
            onFlip={(event: any) => {
              setCurrentPage(
                Number(event?.data ?? 0)
              );
            }}
          >
            {pages.map((page) => (
              <BookPage
                key={page.pageNumber}
                page={page}
                title={title}
              />
            ))}
          </HTMLFlipBook>
        </div>
      </div>

      <p className="mn-book-help">
        {isMobile
          ? "Geser halaman ke kanan atau kiri."
          : "Klik atau tarik sudut halaman untuk membalik buku."}
      </p>

      <style jsx>{`
        .mn-book-root {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          padding: 18px;
          box-sizing: border-box;
          border: 1px solid #deddd5;
          border-radius: 20px;
          background:
            linear-gradient(
              180deg,
              #f7f4e9 0%,
              #efecdf 100%
            );
          overflow: hidden;
          user-select: none;
        }

        .mn-book-toolbar {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 18px;
        }

        .mn-book-toolbar button {
          width: 38px;
          height: 38px;
          border: 1px solid #c9cdbb;
          border-radius: 999px;
          background: #fffdf7;
          color: #234b40;
          font-size: 19px;
          cursor: pointer;
        }

        .mn-book-toolbar button:hover {
          background: #e8ebdc;
        }

        .mn-book-counter,
        .mn-book-zoom {
          min-width: 62px;
          text-align: center;
          color: #536057;
          font-size: 12px;
          font-weight: 700;
        }

        .mn-book-divider {
          width: 1px;
          height: 24px;
          margin: 0 4px;
          background: #d4d5ca;
        }

        .mn-book-viewport {
          width: 100%;
          min-width: 0;
          overflow: auto;
          padding: 10px 0 20px;
          box-sizing: border-box;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
        }

        .mn-book-scale {
          width: max-content;
          min-width: 100%;
          display: flex;
          justify-content: center;
          transform-origin: top center;
          transition: transform 160ms ease;
        }

        .mn-book-help {
          margin: 10px 0 0;
          text-align: center;
          color: #7a7c72;
          font-size: 11px;
        }

        :global(.mn-flipbook) {
          margin: 0 auto;
        }

        :global(.mn-book-page) {
          background: #fffef9;
          overflow: hidden;
        }

        :global(.mn-book-paper) {
          position: relative;
          width: 100%;
          height: 100%;
          background: white;
          overflow: hidden;
          box-shadow:
            inset 0 0 0 1px
            rgba(0, 0, 0, 0.04);
        }

        :global(.mn-book-paper img) {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
        }

        :global(.mn-book-page-number) {
          position: absolute;
          right: 12px;
          bottom: 8px;
          padding: 3px 7px;
          border-radius: 999px;
          background:
            rgba(255, 255, 255, 0.82);
          color: #697069;
          font-size: 9px;
          line-height: 1;
        }

        .mn-book-state,
        .mn-book-error {
          width: 100%;
          padding: 24px;
          box-sizing: border-box;
          text-align: center;
          font-size: 14px;
        }

        .mn-book-error {
          color: #8b3a35;
        }

        @media (max-width: 767px) {
          .mn-book-root {
            width: 100%;
            padding: 10px;
            border-radius: 16px;
          }

          .mn-book-toolbar {
            margin-bottom: 10px;
          }

          .mn-book-viewport {
            overflow-x: auto;
            padding-bottom: 14px;
          }

          .mn-book-scale {
            justify-content: flex-start;
          }
        }

        @media print {
          .mn-book-root {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}
