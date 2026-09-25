import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdminOrSuperAdmin } from "@/lib/admin-auth";
import { sendCeritaReply } from "./actions";

export const dynamic = "force-dynamic";

type ConversationRow = {
  id: string;
  reader_id: string;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type ReaderRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
};

function statusLabel(status: string) {
  switch (status) {
    case "waiting_read":
      return "Menunggu dibaca";
    case "read":
      return "Sudah dibaca";
    case "new_reply":
      return "Balasan baru";
    case "waiting_reply":
      return "Menunggu balasan";
    case "done":
      return "Selesai";
    default:
      return status;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Konfigurasi Supabase server belum lengkap.");
  }

  return createServiceClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export default async function RuangCeritaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrSuperAdmin();

  const { id } = await params;
  const supabase = serviceClient();

  const { data: conversationData, error: conversationError } =
    await supabase
      .from("cerita_conversations")
      .select(
        "id, reader_id, title, status, created_at, updated_at"
      )
      .eq("id", id)
      .maybeSingle();

  if (conversationError) {
    throw new Error(conversationError.message);
  }

  if (!conversationData) {
    notFound();
  }

  const conversation =
    conversationData as ConversationRow;

  const { data: readerData, error: readerError } =
    await supabase
      .from("reader_users")
      .select("id, full_name, email")
      .eq("id", conversation.reader_id)
      .maybeSingle();

  if (readerError) {
    throw new Error(readerError.message);
  }

  const reader = readerData as ReaderRow | null;

  const { data: messageData, error: messageError } =
    await supabase
      .from("cerita_messages")
      .select(
        "id, conversation_id, role, content, created_at"
      )
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

  if (messageError) {
    throw new Error(messageError.message);
  }

  const messages = (messageData ?? []) as MessageRow[];

  if (conversation.status === "waiting_read") {
    await supabase
      .from("cerita_conversations")
      .update({
        status: "read",
      })
      .eq("id", conversation.id);
  }

  async function replyAction(formData: FormData) {
    "use server";

    const content = String(
      formData.get("content") ?? ""
    ).trim();

    await sendCeritaReply(conversation.id, content);
  }

  return (
    <main className="rc-detail-page">
      <div className="rc-detail-shell">
        <header className="rc-detail-top">
          <div>
            <p className="rc-detail-eyebrow">
              RUANG CERITA / SURAT
            </p>

            <h1>
              {reader?.full_name?.trim() || "Reader"}
            </h1>

            <p className="rc-reader-email">
              {reader?.email || ""}
            </p>
          </div>

          <Link
            href="/admin/superadmin/ruang-cerita"
            className="rc-back"
          >
            &lt; Kembali ke Ruang Cerita
          </Link>
        </header>

        <section className="rc-detail-info">
          <div>
            <span>Status</span>
            <strong>
              {statusLabel(
                conversation.status === "waiting_read"
                  ? "read"
                  : conversation.status
              )}
            </strong>
          </div>

          <div className="rc-info-line" />

          <div>
            <span>Dikirim</span>
            <strong>
              {formatDate(conversation.created_at)}
            </strong>
          </div>

          <div className="rc-info-line" />

          <div>
            <span>Isi thread</span>
            <strong>{messages.length}</strong>
          </div>
        </section>

        <section className="rc-letter">
          <div className="rc-letter-heading">
            <span>RUANG CERITA</span>

            <h2>
              {conversation.title?.trim() ||
                "Cerita tanpa judul"}
            </h2>
          </div>

          <div className="rc-thread">
            {messages.length === 0 ? (
              <div className="rc-empty-message">
                Belum ada isi cerita pada percakapan ini.
              </div>
            ) : (
              messages.map((message) => {
                const fromReader =
                  message.role === "reader" ||
                  message.role === "user";

                return (
                  <article
                    key={message.id}
                    className={`rc-letter-entry ${
                      fromReader ? "reader" : "admin"
                    }`}
                  >
                    <div className="rc-entry-head">
                      <div>
                        <span>
                          {fromReader
                            ? reader?.full_name?.trim() ||
                              "Reader"
                            : "Pengelola Menjadi Nol"}
                        </span>

                        <time>
                          {formatDate(message.created_at)}
                        </time>
                      </div>

                      <strong>
                        {fromReader
                          ? "CERITA"
                          : "BALASAN"}
                      </strong>
                    </div>

                    <div className="rc-entry-content">
                      {message.content}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="rc-reply-section">
          <div className="rc-reply-heading">
            <span>BALAS CERITA</span>
            <h2>Tulis balasan dengan tenang.</h2>
            <p>
              Balasan akan muncul di ruang privat reader
              pada thread yang sama.
            </p>
          </div>

          <form
            action={replyAction}
            className="rc-reply-form"
          >
            <textarea
              name="content"
              required
              maxLength={20000}
              placeholder="Tulis balasan untuk cerita ini..."
            />

            <div className="rc-reply-footer">
              <p>
                Hanya admin dan superadmin yang dapat
                membaca dan membalas ruang ini.
              </p>

              <button type="submit">
                Kirim Balasan
                <span aria-hidden="true">&gt;</span>
              </button>
            </div>
          </form>
        </section>
      </div>

      <style>{`
        .rc-detail-page {
          min-height: calc(100vh - 90px);
          padding: 34px 24px 90px;
          position: relative;
          background:
            linear-gradient(
              rgba(247, 244, 236, .82),
              rgba(247, 244, 236, .88)
            ),
            url("/ruang-cerita-nature.png") center / cover fixed no-repeat,
            #f7f4ec;
          color: #17382b;
        }

        .rc-detail-shell {
          width: min(1000px, 100%);
          margin: 0 auto;
        }

        .rc-detail-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 24px;
        }

        .rc-detail-eyebrow {
          margin: 0 0 8px;
          color: #78866b;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .18em;
        }

        .rc-detail-top h1 {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 36px;
          font-weight: 500;
          line-height: 1.1;
        }

        .rc-reader-email {
          margin: 7px 0 0;
          color: #89877e;
          font-size: 12px;
        }

        .rc-back {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 17px;
          border: 1px solid rgba(23, 77, 56, .22);
          border-radius: 999px;
          background: rgba(255, 253, 247, .75);
          color: #174d38;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
          transition: .16s ease;
        }

        .rc-back:hover {
          background: #fff;
          border-color: rgba(23, 77, 56, .42);
          transform: translateY(-1px);
        }

        .rc-detail-info {
          display: flex;
          align-items: center;
          gap: 22px;
          min-height: 64px;
          padding: 12px 21px;
          margin-bottom: 18px;
          border: 1px solid rgba(46, 70, 53, .11);
          border-radius: 18px;
          background: rgba(255, 255, 255, .68);
        }

        .rc-detail-info > div:not(.rc-info-line) {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .rc-detail-info span {
          color: #8a887f;
          font-size: 10px;
        }

        .rc-detail-info strong {
          color: #315b43;
          font-size: 12px;
        }

        .rc-info-line {
          width: 1px;
          height: 24px;
          background: rgba(46, 70, 53, .12);
        }

        .rc-letter {
          overflow: hidden;
          border: 1px solid rgba(46, 70, 53, .12);
          border-radius: 24px;
          background:
            linear-gradient(
              rgba(255, 254, 249, .94),
              rgba(251, 249, 241, .94)
            );
          box-shadow:
            0 18px 48px rgba(51, 63, 49, .055);
        }
        .rc-letter-heading {
          padding: 29px 34px 25px;
          border-bottom:
            1px solid rgba(46, 70, 53, .09);
          background:
            linear-gradient(
              120deg,
              rgba(252, 250, 244, .9),
              rgba(237, 243, 232, .68)
            );
        }

        .rc-letter-heading > span,
        .rc-reply-heading > span {
          color: #8c927e;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .2em;
        }

        .rc-letter-heading h2 {
          margin: 8px 0 0;
          color: #203d2e;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 24px;
          font-weight: 500;
          line-height: 1.35;
        }

        .rc-thread {
          padding: 4px 34px 12px;
        }

        .rc-letter-entry {
          position: relative;
          padding: 31px 4px 34px;
          border-bottom:
            1px solid rgba(46, 70, 53, .09);
        }

        .rc-letter-entry:last-child {
          border-bottom: 0;
        }

        .rc-letter-entry.admin {
          margin: 15px 0;
          padding: 27px 28px 30px;
          border: 1px solid rgba(67, 97, 68, .11);
          border-radius: 18px;
          background: rgba(235, 241, 230, .55);
        }

        .rc-entry-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 18px;
        }

        .rc-entry-head > div {
          display: grid;
          gap: 4px;
        }

        .rc-entry-head > div > span {
          color: #335a43;
          font-family: Georgia, serif;
          font-size: 15px;
        }

        .rc-entry-head time {
          color: #9a968c;
          font-size: 9px;
        }

        .rc-entry-head > strong {
          color: #9b987f;
          font-size: 8px;
          letter-spacing: .18em;
        }

        .rc-entry-content {
          color: #37483e;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 16px;
          line-height: 1.9;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .rc-empty-message {
          padding: 50px 0;
          color: #918e84;
          text-align: center;
          font-size: 13px;
        }

        .rc-reply-section {
          margin-top: 20px;
          padding: 28px 30px 30px;
          border: 1px solid rgba(46, 70, 53, .11);
          border-radius: 24px;
          background: rgba(255, 255, 255, .7);
          box-shadow:
            0 15px 40px rgba(51, 63, 49, .045);
        }

        .rc-reply-heading h2 {
          margin: 7px 0 5px;
          color: #203d2e;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 22px;
          font-weight: 500;
        }

        .rc-reply-heading p {
          margin: 0;
          color: #8c8980;
          font-size: 11px;
        }

        .rc-reply-form {
          margin-top: 20px;
        }

        .rc-reply-form textarea {
          width: 100%;
          min-height: 190px;
          resize: vertical;
          box-sizing: border-box;
          padding: 20px;
          border: 1px solid rgba(46, 76, 56, .18);
          border-radius: 18px;
          outline: none;
          background: #fffef9;
          color: #304438;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 15px;
          line-height: 1.75;
          transition: .16s ease;
        }

        .rc-reply-form textarea:focus {
          border-color: rgba(23, 77, 56, .42);
          box-shadow:
            0 0 0 3px rgba(23, 77, 56, .05);
        }

        .rc-reply-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 13px;
        }

        .rc-reply-footer p {
          margin: 0;
          color: #99958c;
          font-size: 9px;
        }

        .rc-reply-footer button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-width: 138px;
          min-height: 41px;
          padding: 0 18px;
          border: 1px solid rgba(23, 77, 56, .28);
          border-radius: 999px;
          background: rgba(255, 253, 247, .8);
          color: #174d38;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          transition: .16s ease;
        }

        .rc-reply-footer button:hover {
          border-color: #174d38;
          background: #174d38;
          color: #fff;
          transform: translateY(-1px);
        }

        .rc-reply-footer button span {
          font-size: 13px;
        }

        @media (max-width: 700px) {
          .rc-detail-page {
            padding: 25px 14px 65px;
          }

          .rc-detail-top {
            flex-direction: column;
          }

          .rc-detail-info {
            overflow-x: auto;
          }

          .rc-letter-heading {
            padding: 23px 20px;
          }

          .rc-thread {
            padding: 3px 20px 10px;
          }

          .rc-letter-entry.admin {
            padding: 22px 18px;
          }

          .rc-reply-section {
            padding: 23px 20px;
          }

          .rc-reply-footer {
            align-items: flex-start;
            flex-direction: column;
          }

          .rc-reply-footer button {
            width: 100%;
          }
        }

        /* =====================================================
           RUANG CERITA ADMIN - EDITORIAL THREAD V2
           ===================================================== */

        .rc-detail-shell {
          width: min(1180px, calc(100% - 40px)) !important;
        }

        .rc-detail-top {
          align-items: center !important;
          margin-bottom: 20px !important;
          padding: 0 4px !important;
        }

        .rc-detail-top h1 {
          font-size: clamp(34px, 3vw, 46px) !important;
          letter-spacing: -0.025em !important;
        }

        .rc-reader-email {
          margin-top: 8px !important;
          font-size: 12px !important;
        }

        .rc-detail-info {
          min-height: 70px !important;
          padding: 14px 24px !important;
          margin-bottom: 20px !important;
          border-radius: 20px !important;
          background: rgba(255, 253, 247, .82) !important;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 28px rgba(41, 63, 48, .045) !important;
        }

        .rc-detail-info span {
          font-size: 10px !important;
          letter-spacing: .02em !important;
        }

        .rc-detail-info strong {
          font-size: 12px !important;
        }

        .rc-letter {
          border-radius: 28px !important;
          background: rgba(255, 253, 247, .90) !important;
          backdrop-filter: blur(12px);
          box-shadow:
            0 22px 60px rgba(42, 61, 47, .075) !important;
        }

        .rc-letter-heading {
          padding: 34px 42px 30px !important;
          background:
            linear-gradient(
              120deg,
              rgba(255, 253, 247, .94),
              rgba(236, 242, 230, .76)
            ) !important;
        }

        .rc-letter-heading h2 {
          max-width: 820px !important;
          margin-top: 10px !important;
          font-size: clamp(25px, 2.2vw, 32px) !important;
          line-height: 1.28 !important;
        }

        .rc-thread {
          display: flex !important;
          flex-direction: column !important;
          gap: 22px !important;
          padding: 34px 42px 42px !important;
        }

        .rc-letter-entry {
          width: min(82%, 820px) !important;
          box-sizing: border-box !important;
          padding: 24px 28px 27px !important;
          margin: 0 !important;
          border: 1px solid rgba(68, 83, 68, .10) !important;
          border-radius: 22px !important;
          box-shadow: 0 7px 22px rgba(44, 61, 48, .035) !important;
        }

        .rc-letter-entry.reader {
          align-self: flex-start !important;
          background:
            linear-gradient(
              145deg,
              rgba(255, 252, 241, .97),
              rgba(252, 248, 235, .94)
            ) !important;
        }

        .rc-letter-entry.admin {
          align-self: flex-end !important;
          background:
            linear-gradient(
              145deg,
              rgba(235, 243, 230, .96),
              rgba(226, 238, 220, .88)
            ) !important;
          border-color: rgba(67, 105, 72, .14) !important;
        }

        .rc-entry-head {
          align-items: center !important;
          margin-bottom: 17px !important;
        }

        .rc-entry-head > div > span {
          color: #244b36 !important;
          font-size: 16px !important;
          font-weight: 600 !important;
        }

        .rc-entry-head time {
          margin-top: 2px !important;
          color: #929287 !important;
          font-family: Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 10px !important;
        }

        .rc-entry-head > strong {
          padding: 5px 9px !important;
          border: 1px solid rgba(75, 98, 75, .11) !important;
          border-radius: 999px !important;
          color: #7f896f !important;
          background: rgba(255, 255, 255, .42) !important;
          font-family: Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 8px !important;
          letter-spacing: .16em !important;
        }

        .rc-entry-content {
          color: #34483b !important;
          font-size: 17px !important;
          line-height: 1.85 !important;
        }

        .rc-letter-entry.admin .rc-entry-content {
          color: #294535 !important;
        }

        .rc-reply-section {
          margin-top: 24px !important;
          padding: 34px 38px 36px !important;
          border-radius: 28px !important;
          background: rgba(255, 253, 247, .91) !important;
          backdrop-filter: blur(12px);
          box-shadow:
            0 18px 50px rgba(42, 61, 47, .06) !important;
        }

        .rc-reply-heading {
          max-width: 700px !important;
        }

        .rc-reply-heading h2 {
          margin-top: 8px !important;
          font-size: 27px !important;
        }

        .rc-reply-heading p {
          margin-top: 5px !important;
          font-size: 12px !important;
          line-height: 1.6 !important;
        }

        .rc-reply-form {
          margin-top: 22px !important;
        }

        .rc-reply-form textarea {
          min-height: 165px !important;
          padding: 22px 24px !important;
          border-radius: 20px !important;
          background: rgba(255, 254, 249, .95) !important;
          font-size: 16px !important;
          line-height: 1.8 !important;
        }

        .rc-reply-footer {
          margin-top: 15px !important;
        }

        .rc-reply-footer p {
          max-width: 520px !important;
          font-size: 10px !important;
          line-height: 1.5 !important;
        }

        .rc-reply-footer button {
          min-width: 150px !important;
          min-height: 43px !important;
          background: rgba(255, 253, 247, .92) !important;
          box-shadow: 0 5px 16px rgba(23, 77, 56, .05) !important;
        }

        .rc-reply-footer button:hover {
          background: #174d38 !important;
        }

        @media (max-width: 800px) {
          .rc-detail-shell {
            width: 100% !important;
          }

          .rc-letter-heading {
            padding: 27px 22px 24px !important;
          }

          .rc-thread {
            gap: 16px !important;
            padding: 22px 18px 28px !important;
          }

          .rc-letter-entry,
          .rc-letter-entry.reader,
          .rc-letter-entry.admin {
            width: 94% !important;
            padding: 20px 20px 22px !important;
          }

          .rc-letter-entry.reader {
            align-self: flex-start !important;
          }

          .rc-letter-entry.admin {
            align-self: flex-end !important;
          }

          .rc-entry-content {
            font-size: 15px !important;
          }

          .rc-reply-section {
            padding: 26px 20px !important;
          }
        }

        /* =====================================================
           RUANG CERITA ADMIN - EDITORIAL LETTER V3
           ===================================================== */

        .rc-detail-page {
          padding-top: 42px !important;
        }

        .rc-detail-shell {
          width: min(1120px, calc(100% - 40px)) !important;
        }

        /* HEADER */
        .rc-detail-top {
          position: relative;
          align-items: flex-end !important;
          margin-bottom: 22px !important;
          padding: 0 6px 18px !important;
          border-bottom: 1px solid rgba(44, 75, 55, .13);
        }

        .rc-detail-eyebrow {
          margin-bottom: 10px !important;
          color: #8d7b45 !important;
          font-size: 9px !important;
          letter-spacing: .22em !important;
        }

        .rc-detail-top h1 {
          color: #173f2d !important;
          font-size: 40px !important;
          font-weight: 400 !important;
          line-height: 1 !important;
        }

        .rc-reader-email {
          margin-top: 10px !important;
          color: #7e8178 !important;
          font-family: Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 11px !important;
        }

        .rc-back {
          min-height: 38px !important;
          padding: 0 17px !important;
          border-color: rgba(23, 77, 56, .18) !important;
          background: rgba(255, 253, 247, .70) !important;
          box-shadow: none !important;
        }

        /* INFO STRIP */
        .rc-detail-info {
          justify-content: flex-start !important;
          min-height: 58px !important;
          margin-bottom: 18px !important;
          padding: 9px 22px !important;
          border-radius: 15px !important;
          background: rgba(255, 253, 247, .72) !important;
          box-shadow: none !important;
          backdrop-filter: blur(9px);
        }

        .rc-detail-info > div:not(.rc-info-line) {
          gap: 7px !important;
        }

        .rc-detail-info span {
          color: #969389 !important;
          font-size: 9px !important;
        }

        .rc-detail-info strong {
          color: #315941 !important;
          font-size: 11px !important;
        }

        /* MAIN LETTER */
        .rc-letter {
          overflow: hidden !important;
          border: 1px solid rgba(50, 75, 56, .10) !important;
          border-radius: 22px !important;
          background: rgba(255, 254, 249, .93) !important;
          box-shadow:
            0 18px 50px rgba(42, 60, 47, .055) !important;
        }

        .rc-letter-heading {
          position: relative;
          padding: 34px 46px 30px !important;
          border-bottom: 1px solid rgba(51, 75, 57, .09) !important;
          background:
            linear-gradient(
              100deg,
              rgba(255, 254, 249, .98),
              rgba(244, 247, 238, .92)
            ) !important;
        }

        .rc-letter-heading::after {
          content: "";
          position: absolute;
          left: 46px;
          bottom: 0;
          width: 72px;
          height: 2px;
          background: rgba(176, 141, 59, .55);
        }

        .rc-letter-heading > span {
          color: #998653 !important;
          font-size: 8px !important;
          letter-spacing: .24em !important;
        }

        .rc-letter-heading h2 {
          max-width: 800px !important;
          margin: 10px 0 0 !important;
          color: #193f2d !important;
          font-size: 27px !important;
          font-weight: 400 !important;
          line-height: 1.35 !important;
        }

        /* THREAD = ONE CONTINUOUS LETTER */
        .rc-thread {
          position: relative;
          display: block !important;
          padding: 12px 46px 22px !important;
        }

        .rc-thread::before {
          content: "";
          position: absolute;
          top: 42px;
          bottom: 48px;
          left: 51px;
          width: 1px;
          background:
            linear-gradient(
              to bottom,
              rgba(171, 142, 72, .36),
              rgba(72, 105, 78, .12)
            );
        }

        .rc-letter-entry,
        .rc-letter-entry.reader,
        .rc-letter-entry.admin {
          position: relative !important;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 30px 12px 32px 34px !important;
          border: 0 !important;
          border-bottom: 1px solid rgba(50, 75, 56, .08) !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .rc-letter-entry:last-child {
          border-bottom: 0 !important;
        }

        .rc-letter-entry::before {
          content: "";
          position: absolute;
          top: 36px;
          left: 0;
          width: 11px;
          height: 11px;
          box-sizing: border-box;
          border: 3px solid #fffdf7;
          border-radius: 50%;
          background: #b39a58;
          box-shadow: 0 0 0 1px rgba(179, 154, 88, .25);
        }

        .rc-letter-entry.admin::before {
          background: #668268;
          box-shadow: 0 0 0 1px rgba(73, 110, 79, .24);
        }

        .rc-entry-head {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 20px !important;
          margin-bottom: 15px !important;
        }

        .rc-entry-head > div {
          gap: 5px !important;
        }

        .rc-entry-head > div > span {
          color: #264c37 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 15px !important;
          font-weight: 600 !important;
        }

        .rc-letter-entry.admin .rc-entry-head > div > span {
          color: #49684d !important;
        }

        .rc-entry-head time {
          color: #a09c91 !important;
          font-family: Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 9px !important;
        }

        .rc-entry-head > strong {
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          color: #aa9763 !important;
          font-family: Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 8px !important;
          font-weight: 700 !important;
          letter-spacing: .20em !important;
        }

        .rc-letter-entry.admin .rc-entry-head > strong {
          color: #6d876e !important;
        }

        .rc-entry-content {
          max-width: 850px !important;
          padding: 0 !important;
          color: #394a40 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 16px !important;
          line-height: 1.9 !important;
          white-space: pre-wrap !important;
        }

        .rc-letter-entry.admin .rc-entry-content {
          margin-left: 30px !important;
          padding: 17px 20px !important;
          border-left: 2px solid rgba(82, 119, 86, .28) !important;
          border-radius: 0 12px 12px 0 !important;
          background: rgba(232, 240, 227, .58) !important;
          color: #30483a !important;
        }

        /* REPLY COMPOSER */
        .rc-reply-section {
          margin-top: 18px !important;
          padding: 31px 38px 32px !important;
          border: 1px solid rgba(50, 75, 56, .10) !important;
          border-radius: 22px !important;
          background: rgba(255, 254, 249, .91) !important;
          box-shadow:
            0 15px 42px rgba(42, 60, 47, .045) !important;
        }

        .rc-reply-heading > span {
          color: #998653 !important;
          font-size: 8px !important;
          letter-spacing: .22em !important;
        }

        .rc-reply-heading h2 {
          margin: 8px 0 5px !important;
          color: #193f2d !important;
          font-size: 24px !important;
          font-weight: 400 !important;
        }

        .rc-reply-heading p {
          color: #8e8d84 !important;
          font-size: 11px !important;
        }

        .rc-reply-form textarea {
          min-height: 150px !important;
          padding: 20px 22px !important;
          border: 1px solid rgba(47, 82, 59, .17) !important;
          border-radius: 15px !important;
          background: rgba(255, 255, 252, .88) !important;
          color: #31463a !important;
          font-size: 15px !important;
          box-shadow: inset 0 1px 2px rgba(45, 60, 48, .025);
        }

        .rc-reply-form textarea:focus {
          border-color: rgba(23, 77, 56, .38) !important;
          box-shadow: 0 0 0 3px rgba(23, 77, 56, .045) !important;
        }

        .rc-reply-footer button {
          min-width: 145px !important;
          min-height: 41px !important;
          border: 1px solid rgba(23, 77, 56, .28) !important;
          background: transparent !important;
          color: #174d38 !important;
          box-shadow: none !important;
        }

        .rc-reply-footer button:hover {
          border-color: #174d38 !important;
          background: #174d38 !important;
          color: #fff !important;
        }

        @media (max-width: 800px) {
          .rc-detail-page {
            padding: 26px 14px 60px !important;
          }

          .rc-detail-shell {
            width: 100% !important;
          }

          .rc-detail-top {
            align-items: flex-start !important;
          }

          .rc-detail-top h1 {
            font-size: 32px !important;
          }

          .rc-letter-heading {
            padding: 27px 24px 25px !important;
          }

          .rc-letter-heading::after {
            left: 24px !important;
          }

          .rc-thread {
            padding: 8px 22px 18px !important;
          }

          .rc-thread::before {
            left: 27px !important;
          }

          .rc-letter-entry,
          .rc-letter-entry.reader,
          .rc-letter-entry.admin {
            padding:
              26px 4px 28px 27px !important;
          }

          .rc-letter-entry.admin .rc-entry-content {
            margin-left: 0 !important;
            padding: 15px 16px !important;
          }

          .rc-entry-content {
            font-size: 15px !important;
          }

          .rc-reply-section {
            padding: 27px 22px !important;
          }
        }

        /* =====================================================
           RUANG CERITA ADMIN - FINAL BOTANICAL LETTER THEME
           ===================================================== */

        .rc-detail-page {
          min-height: calc(100vh - 80px) !important;
          padding: 34px 24px 80px !important;
          background:
            linear-gradient(
              rgba(250, 247, 237, .80),
              rgba(250, 247, 237, .86)
            ),
            url("/ruang-cerita-nature.png")
              center top / cover fixed no-repeat,
            #f6f1e5 !important;
          color: #183d2d !important;
        }

        .rc-detail-shell {
          width: min(1120px, 100%) !important;
          margin: 0 auto !important;
        }

        /* ================= HEADER ================= */

        .rc-detail-top {
          display: flex !important;
          align-items: flex-end !important;
          justify-content: space-between !important;
          gap: 28px !important;
          margin: 0 0 18px !important;
          padding: 0 8px 18px !important;
          border-bottom:
            1px solid rgba(154, 127, 65, .20) !important;
        }

        .rc-detail-eyebrow {
          margin: 0 0 8px !important;
          color: #8c6f27 !important;
          font-family:
            Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 9px !important;
          font-weight: 800 !important;
          letter-spacing: .23em !important;
        }

        .rc-detail-top h1 {
          margin: 0 !important;
          color: #173f2d !important;
          font-family:
            Georgia, "Times New Roman", serif !important;
          font-size: 39px !important;
          font-weight: 400 !important;
          line-height: 1.05 !important;
          letter-spacing: -.02em !important;
        }

        .rc-reader-email {
          margin: 8px 0 0 !important;
          color: #827d70 !important;
          font-family:
            Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 11px !important;
        }

        .rc-back {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 40px !important;
          padding: 0 19px !important;
          border:
            1px solid rgba(139, 109, 40, .42) !important;
          border-radius: 999px !important;
          background:
            rgba(255, 252, 243, .76) !important;
          color: #214d38 !important;
          font-family:
            Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          text-decoration: none !important;
          box-shadow:
            0 4px 15px rgba(62, 66, 48, .04) !important;
          transition: .16s ease !important;
        }

        .rc-back:hover {
          background: #fffdf6 !important;
          border-color:
            rgba(117, 88, 26, .65) !important;
          transform: translateY(-1px);
        }

        /* ================= INFO ================= */

        .rc-detail-info {
          display: flex !important;
          align-items: stretch !important;
          gap: 0 !important;
          min-height: 64px !important;
          padding: 0 12px !important;
          margin-bottom: 18px !important;
          overflow-x: auto !important;
          border:
            1px solid rgba(117, 102, 66, .16) !important;
          border-radius: 18px !important;
          background:
            rgba(255, 252, 244, .80) !important;
          backdrop-filter: blur(10px);
          box-shadow:
            0 8px 25px rgba(54, 65, 49, .035) !important;
        }

        .rc-detail-info > div:not(.rc-info-line) {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          min-width: max-content !important;
          padding: 0 22px !important;
        }

        .rc-detail-info span {
          color: #989083 !important;
          font-family:
            Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 9px !important;
        }

        .rc-detail-info strong {
          color: #294f39 !important;
          font-family:
            Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 11px !important;
          font-weight: 700 !important;
        }

        .rc-detail-info > div:first-child strong {
          color: #9a6f15 !important;
        }

        .rc-info-line {
          width: 1px !important;
          height: 30px !important;
          margin: auto 0 !important;
          flex: 0 0 1px !important;
          background:
            rgba(124, 108, 71, .16) !important;
        }

        /* ================= LETTER ================= */

        .rc-letter {
          overflow: hidden !important;
          border:
            1px solid rgba(107, 91, 59, .13) !important;
          border-radius: 25px !important;
          background:
            rgba(255, 253, 247, .92) !important;
          backdrop-filter: blur(12px);
          box-shadow:
            0 20px 55px rgba(54, 62, 47, .07) !important;
        }

        .rc-letter-heading {
          position: relative !important;
          padding: 31px 54px 29px !important;
          border-bottom:
            1px solid rgba(113, 95, 58, .10) !important;
          background:
            linear-gradient(
              105deg,
              rgba(255, 252, 243, .96),
              rgba(244, 247, 236, .90)
            ) !important;
        }

        .rc-letter-heading::after {
          content: "" !important;
          position: absolute !important;
          left: 54px !important;
          bottom: 0 !important;
          width: 55px !important;
          height: 2px !important;
          background: #b28b32 !important;
          opacity: .72 !important;
        }

        .rc-letter-heading > span {
          color: #9b792d !important;
          font-family:
            Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 8px !important;
          font-weight: 800 !important;
          letter-spacing: .25em !important;
        }

        .rc-letter-heading h2 {
          max-width: 850px !important;
          margin: 9px 0 0 !important;
          color: #173e2d !important;
          font-family:
            Georgia, "Times New Roman", serif !important;
          font-size: 27px !important;
          font-weight: 400 !important;
          line-height: 1.35 !important;
        }

        /* ================= THREAD ================= */

        .rc-thread {
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 14px !important;
          padding: 27px 38px 35px 72px !important;
        }

        .rc-thread::before {
          content: "" !important;
          position: absolute !important;
          top: 42px !important;
          bottom: 47px !important;
          left: 48px !important;
          width: 1px !important;
          background:
            linear-gradient(
              to bottom,
              rgba(177, 141, 53, .55),
              rgba(84, 126, 88, .42)
            ) !important;
        }

        .rc-letter-entry,
        .rc-letter-entry.reader,
        .rc-letter-entry.admin {
          position: relative !important;
          width: 100% !important;
          max-width: none !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 19px 24px 21px !important;
          border-radius: 16px !important;
          box-shadow: none !important;
        }

        .rc-letter-entry::before {
          content: "" !important;
          position: absolute !important;
          top: 25px !important;
          left: -31px !important;
          width: 11px !important;
          height: 11px !important;
          box-sizing: border-box !important;
          border: 3px solid #fffaf0 !important;
          border-radius: 50% !important;
          background: #b6923d !important;
          box-shadow:
            0 0 0 1px rgba(161, 125, 41, .42) !important;
        }

        .rc-letter-entry.reader {
          border:
            1px solid rgba(176, 143, 70, .17) !important;
          background:
            linear-gradient(
              105deg,
              rgba(255, 251, 239, .91),
              rgba(251, 246, 231, .72)
            ) !important;
        }

        .rc-letter-entry.admin {
          border:
            1px solid rgba(79, 119, 81, .15) !important;
          border-left:
            3px solid rgba(47, 113, 72, .78) !important;
          background:
            linear-gradient(
              105deg,
              rgba(231, 241, 226, .82),
              rgba(241, 246, 235, .70)
            ) !important;
        }

        .rc-letter-entry.admin::before {
          background: #4e8058 !important;
          box-shadow:
            0 0 0 1px rgba(55, 107, 68, .42) !important;
        }

        .rc-entry-head {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 20px !important;
          margin-bottom: 12px !important;
        }

        .rc-entry-head > div {
          display: grid !important;
          gap: 3px !important;
        }

        .rc-entry-head > div > span {
          color: #214c35 !important;
          font-family:
            Georgia, "Times New Roman", serif !important;
          font-size: 15px !important;
          font-weight: 600 !important;
        }

        .rc-letter-entry.admin
        .rc-entry-head > div > span {
          color: #28553a !important;
        }

        .rc-entry-head time {
          color: #918c80 !important;
          font-family:
            Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 9px !important;
        }

        .rc-entry-head > strong {
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
          color: #9d7c32 !important;
          font-family:
            Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 8px !important;
          font-weight: 800 !important;
          letter-spacing: .22em !important;
        }

        .rc-letter-entry.admin
        .rc-entry-head > strong {
          color: #628066 !important;
        }

        .rc-entry-content,
        .rc-letter-entry.admin .rc-entry-content {
          max-width: 900px !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          color: #34463a !important;
          font-family:
            Georgia, "Times New Roman", serif !important;
          font-size: 15px !important;
          line-height: 1.82 !important;
          white-space: pre-wrap !important;
          overflow-wrap: anywhere !important;
        }

        /* ================= REPLY ================= */

        .rc-reply-section {
          position: relative !important;
          margin-top: 18px !important;
          padding: 29px 38px 30px !important;
          overflow: hidden !important;
          border:
            1px solid rgba(106, 91, 59, .13) !important;
          border-radius: 23px !important;
          background:
            rgba(255, 253, 247, .92) !important;
          backdrop-filter: blur(12px);
          box-shadow:
            0 17px 45px rgba(54, 62, 47, .055) !important;
        }

        .rc-reply-section::after {
          content: "" !important;
          position: absolute !important;
          right: -55px !important;
          bottom: -65px !important;
          width: 180px !important;
          height: 180px !important;
          border-radius: 50% !important;
          background:
            radial-gradient(
              circle,
              rgba(160, 183, 137, .12),
              transparent 68%
            ) !important;
          pointer-events: none !important;
        }

        .rc-reply-heading > span {
          color: #9b792d !important;
          font-family:
            Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 8px !important;
          font-weight: 800 !important;
          letter-spacing: .24em !important;
        }

        .rc-reply-heading h2 {
          margin: 7px 0 5px !important;
          color: #173f2d !important;
          font-family:
            Georgia, "Times New Roman", serif !important;
          font-size: 25px !important;
          font-weight: 400 !important;
        }

        .rc-reply-heading p {
          margin: 0 !important;
          color: #8a877e !important;
          font-family:
            Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 10px !important;
        }

        .rc-reply-form {
          position: relative !important;
          z-index: 2 !important;
          margin-top: 19px !important;
        }

        .rc-reply-form textarea {
          width: 100% !important;
          min-height: 145px !important;
          box-sizing: border-box !important;
          padding: 19px 20px !important;
          border:
            1px solid rgba(56, 88, 65, .19) !important;
          border-radius: 14px !important;
          outline: none !important;
          resize: vertical !important;
          background:
            rgba(255, 254, 249, .90) !important;
          color: #304338 !important;
          font-family:
            Georgia, "Times New Roman", serif !important;
          font-size: 15px !important;
          line-height: 1.75 !important;
          transition: .16s ease !important;
        }

        .rc-reply-form textarea:focus {
          border-color:
            rgba(23, 77, 56, .40) !important;
          box-shadow:
            0 0 0 3px
            rgba(23, 77, 56, .045) !important;
        }

        .rc-reply-footer {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 22px !important;
          margin-top: 13px !important;
        }

        .rc-reply-footer p {
          margin: 0 !important;
          color: #8f8b80 !important;
          font-family:
            Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 9px !important;
          line-height: 1.5 !important;
        }

        .rc-reply-footer button {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 9px !important;
          min-width: 155px !important;
          min-height: 43px !important;
          padding: 0 19px !important;
          border: 1px solid #174d38 !important;
          border-radius: 999px !important;
          background: #174d38 !important;
          color: #fff !important;
          cursor: pointer !important;
          font-family:
            Aptos, "Segoe UI", Arial, sans-serif !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          box-shadow:
            0 7px 18px rgba(23, 77, 56, .13) !important;
          transition: .16s ease !important;
        }

        .rc-reply-footer button:hover {
          background: #103e2c !important;
          border-color: #103e2c !important;
          transform: translateY(-1px);
        }

        /* ================= MOBILE ================= */

        @media (max-width: 760px) {
          .rc-detail-page {
            padding:
              25px 13px 65px !important;
          }

          .rc-detail-top {
            align-items:
              flex-start !important;
            flex-direction:
              column !important;
          }

          .rc-detail-top h1 {
            font-size: 32px !important;
          }

          .rc-detail-info {
            overflow-x: auto !important;
          }

          .rc-letter-heading {
            padding:
              25px 22px 24px !important;
          }

          .rc-letter-heading::after {
            left: 22px !important;
          }

          .rc-thread {
            padding:
              21px 16px 27px 48px !important;
          }

          .rc-thread::before {
            left: 28px !important;
          }

          .rc-letter-entry::before {
            left: -26px !important;
          }

          .rc-letter-entry,
          .rc-letter-entry.reader,
          .rc-letter-entry.admin {
            padding:
              17px 17px 19px !important;
          }

          .rc-entry-content,
          .rc-letter-entry.admin
          .rc-entry-content {
            font-size: 14px !important;
          }

          .rc-reply-section {
            padding:
              25px 20px 27px !important;
          }

          .rc-reply-footer {
            align-items:
              flex-start !important;
            flex-direction:
              column !important;
          }

          .rc-reply-footer button {
            width: 100% !important;
          }
        }

        /* =====================================================
           RUANG CERITA ADMIN - FINAL WIDTH
           ===================================================== */

        .rc-detail-shell {
          width: min(1380px, calc(100% - 56px)) !important;
          max-width: 1380px !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }

        .rc-letter {
          width: 100% !important;
        }

        .rc-reply-section {
          width: 100% !important;
          box-sizing: border-box !important;
        }

        .rc-letter-heading h2 {
          max-width: 1050px !important;
        }

        .rc-entry-content,
        .rc-letter-entry.admin .rc-entry-content {
          max-width: none !important;
        }

        @media (max-width: 1450px) {
          .rc-detail-shell {
            width: calc(100% - 48px) !important;
          }
        }

        @media (max-width: 760px) {
          .rc-detail-shell {
            width: 100% !important;
            max-width: none !important;
          }
        }

        /* =====================================================
           RUANG CERITA ADMIN - WIDE OUTER FRAME
           ===================================================== */

        .rc-detail-page::before {
          content: "" !important;
          position: fixed !important;
          z-index: 0 !important;
          top: 128px !important;
          bottom: 34px !important;
          left: 50% !important;
          width: min(1540px, calc(100% - 34px)) !important;
          transform: translateX(-50%) !important;

          border:
            2px solid rgba(255, 255, 255, .68) !important;
          border-radius: 48px !important;

          background:
            rgba(255, 253, 247, .13) !important;

          box-shadow:
            inset 0 0 0 1px rgba(190, 163, 96, .08),
            0 18px 55px rgba(54, 62, 47, .025) !important;

          pointer-events: none !important;
        }

        .rc-detail-shell {
          position: relative !important;
          z-index: 1 !important;
          width: min(1380px, calc(100% - 56px)) !important;
          max-width: 1380px !important;
        }

        @media (max-width: 1450px) {
          .rc-detail-page::before {
            width: calc(100% - 24px) !important;
          }

          .rc-detail-shell {
            width: calc(100% - 48px) !important;
          }
        }

        @media (max-width: 760px) {
          .rc-detail-page::before {
            top: 112px !important;
            bottom: 18px !important;
            width: calc(100% - 12px) !important;
            border-radius: 30px !important;
          }

          .rc-detail-shell {
            width: 100% !important;
          }
        }

        /* =====================================================
           RUANG CERITA ADMIN - FINAL WIDE CREAM CANVAS
           ===================================================== */

        /* Background alam hanya menjadi aksen di pinggir */
        .rc-detail-page {
          position: relative !important;
          padding-left: 18px !important;
          padding-right: 18px !important;
        }

        /* Bidang cream/putih utama hampir selebar layar */
        .rc-detail-page::before {
          content: "" !important;
          position: absolute !important;
          z-index: 0 !important;

          top: 16px !important;
          bottom: 24px !important;

          left: 50% !important;
          width: min(1580px, calc(100% - 32px)) !important;
          transform: translateX(-50%) !important;

          border:
            1px solid rgba(255, 255, 255, .82) !important;

          border-radius: 42px !important;

          background:
            linear-gradient(
              90deg,
              rgba(255, 253, 247, .91),
              rgba(255, 253, 247, .96) 18%,
              rgba(255, 253, 247, .96) 82%,
              rgba(255, 253, 247, .91)
            ) !important;

          box-shadow:
            0 20px 60px rgba(55, 65, 48, .045),
            inset 0 0 0 1px rgba(186, 154, 82, .055) !important;

          pointer-events: none !important;
        }

        /* Konten juga ikut melebar */
        .rc-detail-shell {
          position: relative !important;
          z-index: 1 !important;

          width: min(1420px, calc(100% - 70px)) !important;
          max-width: 1420px !important;

          margin-left: auto !important;
          margin-right: auto !important;
        }

        /* Status bar selebar area */
        .rc-detail-info {
          width: 100% !important;
          box-sizing: border-box !important;
        }

        /* Surat utama */
        .rc-letter {
          width: 100% !important;
          box-sizing: border-box !important;
        }

        /* Area balasan */
        .rc-reply-section {
          width: 100% !important;
          box-sizing: border-box !important;
        }

        /* Jangan bikin isi pesan terlalu melebar walau canvas lebar */
        .rc-entry-content,
        .rc-letter-entry.admin .rc-entry-content {
          max-width: 1120px !important;
        }

        .rc-letter-heading h2 {
          max-width: 1120px !important;
        }

        /* Desktop besar */
        @media (min-width: 1600px) {
          .rc-detail-page::before {
            width: calc(100% - 40px) !important;
          }

          .rc-detail-shell {
            width: min(1450px, calc(100% - 150px)) !important;
            max-width: 1450px !important;
          }
        }

        /* Laptop */
        @media (max-width: 1450px) {
          .rc-detail-page::before {
            width: calc(100% - 24px) !important;
          }

          .rc-detail-shell {
            width: calc(100% - 64px) !important;
            max-width: none !important;
          }
        }

        /* Tablet / HP */
        @media (max-width: 760px) {
          .rc-detail-page {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .rc-detail-page::before {
            top: 8px !important;
            bottom: 12px !important;
            width: calc(100% - 8px) !important;
            border-radius: 26px !important;
          }

          .rc-detail-shell {
            width: 100% !important;
            max-width: none !important;
          }
        }
      `}</style>
    </main>
  );
}