import Link from "next/link";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdminOrSuperAdmin } from "@/lib/admin-auth";

import StoryAdminActions from "./StoryAdminActions";
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

function statusClass(status: string) {
  switch (status) {
    case "waiting_read":
      return "waiting";
    case "new_reply":
      return "reply";
    case "done":
      return "done";
    default:
      return "neutral";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export default async function RuangCeritaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ reader?: string }>;
}) {
  const session = await requireAdminOrSuperAdmin();
  const params = await searchParams;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Konfigurasi Supabase server belum lengkap.");
  }

  const supabase = createServiceClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: conversationData, error: conversationError } = await supabase
    .from("cerita_conversations")
    .select("id, reader_id, title, status, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (conversationError) {
    throw new Error(conversationError.message);
  }

  const conversations = (conversationData ?? []) as ConversationRow[];

  const readerIds = [...new Set(conversations.map((item) => item.reader_id))];

  let readers: ReaderRow[] = [];

  if (readerIds.length > 0) {
    const { data: readerData, error: readerError } = await supabase
      .from("reader_users")
      .select("id, full_name, email")
      .in("id", readerIds);

    if (readerError) {
      throw new Error(readerError.message);
    }

    readers = (readerData ?? []) as ReaderRow[];
  }

  const readerMap = new Map(readers.map((reader) => [reader.id, reader]));

  const readerSummaries = readerIds
    .map((readerId) => {
      const reader = readerMap.get(readerId);
      const stories = conversations.filter(
        (conversation) => conversation.reader_id === readerId
      );

      return {
        id: readerId,
        name: reader?.full_name?.trim() || "Reader",
        email: reader?.email?.trim() || "-",
        count: stories.length,
        latest: stories[0]?.updated_at ?? "",
      };
    })
    .sort(
      (a, b) =>
        new Date(b.latest).getTime() - new Date(a.latest).getTime()
    );

  const selectedReaderId =
    params.reader &&
    readerSummaries.some((reader) => reader.id === params.reader)
      ? params.reader
      : readerSummaries[0]?.id ?? "";

  const selectedReader = readerSummaries.find(
    (reader) => reader.id === selectedReaderId
  );

  const selectedStories = conversations.filter(
    (conversation) => conversation.reader_id === selectedReaderId
  );

  return (
    <main className="rc-admin-page">
      <div className="rc-admin-shell">
        <header className="rc-admin-header">
          <div>
            <p className="rc-admin-eyebrow">SUPERADMIN / ADMIN</p>
            <h1>Ruang Cerita</h1>
            <p className="rc-admin-lead">
              Cerita privat dari reader Menjadi Nol.
            </p>
          </div>

          <Link
            href="/admin/superadmin"
            className="rc-dashboard-button"
          >
            Kembali ke Dashboard
          </Link>
        </header>

        <section className="rc-admin-summary">
          <div>
            <span>Login sebagai</span>
            <strong>{session.role}</strong>
          </div>

          <div className="rc-summary-divider" />

          <div>
            <span>Reader</span>
            <strong>{readerSummaries.length}</strong>
          </div>

          <div className="rc-summary-divider" />

          <div>
            <span>Total cerita</span>
            <strong>{conversations.length}</strong>
          </div>
        </section>

        {conversations.length === 0 ? (
          <section className="rc-admin-empty">
            <span>RUANG CERITA</span>
            <h2>Belum ada cerita yang dikirim.</h2>
            <p>
              Cerita dari reader akan muncul di halaman ini.
            </p>
          </section>
        ) : (
          <section className="rc-admin-workspace">
            <aside className="rc-reader-panel">
              <div className="rc-panel-heading">
                <span>READER</span>
                <strong>{readerSummaries.length}</strong>
              </div>

              <div className="rc-reader-list">
                {readerSummaries.map((reader) => {
                  const active = reader.id === selectedReaderId;

                  return (
                    <Link
                      key={reader.id}
                      href={`/admin/superadmin/ruang-cerita?reader=${encodeURIComponent(
                        reader.id
                      )}`}
                      className={`rc-reader-card${active ? " active" : ""}`}
                    >
                      <div className="rc-reader-avatar">
                        {reader.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="rc-reader-copy">
                        <strong>{reader.name}</strong>
                        <span>{reader.email}</span>
                      </div>

                      <span className="rc-reader-count">
                        {reader.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </aside>

            <div className="rc-story-panel">
              <div className="rc-story-panel-head">
                <div>
                  <span>CERITA DARI</span>
                  <h2>{selectedReader?.name || "Reader"}</h2>
                  <p>{selectedReader?.email || ""}</p>
                </div>

                <div className="rc-story-total">
                  <strong>{selectedStories.length}</strong>
                  <span>Cerita</span>
                </div>
              </div>

              <div className="rc-story-list">
                {selectedStories.map((conversation, index) => (
                  <article
                    key={conversation.id}
                    className="rc-story-card"
                  >
                    <div className="rc-story-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="rc-story-content">
                      <div className="rc-story-meta">
                        <span
                          className={`rc-status ${statusClass(
                            conversation.status
                          )}`}
                        >
                          {statusLabel(conversation.status)}
                        </span>

                        <time>
                          {formatDate(conversation.updated_at)}
                        </time>
                      </div>

                      <h3>
                        {conversation.title?.trim() || "Tanpa judul"}
                      </h3>

                      <p>
                        Dikirim {formatDate(conversation.created_at)}
                      </p>
                    </div>

                    <div className="rc-story-controls">
  <Link
                      href={`/admin/superadmin/ruang-cerita/${conversation.id}`}
                      className="rc-open-button"
                    >
                      Buka Cerita
                      <span aria-hidden="true">&gt;</span>
                    </Link>

  <StoryAdminActions
    conversationId={conversation.id}
    title={conversation.title?.trim() || "Tanpa judul"}
  />
</div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      <style>{`
        .rc-admin-page {
          min-height: calc(100vh - 90px);
          background:
            radial-gradient(circle at 94% 4%, rgba(194, 211, 183, .22), transparent 24%),
            #f7f4ec;
          padding: 34px 24px 80px;
          color: #18382a;
        }

        .rc-admin-shell {
          width: min(1160px, 100%);
          margin: 0 auto;
        }

        .rc-admin-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 28px;
          margin-bottom: 26px;
        }

        .rc-admin-eyebrow {
          margin: 0 0 10px;
          color: #778566;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .18em;
        }

        .rc-admin-header h1 {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 36px;
          line-height: 1.1;
          color: #17382b;
        }

        .rc-admin-lead {
          margin: 9px 0 0;
          color: #73786e;
          font-size: 14px;
        }

        .rc-dashboard-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 20px;
          border: 1px solid rgba(27, 75, 53, .22);
          border-radius: 999px;
          background: rgba(255, 255, 255, .7);
          color: #315d45;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 7px 20px rgba(54, 66, 52, .05);
          transition: .18s ease;
        }

        .rc-dashboard-button:hover {
          background: #fff;
          border-color: rgba(27, 75, 53, .4);
          transform: translateY(-1px);
        }

        .rc-admin-summary {
          min-height: 64px;
          display: flex;
          align-items: center;
          gap: 25px;
          padding: 12px 22px;
          margin-bottom: 18px;
          border: 1px solid rgba(46, 70, 53, .11);
          border-radius: 18px;
          background: rgba(255, 255, 255, .68);
        }

        .rc-admin-summary > div:not(.rc-summary-divider) {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .rc-admin-summary span {
          color: #7a7b71;
          font-size: 12px;
        }

        .rc-admin-summary strong {
          color: #214733;
          font-size: 14px;
        }

        .rc-summary-divider {
          width: 1px;
          height: 24px;
          background: rgba(45, 71, 54, .12);
        }

        .rc-admin-workspace {
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .rc-reader-panel,
        .rc-story-panel {
          overflow: hidden;
          border: 1px solid rgba(46, 70, 53, .11);
          border-radius: 22px;
          background: rgba(255, 255, 255, .72);
          box-shadow: 0 14px 38px rgba(57, 65, 52, .045);
        }

        .rc-reader-panel {
          padding: 18px;
        }

        .rc-panel-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 2px 4px 14px;
        }

        .rc-panel-heading > span,
        .rc-story-panel-head > div:first-child > span {
          color: #8a8a79;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .18em;
        }

        .rc-panel-heading > strong {
          display: grid;
          place-items: center;
          min-width: 27px;
          height: 27px;
          padding: 0 7px;
          border-radius: 999px;
          background: #edf1e6;
          color: #547052;
          font-size: 11px;
        }

        .rc-reader-list {
          display: grid;
          gap: 8px;
        }

        .rc-reader-card {
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr) auto;
          align-items: center;
          gap: 11px;
          padding: 12px;
          border: 1px solid transparent;
          border-radius: 15px;
          color: inherit;
          text-decoration: none;
          transition: .16s ease;
        }

        .rc-reader-card:hover {
          background: rgba(241, 244, 234, .72);
        }

        .rc-reader-card.active {
          border-color: rgba(58, 94, 67, .18);
          background: #edf2e8;
        }

        .rc-reader-avatar {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(63, 96, 69, .13);
          border-radius: 50%;
          background: #faf8f1;
          color: #45664b;
          font-family: Georgia, serif;
          font-size: 17px;
          font-weight: 700;
        }

        .rc-reader-copy {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .rc-reader-copy strong {
          overflow: hidden;
          color: #183a2a;
          font-size: 13px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rc-reader-copy span {
          overflow: hidden;
          color: #8a887e;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rc-reader-count {
          display: grid;
          place-items: center;
          min-width: 27px;
          height: 27px;
          padding: 0 7px;
          border-radius: 999px;
          background: rgba(255, 255, 255, .75);
          color: #567257;
          font-size: 11px;
          font-weight: 800;
        }

        .rc-story-panel {
          min-width: 0;
        }

        .rc-story-panel-head {
          min-height: 105px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 25px;
          border-bottom: 1px solid rgba(46, 70, 53, .09);
          background:
            linear-gradient(120deg, rgba(250, 248, 241, .9), rgba(239, 244, 233, .65));
        }

        .rc-story-panel-head h2 {
          margin: 5px 0 3px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 25px;
          font-weight: 500;
          color: #173b2a;
        }

        .rc-story-panel-head p {
          margin: 0;
          color: #8a887e;
          font-size: 11px;
        }

        .rc-story-total {
          min-width: 62px;
          text-align: center;
        }

        .rc-story-total strong {
          display: block;
          font-family: Georgia, serif;
          font-size: 26px;
          color: #3d684b;
        }

        .rc-story-total span {
          color: #8a887e;
          font-size: 10px;
        }

        .rc-story-list {
          display: grid;
        }

        .rc-story-card {
          display: grid;
          grid-template-columns: 45px minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          min-height: 115px;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(46, 70, 53, .08);
        }

        .rc-story-card:last-child {
          border-bottom: 0;
        }

        .rc-story-card:hover {
          background: rgba(250, 249, 244, .62);
        }

        .rc-story-number {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #f5f2e9;
          color: #82907a;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
        }

        .rc-story-content {
          min-width: 0;
        }

        .rc-story-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .rc-story-meta time {
          color: #969187;
          font-size: 10px;
        }

        .rc-status {
          display: inline-flex;
          align-items: center;
          min-height: 23px;
          padding: 0 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
        }

        .rc-status.waiting {
          background: #f5ead3;
          color: #85662c;
        }

        .rc-status.reply {
          background: #e4efe1;
          color: #356044;
        }

        .rc-status.done {
          background: #e8eee5;
          color: #60715f;
        }

        .rc-status.neutral {
          background: #efeee9;
          color: #6e716b;
        }

        .rc-story-content h3 {
          margin: 0;
          overflow: hidden;
          color: #253e31;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 17px;
          font-weight: 500;
          line-height: 1.4;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rc-story-content > p {
          margin: 5px 0 0;
          color: #99958c;
          font-size: 10px;
        }

        .rc-open-button {
          min-width: 118px;
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0 15px;
          border: 1px solid #1c5b40;
          border-radius: 999px;
          background: #1c5b40;
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 7px 18px rgba(28, 91, 64, .13);
          transition: .16s ease;
        }

        .rc-open-button:hover {
          background: #174c36;
          transform: translateY(-1px);
        }

        .rc-open-button span {
          font-size: 15px;
          line-height: 1;
        }

        .rc-admin-empty {
          padding: 70px 25px;
          border: 1px solid rgba(46, 70, 53, .11);
          border-radius: 22px;
          background: rgba(255, 255, 255, .68);
          text-align: center;
        }

        .rc-admin-empty > span {
          color: #8b927d;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .2em;
        }

        .rc-admin-empty h2 {
          margin: 10px 0 7px;
          font-family: Georgia, serif;
          font-weight: 500;
        }

        .rc-admin-empty p {
          margin: 0;
          color: #85857d;
          font-size: 13px;
        }

        @media (max-width: 800px) {
          .rc-admin-page {
            padding: 25px 14px 60px;
          }

          .rc-admin-header {
            flex-direction: column;
          }

          .rc-dashboard-button {
            align-self: flex-start;
          }

          .rc-admin-summary {
            gap: 13px;
            overflow-x: auto;
          }

          .rc-admin-workspace {
            grid-template-columns: 1fr;
          }

          .rc-reader-list {
            display: flex;
            overflow-x: auto;
            padding-bottom: 4px;
          }

          .rc-reader-card {
            min-width: 235px;
          }

          .rc-story-card {
            grid-template-columns: 38px minmax(0, 1fr);
          }

          .rc-open-button {
            grid-column: 2;
            justify-self: start;
          }
        }

        @media (max-width: 520px) {
          .rc-admin-header h1 {
            font-size: 31px;
          }

          .rc-admin-summary {
            padding: 12px 15px;
          }

          .rc-story-panel-head {
            padding: 18px;
          }

          .rc-story-card {
            padding: 18px 16px;
            gap: 11px;
          }

          .rc-story-meta {
            align-items: flex-start;
            flex-direction: column;
            gap: 5px;
          }
        }

        /* RC BUTTONS - SOFT EDITORIAL */
        .rc-open-button {
          min-width: 112px !important;
          min-height: 38px !important;
          padding: 0 16px !important;
          border: 1px solid rgba(23, 77, 56, 0.28) !important;
          border-radius: 999px !important;
          background: rgba(255, 253, 247, 0.78) !important;
          color: #174d38 !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.01em !important;
          box-shadow: 0 4px 14px rgba(36, 67, 49, 0.06) !important;
          transition: background 160ms ease, color 160ms ease,
            border-color 160ms ease, transform 160ms ease,
            box-shadow 160ms ease !important;
        }

        .rc-open-button span {
          font-size: 13px !important;
          font-weight: 400 !important;
          opacity: 0.7;
          transition: transform 160ms ease;
        }

        .rc-open-button:hover {
          background: #174d38 !important;
          border-color: #174d38 !important;
          color: #ffffff !important;
          box-shadow: 0 7px 18px rgba(23, 77, 56, 0.13) !important;
          transform: translateY(-1px);
        }

        .rc-open-button:hover span {
          transform: translateX(2px);
        }

        .rc-dashboard-button {
          min-height: 40px !important;
          padding: 0 18px !important;
          border: 1px solid rgba(23, 77, 56, 0.20) !important;
          background: rgba(255, 253, 247, 0.68) !important;
          color: #174d38 !important;
          box-shadow: 0 4px 14px rgba(36, 67, 49, 0.045) !important;
        }

        .rc-dashboard-button:hover {
          border-color: rgba(23, 77, 56, 0.42) !important;
          background: #ffffff !important;
          box-shadow: 0 7px 18px rgba(36, 67, 49, 0.07) !important;
        }

        /* RUANG CERITA ADMIN LIST - BOTANICAL BACKGROUND FINAL */

        .rc-page {
          position: relative !important;
          isolation: isolate !important;
          min-height: calc(100vh - 80px) !important;

          background:
            linear-gradient(
              rgba(249, 246, 237, .68),
              rgba(249, 246, 237, .78)
            ),
            url("/ruang-cerita-nature.png")
              center center / cover fixed no-repeat,
            #f6f2e8 !important;
        }

        .rc-page::before {
          content: "" !important;
          position: absolute !important;
          z-index: -1 !important;

          top: 22px !important;
          bottom: 28px !important;
          left: 50% !important;

          width: calc(100% - 46px) !important;
          max-width: 1560px !important;

          transform: translateX(-50%) !important;

          border: 1px solid
            rgba(255, 255, 255, .72) !important;

          border-radius: 42px !important;

          background:
            rgba(255, 253, 247, .38) !important;

          box-shadow:
            inset 0 0 0 1px
            rgba(180, 148, 76, .05) !important;

          pointer-events: none !important;
        }

        .rc-summary,
        .rc-readers,
        .rc-stories {
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
        }

        .rc-summary {
          background:
            rgba(255, 254, 249, .84) !important;
        }

        .rc-readers {
          background:
            rgba(255, 254, 249, .88) !important;
        }

        .rc-stories {
          background:
            rgba(255, 254, 249, .90) !important;
        }

        @media (max-width: 760px) {
          .rc-page {
            background:
              linear-gradient(
                rgba(249, 246, 237, .74),
                rgba(249, 246, 237, .84)
              ),
              url("/ruang-cerita-nature.png")
                center top / cover no-repeat,
              #f6f2e8 !important;
          }

          .rc-page::before {
            top: 10px !important;
            bottom: 14px !important;
            width: calc(100% - 12px) !important;
            border-radius: 28px !important;
          }
        }

        /* =====================================================
           RUANG CERITA ADMIN LIST - CORRECT BOTANICAL BACKGROUND
           ===================================================== */

        .rc-admin-page {
          position: relative !important;
          isolation: isolate !important;
          min-height: calc(100vh - 80px) !important;

          background:
            linear-gradient(
              rgba(249, 246, 237, .66),
              rgba(249, 246, 237, .76)
            ),
            url("/ruang-cerita-nature.png")
              center center / cover fixed no-repeat,
            #f6f2e8 !important;
        }

        /* lapisan cream transparan besar */
        .rc-admin-page::before {
          content: "" !important;

          position: absolute !important;
          z-index: -1 !important;

          top: 22px !important;
          bottom: 28px !important;
          left: 50% !important;

          width: calc(100% - 42px) !important;
          max-width: 1580px !important;

          transform: translateX(-50%) !important;

          border:
            1px solid rgba(255, 255, 255, .72) !important;

          border-radius: 42px !important;

          background:
            rgba(255, 253, 247, .30) !important;

          box-shadow:
            inset 0 0 0 1px
            rgba(181, 148, 75, .05) !important;

          pointer-events: none !important;
        }

        .rc-admin-shell {
          position: relative !important;
          z-index: 1 !important;
        }

        /* summary */
        .rc-admin-summary {
          background:
            rgba(255, 254, 249, .87) !important;

          backdrop-filter: blur(11px) !important;
          -webkit-backdrop-filter: blur(11px) !important;

          box-shadow:
            0 8px 24px
            rgba(48, 64, 50, .04) !important;
        }

        /* reader panel */
        .rc-reader-panel {
          background:
            rgba(255, 254, 249, .89) !important;

          backdrop-filter: blur(11px) !important;
          -webkit-backdrop-filter: blur(11px) !important;

          box-shadow:
            0 12px 32px
            rgba(48, 64, 50, .05) !important;
        }

        /* panel daftar cerita */
        .rc-story-panel {
          background:
            rgba(255, 254, 249, .90) !important;

          backdrop-filter: blur(11px) !important;
          -webkit-backdrop-filter: blur(11px) !important;

          box-shadow:
            0 15px 38px
            rgba(48, 64, 50, .055) !important;
        }

        /* masing-masing cerita tetap bersih */
        .rc-story-card {
          background:
            rgba(255, 255, 252, .76) !important;
        }

        @media (max-width: 760px) {
          .rc-admin-page {
            background:
              linear-gradient(
                rgba(249, 246, 237, .70),
                rgba(249, 246, 237, .82)
              ),
              url("/ruang-cerita-nature.png")
                center top / cover no-repeat,
              #f6f2e8 !important;
          }

          .rc-admin-page::before {
            top: 10px !important;
            bottom: 14px !important;

            width: calc(100% - 12px) !important;

            border-radius: 27px !important;
          }
        }
      `}</style>
    </main>
  );
}