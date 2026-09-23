"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import HTMLFlipBook from "react-pageflip";

type BookPdfViewerProps = {
  src?: string;
  data?: ArrayBuffer | Uint8Array;
  title?: string;
  tableData?: { headers: string[]; rows: string[][] } | null;
};

type PdfPage = {
  pageNumber: number;
  imageUrl: string;
};

const BookPage = forwardRef<
  HTMLDivElement,
  { page: PdfPage; title: string }
>(function BookPage({ page, title }, ref) {
  return (
    <div ref={ref} className="mn-book-page">
      <div className="mn-book-paper">
        <img
          src={page.imageUrl}
          alt={`${title} - halaman ${page.pageNumber}`}
          draggable={false}
        />
        <span className="mn-book-page-number">{page.pageNumber}</span>
      </div>
    </div>
  );
});

const TableBookPage = forwardRef<
  HTMLDivElement,
  { headers: string[]; rows: string[][]; pageNumber: number }
>(function TableBookPage({ headers, rows, pageNumber }, ref) {
  return (
    <div ref={ref} className="mn-book-page">
      <div className="mn-book-paper mn-book-table-paper">
        <div className="mn-book-table-scroll">
          <table className="mn-book-table">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((_, columnIndex) => (
                    <td key={columnIndex}>{row?.[columnIndex] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span className="mn-book-page-number">{pageNumber}</span>
      </div>
    </div>
  );
});

export default function BookPdfViewer({
  src,
  data,
  title = "Dokumen",
  tableData = null,
}: BookPdfViewerProps) {
  const flipBookRef = useRef<any>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const [pages, setPages] = useState<PdfPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [renderDone, setRenderDone] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth < 768);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  useEffect(() => {
    let active = true;
    let pdfDocument: any = null;

    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];

    async function loadPdf() {
      setLoading(true);
      setRenderDone(false);
      setError("");
      setPages([]);
      setCurrentPage(0);

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        let bytes: Uint8Array;

        if (data) {
          bytes =
            data instanceof Uint8Array
              ? new Uint8Array(data)
              : new Uint8Array(data.slice(0));
        } else if (src) {
          const response = await fetch(src, {
            credentials: "include",
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error(`PDF gagal dimuat (${response.status}).`);
          }

          const buffer = await response.arrayBuffer();
          bytes = new Uint8Array(buffer);
        } else {
          throw new Error("Sumber PDF tidak tersedia.");
        }

        if (!active) return;

        pdfDocument = await pdfjs.getDocument({
          data: bytes,
          useWorkerFetch: false,
          isEvalSupported: false,
        }).promise;

        if (!active) return;

        for (
          let pageNumber = 1;
          pageNumber <= pdfDocument.numPages;
          pageNumber += 1
        ) {
          if (!active) return;

          const page = await pdfDocument.getPage(pageNumber);
          const viewport = page.getViewport({
            scale: isMobile ? 1.2 : 1.45,
          });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Canvas PDF tidak tersedia.");
          }

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;

          if (!active) return;

          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, "image/jpeg", 0.9);
          });

          if (!blob) {
            throw new Error(`Halaman ${pageNumber} gagal dirender.`);
          }

          const imageUrl = URL.createObjectURL(blob);
          objectUrlsRef.current.push(imageUrl);

          if (active) {
            setPages((previous) => [
              ...previous,
              { pageNumber, imageUrl },
            ]);
            setLoading(false);
          }

          page.cleanup?.();

          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 0);
          });
        }

        if (active) {
          setRenderDone(true);
          setLoading(false);
        }
      } catch (err) {
        console.error("BookPdfViewer:", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "PDF tidak dapat ditampilkan."
          );
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

      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, [src, data, isMobile]);

  const hasTablePage =
    Array.isArray(tableData?.headers) &&
    tableData.headers.length > 0;

  const totalPages = pages.length + (hasTablePage ? 1 : 0);

  const bookPages = useMemo(() => {
    const items: React.ReactElement[] = pages.map((page) => (
      <BookPage
        key={`pdf-${page.pageNumber}`}
        page={page}
        title={title}
      />
    ));

    if (hasTablePage && tableData) {
      items.push(
        <TableBookPage
          key="table-page"
          headers={tableData.headers}
          rows={Array.isArray(tableData.rows) ? tableData.rows : []}
          pageNumber={pages.length + 1}
        />
      );
    }

    return items;
  }, [pages, title, hasTablePage, tableData]);

  function previousPage() {
    flipBookRef.current?.pageFlip()?.flipPrev();
  }

  function nextPage() {
    flipBookRef.current?.pageFlip()?.flipNext();
  }

  function zoomOut() {
    setZoom((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))));
  }

  function zoomIn() {
    setZoom((value) => Math.min(1.5, Number((value + 0.1).toFixed(2))));
  }

  if (loading && !pages.length) {
    return <div className="mn-book-state">Membuka buku...</div>;
  }

  if (error && !pages.length) {
    return <div className="mn-book-error">{error}</div>;
  }

  if (!pages.length) {
    return <div className="mn-book-error">PDF tidak memiliki halaman.</div>;
  }

  return (
    <section
      className="mn-book-root"
      aria-label={`Buku PDF: ${title}`}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="mn-book-toolbar">
        <button
          type="button"
          onClick={previousPage}
          aria-label="Halaman sebelumnya"
        >
          &lt;
        </button>

        <span className="mn-book-counter">
          {Math.min(currentPage + 1, Math.max(totalPages, 1))} /{" "}
          {Math.max(totalPages, 1)}
        </span>

        <button
          type="button"
          onClick={nextPage}
          aria-label="Halaman berikutnya"
        >
          &gt;
        </button>

        <span className="mn-book-divider" />

        <button type="button" onClick={zoomOut} aria-label="Perkecil">
          -
        </button>

        <span className="mn-book-zoom">{Math.round(zoom * 100)}%</span>

        <button type="button" onClick={zoomIn} aria-label="Perbesar">
          +
        </button>
      </div>

      {!renderDone && (
        <p className="mn-book-progress">
          Menyiapkan halaman berikutnya...
        </p>
      )}

      <div className="mn-book-viewport">
        <div
          className="mn-book-scale"
          style={{ transform: `scale(${zoom})` }}
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
              setCurrentPage(Number(event?.data ?? 0));
            }}
          >
            {bookPages}
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
          background: linear-gradient(180deg, #f7f4e9 0%, #efecdf 100%);
          overflow: hidden;
          user-select: none;
        }

        .mn-book-toolbar {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
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

        .mn-book-progress {
          margin: 0 0 8px;
          text-align: center;
          color: #7a7c72;
          font-size: 11px;
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
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
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
          background: rgba(255, 255, 255, 0.82);
          color: #697069;
          font-size: 9px;
          line-height: 1;
        }

        :global(.mn-book-table-paper) {
          padding: 22px 18px 34px;
          box-sizing: border-box;
        }

        :global(.mn-book-table-scroll) {
          width: 100%;
          height: 100%;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }

        :global(.mn-book-table) {
          width: 100%;
          min-width: 520px;
          border-collapse: collapse;
          color: #38443d;
          font-size: 10px;
          line-height: 1.45;
        }

        :global(.mn-book-table th),
        :global(.mn-book-table td) {
          padding: 7px 8px;
          border: 1px solid #d9dccf;
          text-align: left;
          vertical-align: top;
        }

        :global(.mn-book-table th) {
          background: #edf0e4;
          color: #234b40;
          font-weight: 700;
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
            padding: 10px;
            border-radius: 16px;
          }

          .mn-book-toolbar {
            margin-bottom: 8px;
          }

          .mn-book-viewport {
            overflow-x: auto;
            padding-bottom: 14px;
          }

          .mn-book-scale {
            justify-content: flex-start;
          }

          :global(.mn-book-table) {
            min-width: 600px;
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
