"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteContactMessage, setContactMessageRead } from "./actions";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type Filter = "all" | "new" | "read";

function initials(name: string) {
  return (name.trim()[0] || "?").toUpperCase();
}

function formatDate(value: string, compact = false) {
  const d = new Date(value);
  if (compact) {
    return d.toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export default function ContactMessagesManager({
  initialMessages,
  loadError = "",
}: {
  initialMessages: ContactMessage[];
  loadError?: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [selectedId, setSelectedId] = useState<string | null>(initialMessages[0]?.id ?? null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const unread = messages.filter((m) => !m.is_read).length;
  const selected = messages.find((m) => m.id === selectedId) ?? null;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      const status =
        filter === "all" || (filter === "new" && !m.is_read) || (filter === "read" && m.is_read);
      const text =
        !q || `${m.name} ${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(q);
      return status && text;
    });
  }, [messages, filter, search]);

  function patch(id: string, is_read: boolean) {
    setMessages((old) => old.map((m) => m.id === id ? { ...m, is_read } : m));
  }

  function open(m: ContactMessage) {
    setSelectedId(m.id);
    if (!m.is_read) {
      startTransition(async () => {
        const r = await setContactMessageRead(m.id, true);
        if (r.ok) patch(m.id, true);
        else alert(r.error || "Gagal memperbarui pesan.");
      });
    }
  }

  function toggle(m: ContactMessage) {
    startTransition(async () => {
      const r = await setContactMessageRead(m.id, !m.is_read);
      if (r.ok) patch(m.id, !m.is_read);
      else alert(r.error || "Gagal memperbarui pesan.");
    });
  }

  function remove(m: ContactMessage) {
    if (!confirm(`Hapus pesan dari ${m.name}? Tindakan ini tidak dapat dibatalkan.`)) return;
    startTransition(async () => {
      const r = await deleteContactMessage(m.id);
      if (!r.ok) return alert(r.error || "Gagal menghapus pesan.");
      const remaining = messages.filter((x) => x.id !== m.id);
      setMessages(remaining);
      setSelectedId(remaining[0]?.id ?? null);
    });
  }

  function move(direction: -1 | 1) {
    if (!selected) return;
    const i = visible.findIndex((m) => m.id === selected.id);
    const next = visible[i + direction];
    if (next) open(next);
  }

  return (
    <main className="inboxPage">
      <section className="intro">
        <div>
          <div className="crumb">⌂ &nbsp;/&nbsp; Superadmin &nbsp;/&nbsp; Pesan Masuk</div>
          <div className="titleLine">
            <span className="mailIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 5.5h18v13H3z"/><path d="m4 7 8 6 8-6"/></svg>
            </span>
            <div>
              <h1>Pesan Masuk</h1>
              <p>Pesan dari formulir Kontak Menjadi Nol.</p>
            </div>
          </div>
        </div>
        <div className="quote">❧ <span>Setiap pesan adalah cerita.<br/>Terima, pahami, dan hadir sepenuhnya.</span> ❧</div>
      </section>

      {loadError && <div className="error">Gagal memuat pesan: {loadError}</div>}

      <section className="panel">
        <div className="topbar">
          <div className="filters">
            <button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>Semua ({messages.length})</button>
            <button className={filter==="new"?"active":""} onClick={()=>setFilter("new")}>Baru ({unread}) {unread>0 && <i/>}</button>
            <button className={filter==="read"?"active":""} onClick={()=>setFilter("read")}>Sudah Dibaca ({messages.length-unread})</button>
          </div>
          <label className="search">
            <span>⌕</span>
            <input value={search} onChange={(e)=>setSearch(e.target.value)}
              placeholder="Cari nama, email, subjek, atau isi pesan..." />
          </label>
        </div>

        <div className="grid">
          <aside className="list">
            {visible.length === 0 && <div className="empty">Belum ada pesan.</div>}
            {visible.map((m) => (
              <button key={m.id} onClick={()=>open(m)}
                className={`row ${selectedId===m.id?"selected":""}`}>
                <span className="avatar">{initials(m.name)}</span>
                <span className="rowMain">
                  <span className="rowTop"><strong>{m.name}</strong><time>{formatDate(m.created_at,true)}</time></span>
                  <span className="subject">{m.subject}</span>
                  <span className="preview">{m.message}</span>
                </span>
                <span className={`statusDot ${m.is_read?"read":""}`}/>
              </button>
            ))}
          </aside>

          <article className="detail">
            {!selected ? <div className="empty big">Pilih pesan untuk membaca isinya.</div> : <>
              <header className="sender">
                <span className="avatar large">{initials(selected.name)}</span>
                <div className="senderText">
                  <h2>{selected.name}</h2>
                  <a href={`mailto:${selected.email}`}>{selected.email}</a>
                </div>
                <span className={`badge ${selected.is_read?"readBadge":""}`}>
                  {selected.is_read ? "Sudah Dibaca" : "Baru"}
                </span>
                <button className="icon dangerIcon" title="Hapus" onClick={()=>remove(selected)}>⌫</button>
              </header>

              <time className="fullDate">{formatDate(selected.created_at)}</time>
              <hr/>
              <h3>{selected.subject}</h3>
              <div className="body">{selected.message}</div>

              <div className="meta">
                <strong>Detail Pengirim</strong>
                <div className="metaGrid">
                  <div><span>✉</span><small>Email</small><b>{selected.email}</b></div>
                  <div><span>♙</span><small>Nama</small><b>{selected.name}</b></div>
                  <div><span>▣</span><small>Waktu Kirim</small><b>{formatDate(selected.created_at)}</b></div>
                </div>
              </div>

              <footer>
                <div className="leftActions">
                  <button disabled={pending} className="primary" onClick={()=>toggle(selected)}>
                    ✉ &nbsp; {selected.is_read ? "Tandai Belum Dibaca" : "Tandai Sudah Dibaca"}
                  </button>
                  <button disabled={pending} className="delete" onClick={()=>remove(selected)}>♲ &nbsp; Hapus</button>
                </div>
                <div className="navActions">
                  <button onClick={()=>move(-1)}>← &nbsp; Sebelumnya</button>
                  <button onClick={()=>move(1)}>Berikutnya &nbsp; →</button>
                </div>
              </footer>
            </>}
          </article>
        </div>
      </section>

      <style jsx>{`
        .inboxPage{max-width:1440px;margin:0 auto;padding:34px 34px 60px;color:#102b22}
        .intro{display:flex;justify-content:space-between;align-items:flex-end;gap:28px;margin-bottom:22px}
        .crumb{font-size:13px;color:#66756e;margin-bottom:18px}.titleLine{display:flex;gap:18px;align-items:center}
        .mailIcon{width:58px;height:58px;border:3px solid #17613f;border-radius:10px;display:grid;place-items:center}
        .mailIcon svg{width:36px;fill:none;stroke:#17613f;stroke-width:1.8}
        h1{font-family:Georgia,serif;font-size:40px;font-weight:500;margin:0 0 4px}.titleLine p{margin:0;color:#5e6b66}
        .quote{min-width:390px;background:rgba(247,248,242,.82);border-radius:18px;padding:20px 28px;display:flex;justify-content:space-between;gap:18px;color:#536353;font:italic 17px/1.5 Georgia,serif}
        .panel{background:rgba(255,255,255,.9);border:1px solid rgba(20,70,48,.09);border-radius:24px;padding:24px;box-shadow:0 15px 45px rgba(31,66,49,.07)}
        .topbar{display:flex;justify-content:space-between;gap:20px;margin-bottom:18px}.filters{display:flex;gap:10px;flex-wrap:wrap}
        button{font:inherit}.filters button,.navActions button{border:1px solid #dfe6e1;background:#fff;border-radius:999px;padding:10px 20px;cursor:pointer;color:#19382c}
        .filters button.active{background:#0f6a43;color:#fff;border-color:#0f6a43}.filters i{display:inline-block;width:8px;height:8px;background:#e74747;border-radius:50%;margin-left:7px}
        .search{width:min(440px,42%);border:1px solid #dfe6e1;border-radius:13px;display:flex;align-items:center;padding:0 14px;gap:10px;background:#fff}
        .search span{font-size:24px;color:#65736d}.search input{width:100%;border:0;outline:0;padding:12px 0;font-size:14px;background:transparent}
        .grid{display:grid;grid-template-columns:minmax(330px,.72fr) minmax(0,1.28fr);gap:18px}.list,.detail{border:1px solid #e1e7e3;border-radius:18px;overflow:hidden;background:#fff}
        .row{position:relative;width:100%;border:0;border-bottom:1px solid #edf0ee;background:#fff;padding:18px;display:flex;gap:13px;text-align:left;cursor:pointer;color:inherit}
        .row:hover,.row.selected{background:#f5f8f1}.avatar{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:#edf2e7;color:#315a43;font-weight:800;flex:none}
        .avatar.large{width:52px;height:52px;font-size:19px}.rowMain{min-width:0;display:grid;gap:4px;flex:1}.rowTop{display:flex;justify-content:space-between;gap:10px}.rowTop time{font-size:11px;color:#77827d;white-space:nowrap}
        .subject{font-size:13px}.preview{font-size:12px;color:#6c7873;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:92%}
        .statusDot{position:absolute;right:15px;bottom:17px;width:8px;height:8px;background:#e94747;border-radius:50%}.statusDot.read{background:#b8c7ae}
        .detail{padding:24px}.sender{display:flex;align-items:center;gap:13px}.senderText{flex:1}.senderText h2{margin:0 0 2px;font-size:18px}.senderText a{font-size:13px;color:#68766f;text-decoration:none}
        .badge{background:#fff0ee;color:#d63c35;border-radius:999px;padding:7px 15px;font-size:11px;font-weight:800}.readBadge{background:#eef3ef;color:#607068}
        .icon{width:42px;height:42px;border:1px solid #e1e6e3;border-radius:11px;background:#fff;cursor:pointer}.dangerIcon{color:#a94747}
        .fullDate{display:block;color:#75817b;font-size:12px;margin-top:18px}hr{border:0;border-top:1px solid #edf0ee;margin:16px 0}
        h3{font-size:24px;margin:14px 0 18px}.body{white-space:pre-wrap;line-height:1.75;background:#fbfcfa;border:1px solid #edf0ee;border-radius:15px;padding:20px;min-height:160px}
        .meta{border-top:1px solid #edf0ee;margin-top:22px;padding-top:18px}.meta>strong{font-size:13px}.metaGrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:15px}
        .metaGrid div{display:grid;grid-template-columns:24px 1fr;column-gap:7px}.metaGrid span{grid-row:1/3}.metaGrid small{color:#7c8782}.metaGrid b{font-size:12px;font-weight:600;overflow-wrap:anywhere}
        footer{border-top:1px solid #edf0ee;margin-top:22px;padding-top:18px;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}.leftActions,.navActions{display:flex;gap:9px}
        footer button{border:1px solid #dfe6e1;border-radius:10px;padding:10px 15px;background:#fff;cursor:pointer}.primary{background:#0f6a43!important;color:#fff;border-color:#0f6a43!important}.delete{background:#fff1ef!important;color:#c84039;border-color:#ffd8d3!important}
        .empty{padding:25px;color:#6d7973}.empty.big{min-height:420px;display:grid;place-items:center}.error{margin-bottom:15px;padding:14px 18px;border-radius:13px;background:#fff0f0;color:#a53333}
        @media(max-width:900px){.intro{display:block}.quote{min-width:0;margin-top:20px}.topbar{display:block}.search{width:auto;margin-top:14px}.grid{grid-template-columns:1fr}.metaGrid{grid-template-columns:1fr}.inboxPage{padding:24px 16px}.detail{min-height:350px}}
      `}</style>
    </main>
  );
}
