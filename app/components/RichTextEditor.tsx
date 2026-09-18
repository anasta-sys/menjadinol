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

  const htmlRef = useRef(defaultValue || "");
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const [count, setCount] = useState(() =>
    defaultValue.replace(/<[^>]*>/g, "").length
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (editor.innerHTML !== (defaultValue || "")) {
      editor.innerHTML = defaultValue || "";
      htmlRef.current = defaultValue || "";
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
    const container =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : (range.commonAncestorContainer as HTMLElement);

    if (container && editor.contains(container)) {
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
    command("formatBlock", tag);
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
              title="Quote"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => command("formatBlock", "blockquote")}
            >
              ❝
            </button>
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
          onMouseUp={saveSelection}
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
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        defaultValue={defaultValue || ""}
      />

      <small className="admin-field-help">
        Format tersedia: jenis dan ukuran huruf (mulai 11 px), warna huruf,
        heading opsional, bold, italic, underline, quote, daftar,
        link, pemisah, rata kiri/tengah/kanan, dan rata kanan-kiri.
      </small>
    </div>
  );
}
