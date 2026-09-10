"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="id">
      <body>
        <main style={{maxWidth:720,margin:"10vh auto",padding:32,fontFamily:"Georgia, serif"}}>
          <h1>Jalan Pulang sedang memuat ulang.</h1>
          <p>Silakan coba sekali lagi.</p>
          <button type="button" onClick={reset}>coba lagi</button>
        </main>
      </body>
    </html>
  );
}
