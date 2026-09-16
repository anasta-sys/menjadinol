import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomInt } from "crypto";
export const runtime="nodejs";
const SUBJECTS=new Set(["Saran","Masukan","Pertanyaan","Kerja Sama","Berbagi Cerita","Kendala Website","Lainnya"]);
const clean=(v:unknown,n:number)=>typeof v==="string"?v.trim().slice(0,n):"";
function admin(){const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!u||!k)throw new Error("Supabase env belum lengkap.");return createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}})}
function hash(e:string,o:string){const s=process.env.CONTACT_OTP_SECRET;if(!s)throw new Error("CONTACT_OTP_SECRET belum diatur.");return createHmac("sha256",s).update(`${e}:${o}`).digest("hex")}
export async function POST(req:Request){try{
 const b=await req.json(); if(clean(b.website,200))return NextResponse.json({ok:true});
 const name=clean(b.name,120),email=clean(b.email,254).toLowerCase(),subject=clean(b.subject,80),message=clean(b.message,5000);
 if(!name||!email||!subject||!message)return NextResponse.json({ok:false,error:"Data belum lengkap."},{status:400});
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({ok:false,error:"Format email tidak valid."},{status:400});
 if(!SUBJECTS.has(subject))return NextResponse.json({ok:false,error:"Subjek tidak valid."},{status:400});
 const db=admin(),since=new Date(Date.now()-60000).toISOString();
 const {count}=await db.from("contact_email_otps").select("id",{count:"exact",head:true}).eq("email",email).gte("created_at",since);
 if((count??0)>0)return NextResponse.json({ok:false,error:"Tunggu 60 detik sebelum meminta kode baru."},{status:429});
 const otp=String(randomInt(0,1000000)).padStart(6,"0"),otp_hash=hash(email,otp),expires_at=new Date(Date.now()+600000).toISOString();
 const {error}=await db.from("contact_email_otps").insert({email,otp_hash,expires_at,attempts:0,name,subject,message}); if(error)throw error;
 const key=process.env.RESEND_API_KEY,from=process.env.CONTACT_OTP_FROM;if(!key||!from)throw new Error("Konfigurasi email OTP belum lengkap.");
 const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[email],subject:"Kode verifikasi Kontak · Menjadi Nol",html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#173d2d"><h2>Verifikasi emailmu</h2><p>Gunakan kode berikut untuk mengirim pesan:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0">${otp}</div><p>Kode berlaku 10 menit dan jangan dibagikan kepada siapa pun.</p></div>`})});
 if(!r.ok){console.error("contact otp email error",await r.text());await db.from("contact_email_otps").delete().eq("email",email).eq("otp_hash",otp_hash);return NextResponse.json({ok:false,error:"Kode verifikasi belum dapat dikirim."},{status:502})}
 return NextResponse.json({ok:true,expiresInSeconds:600});
}catch(e){console.error("contact send otp error",e);return NextResponse.json({ok:false,error:"Permintaan tidak dapat diproses."},{status:500})}}
