import Link from "next/link";

export const metadata = {
  title: "Halaman tidak ditemukan",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="inner-page production-message-page">
      <div className="shell inner-card production-message-card">
        <p className="eyebrow">404</p>
        <h1>Jalan ini belum ditemukan.</h1>
        <p className="inner-lead">
          Halaman yang kamu cari mungkin sudah berpindah atau alamatnya tidak tepat.
        </p>
        <Link className="btn-primary production-home-link" href="/">
          kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
