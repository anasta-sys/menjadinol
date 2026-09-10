export function Footer() {
  return (
    <footer className="site-footer mn-footer">
      <div className="mn-footer-inner">
        <div className="mn-footer-brand">
          <div className="mn-footer-lotus" aria-hidden="true">
            <img src="/jalan-pulang-symbol.png" alt="" />
          </div>
          <div>
            <div className="mn-footer-title">MENJADI NOL</div>
            <div className="mn-footer-tagline">Perjalanan pulang dalam diri</div>
          </div>
        </div>

        <div className="mn-footer-center">
          <div className="mn-footer-leaf" aria-hidden="true">❧</div>
          <p className="mn-footer-sentence">
            Ruang untuk berjeda, menyelami rasa, memahami makna, dan kembali pada diri.
          </p>
          <div className="mn-footer-meta">
            <span>Spiritual Journey by Anasta</span>
            <span className="dot">•</span>
            <span>Privacy-first</span>
            <span className="dot">•</span>
            <span>no third-party trackers</span>
            <span className="dot">•</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>

        <div className="mn-footer-social" aria-label="Social links">
          <a href="#" aria-label="Instagram">◎</a>
          <a href="#" aria-label="YouTube">▶</a>
          <a href="mailto:" aria-label="Email">✉</a>
        </div>
      </div>

      <style>{`
        .mn-footer {
          position: relative;
          width: 100%;
          margin-top: 28px;
          padding: 26px 28px 30px;
          box-sizing: border-box;
          overflow: hidden;
          background:
            radial-gradient(circle at 12% 100%, rgba(187, 211, 180, .42), transparent 28%),
            radial-gradient(circle at 88% 100%, rgba(207, 224, 198, .5), transparent 30%),
            linear-gradient(180deg, rgba(255,255,255,.94) 0%, rgba(249,247,239,.98) 58%, rgba(237,244,232,.98) 100%);
          border-top: 1px solid rgba(28, 80, 53, .08);
        }

        .mn-footer::before,
        .mn-footer::after {
          content: "";
          position: absolute;
          bottom: -56px;
          width: 55%;
          height: 120px;
          border-radius: 50%;
          background: rgba(196, 217, 190, .33);
          filter: blur(.1px);
          pointer-events: none;
        }

        .mn-footer::before { left: -9%; transform: rotate(3deg); }
        .mn-footer::after { right: -12%; transform: rotate(-4deg); background: rgba(220, 232, 211, .52); }

        .mn-footer-inner {
          position: relative;
          z-index: 2;
          width: min(1320px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(220px, 1fr) minmax(320px, 1.8fr) minmax(160px, .7fr);
          align-items: center;
          gap: 28px;
        }

        .mn-footer-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .mn-footer-lotus {
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          display: grid;
          place-items: center;
        }

        .mn-footer-lotus img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .mn-footer-title {
          color: #123d2b;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 18px;
          line-height: 1.1;
          letter-spacing: .22em;
          white-space: nowrap;
        }

        .mn-footer-tagline {
          margin-top: 4px;
          color: #536a5b;
          font-size: 11px;
          letter-spacing: .08em;
          white-space: nowrap;
        }

        .mn-footer-center {
          text-align: center;
          min-width: 0;
        }

        .mn-footer-leaf {
          color: #1d6842;
          font-size: 25px;
          line-height: 1;
          margin-bottom: 8px;
        }

        .mn-footer-sentence {
          margin: 0;
          color: #31483b;
          font-size: 13px;
          line-height: 1.6;
        }

        .mn-footer-meta {
          margin-top: 7px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #5e6d63;
          font-size: 11px;
          line-height: 1.45;
        }

        .mn-footer-meta .dot { color: #1d6842; }

        .mn-footer-social {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 16px;
        }

        .mn-footer-social a {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #174f35;
          text-decoration: none;
          font-size: 18px;
          transition: transform .18s ease, background .18s ease;
        }

        .mn-footer-social a:hover {
          transform: translateY(-2px);
          background: rgba(24, 96, 58, .08);
        }

        @media (max-width: 900px) {
          .mn-footer-inner {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 18px;
          }

          .mn-footer-brand,
          .mn-footer-social {
            justify-content: center;
          }
        }

        @media (max-width: 560px) {
          .mn-footer { padding: 22px 16px 26px; }
          .mn-footer-title { font-size: 16px; letter-spacing: .18em; }
          .mn-footer-tagline { white-space: normal; }
          .mn-footer-sentence { font-size: 12px; }
          .mn-footer-meta { font-size: 10px; gap: 6px; }
        }
      `}</style>
    </footer>
  );
}
