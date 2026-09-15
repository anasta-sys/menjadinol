import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import "./globals.css";
import "./menjadi-nol-theme.css";

import { createClient } from "@/lib/supabase/server";
import SectionBackground from "@/app/components/SectionBackground";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import ReaderProtectedShell from "@/app/components/ReaderProtectedShell";
import PageViewTracker from "@/app/components/PageViewTracker";

const site =
  process.env.NEXT_PUBLIC_SITE_URL || "https://menjadinol.com";

export const metadata: Metadata = {
  metadataBase: new URL(site),

  title: {
    default: "Menjadi Nol — Perjalanan pulang dalam diri",
    template: "%s | Menjadi Nol",
  },

  description:
    "Ruang untuk berjeda, menyelami rasa, memahami makna, dan kembali pada diri.",

  applicationName: "Menjadi Nol",

  authors: [{ name: "Menjadi Nol" }],

  creator: "Menjadi Nol",

  category: "reflection",

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "id_ID",
    url: site,
    siteName: "Menjadi Nol",

    title: "Menjadi Nol — Perjalanan pulang dalam diri",

    description:
      "Ruang untuk berjeda, menyelami rasa, memahami makna, dan kembali pada diri.",

    images: [
      {
        url: "/og-jalan-pulang.png",
        width: 1200,
        height: 630,
        alt: "Menjadi Nol — Perjalanan pulang dalam diri",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "Menjadi Nol — Perjalanan pulang dalam diri",

    description:
      "Ruang untuk berjeda, menyelami rasa, memahami makna, dan kembali pada diri.",

    images: ["/og-jalan-pulang.png"],
  },

  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let readerName = "";

  if (user) {
    const { data: reader } = await supabase
      .from("reader_users")
      .select("name")
      .eq("user_id", user.id)
      .maybeSingle();

    readerName =
      reader?.name?.trim() ||
      String(user.user_metadata?.name || "").trim();
  }

  return (
    <html lang="id">
      <body>
        <ReaderProtectedShell>
          <PageViewTracker />

          <Suspense fallback={null}>
            <Header readerName={readerName} />
          </Suspense>

          <SectionBackground />

          {children}

          <Footer />
        </ReaderProtectedShell>
      </body>
    </html>
  );
}