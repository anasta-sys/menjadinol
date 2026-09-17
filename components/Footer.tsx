export function Footer() {
  return (
    <footer className="site-footer mn-footer">
      {/* DAUN KIRI */}
      <svg
        className="mn-footer-botanical mn-footer-botanical-left"
        viewBox="0 0 230 240"
        aria-hidden="true"
      >
        <path d="M18 235C43 165 74 93 129 22" />
        <path d="M45 173C20 150 16 123 24 93 50 111 61 137 45 173Z" />
        <path d="M65 132C40 104 42 75 55 49 79 71 86 101 65 132Z" />
        <path d="M90 94C71 64 78 37 95 16 113 43 111 71 90 94Z" />
        <path d="M55 187C85 173 108 177 127 194 98 207 75 203 55 187Z" />
        <path d="M78 145C105 131 129 134 149 149 124 164 99 161 78 145Z" />
        <path d="M101 102C128 90 151 95 168 111 140 122 118 119 101 102Z" />
      </svg>

      {/* DAUN KANAN */}
      <svg
        className="mn-footer-botanical mn-footer-botanical-right"
        viewBox="0 0 230 240"
        aria-hidden="true"
      >
        <path d="M18 235C43 165 74 93 129 22" />
        <path d="M45 173C20 150 16 123 24 93 50 111 61 137 45 173Z" />
        <path d="M65 132C40 104 42 75 55 49 79 71 86 101 65 132Z" />
        <path d="M90 94C71 64 78 37 95 16 113 43 111 71 90 94Z" />
        <path d="M55 187C85 173 108 177 127 194 98 207 75 203 55 187Z" />
        <path d="M78 145C105 131 129 134 149 149 124 164 99 161 78 145Z" />
        <path d="M101 102C128 90 151 95 168 111 140 122 118 119 101 102Z" />
      </svg>

      <div className="mn-footer-wave mn-footer-wave-one" />
      <div className="mn-footer-wave mn-footer-wave-two" />

      <div className="mn-footer-inner">
        {/* KIRI */}
        <div className="mn-footer-brand">
          <img
            src="/menjadi-nol-symbol-transparent.png"
            alt="Menjadi Nol"
            className="mn-footer-logo"
          />

          <div>
            <div className="mn-footer-title">MENJADI NOL</div>
            <div className="mn-footer-tagline">
              Perjalanan pulang dalam diri
            </div>
          </div>
        </div>

        {/* TENGAH */}
        <div className="mn-footer-center">
          <div className="mn-footer-leaf-row" aria-hidden="true">
            <span className="mn-footer-line" />

            <svg
              className="mn-footer-leaf"
              viewBox="0 0 64 48"
            >
              <path d="M32 43V16" />

              <path
                className="leaf-fill"
                d="M31 27C18 26 11 18 10 7c13-1 22 6 21 20Z"
              />

              <path
                className="leaf-fill-dark"
                d="M33 26C45 24 53 16 55 4c10 9 5 24-22 31Z"
              />

              <path d="M32 24C26 19 20 15 14 11" />
              <path d="M33 24C40 19 47 13 52 8" />
            </svg>

            <span className="mn-footer-line" />
          </div>

          <p className="mn-footer-sentence">
            Ruang untuk berjeda, menyelami rasa,
            memahami makna, dan kembali pada diri.
          </p>

          <div className="mn-footer-meta">
            <span>Spiritual Journey by Anasta</span>
            <span className="dot">•</span>
            <span>Privacy-first</span>
            <span className="dot">•</span>
            <span>no third-party trackers</span>
            <span className="dot">•</span>
            <span>
              © {new Date().getFullYear()} Menjadi Nol
            </span>
          </div>
        </div>

        {/* KANAN */}
        <div
          className="mn-footer-social"
          aria-label="Social media"
        >
         {/* INSTAGRAM */}
        <a
          href="https://www.instagram.com/menjadi.nol/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram Menjadi Nol"
          title="@menjadi.nol"
        >
            <svg
              className="mn-social-solid"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                className="mn-social-body"
                d="M7.7 2h8.6C19.45 2 22 4.55 22 7.7v8.6c0 3.15-2.55 5.7-5.7 5.7H7.7C4.55 22 2 19.45 2 16.3V7.7C2 4.55 4.55 2 7.7 2Z"
              />
              <circle
                className="mn-social-cut"
                cx="12"
                cy="12"
                r="3.7"
              />
              <circle
                className="mn-social-cut"
                cx="17.1"
                cy="6.9"
                r="1"
              />
            </svg>
          </a>

          {/* YOUTUBE */}
          <a
            href="https://www.youtube.com/@menjadinol"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube Menjadi Nol"
            title="YouTube Menjadi Nol"
          >
            <svg
              className="mn-social-solid"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                className="mn-social-body"
                d="M23.2 7.1a3 3 0 0 0-2.1-2.1C19.2 4.5 12 4.5 12 4.5s-7.2 0-9.1.5A3 3 0 0 0 .8 7.1C.3 9 .3 12 .3 12s0 3 .5 4.9A3 3 0 0 0 2.9 19c1.9.5 9.1.5 9.1.5s7.2 0 9.1-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-4.9.5-4.9s0-3-.5-4.9Z"
              />
              <path
                className="mn-social-cut"
                d="m9.6 15.3 6.2-3.3-6.2-3.3v6.6Z"
              />
            </svg>
          </a>

          {/* EMAIL */}
          <a
            href="mailto:admin@menjadinol.com"
            aria-label="Email Menjadi Nol"
            title="admin@menjadinol.com"
          >
            <svg
              className="mn-social-solid"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                className="mn-social-body"
                d="M4.3 4.5h15.4A2.3 2.3 0 0 1 22 6.8v10.4a2.3 2.3 0 0 1-2.3 2.3H4.3A2.3 2.3 0 0 1 2 17.2V6.8a2.3 2.3 0 0 1 2.3-2.3Z"
              />
              <path
                className="mn-social-cut"
                d="M4.6 7.1 12 12.7l7.4-5.6"
              />
            </svg>
          </a>
        </div>
      </div>

      <style>{`
        .mn-footer {
          position: relative;
          width: 100%;
          min-height: 120px;
          margin-top: 0;
          padding: 24px 48px 18px;
          box-sizing: border-box;
          overflow: hidden;

          border-top: 1px solid rgba(61, 100, 77, .08);

          background:
            linear-gradient(
              180deg,
              #fffefa 0%,
              #fbfaf4 55%,
              #eef3e8 100%
            );
        }

        .mn-footer-botanical {
          position: absolute;
          z-index: 2;

          bottom: -12px;

          width: 190px;
          height: 205px;

          fill: rgba(122, 151, 119, .25);
          stroke: rgba(91, 125, 91, .52);

          stroke-width: 1.3;
          stroke-linecap: round;
          stroke-linejoin: round;

          pointer-events: none;
        }

        .mn-footer-botanical-left {
          left: -24px;
        }

        .mn-footer-botanical-right {
          right: -24px;
          transform: scaleX(-1);
        }

        .mn-footer-wave {
          position: absolute;
          z-index: 1;

          left: 50%;

          width: 125%;
          height: 170px;

          border-radius: 50% 50% 0 0;

          pointer-events: none;
        }

        .mn-footer-wave-one {
          bottom: -115px;

          transform:
            translateX(-50%)
            rotate(2deg);

          background:
            rgba(205, 221, 197, .46);
        }

        .mn-footer-wave-two {
          bottom: -133px;

          transform:
            translateX(-50%)
            rotate(-2deg);

          background:
            rgba(224, 233, 217, .72);
        }

        .mn-footer-inner {
          position: relative;
          z-index: 5;

          width: min(1320px, 100%);
          margin: 0 auto;

          display: grid;

          grid-template-columns:
            minmax(250px, 1fr)
            minmax(430px, 1.7fr)
            minmax(180px, .65fr);

          align-items: center;
          gap: 32px;
        }

        .mn-footer-brand {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .mn-footer-logo {
          width: 58px;
          height: 58px;

          display: block;
          object-fit: contain;
        }

        .mn-footer-title {
          color: #234b38;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size: 19px;
          font-weight: 500;

          line-height: 1.1;
          letter-spacing: .20em;
        }

        .mn-footer-tagline {
          margin-top: 6px;

          color: #718274;

          font-size: 10px;
          letter-spacing: .08em;
        }

        /* CENTER NAIK */
        .mn-footer-center {
          text-align: center;

          transform: translateY(-16px);
        }

        .mn-footer-leaf-row {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 18px;

          margin-bottom: 8px;

          transform: translateY(-4px);
        }

        .mn-footer-line {
          width: 58px;
          height: 1px;

          background:
            rgba(63, 120, 87, .56);
        }

        .mn-footer-leaf {
          width: 58px;
          height: 43px;

          fill: none;

          stroke: #3f7857;

          stroke-width: 1.2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .mn-footer-leaf .leaf-fill {
          fill: #8dad91;
          stroke: #6a9474;
        }

        .mn-footer-leaf .leaf-fill-dark {
          fill: #4f805d;
          stroke: #3d704f;
        }

        .mn-footer-sentence {
          margin: 0;

          color: #294638;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size:
            clamp(
              14px,
              1.05vw,
              17px
            );

          line-height: 1.55;
        }

        .mn-footer-meta {
          margin-top: 14px;

          display: flex;
          flex-wrap: wrap;

          align-items: center;
          justify-content: center;

          gap: 8px;

          color: #75837a;

          font-size: 10px;
          line-height: 1.5;
        }

        .mn-footer-meta .dot {
          color: #42674f;
        }

        .mn-footer-social {
          display: flex;
          justify-content: flex-end;
          align-items: center;

          gap: 14px;
        }

        .mn-footer-social a {
          width: 42px;
          height: 42px;

          display: grid;
          place-items: center;

          border:
            1px solid
            rgba(61, 105, 78, .16);

          border-radius: 50%;

          color: #0f5f3d;

          background:
            rgba(237, 245, 235, .88);

          text-decoration: none;

          box-shadow:
            0 7px 20px
            rgba(56, 88, 69, .06);

          transition:
            transform .2s ease,
            background .2s ease,
            color .2s ease;
        }

        .mn-footer-social a:hover {
          transform: translateY(-3px);

          background: #dfeadd;
          color: #08492e;
        }

        .mn-social-solid {
          width: 22px;
          height: 22px;

          overflow: visible;

          fill: none;
          stroke: none;
        }

        .mn-social-body {
          fill: currentColor;
          stroke: none;
        }

        .mn-social-cut {
          fill: #ffffff;
          stroke: #ffffff;

          stroke-width: 1.4;

          stroke-linecap: round;
          stroke-linejoin: round;
        }

        @media (max-width: 1024px) {
          .mn-footer {
            padding:
              24px
              48px
              18px;
          }

          .mn-footer-inner {
            grid-template-columns:
              1fr
              1.6fr;

            gap: 25px;
          }

          .mn-footer-center {
            transform: translateY(-8px);
          }

          .mn-footer-social {
            grid-column: 1 / -1;

            justify-content: center;

            margin-top: 4px;
          }

          .mn-footer-botanical {
            width: 150px;
            height: 175px;
          }
        }

        @media (max-width: 700px) {
          .mn-footer {
            min-height: 330px;

            padding:
              46px
              24px
              max(
                32px,
                env(safe-area-inset-bottom)
              );
          }

          .mn-footer-inner {
            grid-template-columns:
              1fr;

            text-align: center;

            gap: 24px;
          }

          .mn-footer-brand {
            justify-content: center;
          }

          .mn-footer-title {
            font-size: 17px;
          }

          .mn-footer-center {
            max-width: 460px;

            margin: 0 auto;

            transform: translateY(0);
          }

          .mn-footer-meta {
            font-size: 9px;
          }

          .mn-footer-line {
            width: 40px;
          }

          .mn-footer-social {
            grid-column: auto;

            justify-content: center;

            margin-top: 0;
          }

          .mn-footer-botanical {
            width: 120px;
            height: 145px;

            opacity: .75;
          }

          .mn-footer-botanical-left {
            left: -35px;
          }

          .mn-footer-botanical-right {
            right: -35px;
          }
        }
      `}</style>
    </footer>
  );
}