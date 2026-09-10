"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="inner-page production-message-page">
      <div className="shell inner-card production-message-card">
        <p className="eyebrow">jalan pulang</p>
        <h1>Ada sesuatu yang belum berhasil dimuat.</h1>
        <p className="inner-lead">
          Coba muat kembali halaman ini. Data yang sudah tersimpan tidak berubah.
        </p>
        <button className="btn-primary production-home-link" type="button" onClick={reset}>
          coba lagi
        </button>
      </div>
    </main>
  );
}
