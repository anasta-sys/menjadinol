"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ContentTableBuilder from "@/app/components/ContentTableBuilder";
import RichTextEditor from "@/app/components/RichTextEditor";
import {
  createFolderEntry,
  updateContentFolder,
} from "@/app/admin/folder-actions";

type Folder = {
  id: string;
  title: string;
  slug: string;
  description: string;
};

export default function FolderAdminControls({
  folder,
}: {
  folder: Folder;
}) {
  const router = useRouter();
  const [showAdd,setShowAdd] = useState(false);
  const [showFolderEdit,setShowFolderEdit] = useState(false);
  const [saving,startSaving] = useTransition();
  const [message,setMessage] = useState("");

  function saveFolder(formData: FormData) {
    setMessage("");

    startSaving(async () => {
      try {
        await updateContentFolder(formData);
        setShowFolderEdit(false);
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Perubahan folder gagal disimpan."
        );
      }
    });
  }

  function saveNewEntry(formData: FormData) {
    setMessage("");

    startSaving(async () => {
      try {
        await createFolderEntry(formData);
        setShowAdd(false);
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Tulisan gagal disimpan."
        );
      }
    });
  }

  return (
    <section className="folder-live-admin">
      <div className="folder-live-admin-head">
        <div>
          <p className="eyebrow">
            admin
          </p>

          <h2>
            Kelola isi folder
          </h2>

          <p>
            Tambah tulisan baru atau ubah informasi folder.
            Edit dan hapus tulisan tersedia langsung pada setiap tulisan.
          </p>
        </div>

        <div className="folder-live-admin-actions">
          <button
            className="admin-mini"
            type="button"
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd
              ? "tutup"
              : "+ tambah tulisan"}
          </button>

          <button
            className="admin-mini"
            type="button"
            onClick={() =>
              setShowFolderEdit((v) => !v)
            }
          >
            {showFolderEdit
              ? "batal"
              : "rename / edit folder"}
          </button>
        </div>
      </div>

      {message && (
        <div
          className="login-error"
          role="alert"
        >
          {message}
        </div>
      )}

      {showFolderEdit && (
        <form
          action={saveFolder}
          className="proper-admin-form folder-live-form"
        >
          <input
            type="hidden"
            name="id"
            value={folder.id}
          />

          <div className="admin-two-col">
            <label>
              Nama folder
              <input
                name="title"
                maxLength={120}
                defaultValue={folder.title}
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
                defaultValue={folder.slug}
                required
                disabled={saving}
              />
            </label>
          </div>

          <label>
            Deskripsi
            <textarea
              name="description"
              className="summary-field"
              maxLength={500}
              defaultValue={folder.description}
              disabled={saving}
            />
          </label>

          <button
            className="login-submit admin-save"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "menyimpan..."
              : "simpan perubahan folder"}
          </button>
        </form>
      )}

      {showAdd && (
        <form
          action={saveNewEntry}
          className="proper-admin-form folder-live-form"
        >
          <input
            type="hidden"
            name="folder_id"
            value={folder.id}
          />

          <div className="admin-two-col">
            <label>
              Judul
              <input
                name="title"
                maxLength={180}
                required
                disabled={saving}
              />
            </label>

            <label>
              Slug opsional
              <input
                name="slug"
                maxLength={120}
                pattern="[a-z0-9-]*"
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
              disabled={saving}
            />
          </label>

          <RichTextEditor
            name="body"
            label="Isi tulisan"
            maxLength={50000}
            minHeight={260}
            disabled={saving}
          />

          <label className="material-upload-field">
              Materi PDF / JPG / PNG (opsional)
          <input
              type="file"
              name="attachment"
              accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
              disabled={saving}
          />
        <small>
            Maksimal 12 MB. File disimpan privat dan divalidasi lagi di server.
        </small>
        </label>
        
          <ContentTableBuilder />

          <label>
            Status
            <select
              name="status"
              defaultValue="draft"
              disabled={saving}
            >
              <option value="draft">
                Draft
              </option>
              <option value="published">
                Published
              </option>
            </select>
          </label>

          <button
            className="login-submit admin-save"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "menyimpan..."
              : "simpan tulisan"}
          </button>
        </form>
      )}
    </section>
  );
}
