"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "@/app/components/RichTextEditor";
import ContentTableBuilder, {
  type ContentTableData,
} from "@/app/components/ContentTableBuilder";
import {
  updateFolderEntry,
  deleteFolderEntry,
} from "@/app/admin/folder-actions";

type Entry = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  table_data?: ContentTableData | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
  status: "draft" | "review" | "published";
};

type PreviewData = {
  title: string;
  excerpt: string;
  body: string;
  attachmentName?: string;
} | null;

function confirmDelete(event: React.FormEvent<HTMLFormElement>) {
  const ok = window.confirm(
    "Yakin tulisan ini dihapus?\n\nTulisan yang sudah dihapus tidak dapat dikembalikan dari menu ini."
  );

  if (!ok) {
    event.preventDefault();
  }
}

function sanitizePreviewHtml(raw: string) {
  if (typeof window === "undefined") return raw;

  const doc = new DOMParser().parseFromString(raw || "", "text/html");

  doc
    .querySelectorAll("script,iframe,object,embed,style")
    .forEach((node) => node.remove());

  doc.body.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attr) => {
      if (/^on/i.test(attr.name)) {
        element.removeAttribute(attr.name);
      }

      if (
        (attr.name === "href" || attr.name === "src") &&
        /^\s*javascript:/i.test(attr.value)
      ) {
        element.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}

export default function EntryInlineAdminActions({
  entry,
}: {
  entry: Entry;
}) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<PreviewData>(null);

  function saveEntry(formData: FormData) {
    setMessage("");

    startSaving(async () => {
      try {
        await updateFolderEntry(formData);
        setEditing(false);
        setPreview(null);
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Perubahan tulisan gagal disimpan."
        );
      }
    });
  }

  function openPreview(button: HTMLButtonElement) {
    const form = button.form;
    if (!form) return;

    const formData = new FormData(form);

    const title = String(formData.get("title") || "").trim();
    const excerpt = String(formData.get("excerpt") || "").trim();
    const body = sanitizePreviewHtml(
      String(formData.get("body") || "")
    );

    const attachment = formData.get("attachment");

    if (!title) {
      setMessage("Judul wajib diisi sebelum preview.");
      return;
    }

    const plainBody = body.replace(/<[^>]*>/g, "").trim();

    if (
      !plainBody &&
      !(attachment instanceof File && attachment.size > 0) &&
      !entry.attachment_path
    ) {
      setMessage(
        "Isi tulisan atau lampiran wajib ada sebelum preview."
      );
      return;
    }

    setMessage("");

    setPreview({
      title,
      excerpt,
      body,
      attachmentName:
        attachment instanceof File && attachment.size > 0
          ? attachment.name
          : entry.attachment_name || undefined,
    });
  }

  return (
    <>
      <div className="entry-inline-admin">
        <div className="entry-inline-actions">
          <button
            className="admin-mini"
            type="button"
            onClick={() => {
              setMessage("");
              setPreview(null);
              setEditing((value) => !value);
            }}
          >
            {editing ? "batal" : "edit / revisi"}
          </button>

          <form
            action={deleteFolderEntry}
            onSubmit={confirmDelete}
          >
            <input
              type="hidden"
              name="id"
              value={entry.id}
            />

            <button
              className="admin-mini danger"
              type="submit"
            >
              hapus tulisan
            </button>
          </form>
        </div>

        {editing && (
          <form
            action={saveEntry}
            className="proper-admin-form entry-inline-edit-form"
          >
            <input
              type="hidden"
              name="id"
              value={entry.id}
            />

            <div className="admin-two-col">
              <label>
                Judul
                <input
                  name="title"
                  maxLength={180}
                  defaultValue={entry.title}
                  required
                  disabled={saving}
                />
              </label>

              <label>
                Slug
                <input
                  name="slug"
                  maxLength={120}
                  pattern="[a-z0-9-]*"
                  defaultValue={entry.slug}
                  required
                  disabled={saving}
                />
              </label>
            </div>

            <label>
              Ringkasan
              <textarea
                name="excerpt"
                className="summary-field"
                maxLength={420}
                defaultValue={entry.excerpt}
                disabled={saving}
              />
            </label>

            <RichTextEditor
              name="body"
              label="Isi tulisan"
              defaultValue={entry.body}
              maxLength={100000}
              minHeight={300}
              disabled={saving}
            />

            <label className="material-upload-field">
              Ganti materi PDF / JPG / PNG
              <input
                type="file"
                name="attachment"
                accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                disabled={saving}
              />
              <small>
                Maksimal 12 MB. Kosongkan bila tidak ingin
                mengganti file.
              </small>
            </label>

            {entry.attachment_path && (
              <label className="material-remove-check">
                <input
                  type="checkbox"
                  name="remove_attachment"
                  value="yes"
                  disabled={saving}
                />
                Hapus materi saat ini (
                {entry.attachment_name ?? "file"})
              </label>
            )}

            <ContentTableBuilder
              initialValue={entry.table_data ?? null}
            />

            <div className="admin-actions">
              <button
                className="admin-secondary"
                type="button"
                disabled={saving}
                onClick={(event) =>
                  openPreview(event.currentTarget)
                }
              >
                preview
              </button>

              <button
                className="admin-secondary"
                type="submit"
                name="status"
                value="draft"
                disabled={saving}
              >
                {saving ? "menyimpan..." : "simpan draft"}
              </button>

              <button
                className="admin-secondary"
                type="submit"
                name="status"
                value="review"
                disabled={saving}
              >
                {saving ? "menyimpan..." : "review"}
              </button>

              <button
                className="login-submit admin-save"
                type="submit"
                name="status"
                value="published"
                disabled={saving}
              >
                {saving ? "menyimpan..." : "publikasikan"}
              </button>
            </div>

            {message && (
              <div
                className="login-error"
                role="alert"
              >
                {message}
              </div>
            )}
          </form>
        )}
      </div>

      {preview && (
        <div
          className="admin-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Preview tulisan"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreview(null);
            }
          }}
        >
          <article className="admin-preview-modal">
            <div className="admin-preview-header">
              <div>
                <p className="eyebrow">
                  preview tulisan
                </p>
                <span>
                  Belum disimpan atau dipublikasikan
                </span>
              </div>

              <button
                className="admin-secondary"
                type="button"
                onClick={() => setPreview(null)}
              >
                tutup
              </button>
            </div>

            <div className="admin-preview-article">
              <h1>{preview.title}</h1>

              {preview.excerpt && (
                <p className="admin-preview-excerpt">
                  {preview.excerpt}
                </p>
              )}

              <div
                className="jp-rich-render admin-preview-body"
                dangerouslySetInnerHTML={{
                  __html: preview.body,
                }}
              />

              {preview.attachmentName && (
                <div className="admin-preview-attachment">
                  Lampiran: {preview.attachmentName}
                </div>
              )}
            </div>
          </article>
        </div>
      )}
    </>
  );
}
