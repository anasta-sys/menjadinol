"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  deleteContactMessage,
  permanentlyDeleteContactMessage,
  replyContactMessage,
  restoreContactMessage,
  setContactMessageRead,
} from "./actions";

export type ContactMessage = {
  id:string; name:string; email:string; subject:string; message:string;
  is_read:boolean; created_at:string; deleted_at:string|null;
};
type Filter="all"|"new"|"read"|"trash";

const DEFAULT_REPLY = "\n\nBest regards,\nadmin@menjadinol.com";

function initials(n:string){return (n.trim()[0]||"?").toUpperCase();}
function formatDate(v:string){return new Date(v).toLocaleString("id-ID",{day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});}

export default function ContactMessagesManager({initialMessages,loadError=""}:{initialMessages:ContactMessage[];loadError?:string}) {
  const [messages,setMessages]=useState(initialMessages);
  const [selectedId,setSelectedId]=useState<string|null>(initialMessages.find(m=>!m.deleted_at)?.id ?? null);
  const [filter,setFilter]=useState<Filter>("all");
  const [search,setSearch]=useState("");
  const [pending,startTransition]=useTransition();
  const [replyOpen,setReplyOpen]=useState(false);
  const [replyText,setReplyText]=useState("");
  const [replyStatus,setReplyStatus]=useState("");
  const [exportOpen,setExportOpen]=useState(false);
  const [page,setPage]=useState(1);

  const active=messages.filter(m=>!m.deleted_at);
  const trash=messages.filter(m=>!!m.deleted_at);
  const unread=active.filter(m=>!m.is_read).length;
  const selected=messages.find(m=>m.id===selectedId)??null;

  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return messages.filter(m=>{
      const status=filter==="trash" ? !!m.deleted_at :
        !m.deleted_at && (filter==="all" || (filter==="new"&&!m.is_read) || (filter==="read"&&m.is_read));
      const text=!q || `${m.name} ${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(q);
      return status&&text;
    });
  },[messages,filter,search]);

  const MESSAGE_PAGE_SIZE = 10;

  const totalPages = Math.max(
    1,
    Math.ceil(visible.length / MESSAGE_PAGE_SIZE)
  );

  const safePage = Math.min(
    Math.max(1,page),
    totalPages
  );

  const pageStart =
    (safePage - 1) * MESSAGE_PAGE_SIZE;

  const paginatedVisible = visible.slice(
    pageStart,
    pageStart + MESSAGE_PAGE_SIZE
  );

  function changePage(nextPage:number){
    setPage(
      Math.min(
        Math.max(1,nextPage),
        totalPages
      )
    );
  }
  function chooseFirst(next:ContactMessage[], f:Filter=filter){
    const x=next.find(m=>f==="trash"?!!m.deleted_at:!m.deleted_at);
    setSelectedId(x?.id??null);
  }
  function open(m:ContactMessage){
    setSelectedId(m.id); setReplyOpen(false); setReplyText(DEFAULT_REPLY); setReplyStatus("");
    if(!m.deleted_at&&!m.is_read) startTransition(async()=>{
      const r=await setContactMessageRead(m.id,true);
      if(r.ok)setMessages(old=>old.map(x=>x.id===m.id?{...x,is_read:true}:x));
      else alert(r.error||"Gagal memperbarui pesan.");
    });
  }
  function toggle(m:ContactMessage){startTransition(async()=>{
    const r=await setContactMessageRead(m.id,!m.is_read);
    if(r.ok)setMessages(old=>old.map(x=>x.id===m.id?{...x,is_read:!m.is_read}:x));
    else alert(r.error||"Gagal memperbarui pesan.");
  });}
  function moveTrash(m:ContactMessage){
    if(!confirm(`Pindahkan pesan dari ${m.name} ke Sampah?`))return;
    startTransition(async()=>{
      const r=await deleteContactMessage(m.id); if(!r.ok)return alert(r.error||"Gagal memindahkan pesan.");
      const now=new Date().toISOString();
      const next=messages.map(x=>x.id===m.id?{...x,deleted_at:now}:x); setMessages(next); chooseFirst(next);
    });
  }
  function restore(m:ContactMessage){startTransition(async()=>{
    const r=await restoreContactMessage(m.id); if(!r.ok)return alert(r.error||"Gagal memulihkan pesan.");
    const next=messages.map(x=>x.id===m.id?{...x,deleted_at:null}:x); setMessages(next); chooseFirst(next,"trash");
  });}
  function destroy(m:ContactMessage){
    if(!confirm(`Hapus PERMANEN pesan dari ${m.name}? Pesan tidak dapat dipulihkan lagi.`))return;
    startTransition(async()=>{
      const r=await permanentlyDeleteContactMessage(m.id); if(!r.ok)return alert(r.error||"Gagal menghapus permanen.");
      const next=messages.filter(x=>x.id!==m.id); setMessages(next); chooseFirst(next,"trash");
    });
  }
  function sendReply(){
    if(!selected||!replyText.trim())return;
    const id=selected.id; setReplyStatus("");
    startTransition(async()=>{
      const r=await replyContactMessage(id,replyText);
      if(!r.ok){setReplyStatus(r.error||"Balasan gagal dikirim.");return;}
      setMessages(old=>old.map(x=>x.id===id?{...x,is_read:true}:x));
      setReplyText(DEFAULT_REPLY);setReplyOpen(false);setReplyStatus("Balasan berhasil dikirim ke email pengirim.");
    });
  }
  function changeFilter(f:Filter){setFilter(f);setPage(1);setReplyOpen(false);setReplyStatus("");const x=messages.find(m=>f==="trash"?!!m.deleted_at:!m.deleted_at);setSelectedId(x?.id??null);}

  function exportAll(format:"txt"|"docx"|"xlsx"){
    window.location.href =
      `/api/admin/contact-messages/export?format=${format}`;
    setExportOpen(false);
  }

  function printAll(){
    const data=messages.filter(m=>!m.deleted_at);

    const esc=(value:string)=>value
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");

    const popup=window.open("","_blank");

    if(!popup){
      alert("Popup diblokir browser. Izinkan popup untuk mencetak.");
      return;
    }

    const items=data.map((m,index)=>`
      <article class="message">
        <div class="number">
          PESAN ${String(index+1).padStart(2,"0")}
        </div>

        <h2>${esc(m.subject)}</h2>

        <div class="info">
          <div><b>Nama</b><span>${esc(m.name)}</span></div>
          <div><b>Email</b><span>${esc(m.email)}</span></div>
          <div><b>Waktu</b><span>${esc(formatDate(m.created_at))}</span></div>
          <div><b>Status</b><span>${m.is_read?"Sudah Dibaca":"Baru"}</span></div>
        </div>

        <div class="content">
          ${esc(m.message).replace(/\n/g,"<br>")}
        </div>
      </article>
    `).join("");

    popup.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pesan Masuk - Menjadi Nol</title>

        <style>
          @page {
            margin: 16mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #304639;
            font-family: Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.45;
          }

          header {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #d8d2c1;
          }

          .brand {
            color: #94743d;
            font-size: 8pt;
            font-weight: 700;
            letter-spacing: .14em;
          }

          h1 {
            margin: 5px 0;
            font-family: Georgia, serif;
            font-size: 18pt;
            font-weight: 400;
          }

          .summary {
            color: #69766d;
            font-size: 9pt;
          }

          .message {
            padding: 14px 0 18px;
            border-bottom: 1px solid #ded9ca;
            break-inside: avoid;
          }

          .number {
            color: #98783f;
            font-size: 7pt;
            font-weight: 700;
            letter-spacing: .12em;
          }

          h2 {
            margin: 4px 0 10px;
            font-family: Georgia, serif;
            font-size: 13pt;
            font-weight: 400;
          }

          .info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px 18px;
            margin-bottom: 10px;
            font-size: 8pt;
          }

          .info div {
            display: flex;
            gap: 6px;
          }

          .info b {
            min-width: 42px;
            color: #607066;
          }

          .info span {
            overflow-wrap: anywhere;
          }

          .content {
            padding: 10px 12px;
            border: 1px solid #e2ded2;
            border-radius: 8px;
            background: #faf9f4;
          }
        </style>
      </head>

      <body>
        <header>
          <div class="brand">
            MENJADI NOL / PESAN MASUK
          </div>

          <h1>Arsip Pesan Masuk</h1>

          <div class="summary">
            ${data.length} pesan dari formulir Kontak
          </div>
        </header>

        ${items}
      </body>
      </html>
    `);

    popup.document.close();

    setTimeout(()=>{
      popup.focus();
      popup.print();
    },250);

    setExportOpen(false);
  }
  return <main className="inboxPage">
    <section className="intro"><div><div className="crumb">Superadmin &nbsp;/&nbsp; Pesan Masuk</div><div className="titleLine"><span className="mailIcon">M</span><div><h1>Pesan Masuk</h1><p>Pesan dari formulir Kontak Menjadi Nol.</p></div></div></div><div className="quote"><span>Setiap pesan adalah cerita.<br/>Terima, pahami, dan hadir sepenuhnya.</span></div></section>
    {loadError&&<div className="error">Gagal memuat pesan: {loadError}</div>}
    <section className="panel">
      <div className="topbar"><div className="filters">
        <button className={filter==="all"?"active":""} onClick={()=>changeFilter("all")}>Semua ({active.length})</button>
        <button className={filter==="new"?"active":""} onClick={()=>changeFilter("new")}>Baru ({unread})</button>
        <button className={filter==="read"?"active":""} onClick={()=>changeFilter("read")}>Sudah Dibaca ({active.length-unread})</button>
        <button className={filter==="trash"?"active trashTab":""} onClick={()=>changeFilter("trash")}>Sampah ({trash.length})</button>
      </div>


  <div className="topbarActions">

  <button
    type="button"
    className="exportTrigger"
    onClick={()=>window.location.href="/admin/superadmin"}
  >
    <span className="exportIcon">&larr;</span>
    <span>Back to Superadmin</span>
  </button>

  <div className="exportWrap">
  <button
    type="button"
    className="exportTrigger"
    onClick={()=>setExportOpen(v=>!v)}
  >
    <span className="exportIcon">↓</span>
    Ekspor Semua
    <span className="exportChevron">v</span>
  </button>

  {exportOpen&&
    <div className="exportMenu">
      <div className="exportTitle">
        EKSPOR SEMUA PESAN
      </div>

      <button type="button" onClick={printAll}>
        <b>PDF / Cetak</b>
        <small>Semua pesan</small>
      </button>

      <button
        type="button"
        onClick={()=>exportAll("docx")}
      >
        <b>Word</b>
        <small>.docx</small>
      </button>

      <button
        type="button"
        onClick={()=>exportAll("xlsx")}
      >
        <b>Excel</b>
        <small>.xlsx</small>
      </button>

      <button
        type="button"
        onClick={()=>exportAll("txt")}
      >
        <b>TXT</b>
        <small>.txt</small>
      </button>
    </div>
  }
</div></div><label className="search"><span className="searchText">Cari</span><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Cari nama, email, subjek, atau isi pesan..."/></label></div>
      <div className="grid"><aside className="list">
        {!visible.length&&<div className="empty">{filter==="trash"?"Sampah kosong.":"Belum ada pesan."}</div>}
        {paginatedVisible.map(m=><button key={m.id} onClick={()=>open(m)} className={`row ${selectedId===m.id?"selected":""}`}>
          <span className="avatar">{initials(m.name)}</span><span className="rowMain"><span className="rowTop"><strong>{m.name}</strong><time>{formatDate(m.created_at)}</time></span><span className="subject">{m.subject}</span><span className="preview">{m.message}</span></span>{!m.deleted_at&&<span className={`statusDot ${m.is_read?"read":""}`}/>}
        </button>)}

        {visible.length > MESSAGE_PAGE_SIZE && (
          <div className="messagePagination">
            <button
              type="button"
              disabled={safePage===1}
              onClick={()=>changePage(safePage-1)}
              aria-label="Halaman sebelumnya"
            >
              ‹
            </button>

            {Array.from(
              {length:totalPages},
              (_,index)=>index+1
            ).map(pageNumber=>(
              <button
                key={pageNumber}
                type="button"
                className={
                  safePage===pageNumber
                    ? "pageActive"
                    : ""
                }
                aria-current={
                  safePage===pageNumber
                    ? "page"
                    : undefined
                }
                onClick={()=>changePage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              disabled={safePage===totalPages}
              onClick={()=>changePage(safePage+1)}
              aria-label="Halaman berikutnya"
            >
              ›
            </button>
          </div>
        )}
      </aside><article className="detail">
        {!selected?<div className="empty big">Pilih pesan untuk membaca isinya.</div>:<>
          <header className="sender"><span className="avatar large">{initials(selected.name)}</span><div className="senderText"><h2>{selected.name}</h2><a href={`mailto:${selected.email}`}>{selected.email}</a></div><span className="badge">{selected.deleted_at?"Di Sampah":selected.is_read?"Sudah Dibaca":"Baru"}</span></header>
          <time className="fullDate">{formatDate(selected.created_at)}</time><hr/><h3>{selected.subject}</h3><div className="body">{selected.message}</div>
          {!selected.deleted_at&&<div className="replyArea"><div className="replyHead"><strong>Balas Pesan</strong>{!replyOpen&&<button className="primary" onClick={()=>{setReplyOpen(true);setReplyText(DEFAULT_REPLY);setReplyStatus("");}}>Balas</button>}</div>
            {replyOpen&&<div className="replyComposer"><div className="replyTo">Kepada: <b>{selected.name}</b> &lt;{selected.email}&gt;</div><textarea value={replyText} maxLength={10000} disabled={pending} placeholder="Tulis balasan untuk pengirim..." onChange={e=>setReplyText(e.target.value)}/><div className="composerFoot"><small>{replyText.length.toLocaleString("id-ID")} / 10.000</small><div><button onClick={()=>{setReplyOpen(false);setReplyText(DEFAULT_REPLY);}}>Batal</button><button className="primary" disabled={pending||!replyText.trim()} onClick={sendReply}>{pending?"Mengirim...":"Kirim Balasan"}</button></div></div></div>}
            {replyStatus&&<div className={replyStatus.startsWith("Balasan berhasil")?"success":"error"}>{replyStatus}</div>}
          </div>}
          <div className="meta"><strong>Detail Pengirim</strong><div className="metaGrid"><div><small>Email</small><b>{selected.email}</b></div><div><small>Nama</small><b>{selected.name}</b></div><div><small>Waktu Kirim</small><b>{formatDate(selected.created_at)}</b></div></div></div>
          <footer>{selected.deleted_at?<div className="leftActions"><button className="restore" disabled={pending} onClick={()=>restore(selected)}>Pulihkan</button><button className="delete" disabled={pending} onClick={()=>destroy(selected)}>Hapus Permanen</button></div>:<div className="leftActions"><button className="primary" disabled={pending} onClick={()=>toggle(selected)}>{selected.is_read?"Tandai Belum Dibaca":"Tandai Sudah Dibaca"}</button><button className="delete" disabled={pending} onClick={()=>moveTrash(selected)}>Hapus ke Sampah</button></div>}</footer>
        </>}
      </article></div>
    </section>
    <style jsx>{`
      .inboxPage{max-width:1440px;margin:0 auto;padding:34px;color:#102b22}.intro,.topbar,.sender,footer,.replyHead,.composerFoot{display:flex;justify-content:space-between;align-items:center;gap:18px}.intro{margin-bottom:22px}.crumb{font-size:13px;color:#66756e;margin-bottom:18px}.titleLine{display:flex;gap:18px;align-items:center}.mailIcon{width:58px;height:58px;border:3px solid #17613f;border-radius:10px;display:grid;place-items:center;font-size:28px;color:#17613f}h1{font-family:Georgia,serif;font-size:40px;font-weight:500;margin:0}.titleLine p{margin:4px 0;color:#5e6b66}.quote{background:#f7f8f2;border-radius:18px;padding:20px 28px;color:#536353;font:italic 17px/1.5 Georgia,serif}.panel{background:#fff;border:1px solid #e4e9e5;border-radius:24px;padding:24px;box-shadow:0 15px 45px rgba(31,66,49,.07)}.filters{display:flex;gap:9px;flex-wrap:wrap}button{font:inherit;cursor:pointer}.filters button,.composerFoot button{border:1px solid #dfe6e1;background:#fff;border-radius:999px;padding:10px 18px;color:#19382c}.filters .active{background:#0f6a43;color:#fff;border-color:#0f6a43}.filters .trashTab{background:#6f554d;border-color:#6f554d}.search{width:min(420px,40%);border:1px solid #dfe6e1;border-radius:13px;padding:0 14px;display:flex;align-items:center;gap:8px}.search input{width:100%;border:0;outline:0;padding:12px 0}.grid{display:grid;grid-template-columns:minmax(330px,.72fr) minmax(0,1.28fr);gap:18px;margin-top:18px}.list,.detail{border:1px solid #e1e7e3;border-radius:18px;overflow:hidden;background:#fff}.row{position:relative;width:100%;border:0;border-bottom:1px solid #edf0ee;background:#fff;padding:18px;display:flex;gap:13px;text-align:left;color:inherit}.row:hover,.row.selected{background:#f5f8f1}.avatar{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:#edf2e7;color:#315a43;font-weight:800;flex:none}.avatar.large{width:52px;height:52px}.rowMain{min-width:0;display:grid;gap:4px;flex:1}.rowTop{display:flex;justify-content:space-between;gap:10px}.rowTop time{font-size:10px;color:#77827d}.subject{font-size:13px}.preview{font-size:12px;color:#6c7873;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.statusDot{position:absolute;right:15px;bottom:17px;width:8px;height:8px;background:#e94747;border-radius:50%}.statusDot.read{background:#b8c7ae}.detail{padding:24px}.senderText{flex:1}.senderText h2{margin:0}.senderText a{font-size:13px;color:#68766f;text-decoration:none}.badge{background:#eef3ef;color:#607068;border-radius:999px;padding:7px 15px;font-size:11px;font-weight:800}.fullDate{display:block;color:#75817b;font-size:12px;margin-top:18px}hr{border:0;border-top:1px solid #edf0ee;margin:16px 0}h3{font-size:24px}.body{white-space:pre-wrap;line-height:1.75;background:#fbfcfa;border:1px solid #edf0ee;border-radius:15px;padding:20px;min-height:150px}.replyArea,.meta,footer{border-top:1px solid #edf0ee;margin-top:22px;padding-top:18px}.replyComposer{margin-top:14px;padding:16px;background:#f8faf7;border:1px solid #e1e8e2;border-radius:14px}.replyTo{font-size:12px;color:#68766f;margin-bottom:10px}.replyComposer textarea{width:100%;min-height:150px;box-sizing:border-box;border:1px solid #dbe4dd;border-radius:11px;padding:13px;font:14px/1.65 Arial}.composerFoot{margin-top:10px}.composerFoot>div,.leftActions{display:flex;gap:8px}.primary,.restore,.delete{border-radius:10px;padding:10px 15px}.primary{background:#0f6a43!important;color:#fff!important;border:1px solid #0f6a43!important}.restore{background:#eef8f1;color:#17613f;border:1px solid #cfe5d6}.delete{background:#fff1ef;color:#c84039;border:1px solid #ffd8d3}.success,.error{margin-top:12px;padding:11px;border-radius:10px}.success{background:#eef8f1;color:#17613f}.error{background:#fff0f0;color:#a53333}.metaGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:15px}.metaGrid div{display:grid}.metaGrid small{color:#7c8782}.metaGrid b{font-size:12px;overflow-wrap:anywhere}.empty{padding:25px;color:#6d7973}.empty.big{min-height:420px;display:grid;place-items:center}@media(max-width:900px){.intro,.topbar{display:block}.quote{margin-top:18px}.search{width:auto;margin-top:14px}.grid{grid-template-columns:1fr}.metaGrid{grid-template-columns:1fr}.inboxPage{padding:24px 16px}}

.messagePagination{
  display:flex;
  justify-content:center;
  align-items:center;
  gap:6px;
  flex-wrap:wrap;
  padding:14px;
  border-top:1px solid #edf0ee;
  background:#fbfcfa;
}

.messagePagination button{
  width:34px;
  height:34px;
  padding:0;
  border-radius:9px;
  border:1px solid #dfe6e1;
  background:#fff;
  color:#315a43;
  font-size:12px;
  font-weight:700;
}

.messagePagination button.pageActive{
  background:#0f6a43;
  border-color:#0f6a43;
  color:#fff;
}

.messagePagination button:disabled{
  cursor:not-allowed;
  opacity:.35;
}
.exportWrap{
  position:relative;
  margin-left:auto;
}

.exportTrigger{
  height:42px;
  padding:0 15px;
  display:inline-flex;
  align-items:center;
  gap:8px;
  border:1px solid rgba(148,116,59,.30);
  border-radius:999px;
  background:#f5f0df;
  color:#536a58;
  font-size:10px;
  font-weight:700;
  white-space:nowrap;
  box-shadow:0 7px 20px rgba(50,70,55,.07);
}

.exportTrigger:hover{
  background:#fbf7e9;
  border-color:rgba(148,116,59,.48);
}

.exportIcon{
  width:22px;
  height:22px;
  display:grid;
  place-items:center;
  border:1px solid rgba(148,116,59,.22);
  border-radius:50%;
  color:#94743d;
  font-size:13px;
}

.exportChevron{
  color:#94743d;
  font-size:8px;
}

.exportMenu{
  position:absolute;
  z-index:100;
  top:50px;
  right:0;
  width:220px;
  padding:7px;
  border:1px solid #dde3dc;
  border-radius:15px;
  background:#fffdf6;
  box-shadow:0 18px 45px rgba(38,57,44,.16);
}

.exportTitle{
  padding:8px 10px 9px;
  border-bottom:1px solid #ece8dc;
  color:#96763e;
  font-size:7px;
  font-weight:800;
  letter-spacing:.12em;
}

.exportMenu button{
  width:100%;
  min-height:43px;
  padding:8px 10px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  border:0;
  border-radius:9px;
  background:transparent;
  color:#405b49;
  font-size:10px;
  text-align:left;
}

.exportMenu button:hover{
  background:#f1f5ed;
}

.exportMenu button b{
  font-size:10px;
}

.exportMenu button small{
  color:#987940;
  font-size:8px;
}

@media(max-width:900px){
  .exportWrap{
    margin:14px 0 0;
  }

  .exportMenu{
    left:0;
    right:auto;
  }
}

.backSuperadmin08{
  position:static !important;
  margin:0 !important;
  text-decoration:none !important;
  white-space:nowrap;
}



.inboxPage{
  position:relative;
}

.intro{
  position:relative;
  padding-top:10px;
}

.mailIcon{
  background:#eef5e9 !important;
  border-color:#4f7d59 !important;
  color:#416c4c !important;
}

.quote{
  background:rgba(250,246,232,.82) !important;
  border:1px solid rgba(181,151,92,.15);
  box-shadow:0 10px 30px rgba(68,82,63,.05);
}

.panel{
  background:rgba(255,253,247,.93) !important;
}

.filters button{
  background:#fffdf7;
}

.filters .active{
  background:#176b48 !important;
}

.row.selected{
  background:#f1f6ec !important;
}

.avatar{
  background:#eef4e8 !important;
  color:#315f42 !important;
}

.badge{
  background:#edf4e9 !important;
  color:#486851 !important;
}

@media(max-width:900px){
  .backSuperadmin08{
  position:static !important;
  margin:0 !important;
  text-decoration:none !important;
  white-space:nowrap;
}
}

/* Topbar actions - Back + Export */
.topbarActions{
  margin-left:auto;
  display:flex;
  align-items:center;
  gap:8px;
  flex:none;
}

.backSuperadmin08{
  position:static !important;
  margin:0 !important;
  text-decoration:none !important;
  white-space:nowrap;
}



.exportWrap{
  margin-left:0 !important;
}

@media(max-width:900px){
  .topbarActions{
    margin:14px 0 0;
    width:100%;
  }

  .backSuperadmin08{
  position:static !important;
  margin:0 !important;
  text-decoration:none !important;
  white-space:nowrap;
}
}

/* FINAL Back to Superadmin - same visual as Export */
.topbarActions .backSuperadmin08,
.topbarActions a.backSuperadmin08,
.topbarActions a.exportTrigger.backSuperadmin08{
  position:static !important;
  top:auto !important;
  right:auto !important;
  width:auto !important;
  height:42px !important;
  min-height:42px !important;
  margin:0 !important;
  padding:0 15px !important;

  display:inline-flex !important;
  align-items:center !important;
  justify-content:center !important;
  gap:8px !important;

  box-sizing:border-box !important;

  border:1px solid rgba(148,116,59,.30) !important;
  border-radius:999px !important;

  background:#f5f0df !important;
  color:#536a58 !important;

  font-family:inherit !important;
  font-size:10px !important;
  line-height:1 !important;
  font-weight:700 !important;

  text-decoration:none !important;
  white-space:nowrap !important;

  box-shadow:0 7px 20px rgba(50,70,55,.07) !important;
}

.topbarActions .backSuperadmin08:hover,
.topbarActions a.backSuperadmin08:hover{
  background:#fbf7e9 !important;
  border-color:rgba(148,116,59,.48) !important;
  color:#536a58 !important;
  text-decoration:none !important;
}

.topbarActions{
  margin-left:auto !important;
  display:flex !important;
  align-items:center !important;
  gap:8px !important;
}

.topbarActions .exportWrap{
  margin:0 !important;
}

/* FINAL TOPBAR ACTIONS */
.topbarActions{
  margin-left:auto !important;
  display:flex !important;
  align-items:center !important;
  gap:8px !important;
  flex:none !important;
}

.topbarActions > .exportTrigger{
  margin:0 !important;
  flex:none !important;
}

.topbarActions .exportWrap{
  margin:0 !important;
  flex:none !important;
}
    `}</style>
  </main>;
}
