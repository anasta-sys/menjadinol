"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateContentFolder,
  deleteContentFolder,
} from "@/app/admin/folder-actions";

type Folder = {
  id: string;
  title: string;
  slug: string;
  description: string;
};

function confirmDelete(event: React.FormEvent<HTMLFormElement>) {
  const ok = window.confirm(
    "Yakin fitur ini dihapus?\n\nSemua tulisan di dalam fitur ini juga akan ikut terhapus."
  );

  if (!ok) {
    event.preventDefault();
  }
}

export default function SectionFolderAdminActions({
  folder,
}: {
  folder: Folder;
}) {
  const router = useRouter();
  const [editing,setEditing] = useState(false);
  const [saving,startSaving] = useTransition();
  const [message,setMessage] = useState("");

  function saveFolder(formData: FormData) {
    setMessage("");

    startSaving(async () => {
      try {
        await updateContentFolder(formData);

        // Tutup form HANYA setelah server action berhasil.
        setEditing(false);

        // Ambil ulang data terbaru dari server.
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Perubahan fitur gagal disimpan."
        );
      }
    });
  }

  return (
    <div className="section-folder-admin-tools">
      <div className="section-folder-admin-buttons">
        <button
          className="admin-mini"
          type="button"
          onClick={() => {
            setMessage("");
            setEditing((value) => !value);
          }}
        >
          {editing ? "batal" : "edit / rename"}
        </button>

        <form
          action={deleteContentFolder}
          onSubmit={confirmDelete}
        >
          <input
            type="hidden"
            name="id"
            value={folder.id}
          />

          <button
            className="admin-mini danger"
            type="submit"
          >
            hapus
          </button>
        </form>
      </div>

      {editing && (
        <form
          action={saveFolder}
          className="proper-admin-form section-folder-inline-edit"
        >
          <input
            type="hidden"
            name="id"
            value={folder.id}
          />

          <div className="admin-two-col">
            <label>
              Nama fitur
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
              : "simpan perubahan"}
          </button>

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
  );
}
