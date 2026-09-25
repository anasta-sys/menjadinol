"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteCerita,
  restoreCerita,
} from "./[id]/actions";

type Props = {
  conversationId: string;
  title: string;
};

export default function StoryAdminActions({
  conversationId,
  title,
}: Props) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [showExport, setShowExport] = useState(false);

  async function download(format: "pdf" | "docx" | "txt") {
    if (busy) return;

    setShowExport(false);
    setBusy(true);

    try {
      const url =
        "/api/admin/ruang-cerita/export?id=" +
        encodeURIComponent(conversationId) +
        "&format=" +
        format;

      const response = await fetch(url, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        let message = "Ekspor belum berhasil.";

        try {
          const data = await response.json();

          if (data?.error) {
            message = data.error;
          }
        } catch {
          // Abaikan jika respons bukan JSON.
        }

        window.alert(message);
        return;
      }

      const blob = await response.blob();

      const disposition =
        response.headers.get("content-disposition") || "";

      const match = disposition.match(
        /filename="?([^"]+)"?/i
      );

      const extension =
        format === "docx" ? "docx" : format;

      const fallback =
        `ruang-cerita-${conversationId}.${extension}`;

      const fileName =
        match?.[1]?.trim() || fallback;

      const objectUrl =
        window.URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = fileName;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(objectUrl);
    } catch {
      window.alert("Ekspor belum berhasil.");
    } finally {
      setBusy(false);
    }
  }
  async function handleDelete() {
    if (busy) return;

    const confirmed = window.confirm(
      `Hapus cerita "${title}"?\n\nCerita tidak dihapus permanen dan masih dapat dipulihkan.`
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      const result = await deleteCerita(conversationId);

      if (!result.ok) {
        window.alert(
          result.error || "Cerita belum berhasil dihapus."
        );
        return;
      }

      window.alert("Cerita berhasil dihapus.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (busy) return;

    setBusy(true);

    try {
      const result = await restoreCerita(conversationId);

      if (!result.ok) {
        window.alert(
          result.error || "Cerita belum berhasil dipulihkan."
        );
        return;
      }

      window.alert("Cerita berhasil dipulihkan.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rc-story-admin-actions">
      <div className="rc-export-wrap">
        <button
          type="button"
          className="rc-story-action rc-story-action-export"
          onClick={() => setShowExport((value) => !value)}
          disabled={busy}
        >
          Ekspor
        </button>

        {showExport ? (
          <div className="rc-export-menu">
            <button
              type="button"
              onClick={() => download("pdf")}
            >
              PDF
            </button>

            <button
              type="button"
              onClick={() => download("docx")}
            >
              Word
            </button>

            <button
              type="button"
              onClick={() => download("txt")}
            >
              Teks
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="rc-story-action rc-story-action-delete"
        onClick={handleDelete}
        disabled={busy}
      >
        {busy ? "Memproses..." : "Hapus"}
      </button>

      <button
        type="button"
        className="rc-story-action rc-story-action-restore"
        onClick={handleRestore}
        disabled={busy}
      >
        Pulihkan
      </button>

      <style jsx>{`
        .rc-story-admin-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 10px;
        }

        .rc-story-action {
          min-height: 34px;
          padding: 0 13px;

          border-radius: 999px;

          font-family: Aptos, "Segoe UI", Arial, sans-serif;
          font-size: 12px;
          font-weight: 700;

          cursor: pointer;

          transition:
            background 160ms ease,
            color 160ms ease,
            border-color 160ms ease,
            transform 160ms ease;
        }

        .rc-story-action:hover {
          transform: translateY(-1px);
        }

        .rc-story-action-export {
          background: #f7f1df;
          border: 1px solid #c9a755;
          color: #725b24;
        }

        .rc-story-action-export:hover {
          background: #ead8a7;
        }

        .rc-story-action-delete {
          background: #fff8f4;
          border: 1px solid #c99b8e;
          color: #8b5145;
        }

        .rc-story-action-delete:hover {
          background: #f3dfd8;
        }

        .rc-story-action-restore {
          background: #e4eddc;
          border: 1px solid #8ca17d;
          color: #456346;
        }

        .rc-story-action-restore:hover {
          background: #d2e2c7;
        }

        .rc-story-action:disabled {
          opacity: 0.55;
          cursor: default;
          transform: none;
        }

        .rc-export-wrap {
          position: relative;
        }

        .rc-export-menu {
          position: absolute;
          z-index: 50;

          right: 0;
          top: calc(100% + 7px);

          width: 118px;

          padding: 6px;

          border: 1px solid rgba(154, 128, 65, 0.30);
          border-radius: 13px;

          background: #fffdf7;

          box-shadow:
            0 12px 28px rgba(41, 62, 46, 0.16);
        }

        .rc-export-menu button {
          width: 100%;

          padding: 8px 10px;

          border: 0;
          border-radius: 8px;

          background: transparent;
          color: #365845;

          text-align: left;

          font-family: Aptos, "Segoe UI", Arial, sans-serif;
          font-size: 12px;
          font-weight: 650;

          cursor: pointer;
        }

        .rc-export-menu button:hover {
          background: #e4eddc;
        }
      `}</style>
    </div>
  );
}