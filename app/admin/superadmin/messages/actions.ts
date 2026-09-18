"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireSuperAdmin } from "@/lib/admin-auth";

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}
function escapeHtml(value: string) {
  return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
async function secureClient() {
  await requireSuperAdmin();
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !key) throw new Error("Konfigurasi server Supabase belum lengkap.");
  return createServiceClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
function resendConfig(){
  const key=process.env.RESEND_API_KEY;
  const from=process.env.RESEND_FROM_EMAIL || process.env.OTP_FROM_EMAIL ||
    process.env.CONTACT_OTP_FROM || process.env.EMAIL_FROM || process.env.FROM_EMAIL;
  if(!key) throw new Error("RESEND_API_KEY belum tersedia.");
  if(!from) throw new Error("Email pengirim belum tersedia.");
  return {key,from};
}
function refresh(){ revalidatePath("/admin/superadmin/messages"); }

export async function setContactMessageRead(id:string,isRead:boolean){
  try{
    const db=await secureClient();
    const {error}=await db.from("contact_messages").update({is_read:isRead}).eq("id",clean(id,100)).is("deleted_at",null);
    if(error) return {ok:false,error:error.message};
    refresh(); return {ok:true};
  }catch(e){return {ok:false,error:e instanceof Error?e.message:"Akses ditolak."};}
}

export async function deleteContactMessage(id:string){
  try{
    const db=await secureClient();
    const {error}=await db.from("contact_messages").update({deleted_at:new Date().toISOString()}).eq("id",clean(id,100));
    if(error) return {ok:false,error:error.message};
    refresh(); return {ok:true};
  }catch(e){return {ok:false,error:e instanceof Error?e.message:"Gagal memindahkan pesan ke Sampah."};}
}

export async function restoreContactMessage(id:string){
  try{
    const db=await secureClient();
    const {error}=await db.from("contact_messages").update({deleted_at:null}).eq("id",clean(id,100));
    if(error) return {ok:false,error:error.message};
    refresh(); return {ok:true};
  }catch(e){return {ok:false,error:e instanceof Error?e.message:"Gagal memulihkan pesan."};}
}

export async function permanentlyDeleteContactMessage(id:string){
  try{
    const db=await secureClient();
    const {error}=await db.from("contact_messages").delete().eq("id",clean(id,100)).not("deleted_at","is",null);
    if(error) return {ok:false,error:error.message};
    refresh(); return {ok:true};
  }catch(e){return {ok:false,error:e instanceof Error?e.message:"Gagal menghapus permanen."};}
}

export async function replyContactMessage(id:string,reply:string){
  try{
    const messageId=clean(id,100), replyText=clean(reply,10000);
    if(!messageId) return {ok:false,error:"ID pesan tidak valid."};
    if(!replyText) return {ok:false,error:"Balasan masih kosong."};
    const db=await secureClient();
    const {data:m,error}=await db.from("contact_messages")
      .select("id,name,email,subject").eq("id",messageId).is("deleted_at",null).single();
    if(error || !m) return {ok:false,error:error?.message || "Pesan tidak ditemukan."};

    const {key,from}=resendConfig();
    const resend=new Resend(key);
    const safeName=escapeHtml(clean(m.name,80));
    const safeReply=escapeHtml(replyText).replace(/\r?\n/g,"<br />");
    const subject=clean(m.subject,140);
    const email=clean(m.email,160).toLowerCase();

    const {error:mailError}=await resend.emails.send({
      from,to:[email],subject:`Re: ${subject}`,
      html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px;color:#24352d;line-height:1.7">
        <div style="font-family:Georgia,serif;font-size:25px;color:#17613f;margin-bottom:24px">Menjadi Nol</div>
        <p>Halo ${safeName},</p>
        <div style="margin:20px 0;padding:20px 22px;background:#f7f9f5;border:1px solid #e4ebe5;border-radius:14px">${safeReply}</div>
        <hr style="border:0;border-top:1px solid #e6ebe7;margin:28px 0" />
        <p style="font-size:12px;color:#748078">Balasan ini dikirim sebagai tanggapan atas pesan yang Anda kirim melalui formulir Kontak Menjadi Nol.</p>
      </div>`
    });
    if(mailError) return {ok:false,error:mailError.message || "Email balasan gagal dikirim."};
    await db.from("contact_messages").update({is_read:true}).eq("id",messageId);
    refresh(); return {ok:true};
  }catch(e){
    console.error("replyContactMessage error",e);
    return {ok:false,error:e instanceof Error?e.message:"Balasan gagal dikirim."};
  }
}
