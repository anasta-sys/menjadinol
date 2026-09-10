"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type ReaderProtectedShellProps = {
  children: ReactNode;
};

function isEditableTarget(target: EventTarget | null) {
  const element =
    target instanceof Element ? target : null;

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
}

export default function ReaderProtectedShell({
  children,
}: ReaderProtectedShellProps) {
  const pathname = usePathname();

  const isAdmin =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  useEffect(() => {
    // Admin/editor sengaja tidak diberi proteksi reader.
    if (isAdmin) {
      document.body.classList.remove(
        "reader-copy-protected"
      );

      return;
    }

    document.body.classList.add(
      "reader-copy-protected"
    );

    const preventSelection = (event: Event) => {
      if (isEditableTarget(event.target)) return;

      event.preventDefault();

      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        selection.removeAllRanges();
      }
    };

    const preventCopy = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      event.stopPropagation();

      try {
        event.clipboardData?.setData(
          "text/plain",
          ""
        );
        event.clipboardData?.setData(
          "text/html",
          ""
        );
      } catch {
        // Tidak perlu melakukan apa-apa.
      }

      const selection = window.getSelection();
      selection?.removeAllRanges();
    };

    const preventCut = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
    };

    const preventContextMenu = (
      event: MouseEvent
    ) => {
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
    };

    const preventDrag = (event: DragEvent) => {
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
    };

    const preventKeyboard = (
      event: globalThis.KeyboardEvent
    ) => {
      if (isEditableTarget(event.target)) {
        // Form login/register tetap normal:
        // Ctrl/Cmd+A, C, V, X tetap boleh.
        return;
      }

      const ctrlOrCommand =
        event.ctrlKey || event.metaKey;

      if (!ctrlOrCommand) return;

      const key = event.key.toLowerCase();

      const blockedKeys = new Set([
        "a", // select all
        "c", // copy
        "x", // cut
        "s", // save page
        "p", // print
        "u", // view source shortcut
      ]);

      if (!blockedKeys.has(key)) return;

      event.preventDefault();
      event.stopPropagation();
    };

    // Penting:
    // "selectstart" native browser digunakan karena React onSelect
    // baru berjalan setelah selection terjadi.
    document.addEventListener(
      "selectstart",
      preventSelection,
      true
    );
    document.addEventListener(
      "copy",
      preventCopy,
      true
    );
    document.addEventListener(
      "cut",
      preventCut,
      true
    );
    document.addEventListener(
      "contextmenu",
      preventContextMenu,
      true
    );
    document.addEventListener(
      "dragstart",
      preventDrag,
      true
    );
    document.addEventListener(
      "keydown",
      preventKeyboard,
      true
    );

    return () => {
      document.body.classList.remove(
        "reader-copy-protected"
      );

      document.removeEventListener(
        "selectstart",
        preventSelection,
        true
      );
      document.removeEventListener(
        "copy",
        preventCopy,
        true
      );
      document.removeEventListener(
        "cut",
        preventCut,
        true
      );
      document.removeEventListener(
        "contextmenu",
        preventContextMenu,
        true
      );
      document.removeEventListener(
        "dragstart",
        preventDrag,
        true
      );
      document.removeEventListener(
        "keydown",
        preventKeyboard,
        true
      );
    };
  }, [isAdmin]);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div
      className="reader-protected-shell"
      style={{
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      {children}
    </div>
  );
}
