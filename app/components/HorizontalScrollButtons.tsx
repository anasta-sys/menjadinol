"use client";

type Props = {
  target: "media" | "table";
};

export default function HorizontalScrollButtons({ target }: Props) {
  function move(event: React.MouseEvent<HTMLButtonElement>, direction: -1 | 1) {
    const article = event.currentTarget.closest(".folder-entry-card");
    if (!article) return;

    const selector =
      target === "media"
        ? ".material-image-wrap, .material-pdf-canvas-wrap"
        : ".public-content-table-wrap";

    const scroller = article.querySelector<HTMLElement>(selector);
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * Math.max(280, scroller.clientWidth * 0.75),
      behavior: "smooth",
    });
  }

  return (
    <div className="hscroll-buttons" aria-label="Geser kanan kiri">
      <button type="button" onClick={(e) => move(e, -1)} aria-label="Geser ke kiri">
        ←
      </button>
      <span>geser</span>
      <button type="button" onClick={(e) => move(e, 1)} aria-label="Geser ke kanan">
        →
      </button>

      <style jsx>{`
        .hscroll-buttons {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          width: 100%;
          margin: 10px 0 6px;
          font-size: 11px;
          color: #6d746d;
        }

        button {
          width: 38px;
          height: 34px;
          border: 1px solid rgba(34, 74, 55, 0.22);
          border-radius: 999px;
          background: #fff;
          color: #234a37;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
        }

        button:active {
          transform: translateY(1px);
        }
      `}</style>
    </div>
  );
}
