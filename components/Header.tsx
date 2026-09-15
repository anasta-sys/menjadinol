"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ReaderLogoutButton from "./ReaderLogoutButton";

const links = [
  ["/", "Beranda"],
  ["/tentang", "Tentang"],
  ["/perjalanan", "Perjalanan"],
  ["/ruang-belajar", "Ruang Belajar"],
  ["/sinopsis", "Sinopsis"],
  ["/artikel", "Artikel"],
  ["/kontak", "Kontak"],
] as const;

type HeaderProps = {
  readerName?: string;
};

export function Header({
  readerName = "",
}: HeaderProps) {
  const pathname = usePathname();

  return (
    <>
      <header className="mn-header">
        {/* Ornamen botanical */}
        <img
          src="/header-leaves-left.png"
          alt=""
          aria-hidden="true"
          className="mn-header-leaves mn-header-leaves-left"
        />

        <img
          src="/header-leaves-right.png"
          alt=""
          aria-hidden="true"
          className="mn-header-leaves mn-header-leaves-right"
        />

        <div className="mn-header-inner">
          <Link
            href="/"
            className="mn-brand"
            aria-label="Menjadi Nol"
          >
            <img
              src="/jalan-pulang-symbol.png"
              alt=""
              className="mn-brand-logo"
            />

            <span className="mn-brand-copy">
              <span className="mn-brand-title">
                MENJADI NOL
              </span>

              <span className="mn-brand-tagline">
                Perjalanan pulang dalam diri
              </span>
            </span>
          </Link>

          <nav
            className="mn-nav"
            aria-label="Navigasi utama"
          >
            {links.map(([href, label]) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname === href ||
                    pathname.startsWith(
                      `${href}/`
                    );

              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    active
                      ? "mn-nav-link active"
                      : "mn-nav-link"
                  }
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mn-account">
            {readerName && (
              <span
                className="mn-reader-name"
                title={readerName}
              >
                {readerName}
              </span>
            )}

            <ReaderLogoutButton />
          </div>
        </div>
      </header>

      <style jsx global>{`
        .mn-header {
          position: relative;
          z-index: 100;
          width: 100%;
          overflow: hidden;
          background: rgba(255, 253, 248, 0.96);
          border-bottom: 1px solid
            rgba(25, 86, 56, 0.07);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        /* =========================
           BOTANICAL HEADER
           ========================= */

        .mn-header-leaves {
          position: absolute;
          top: 0;
          z-index: 0;
          pointer-events: none;
          user-select: none;
          object-fit: contain;
          opacity: 0.3;
        }

        .mn-header-leaves-left {
          left: 0;
          top: 50%;
          width: 115px;
          transform: translate(-18px, -50%);
        }

        .mn-header-leaves-right {
          right: 0;
          top: 50%;
          width: 125px;
          transform: translate(18px, -50%);
        }

        .mn-header-inner {
          position: relative;
          z-index: 1;
          width: min(
            1360px,
            calc(100% - 64px)
          );
          min-height: 104px;
          margin: 0 auto;
          display: grid;
          grid-template-columns:
            minmax(300px, 1fr)
            auto
            minmax(120px, 1fr);
          align-items: center;
          column-gap: 32px;
        }

        .mn-brand {
          justify-self: start;
          display: inline-flex;
          align-items: center;
          gap: 16px;
          color: #103b29;
          text-decoration: none;
        }

        .mn-brand-logo {
          width: 66px;
          height: 66px;
          object-fit: contain;
          flex: 0 0 auto;
        }

        .mn-brand-copy {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }

        .mn-brand-title {
          font-family: Georgia,
            "Times New Roman", serif;
          font-size: 27px;
          font-weight: 500;
          letter-spacing: 0.18em;
          color: #103b29;
          white-space: nowrap;
        }

        .mn-brand-tagline {
          margin-top: 8px;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.075em;
          color: #395a47;
          white-space: nowrap;
        }

        .mn-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 30px;
          white-space: nowrap;
        }

        .mn-nav-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          color: #1e2923;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .mn-nav-link:hover,
        .mn-nav-link.active {
          color: #165d3c;
        }

        .mn-nav-link.active::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 2px;
          border-radius: 999px;
          background: #165d3c;
        }

        /* =========================
           READER ACCOUNT
           ========================= */

        .mn-account {
          justify-self: end;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          min-width: 0;
        }

        .mn-reader-name {
          display: block;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          font-family: "Segoe UI", Arial, sans-serif;
          font-size: 17px;
          font-weight: 500;
          color: #315c46;
          text-transform: capitalize;
          }

        .mn-account .reader-logout-button {
          min-width: 116px;
          min-height: 44px;
          padding: 0 20px;
          border: 0 !important;
          border-radius: 999px !important;
          background: #185f3d !important;
          color: #fff !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          box-shadow: 0 10px 24px
            rgba(24, 95, 61, 0.16);
        }

        .mn-account
          .reader-logout-button:hover {
          background: #124d31 !important;
          color: #fff !important;
        }

        .jp-time-strip,
        .jp-time-strip-inner {
          display: none !important;
        }

        @media (max-width: 1240px) {
          .mn-header-inner {
            width: min(
              1180px,
              calc(100% - 40px)
            );
            grid-template-columns:
              auto 1fr auto;
            column-gap: 22px;
          }

          .mn-brand-logo {
            width: 58px;
            height: 58px;
          }

          .mn-brand-title {
            font-size: 22px;
          }

          .mn-brand-tagline {
            font-size: 11px;
          }

          .mn-nav {
            gap: 20px;
          }

          .mn-nav-link {
            font-size: 13px;
          }

          .mn-reader-name {
            max-width: 120px;
            font-size: 14px;
          }

          .mn-header-leaves-left {
            width: 95px;
          }

          .mn-header-leaves-right {
            width: 105px;
          }
        }

        @media (max-width: 980px) {
          .mn-header-inner {
            min-height: auto;
            grid-template-columns: 1fr auto;
            padding: 14px 0 10px;
          }

          .mn-brand {
            gap: 12px;
          }

          .mn-brand-logo {
            width: 52px;
            height: 52px;
          }

          .mn-brand-title {
            font-size: 19px;
            letter-spacing: 0.14em;
          }

          .mn-brand-tagline {
            margin-top: 6px;
            font-size: 10px;
          }

          .mn-nav {
            grid-column: 1 / -1;
            order: 3;
            width: 100%;
            justify-content: flex-start;
            gap: 24px;
            overflow-x: auto;
            padding: 4px 0 1px;
            scrollbar-width: none;
          }

          .mn-nav::-webkit-scrollbar {
            display: none;
          }

          .mn-nav-link {
            flex: 0 0 auto;
          }

          .mn-header-leaves {
            opacity: 0.24;
          }
        }

        @media (max-width: 640px) {
          .mn-header-inner {
            width: calc(100% - 28px);
          }

          .mn-brand-logo {
            width: 46px;
            height: 46px;
          }

          .mn-brand-title {
            font-size: 16px;
          }

          .mn-brand-tagline {
            max-width: 190px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .mn-account {
            gap: 8px;
          }

          .mn-reader-name {
            max-width: 75px;
            font-size: 12px;
          }

          .mn-account
            .reader-logout-button {
            min-width: 92px;
            min-height: 40px;
            padding: 0 16px;
            font-size: 13px !important;
          }

          .mn-nav {
            gap: 20px;
          }

          .mn-header-leaves-left {
            width: 72px;
            transform: translate(
              -30px,
              -15px
            );
          }

          .mn-header-leaves-right {
            width: 76px;
            transform: translate(
              30px,
              -13px
            );
          }

          .mn-header-leaves {
            opacity: 0.2;
          }
        }
      `}</style>
    </>
  );
}