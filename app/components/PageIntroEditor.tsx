"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "@/app/components/RichTextEditor";
import {
  updatePageContent,
} from "@/app/admin/page-content-actions";

export default function PageIntroEditor({
  pageKey,
  eyebrow,
  title,
  description,
}: {
  pageKey:
    | "tentang"
    | "perjalanan"
    | "ruang-belajar"
    | "ruang-jeda"
    | "cerita-makna"
    | "kontak";
  eyebrow: string;
  title: string;
  description: string;
}) {
  const router = useRouter();

  const [open,setOpen] =
    useState(false);

  const [saving,startSaving] =
    useTransition();

  const [message,setMessage] =
    useState("");

  function save(
    formData: FormData
  ) {
    setMessage("");

    startSaving(async () => {
      try {
        await updatePageContent(
          formData
        );

        setOpen(false);
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Perubahan halaman gagal disimpan."
        );
      }
    });
  }

  return (
    <div className="page-intro-admin-tools">
      <button
        type="button"
        className="admin-mini"
        onClick={() => {
          setMessage("");
          setOpen(
            (current) => !current
          );
        }}
      >
        {open
          ? "batal"
          : "âœŽ edit halaman"}
      </button>

      {open && (
        <form
          action={save}
          className="proper-admin-form page-intro-edit-form"
        >
          <input
            type="hidden"
            name="page_key"
            value={pageKey}
          />

          <label>
            Label kecil
            <input
              name="eyebrow"
              maxLength={60}
              defaultValue={eyebrow}
              disabled={saving}
            />
          </label>

          <label>
            Judul utama
            <textarea
              name="title"
              className="summary-field"
              maxLength={240}
              defaultValue={title}
              required
              disabled={saving}
            />
          </label>

          <RichTextEditor
            name="description"
            label="Deskripsi"
            defaultValue={description}
            maxLength={2000}
            minHeight={130}
            disabled={saving}
          />

          <button
            className="login-submit admin-save"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "menyimpan..."
              : "simpan perubahan halaman"}
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

