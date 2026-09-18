"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  name: string;
  label?: string;
  defaultValue?: string;
  maxLength?: number;
  minHeight?: number;
  disabled?: boolean;
};

function textLength(html: string) {
  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, "").length;
  }

  const element = document.createElement("div");
  element.innerHTML = html;
  return (element.textContent || "").length;
}

const FONT_SIZES = [11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 32];

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Verdana", value: "Verdana" },
  { label: "Trebuchet MS", value: "Trebuchet MS" },
];

const TEXT_COLORS = [
  { label: "Hitam", value: "#111111" },
  { label: "Abu-abu", value: "#666666" },
  { label: "Hijau", value: "#17613f" },
  { label: "Hijau tua", value: "#0f4d34" },
  { label: "Emas", value: "#a67c00" },
  { label: "Cokelat", value: "#7a5230" },
  { label: "Merah", value: "#b42318" },
  { label: "Biru", value: "#175cd3" },
];

const QUOTE_COLORS = [
  { label: "Emas", value: "gold" },
  { label: "Hijau", value: "green" },
  { label: "Hijau tua", value: "dark-green" },
  { label: "Abu-abu", value: "gray" },
  { label: "Cokelat", value: "brown" },
  { label: "Merah", value: "red" },
  { label: "Biru", value: "blue" },
];


export default function RichTextEditor({
  name,
  label = "Isi tulisan",
  defaultValue = "",
  maxLength = 100000,
  minHeight = 300,
  disabled = false,
}: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const htmlRef = useRef(defaultValue || "");
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const [htmlValue, setHtmlValue] = useState(defaultValue || "");
  const [count, setCount] = useState(() =>
    defaultValue.replace(/<[^>]*>/g, "").length
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (editor.innerHTML !== (defaultValue || "")) {
      editor.innerHTML = defaultValue || "";
      htmlRef.current = defaultValue || "";
      setHtmlValue(defaultValue || "");
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = defaultValue || "";
      }
      setCount(textLength(defaultValue || ""));
    }
  }, [defaultValue]);

  function placeCaretAtEnd(element: HTMLElement) {
    element.focus();

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function saveSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const startNode = range.startContainer;
    const endNode = range.endContainer;

    if (editor.contains(startNode) && editor.contains(endNode)) {
      savedRangeRef.current = range.cloneRange();
    }
  }

  function restoreSelection() {
    const editor = editorRef.current;
    const range = savedRangeRef.current;
    if (!editor) return;

    editor.focus();

    if (!range) return;

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function sync() {
    if (disabled) return;

    const editor = editorRef.current;
    if (!editor) return;

    const nextHtml = editor.innerHTML;
    const nextCount = (editor.textContent || "").length;

    if (nextCount > maxLength) {
      editor.innerHTML = htmlRef.current;
      placeCaretAtEnd(editor);
      return;
    }

    htmlRef.current = nextHtml;
    setHtmlValue(nextHtml);
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = nextHtml;
    }
    setCount(nextCount);
    saveSelection();
  }

  function command(commandName: string, value?: string) {
    if (disabled) return;

    restoreSelection();
    document.execCommand(commandName, false, value);
    sync();
  }

  function heading(tag: "p" | "h2" | "h3") {
    if (disabled) return;

    restoreSelection();
    document.execCommand("formatBlock", false, tag);

    // Saat memilih "Normal", pastikan paragraf kembali normal.
    // Ini mencegah state Bold browser terbawa ke paragraf hasil revisi.
    if (tag === "p") {
      document.execCommand("removeFormat", false);
      document.execCommand("formatBlock", false, "p");
    }

    sync();
  }

  function applyFontFamily(fontFamily: string) {
    if (disabled || !fontFamily) return;

    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("fontName", false, fontFamily);
    sync();
  }

  function applyFontSize(size: number) {
    if (disabled) return;

    restoreSelection();

    // Gunakan satu marker sementara, lalu ubah hasilnya menjadi px yang pasti.
    // Saat ukuran diganti lagi, browser mengganti format pada selection,
    // bukan membuat heading baru.
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("fontSize", false, "7");

    const editor = editorRef.current;
    if (!editor) return;

    editor.querySelectorAll('font[size="7"]').forEach((font) => {
      const span = document.createElement("span");
      span.style.fontSize = `${size}px`;

      while (font.firstChild) {
        span.appendChild(font.firstChild);
      }

      font.replaceWith(span);
    });

    normalizeInlineStyles(editor);
    sync();
  }

  function normalizeInlineStyles(editor: HTMLElement) {
    // Rapikan span bertingkat dengan style yang sama agar editing berulang
    // tidak terus menumpuk wrapper ukuran/font.
    let changed = true;

    while (changed) {
      changed = false;

      editor.querySelectorAll("span").forEach((span) => {
        const parent = span.parentElement;
        if (
          parent?.tagName === "SPAN" &&
          parent.getAttribute("style") === span.getAttribute("style")
        ) {
          while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
          }
          span.remove();
          changed = true;
        }
      });
    }
  }

  function applyTextColor(color: string) {
    if (disabled || !color) return;

    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("foreColor", false, color);
    sync();
  }

  function applyQuote(quoteColor: string) {
    if (disabled || !quoteColor) return;

    restoreSelection();
    document.execCommand("formatBlock", false, "blockquote");

    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      sync();
      return;
    }

    let node: Node | null = selection.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

    let element = node as HTMLElement | null;
    while (element && element !== editor && element.tagName !== "BLOCKQUOTE") {
      element = element.parentElement;
    }

    if (element?.tagName === "BLOCKQUOTE") {
      element.setAttribute("data-quote-color", quoteColor);
    }

    sync();
  }

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;

    const modifier = event.ctrlKey || event.metaKey;
    if (!modifier || event.key.toLowerCase() !== "a") return;

    event.preventDefault();

    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    const range = document.createRange();
    range.selectNodeContents(editor);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedRangeRef.current = range.cloneRange();
  }

  function addLink() {
    if (disabled) return;

    const url = window.prompt("Masukkan URL link:");
    if (!url) return;

    const normalized =
      /^https?:\/\//i.test(url) || url.startsWith("/")
        ? url
        : `https://${url}`;

    command("createLink", normalized);
  }

  function addDivider() {
    if (disabled) return;

    restoreSelection();
    document.execCommand("insertHorizontalRule");
    sync();
  }

  function insertHtml(html: string) {
    if (disabled) return;

    restoreSelection();
    document.execCommand("insertHTML", false, html);
    sync();
  }

  function addTable() {
    if (disabled) return;

    const rowInput = window.prompt("Jumlah baris tabel (1-20):", "3");
    if (rowInput === null) return;

    const colInput = window.prompt("Jumlah kolom tabel (1-10):", "3");
    if (colInput === null) return;

    const rows = Number(rowInput);
    const cols = Number(colInput);

    if (
      !Number.isInteger(rows) ||
      !Number.isInteger(cols) ||
      rows < 1 ||
      rows > 20 ||
      cols < 1 ||
      cols > 10
    ) {
      window.alert("Jumlah tabel tidak valid.");
      return;
    }

    const header = Array.from(
      { length: cols },
      (_, index) => `<th>Kolom ${index + 1}</th>`
    ).join("");

    const body = Array.from(
      { length: Math.max(0, rows - 1) },
      () =>
        `<tr>${Array.from(
          { length: cols },
          () => "<td>&nbsp;</td>"
        ).join("")}</tr>`
    ).join("");

    insertHtml(
      `<div class="jp-table-wrap"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div><p><br></p>`
    );
  }

  async function uploadMedia(
    file: File,
    kind: "image" | "pdf"
  ) {
    if (disabled || uploadingMedia) return;

    const imageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    const valid =
      kind === "image"
        ? imageTypes.includes(file.type)
        : file.type === "application/pdf";

    if (!valid) {
      window.alert(
        kind === "image"
          ? "Gunakan JPG, PNG, WebP, atau GIF."
          : "Gunakan file PDF."
      );
      return;
    }

    const maxSize =
      kind === "image"
        ? 8 * 1024 * 1024
        : 20 * 1024 * 1024;

    if (file.size > maxSize) {
      window.alert(
        kind === "image"
          ? "Gambar maksimal 8 MB."
          : "PDF maksimal 20 MB."
      );
      return;
    }

    saveSelection();
    setUploadingMedia(true);

    try {
      const data = new FormData();
      data.append("file", file);
      data.append("kind", kind);

      const response = await fetch(
        "/api/admin/content-media",
        {
          method: "POST",
          body: data,
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !result?.url) {
        throw new Error(
          result?.error || "Upload gagal."
        );
      }

      const safeName = file.name
        .replace(/[<>"']/g, "")
        .slice(0, 160);

      if (kind === "image") {
        insertHtml(
          `<figure class="jp-rich-media"><img src="${result.url}" alt="${safeName}" loading="lazy"><figcaption>${safeName}</figcaption></figure><p><br></p>`
        );
      } else {
        insertHtml(
          `<p class="jp-rich-file"><a href="${result.url}" target="_blank" rel="noopener noreferrer">📄 ${safeName}</a></p><p><br></p>`
        );
      }
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Upload gagal."
      );
    } finally {
      setUploadingMedia(false);
    }
  }

  const toolbarRowStyle = {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "6px",
    width: "100%",
  };

  return (
    <div className="jp-rich-label">
      <span className="admin-field-label-row">
        <span>{label}</span>

        <span
          className={
            count >= maxLength
              ? "admin-character-count limit"
              : "admin-character-count"
          }
        >
          {count.toLocaleString("id-ID")} /{" "}
          {maxLength.toLocaleString("id-ID")}
        </span>
      </span>

      <div className="jp-rich-editor">
        <div
          className="jp-rich-toolbar"
          aria-label="Toolbar format tulisan"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: "8px",
          }}
          onMouseDown={saveSelection}
        >
          {/* BARIS 1 — jenis huruf, ukuran, heading, dan format teks */}
          <div style={toolbarRowStyle}>
            <select
              disabled={disabled}
              defaultValue=""
              title="Jenis huruf"
              aria-label="Jenis huruf"
              onMouseDown={saveSelection}
              onChange={(event) => {
                applyFontFamily(event.target.value);
                event.currentTarget.value = "";
              }}
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.label} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>

            <select
              disabled={disabled}
              defaultValue=""
              title="Ukuran huruf"
              aria-label="Ukuran huruf"
              onMouseDown={saveSelection}
              onChange={(event) => {
                const size = Number(event.target.value);
                if (size) applyFontSize(size);
                event.currentTarget.value = "";
              }}
            >
              <option value="">Ukuran</option>
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} px
                </option>
              ))}
            </select>

            <select
              disabled={disabled}
              defaultValue=""
              title="Warna huruf"
              aria-label="Warna huruf"
              onMouseDown={saveSelection}
              onChange={(event) => {
                if (event.target.value) applyTextColor(event.target.value);
                event.currentTarget.value = "";
              }}
            >
              <option value="">Warna</option>
              {TEXT_COLORS.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </select>

            <select
              disabled={disabled}
              defaultValue=""
              title="Format paragraf"
              aria-label="Format paragraf"
              onMouseDown={saveSelection}
              onChange={(event) => {
                const value = event.target.value as "p" | "h2" | "h3" | "";
                if (value) heading(value);
                event.currentTarget.value = "";
              }}
            >
              <option value="">Format</option>
              <option value="p">Normal</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>

            <span className="jp-rich-divider" />

            <button
              type="button"
              disabled={disabled}
              title="Tebal"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => command("bold")}
            >
              <strong>B</strong>
            </button>

            <button
              type="button"
              disabled={disabled}
              title="Miring"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => command("italic")}
            >
              <em>I</em>
            </button>

            <button
              type="button"
              disabled={disabled}
              title="Garis bawah"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => command("underline")}
            >
              <u>U</u>
            </button>

            <button
              type="button"
              disabled={disabled}
              title="Hapus format pada teks yang dipilih"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => {
                restoreSelection();
                document.execCommand("removeFormat", false);
                sync();
              }}
            >
              Tx
            </button>

            <select
              disabled={disabled}
              defaultValue=""
              title="Quote dan warna garis"
              aria-label="Quote dan warna garis"
              onMouseDown={saveSelection}
              onChange={(event) => {
                if (event.target.value) applyQuote(event.target.value);
                event.currentTarget.value = "";
              }}
            >
              <option value="">❝ Quote</option>
              {QUOTE_COLORS.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </select>
          </div>

          {/* BARIS 2 — list, link, pemisah, alignment, undo/redo */}
          <div style={toolbarRowStyle}>
            <button
              type="button"
              disabled={disabled}
              title="Bullet list"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => command("insertUnorderedList")}
            >
              • List
            </button>

            <button
              type="button"
              disabled={disabled}
              title="Numbered list"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => command("insertOrderedList")}
            >
              1. List
            </button>

            <button
              type="button"
              disabled={disabled}
              title="Link"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={addLink}
            >
              Link
            </button>

            <button
              type="button"
              disabled={disabled}
              title="Pemisah"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={addDivider}
            >
              ―
            </button>

            <button
              type="button"
              disabled={disabled || uploadingMedia}
              title="Sisipkan tabel"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={addTable}
            >
              ▦ Tabel
            </button>

            <button
              type="button"
              disabled={disabled || uploadingMedia}
              title="Upload gambar"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() =>
                imageInputRef.current?.click()
              }
            >
              🖼 Gambar
            </button>

            <button
              type="button"
              disabled={disabled || uploadingMedia}
              title="Upload PDF"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() =>
                pdfInputRef.current?.click()
              }
            >
              📄 PDF
            </button>

            {uploadingMedia && (
              <span>Uploading...</span>
            )}

            <span className="jp-rich-divider" />

            <button
              type="button"
              className="jp-align-left"
              disabled={disabled}
              title="Rata kiri"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => command("justifyLeft")}
            >
              <span>☰</span>
            </button>

            <button
              type="button"
              className="jp-align-center"
              disabled={disabled}
              title="Rata tengah"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => command("justifyCenter")}
            >
              <span>☰</span>
            </button>

            <button
              type="button"
              className="jp-align-right"
              disabled={disabled}
              title="Rata kanan"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => command("justifyRight")}
            >
              <span>☰</span>
            </button>

            <button
              type="button"
              className="jp-align-justify"
              disabled={disabled}
              title="Rata kanan kiri"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => command("justifyFull")}
            >
              <span>☰</span>
            </button>

            <span className="jp-rich-divider" />

            <button
              type="button"
              disabled={disabled}
              title="Undo"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => command("undo")}
            >
              ↶
            </button>

            <button
              type="button"
              disabled={disabled}
              title="Redo"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => command("redo")}
            >
              ↷
            </button>
          </div>
        </div>

        <div
          ref={editorRef}
          className={
            disabled
              ? "jp-rich-content is-disabled"
              : "jp-rich-content"
          }
          contentEditable={!disabled}
          aria-disabled={disabled}
          suppressContentEditableWarning
          style={{ minHeight }}
          onInput={sync}
          onBlur={sync}
          onMouseDown={(event) => {
            // Jangan cegah default: browser harus bebas memulai blok/seleksi teks.
            event.stopPropagation();
          }}
          onMouseMove={(event) => {
            // Jangan biarkan handler parent mengambil alih drag selection.
            if (event.buttons === 1) event.stopPropagation();
          }}
          onMouseUp={(event) => {
            event.stopPropagation();
            saveSelection();
          }}
          onSelect={saveSelection}
          onKeyUp={saveSelection}
          onKeyDown={handleEditorKeyDown}
          onCopy={(event) => {
            // Copy diizinkan khusus di area editor.
            event.stopPropagation();
          }}
          onCut={(event) => {
            event.stopPropagation();
            window.setTimeout(sync, 0);
          }}
          onPaste={(event) => {
            event.stopPropagation();
            window.setTimeout(sync, 0);
          }}
        />
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void uploadMedia(file, "image");
          }
          event.currentTarget.value = "";
        }}
      />

      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void uploadMedia(file, "pdf");
          }
          event.currentTarget.value = "";
        }}
      />

      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        value={htmlValue}
        readOnly
      />

      <small className="admin-field-help">
        Format tersedia: jenis dan ukuran huruf (mulai 11 px), warna huruf,
        heading opsional, bold, italic, underline, quote, daftar,
        link, pemisah, tabel, gambar, PDF, rata kiri/tengah/kanan, dan rata kanan-kiri.
      </small>
    </div>
  );
}
