"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ReaderSecurityGuard() {
  const pathname = usePathname();

  useEffect(() => {
    // =========================================================
    // JANGAN PROTEKSI HALAMAN ADMIN / AUTH
    // =========================================================
    const excluded =
      pathname.startsWith("/admin") ||
      pathname.startsWith("/reader-login") ||
      pathname.startsWith("/reader-register") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/auth");

    if (excluded) {
      document.documentElement.classList.remove("reader-secured");
      return;
    }

    document.documentElement.classList.add("reader-secured");

    // =========================================================
    // CEK APAKAH USER SEDANG DI INPUT / TEXTAREA
    // =========================================================
    const isEditable = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;

      if (!element) return false;

      return Boolean(
        element.closest(
          [
            "input",
            "textarea",
            "select",
            '[contenteditable="true"]',
            '[role="textbox"]',
          ].join(",")
        )
      );
    };

    // =========================================================
    // BLOK COPY
    // =========================================================
    const handleCopy = (event: ClipboardEvent) => {
      if (isEditable(event.target)) return;

      event.preventDefault();
      event.stopPropagation();

      try {
        event.clipboardData?.setData("text/plain", "");
      } catch {
        // abaikan
      }
    };

    // =========================================================
    // BLOK CUT
    // =========================================================
    const handleCut = (event: ClipboardEvent) => {
      if (isEditable(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
    };

    // =========================================================
    // BLOK KLIK KANAN
    // =========================================================
    const handleContextMenu = (event: MouseEvent) => {
      if (isEditable(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
    };

    // =========================================================
    // BLOK DRAG IMAGE / TEXT
    // =========================================================
    const handleDragStart = (event: DragEvent) => {
      if (isEditable(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
    };

    // =========================================================
    // BLOK SELECTION
    // =========================================================
    const handleSelectStart = (event: Event) => {
      if (isEditable(event.target)) return;

      event.preventDefault();
    };

    // =========================================================
    // BLOK SHORTCUT
    // =========================================================
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditable(event.target)) return;

      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;

      if (!modifier) return;

      // Ctrl/Cmd + C = copy
      if (key === "c") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Ctrl/Cmd + X = cut
      if (key === "x") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Ctrl/Cmd + A = select all
      if (key === "a") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Ctrl/Cmd + S = save page
      if (key === "s") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Ctrl/Cmd + P = print
      if (key === "p") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Ctrl/Cmd + U = view source
      if (key === "u") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    };

    // =========================================================
    // BLOK PRINT VIA beforeprint
    // =========================================================
    const handleBeforePrint = () => {
      document.body.classList.add("reader-print-blocked");
    };

    const handleAfterPrint = () => {
      document.body.classList.remove("reader-print-blocked");
    };

    // CAPTURE = TRUE
    // supaya event dicegat sebelum masuk komponen lain
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("cut", handleCut, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("dragstart", handleDragStart, true);
    document.addEventListener("selectstart", handleSelectStart, true);
    document.addEventListener("keydown", handleKeyDown, true);

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      document.documentElement.classList.remove("reader-secured");

      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("cut", handleCut, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("dragstart", handleDragStart, true);
      document.removeEventListener("selectstart", handleSelectStart, true);
      document.removeEventListener("keydown", handleKeyDown, true);

      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [pathname]);

  return null;
}