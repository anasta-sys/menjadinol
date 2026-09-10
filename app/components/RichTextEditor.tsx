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

export default function RichTextEditor({
  name,
  label = "Isi tulisan",
  defaultValue = "",
  maxLength = 100000,
  minHeight = 300,
  disabled = false,
}: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [html, setHtml] = useState(defaultValue || "");
  const [count, setCount] = useState(() =>
    defaultValue.replace(/<[^>]*>/g, "").length
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (editor.innerHTML !== (defaultValue || "")) {
      editor.innerHTML = defaultValue || "";
      setHtml(defaultValue || "");
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

  function sync() {
    if (disabled) return;

    const editor = editorRef.current;
    if (!editor) return;

    const nextHtml = editor.innerHTML;
    const nextCount = (editor.textContent || "").length;

    if (nextCount > maxLength) {
      editor.innerHTML = html;
      placeCaretAtEnd(editor);
      return;
    }

    setHtml(nextHtml);
    setCount(nextCount);
  }

  function command(commandName: string, value?: string) {
    if (disabled) return;

    editorRef.current?.focus();
    document.execCommand(commandName, false, value);
    sync();
  }

  function heading(tag: "h2" | "h3") {
    command("formatBlock", tag);
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

    editorRef.current?.focus();
    document.execCommand("insertHorizontalRule");
    sync();
  }

  return (
    <label className="jp-rich-label">
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
        >
          <button
            type="button"
            disabled={disabled}
            title="Subjudul"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => heading("h2")}
          >
            H2
          </button>

          <button
            type="button"
            disabled={disabled}
            title="Subjudul kecil"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => heading("h3")}
          >
            H3
          </button>

          <span className="jp-rich-divider" />

          <button
            type="button"
            disabled={disabled}
            title="Tebal"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command("bold")}
          >
            <strong>B</strong>
          </button>

          <button
            type="button"
            disabled={disabled}
            title="Miring"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command("italic")}
          >
            <em>I</em>
          </button>

          <button
            type="button"
            disabled={disabled}
            title="Quote"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              command("formatBlock", "blockquote")
            }
          >
            ❝
          </button>

          <span className="jp-rich-divider" />

          <button
            type="button"
            disabled={disabled}
            title="Bullet list"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command("insertUnorderedList")}
          >
            • List
          </button>

          <button
            type="button"
            disabled={disabled}
            title="Numbered list"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command("insertOrderedList")}
          >
            1. List
          </button>

          <button
            type="button"
            disabled={disabled}
            title="Link"
            onMouseDown={(event) => event.preventDefault()}
            onClick={addLink}
          >
            Link
          </button>

          <button
            type="button"
            disabled={disabled}
            title="Pemisah"
            onMouseDown={(event) => event.preventDefault()}
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
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command("justifyLeft")}
          >
            <span>☰</span>
          </button>

          <button
            type="button"
            className="jp-align-center"
            disabled={disabled}
            title="Rata tengah"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command("justifyCenter")}
          >
            <span>☰</span>
          </button>

          <button
            type="button"
            className="jp-align-right"
            disabled={disabled}
            title="Rata kanan"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command("justifyRight")}
          >
            <span>☰</span>
          </button>

          <button
            type="button"
            className="jp-align-justify"
            disabled={disabled}
            title="Rata kanan kiri"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command("justifyFull")}
          >
            <span>☰</span>
          </button>

          <span className="jp-rich-divider" />

          <button
            type="button"
            disabled={disabled}
            title="Undo"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command("undo")}
          >
            ↶
          </button>

          <button
            type="button"
            disabled={disabled}
            title="Redo"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command("redo")}
          >
            ↷
          </button>
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
          dangerouslySetInnerHTML={{
            __html: defaultValue || "",
          }}
        />
      </div>

      <input
        type="hidden"
        name={name}
        value={html}
      />

      <small className="admin-field-help">
        Format tersedia: subjudul, bold, italic, quote,
        daftar, link, pemisah, rata kiri/tengah/kanan,
        dan rata kanan-kiri.
      </small>
    </label>
  );
}
