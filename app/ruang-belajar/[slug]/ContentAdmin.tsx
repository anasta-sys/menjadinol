"use client";
import {useState} from "react";
import {createLearningArticle,deleteLearningArticle} from "../actions";

type Article={id:string;title:string;status:string};
export default function ContentAdmin({collectionId,collectionSlug,articles}:{collectionId:string;collectionSlug:string;articles:Article[]}){
 const [open,setOpen]=useState(false);
 return <section className="learning-content-admin">
   <div className="learning-content-admin-head"><div><span className="folder-label">admin</span><h2>Kelola konten</h2></div><button className="learning-add-button" type="button" onClick={()=>setOpen(v=>!v)}>{open?"tutup":"+ tambah konten"}</button></div>
   {open&&<form action={createLearningArticle} className="learning-content-form">
     <input type="hidden" name="collection_id" value={collectionId}/><input type="hidden" name="collection_slug" value={collectionSlug}/>
     <label>Judul<input name="title" maxLength={180} placeholder="Judul materi" required/></label>
     <label>Slug opsional<input name="slug" maxLength={120} pattern="[a-z0-9-]*" placeholder="judul-materi"/></label>
     <label className="folder-form-full">Ringkasan<textarea name="excerpt" maxLength={420} placeholder="Ringkasan singkat..."/></label>
     <label className="folder-form-full">Isi konten<textarea name="body" maxLength={50000} className="learning-body-field" placeholder="Tulis materi di sini..." required/></label>
     <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="published">Published</option></select></label>
     <button className="learning-save-button" type="submit">simpan konten</button>
   </form>}
   <div className="learning-admin-list">{articles.map(a=><div className="learning-admin-row" key={a.id}><div><strong>{a.title}</strong><small>{a.status}</small></div><form action={deleteLearningArticle}><input type="hidden" name="id" value={a.id}/><input type="hidden" name="collection_slug" value={collectionSlug}/><button className="learning-delete-button" type="submit">hapus</button></form></div>)}</div>
 </section>
}
