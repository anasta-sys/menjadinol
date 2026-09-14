"use client";

import { usePathname } from "next/navigation";

const backgrounds = [
  {
    path: "/tentang",
    image: "/page-backgrounds/tentang.png",
    position: "center center",
  },
  {
    path: "/perjalanan",
    image: "/page-backgrounds/perjalanan.png",
    position: "center center",
  },
  {
    path: "/ruang-belajar",
    image: "/page-backgrounds/ruang-belajar.png",
    position: "center center",
  },
  {
    path: "/sinopsis",
    image: "/page-backgrounds/sinopsis.png",
    position: "center center",
  },
  {
    path: "/artikel",
    image: "/page-backgrounds/artikel.png",
    position: "center center",
  },
  {
    path: "/kontak",
    image: "/page-backgrounds/kontak.png",
    position: "center center",
  },
];

export default function SectionBackground() {
  const pathname = usePathname();

  const current = backgrounds.find(
    (item) =>
      pathname === item.path ||
      pathname.startsWith(`${item.path}/`)
  );

  if (!current) return null;

  return (
    <div
      className="mn-section-background"
      aria-hidden="true"
      style={{
        backgroundImage: `
          linear-gradient(
            rgba(248, 245, 237, 0.42),
            rgba(248, 245, 237, 0.42)
          ),
          url("${current.image}")
        `,
        backgroundPosition: current.position,
      }}
    />
  );
}