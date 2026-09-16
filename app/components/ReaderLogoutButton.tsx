"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

export default function ReaderLogoutButton() {
  const [submitting, setSubmitting] =
    useState(false);

  const [readerName, setReaderName] =
    useState("");

  const formRef =
    useRef<HTMLFormElement | null>(null);

  /*
   * Ambil nama pembaca dari sumber yang sama
   * dengan halaman /welcome:
   *
   * 1. reader_users.name
   * 2. user_metadata.name
   *
   * Jika nama gagal dibaca, tombol logout
   * tetap bekerja seperti sebelumnya.
   */
  useEffect(() => {
    let active = true;

    async function loadReaderName() {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !active) return;

        const { data: reader } = await supabase
          .from("reader_users")
          .select("name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!active) return;

        const name =
          reader?.name?.trim() ||
          String(
            user.user_metadata?.name || ""
          ).trim();

        setReaderName(name);
      } catch (error) {
        console.error(
          "Gagal mengambil nama pembaca:",
          error
        );
      }
    }

    loadReaderName();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    /*
     * Hapus session Supabase di BROWSER terlebih dahulu.
     * Logika logout lama tetap dipertahankan.
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
     * cookie reader/server.
     */
    formRef.current?.submit();
  }

  return (
    <div className="reader-account-area">
      {readerName && (
        <span
          className="reader-account-name"
          title={readerName}
        >
          {readerName}
        </span>
      )}

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

      <style jsx>{`
        .reader-account-area {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          min-width: 0;
        }

        .reader-account-name {
          display: block;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          font-family: Georgia, "Times New Roman", serif;
          font-size: 15px;
          font-weight: 500;
          color: #315c46;
        }

        @media (max-width: 980px) {
          .reader-account-name {
            max-width: 120px;
            font-size: 14px;
          }
        }

        @media (max-width: 640px) {
          .reader-account-area {
            gap: 8px;
          }

          .reader-account-name {
            max-width: 85px;
            font-size: 12px;
          }
        }

        @media (max-width: 420px) {
          .reader-account-name {
            max-width: 65px;
          }
        }
      `}</style>
    </div>
  );
}