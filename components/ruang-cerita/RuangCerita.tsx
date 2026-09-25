"use client";

import { useEffect, useState } from "react";
import "./RuangCerita.css";
import {
  createStory,
  continueStory,
  getStories,
  getThread,
  type CeritaConversation,
  type CeritaMessage,
} from "@/lib/ruang-cerita/data";

type View =
  | "write"
  | "sent"
  | "stories"
  | "thread"
  | "continue"
  | "continued"

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatDate(value: string, withTime = false) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const result =
    date.getDate() +
    " " +
    MONTHS[date.getMonth()] +
    " " +
    date.getFullYear();

  if (!withTime) {
    return result;
  }

  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return result + " - " + hour + ":" + minute;
}

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
      return "Menunggu dibaca";
  }
}

function statusClass(status: string) {
  switch (status) {
    case "new_reply":
      return "rc-status-new";
    case "read":
      return "rc-status-read";
    case "done":
      return "rc-status-done";
    default:
      return "rc-status-wait";
  }
}

export default function RuangCerita() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("write");

  const [story, setStory] = useState("");
  const [continuation, setContinuation] = useState("");

  const [stories, setStories] = useState<CeritaConversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeConversation, setActiveConversation] =
    useState<CeritaConversation | null>(null);
  const [messages, setMessages] = useState<CeritaMessage[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");


  useEffect(() => {
    let mounted = true;

    async function loadUnreadReplies() {
      try {
        const result = await getStories();

        if (!mounted) {
          return;
        }

        setStories(result);

        const count = result.filter(
          (item) => item.status === "new_reply"
        ).length;

        setUnreadCount(count);
      } catch {
        if (mounted) {
          setUnreadCount(0);
        }
      }
    }

    void loadUnreadReplies();

    return () => {
      mounted = false;
    };
  }, []);
  function toggleWidget() {
    setOpen((current) => !current);
  }

  function closeWidget() {
    setOpen(false);
  }


  async function sendStory() {
    const clean = story.trim();

    if (!clean || busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const result = await createStory(clean);

      setActiveConversation(result.conversation);
      setMessages([result.message]);
      setStory("");
      setView("sent");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Cerita belum berhasil dikirim.";

      if (message === "LOGIN_REQUIRED") {
        setError("Sesi pembaca tidak ditemukan. Silakan muat ulang halaman.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function openStories() {
    if (busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const result = await getStories();

      setStories(result);
      setView("stories");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Cerita belum dapat dimuat.";

      if (message === "LOGIN_REQUIRED") {
        setError("Sesi pembaca tidak ditemukan. Silakan muat ulang halaman.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function openThread(conversationId: string) {
    if (busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const result = await getThread(conversationId);

      setActiveConversation(result.conversation);
      setMessages(result.messages);
      setView("thread");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Cerita belum dapat dibuka.";

      if (message === "LOGIN_REQUIRED") {
        setError("Sesi pembaca tidak ditemukan. Silakan muat ulang halaman.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  function exportCurrentStory() {
    if (!activeConversation || messages.length === 0) {
      return;
    }

    const title =
      activeConversation.title?.trim() ||
      "Cerita tanpa judul";

    const lines = [
      "MENJADI NOL - RUANG CERITA",
      "",
      title,
      formatDate(activeConversation.created_at),
      "",
      "----------------------------------------",
      "",
      ...messages.flatMap((message) => [
        message.role === "reader"
          ? "CERITAMU"
          : "BALASAN RUANG CERITA",
        formatDate(message.created_at, true),
        "",
        message.content,
        "",
        "----------------------------------------",
        "",
      ]),
    ];

    const text = lines.join("\r\n");
    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

    anchor.href = url;
    anchor.download =
      `ruang-cerita-${safeTitle || "cerita"}.txt`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }
  async function sendContinuation() {
    const clean = continuation.trim();

    if (!clean || !activeConversation || busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await continueStory(activeConversation.id, clean);

      const refreshed = await getThread(activeConversation.id);

      setActiveConversation({
        ...refreshed.conversation,
        status: "waiting_reply",
      });

      setMessages(refreshed.messages);
      setContinuation("");
      setView("continued");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Lanjutan cerita belum berhasil dikirim.";

      if (message === "LOGIN_REQUIRED") {
        setError("Sesi pembaca tidak ditemukan. Silakan muat ulang halaman.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="rc-widget">
      {open ? (
        <section
          className="rc-panel rc-demo-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Ruang Cerita"
        >
          <header className="rc-panel-header rc-demo-header">
            <div className="rc-panel-brand">
              <RuangCeritaSymbol />

              <div className="rc-panel-brand-copy">
                <strong>RUANG CERITA</strong>
                <span>Sebuah ruang untuk bercerita.</span>
              </div>
            </div>

            <div className="rc-panel-controls">
              <button
                type="button"
                className="rc-control"
                onClick={closeWidget}
                aria-label="Minimalkan Ruang Cerita"
                title="Minimalkan"
              >
                -
              </button>

              <button
                type="button"
                className="rc-control"
                onClick={closeWidget}
                aria-label="Tutup Ruang Cerita"
                title="Tutup"
              >
                X
              </button>
            </div>
          </header>

          <div className={`rc-demo-body ${view === "write" ? "rc-demo-body-write" : ""}`}>

            {view === "write" ? (
              <div className="rc-screen">
                <div className="rc-screen-heading">
                  <span className="rc-kicker">MENJADI NOL</span>

                  <h2>
                    Apa yang sedang memenuhi ruang di dalam dirimu?
                  </h2>

                  <p>
                    Tidak perlu rapi. Tidak perlu menemukan jawaban.
                    Ceritakan saja dari mana kamu ingin memulai.
                  </p>
                </div>

                <textarea
                  className="rc-story-input"
                  value={story}
                  onChange={(event) =>
                    setStory(event.target.value)
                  }
                  placeholder="Mulai dari apa pun yang terasa ingin diceritakan..."
                  rows={9}
                  maxLength={2000}
                  disabled={busy}
                />

                <div className="rc-private-note">
                  <span
                    className="rc-lock"
                    aria-hidden="true"
                  >
                    *
                  </span>

                  <p>
                    Ceritamu bersifat privat dan hanya dapat dibaca
                    oleh kamu dan pengelola yang diberi akses.
                  </p>
                </div>

                {error ? (
                  <p role="alert">{error}</p>
                ) : null}

                <button
                  type="button"
                  className="rc-demo-primary"
                  onClick={() => void sendStory()}
                  disabled={busy || !story.trim()}
                >
                  {busy
                    ? "Mengirim..."
                    : "Kirim Cerita"}
                </button>

                <button
                  type="button"
                  className="rc-text-button"
                  onClick={() => void openStories()}
                  disabled={busy}
                >
                  Lihat cerita yang pernah kamu kirim
                </button>

                <BotanicalCorner />
              </div>
            ) : null}

            {view === "sent" ? (
              <div className="rc-screen rc-result-screen">
                <div
                  className="rc-envelope"
                  aria-hidden="true"
                >
                  <span className="rc-envelope-leaf" />
                  <span className="rc-envelope-check">
                    OK
                  </span>
                </div>

                <h2>Ceritamu berhasil dikirim.</h2>

                <p>
                  Terima kasih sudah berbagi cerita. Kamu akan
                  mendapat pemberitahuan ketika ada balasan.
                </p>

                <div className="rc-status-card">
                  <span>Status saat ini:</span>

                  <strong>
                    {statusLabel(
                      activeConversation?.status ??
                        "waiting_read"
                    )}
                  </strong>
                </div>

                <button
                  type="button"
                  className="rc-demo-secondary"
                  onClick={() => void openStories()}
                  disabled={busy}
                >
                  Lihat Cerita Saya
                </button>

                <button
                  type="button"
                  className="rc-text-button"
                  onClick={closeWidget}
                >
                  Tutup
                </button>

                <BotanicalCorner />
              </div>
            ) : null}

            {view === "stories" ? (
              <div className="rc-screen">
                <div className="rc-list-top">
                  <div>
                    <span className="rc-kicker">
                      CERITA SAYA
                    </span>

                    <h2>
                      Cerita yang pernah kamu kirim
                    </h2>
                  </div>

                  <button
                    type="button"
                    className="rc-small-primary"
                    onClick={() => {
                      setError("");
                      setView("write");
                    }}
                  >
                    + Tulis Cerita Baru
                  </button>
                </div>

                {error ? (
                  <p role="alert">{error}</p>
                ) : null}

                <div className="rc-story-list">
                  {busy ? (
                    <p>Memuat cerita...</p>
                  ) : null}

                  {!busy && stories.length === 0 ? (
                    <p>
                      Belum ada cerita yang kamu kirim.
                    </p>
                  ) : null}

                  {!busy
                    ? stories.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={
                            item.status === "new_reply"
                              ? "rc-story-row rc-story-row-new"
                              : "rc-story-row"
                          }
                          onClick={() =>
                            void openThread(item.id)
                          }
                        >
                          <span className="rc-story-row-copy">
                            <strong>
                              {item.title ||
                                "Cerita tanpa judul"}
                            </strong>

                            <small>
                              {formatDate(
                                item.created_at
                              )}
                            </small>
                          </span>

                          <span
                            className={
                              "rc-status " +
                              statusClass(
                                item.status
                              )
                            }
                          >
                            {statusLabel(
                              item.status
                            )}
                          </span>

                          <span className="rc-row-arrow">
                            &gt;
                          </span>
                        </button>
                      ))
                    : null}
                </div>

                <BotanicalCorner />
              </div>
            ) : null}

            {view === "thread" &&
            activeConversation ? (
              <div className="rc-screen rc-thread-screen">
                <button
                  type="button"
                  className="rc-back"
                  onClick={() => void openStories()}
                  disabled={busy}
                >
                  &lt; Kembali ke daftar
                </button>

                <div className="rc-thread-title">
                  <h2>
                    {activeConversation.title ||
                      "Cerita tanpa judul"}
                  </h2>

                  <span>
                    {formatDate(
                      activeConversation.created_at
                    )}
                  </span>
                </div>

                {error ? (
                  <p role="alert">{error}</p>
                ) : null}

                <div className="rc-thread-line">
                  {messages.map(
                    (message, index) => (
                      <div key={message.id}>
                        <article
                          className={
                            message.role === "reader"
                              ? "rc-letter rc-letter-user"
                              : "rc-letter rc-letter-admin"
                          }
                        >
                          <span className="rc-letter-label">
                            {message.role ===
                            "reader"
                              ? "Ceritamu"
                              : "Balasan Ruang Cerita"}
                          </span>

                          <time>
                            {formatDate(
                              message.created_at,
                              true
                            )}
                          </time>

                          <p>{message.content}</p>
                        </article>

                        {index <
                        messages.length - 1 ? (
                          <span
                            className="rc-thread-leaf"
                            aria-hidden="true"
                          >
                            *
                          </span>
                        ) : null}
                      </div>
                    )
                  )}
                </div>

                <button
                  type="button"
                  className="rc-demo-primary"
                  onClick={() => {
                    setError("");
                    setContinuation("");
                    setView("continue");
                  }}
                >
                  Lanjutkan Cerita
                </button>
              </div>
            ) : null}

            {view === "continue" &&
            activeConversation ? (
              <div className="rc-screen">
                <button
                  type="button"
                  className="rc-back"
                  onClick={() =>
                    setView("thread")
                  }
                >
                  &lt; Kembali ke cerita
                </button>

                <div className="rc-screen-heading rc-left-heading">
                  <span className="rc-kicker">
                    LANJUTKAN CERITA
                  </span>

                  <h2>
                    Apa yang ingin kamu sampaikan?
                  </h2>

                  <p>
                    Lanjutkan dari cerita dan balasan
                    yang sudah kamu baca.
                  </p>
                </div>

                <textarea
                  className="rc-story-input"
                  value={continuation}
                  onChange={(event) =>
                    setContinuation(
                      event.target.value
                    )
                  }
                  placeholder="Mulai dari apa pun yang terasa ingin diceritakan..."
                  rows={10}
                  maxLength={2000}
                  disabled={busy}
                />

                {error ? (
                  <p role="alert">{error}</p>
                ) : null}

                <button
                  type="button"
                  className="rc-demo-primary"
                  onClick={() =>
                    void sendContinuation()
                  }
                  disabled={
                    busy ||
                    !continuation.trim()
                  }
                >
                  {busy
                    ? "Mengirim..."
                    : "Kirim Cerita"}
                </button>

                <BotanicalCorner />
              </div>
            ) : null}

            {view === "continued" ? (
              <div className="rc-screen rc-result-screen">
                <div
                  className="rc-envelope"
                  aria-hidden="true"
                >
                  <span className="rc-envelope-leaf" />

                  <span className="rc-envelope-check">
                    OK
                  </span>
                </div>

                <h2>
                  Lanjutan ceritamu berhasil dikirim.
                </h2>

                <p>
                  Kamu akan mendapat pemberitahuan ketika
                  ada balasan berikutnya.
                </p>

                <div className="rc-status-card">
                  <span>Status saat ini:</span>
                  <strong>Menunggu balasan</strong>
                </div>

                <button
                  type="button"
                  className="rc-demo-secondary"
                  onClick={() => {
                    if (activeConversation) {
                      void openThread(
                        activeConversation.id
                      );
                    }
                  }}
                  disabled={busy}
                >
                  Kembali ke Cerita
                </button>

                <BotanicalCorner />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="rc-launch-area">
        <span className="rc-launch-label">
          Ruang Cerita
        </span>

        <button
          type="button"
          className="rc-launch"
          onClick={toggleWidget}
          aria-label={
            open
              ? "Tutup Ruang Cerita"
              : "Buka Ruang Cerita"
          }
          aria-expanded={open}
          title="Ruang Cerita"
        >
          <RuangCeritaSymbol />
          {unreadCount > 0 ? (
            <span
              className="rc-unread-badge"
              aria-label={`${unreadCount} balasan baru`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}

function BotanicalCorner() {
  return (
    <span
      className="rc-botanical"
      aria-hidden="true"
    >
      <span className="rc-botanical-stem" />
      <span className="rc-botanical-leaf rc-botanical-leaf-a" />
      <span className="rc-botanical-leaf rc-botanical-leaf-b" />
      <span className="rc-botanical-leaf rc-botanical-leaf-c" />
    </span>
  );
}

function RuangCeritaSymbol() {
  return (
    <span
      className="rc-story-symbol"
      aria-hidden="true"
    >
      <span className="rc-story-symbol-inner">
        <img
          src="/menjadi-nol-symbol-transparent.png"
          alt=""
          className="rc-story-logo"
        />
      </span>

      <span className="rc-story-leaves">
        <span className="rc-story-leaf rc-story-leaf-one" />
        <span className="rc-story-leaf rc-story-leaf-two" />
        <span className="rc-story-stem" />
      </span>
    </span>
  );
}