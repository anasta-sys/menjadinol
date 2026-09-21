"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createContentFolder } from "@/app/admin/folder-actions";

type Section =
  | "tentang"
  | "artikel"
  | "layanan"
  | "ruang-belajar"
  | "ruang-jeda"
  | "kontak";

export default function SectionCreateAdmin({
  section,
  label,
}: {
  section: Section;
  label: string;
}) {
  const router = useRouter();
  const [open,setOpen] = useState(false);
  const [saving,startSaving] = useTransition();
  const [message,setMessage] = useState("");

  function saveFolder(formData: FormData) {
    setMessage("");

    startSaving(async () => {
      try {
        await createContentFolder(formData);
        setOpen(false);
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Fitur gagal disimpan."
        );
      }
    });
  }

  return (
    <section className="learning-admin-box section-create-admin">
      <div className="learning-admin-head">
        <div>
          <span className="folder-label">admin</span>
          <h2>Kelola fitur {label}</h2>
        </div>

        <button
          className="learning-add-button"
          type="button"
          onClick={() => {
            setMessage("");
            setOpen((value) => !value);
          }}
        >
          {open ? "tutup" : "+ buat fitur baru"}
        </button>
      </div>

      {open && (
        <form
          action={saveFolder}
          className="learning-folder-form"
        >
          <input
            type="hidden"
            name="section"
            value={section}
          />

          <label>
            Nama fitur
            <input
              name="title"
              maxLength={120}
              placeholder="Nama fitur"
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
              placeholder="nama-fitur"
              disabled={saving}
            />
          </label>

          <label className="folder-form-full">
            Deskripsi
            <textarea
              name="description"
              maxLength={500}
              placeholder="Deskripsi singkat fitur..."
              disabled={saving}
            />
          </label>

          <button
            className="learning-save-button"
            type="submit"
            disabled={saving}
          >
            {saving ? "menyimpan..." : "simpan fitur"}
          </button>

          {message && (
            <div className="login-error" role="alert">
              {message}
            </div>
          )}
        </form>
      )}
    </section>
  );
}
