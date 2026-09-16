import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";
export const runtime="nodejs";
function admin(){const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!u||!k)throw new Error("Supabase env belum lengkap.");return createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}})}
function hash(e:string,o:string){const s=process.env.CONTACT_OTP_SECRET;if(!s)throw new Error("CONTACT_OTP_SECRET belum diatur.");return createHmac("sha256",s).update(`${e}:${o}`).digest("hex")}
function same(a:string,b:string){try{const x=Buffer.from(a,"hex"),y=Buffer.from(b,"hex");return x.length===y.length&&timingSafeEqual(x,y)}catch{return false}}
export async function POST(req:Request){try{
 const b=await req.json(),email=typeof b.email==="string"?b.email.trim().toLowerCase():"",otp=typeof b.otp==="string"?b.otp.replace(/\D/g,"").slice(0,6):"";
 if(!email||otp.length!==6)return NextResponse.json({ok:false,error:"Kode harus 6 digit."},{status:400});
 const db=admin();const {data:r,error}=await db.from("contact_email_otps").select("id,email,otp_hash,expires_at,attempts,name,subject,message").eq("email",email).order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(error||!r)return NextResponse.json({ok:false,error:"Kode tidak ditemukan. Minta kode baru."},{status:400});
 if(new Date(r.expires_at).getTime()<Date.now()){await db.from("contact_email_otps").delete().eq("id",r.id);return NextResponse.json({ok:false,error:"Kode kedaluwarsa."},{status:400})}
 if(r.attempts>=5){await db.from("contact_email_otps").delete().eq("id",r.id);return NextResponse.json({ok:false,error:"Terlalu banyak percobaan. Minta kode baru."},{status:429})}
 if(!same(hash(email,otp),r.otp_hash)){await db.from("contact_email_otps").update({attempts:r.attempts+1}).eq("id",r.id);return NextResponse.json({ok:false,error:"Kode verifikasi salah."},{status:400})}
 const {error:ie}=await db.from("contact_messages").insert({name:r.name,email:r.email,subject:r.subject,message:r.message,is_read:false});if(ie)throw ie;
 await db.from("contact_email_otps").delete().eq("email",email);return NextResponse.json({ok:true});
}catch(e){console.error("contact verify otp error",e);return NextResponse.json({ok:false,error:"Verifikasi belum berhasil."},{status:500})}}
