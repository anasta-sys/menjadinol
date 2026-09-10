import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jalan Pulang",
    short_name: "Jalan Pulang",
    description:
      "Ruang untuk berjeda, menyelami rasa, memahami makna, dan kembali pada diri.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f2e9",
    theme_color: "#6f865f",
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
