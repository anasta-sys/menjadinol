"use client";

import { useMemo, useState, useTransition } from "react";
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
  function changeFilter(f:Filter){setFilter(f);setReplyOpen(false);setReplyStatus("");const x=messages.find(m=>f==="trash"?!!m.deleted_at:!m.deleted_at);setSelectedId(x?.id??null);}

  return <main className="inboxPage">
    <section className="intro"><div><div className="crumb">⌂ &nbsp;/&nbsp; Superadmin &nbsp;/&nbsp; Pesan Masuk</div><div className="titleLine"><span className="mailIcon">✉</span><div><h1>Pesan Masuk</h1><p>Pesan dari formulir Kontak Menjadi Nol.</p></div></div></div><div className="quote">❧ <span>Setiap pesan adalah cerita.<br/>Terima, pahami, dan hadir sepenuhnya.</span> ❧</div></section>
    {loadError&&<div className="error">Gagal memuat pesan: {loadError}</div>}
    <section className="panel">
      <div className="topbar"><div className="filters">
        <button className={filter==="all"?"active":""} onClick={()=>changeFilter("all")}>Semua ({active.length})</button>
        <button className={filter==="new"?"active":""} onClick={()=>changeFilter("new")}>Baru ({unread})</button>
        <button className={filter==="read"?"active":""} onClick={()=>changeFilter("read")}>Sudah Dibaca ({active.length-unread})</button>
        <button className={filter==="trash"?"active trashTab":""} onClick={()=>changeFilter("trash")}>♲ Sampah ({trash.length})</button>
      </div><label className="search">⌕<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama, email, subjek, atau isi pesan..."/></label></div>
      <div className="grid"><aside className="list">
        {!visible.length&&<div className="empty">{filter==="trash"?"Sampah kosong.":"Belum ada pesan."}</div>}
        {visible.map(m=><button key={m.id} onClick={()=>open(m)} className={`row ${selectedId===m.id?"selected":""}`}>
          <span className="avatar">{initials(m.name)}</span><span className="rowMain"><span className="rowTop"><strong>{m.name}</strong><time>{formatDate(m.created_at)}</time></span><span className="subject">{m.subject}</span><span className="preview">{m.message}</span></span>{!m.deleted_at&&<span className={`statusDot ${m.is_read?"read":""}`}/>}
        </button>)}
      </aside><article className="detail">
        {!selected?<div className="empty big">Pilih pesan untuk membaca isinya.</div>:<>
          <header className="sender"><span className="avatar large">{initials(selected.name)}</span><div className="senderText"><h2>{selected.name}</h2><a href={`mailto:${selected.email}`}>{selected.email}</a></div><span className="badge">{selected.deleted_at?"Di Sampah":selected.is_read?"Sudah Dibaca":"Baru"}</span></header>
          <time className="fullDate">{formatDate(selected.created_at)}</time><hr/><h3>{selected.subject}</h3><div className="body">{selected.message}</div>
          {!selected.deleted_at&&<div className="replyArea"><div className="replyHead"><strong>Balas Pesan</strong>{!replyOpen&&<button className="primary" onClick={()=>{setReplyOpen(true);setReplyText(DEFAULT_REPLY);setReplyStatus("");}}>↩ &nbsp; Balas</button>}</div>
            {replyOpen&&<div className="replyComposer"><div className="replyTo">Kepada: <b>{selected.name}</b> &lt;{selected.email}&gt;</div><textarea value={replyText} maxLength={10000} disabled={pending} placeholder="Tulis balasan untuk pengirim..." onChange={e=>setReplyText(e.target.value)}/><div className="composerFoot"><small>{replyText.length.toLocaleString("id-ID")} / 10.000</small><div><button onClick={()=>{setReplyOpen(false);setReplyText(DEFAULT_REPLY);}}>Batal</button><button className="primary" disabled={pending||!replyText.trim()} onClick={sendReply}>{pending?"Mengirim...":"✉ Kirim Balasan"}</button></div></div></div>}
            {replyStatus&&<div className={replyStatus.startsWith("Balasan berhasil")?"success":"error"}>{replyStatus}</div>}
          </div>}
          <div className="meta"><strong>Detail Pengirim</strong><div className="metaGrid"><div><small>Email</small><b>{selected.email}</b></div><div><small>Nama</small><b>{selected.name}</b></div><div><small>Waktu Kirim</small><b>{formatDate(selected.created_at)}</b></div></div></div>
          <footer>{selected.deleted_at?<div className="leftActions"><button className="restore" disabled={pending} onClick={()=>restore(selected)}>↶ Pulihkan</button><button className="delete" disabled={pending} onClick={()=>destroy(selected)}>Hapus Permanen</button></div>:<div className="leftActions"><button className="primary" disabled={pending} onClick={()=>toggle(selected)}>✉ {selected.is_read?"Tandai Belum Dibaca":"Tandai Sudah Dibaca"}</button><button className="delete" disabled={pending} onClick={()=>moveTrash(selected)}>♲ Hapus ke Sampah</button></div>}</footer>
        </>}
      </article></div>
    </section>
    <style jsx>{`
      .inboxPage{max-width:1440px;margin:0 auto;padding:34px;color:#102b22}.intro,.topbar,.sender,footer,.replyHead,.composerFoot{display:flex;justify-content:space-between;align-items:center;gap:18px}.intro{margin-bottom:22px}.crumb{font-size:13px;color:#66756e;margin-bottom:18px}.titleLine{display:flex;gap:18px;align-items:center}.mailIcon{width:58px;height:58px;border:3px solid #17613f;border-radius:10px;display:grid;place-items:center;font-size:28px;color:#17613f}h1{font-family:Georgia,serif;font-size:40px;font-weight:500;margin:0}.titleLine p{margin:4px 0;color:#5e6b66}.quote{background:#f7f8f2;border-radius:18px;padding:20px 28px;color:#536353;font:italic 17px/1.5 Georgia,serif}.panel{background:#fff;border:1px solid #e4e9e5;border-radius:24px;padding:24px;box-shadow:0 15px 45px rgba(31,66,49,.07)}.filters{display:flex;gap:9px;flex-wrap:wrap}button{font:inherit;cursor:pointer}.filters button,.composerFoot button{border:1px solid #dfe6e1;background:#fff;border-radius:999px;padding:10px 18px;color:#19382c}.filters .active{background:#0f6a43;color:#fff;border-color:#0f6a43}.filters .trashTab{background:#6f554d;border-color:#6f554d}.search{width:min(420px,40%);border:1px solid #dfe6e1;border-radius:13px;padding:0 14px;display:flex;align-items:center;gap:8px}.search input{width:100%;border:0;outline:0;padding:12px 0}.grid{display:grid;grid-template-columns:minmax(330px,.72fr) minmax(0,1.28fr);gap:18px;margin-top:18px}.list,.detail{border:1px solid #e1e7e3;border-radius:18px;overflow:hidden;background:#fff}.row{position:relative;width:100%;border:0;border-bottom:1px solid #edf0ee;background:#fff;padding:18px;display:flex;gap:13px;text-align:left;color:inherit}.row:hover,.row.selected{background:#f5f8f1}.avatar{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:#edf2e7;color:#315a43;font-weight:800;flex:none}.avatar.large{width:52px;height:52px}.rowMain{min-width:0;display:grid;gap:4px;flex:1}.rowTop{display:flex;justify-content:space-between;gap:10px}.rowTop time{font-size:10px;color:#77827d}.subject{font-size:13px}.preview{font-size:12px;color:#6c7873;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.statusDot{position:absolute;right:15px;bottom:17px;width:8px;height:8px;background:#e94747;border-radius:50%}.statusDot.read{background:#b8c7ae}.detail{padding:24px}.senderText{flex:1}.senderText h2{margin:0}.senderText a{font-size:13px;color:#68766f;text-decoration:none}.badge{background:#eef3ef;color:#607068;border-radius:999px;padding:7px 15px;font-size:11px;font-weight:800}.fullDate{display:block;color:#75817b;font-size:12px;margin-top:18px}hr{border:0;border-top:1px solid #edf0ee;margin:16px 0}h3{font-size:24px}.body{white-space:pre-wrap;line-height:1.75;background:#fbfcfa;border:1px solid #edf0ee;border-radius:15px;padding:20px;min-height:150px}.replyArea,.meta,footer{border-top:1px solid #edf0ee;margin-top:22px;padding-top:18px}.replyComposer{margin-top:14px;padding:16px;background:#f8faf7;border:1px solid #e1e8e2;border-radius:14px}.replyTo{font-size:12px;color:#68766f;margin-bottom:10px}.replyComposer textarea{width:100%;min-height:150px;box-sizing:border-box;border:1px solid #dbe4dd;border-radius:11px;padding:13px;font:14px/1.65 Arial}.composerFoot{margin-top:10px}.composerFoot>div,.leftActions{display:flex;gap:8px}.primary,.restore,.delete{border-radius:10px;padding:10px 15px}.primary{background:#0f6a43!important;color:#fff!important;border:1px solid #0f6a43!important}.restore{background:#eef8f1;color:#17613f;border:1px solid #cfe5d6}.delete{background:#fff1ef;color:#c84039;border:1px solid #ffd8d3}.success,.error{margin-top:12px;padding:11px;border-radius:10px}.success{background:#eef8f1;color:#17613f}.error{background:#fff0f0;color:#a53333}.metaGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:15px}.metaGrid div{display:grid}.metaGrid small{color:#7c8782}.metaGrid b{font-size:12px;overflow-wrap:anywhere}.empty{padding:25px;color:#6d7973}.empty.big{min-height:420px;display:grid;place-items:center}@media(max-width:900px){.intro,.topbar{display:block}.quote{margin-top:18px}.search{width:auto;margin-top:14px}.grid{grid-template-columns:1fr}.metaGrid{grid-template-columns:1fr}.inboxPage{padding:24px 16px}}
    `}</style>
  </main>;
}
