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
import SiteWidgets from "@/components/ruang-tanya/SiteWidgets";

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

  let accountName = "";
let accountRole = "";

if (user) {
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("display_name,role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    adminUser &&
    ["writer", "admin", "superadmin"].includes(adminUser.role)
  ) {
    accountName =
      adminUser.display_name?.trim() ||
      String(
        user.user_metadata?.display_name ||
          user.user_metadata?.name ||
          ""
      ).trim();

    accountRole =
      adminUser.role === "writer"
        ? "Penulis"
        : adminUser.role === "admin"
          ? "Admin"
          : "Superadmin";
  } else {
    const { data: reader } = await supabase
      .from("reader_users")
      .select("name")
      .eq("user_id", user.id)
      .maybeSingle();

    accountName =
      reader?.name?.trim() ||
      String(user.user_metadata?.name || "").trim();

    accountRole = "Pembaca";
  }
}

  return (
    <html lang="id">
      <body>
        <ReaderProtectedShell>
          <PageViewTracker />

          <Suspense fallback={null}>
            <Header
              accountName={accountName}
              accountRole={accountRole}
          />
          </Suspense>

          <SectionBackground />

          {children}

          <Footer />
          <SiteWidgets accountName={accountName} />
        </ReaderProtectedShell>
      </body>
    </html>
  );
}