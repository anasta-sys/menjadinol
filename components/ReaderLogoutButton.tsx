"use client";

import {
  FormEvent,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

export default function ReaderLogoutButton() {
  const [submitting, setSubmitting] =
    useState(false);

  const formRef =
    useRef<HTMLFormElement | null>(null);

  async function handleLogout(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    /*
     * Hapus session Supabase di BROWSER terlebih dahulu.
     * Ini penting supaya LoginClient tidak membaca session lama
     * lalu langsung mengembalikan user ke /admin.
     *
     * TIDAK menggunakan fetch().
     */
    try {
      const supabase =
        createClient();

      await supabase.auth.signOut();
    } catch (error) {
      console.error(
        "Browser logout warning:",
        error
      );
    }

    /*
     * Setelah browser session bersih,
     * lanjut POST biasa ke server untuk membersihkan
     * cookie reader/server dan menentukan halaman login.
     */
    formRef.current?.submit();
  }

  return (
    <form
      ref={formRef}
      action="/api/logout"
      method="post"
      style={{
        display: "inline",
        margin: 0,
      }}
      onSubmit={handleLogout}
    >
      <button
        type="submit"
        className="reader-logout-button"
        disabled={submitting}
        aria-label="Keluar"
      >
        {submitting
          ? "keluar..."
          : "logout"}
      </button>
    </form>
  );
}
