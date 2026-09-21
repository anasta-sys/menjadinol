"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function clean(v:FormDataEntryValue|null,max:number){
  return String(v ?? "").trim().slice(0,max);
}

function slugify(v:string){
  return v.toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9\s-]/g,"")
    .replace(/\s+/g,"-")
    .replace(/-+/g,"-")
    .replace(/^-|-$/g,"")
    .slice(0,100);
}

async function requireAdminAal2(){
  const supabase = await createClient();

  const {data:claims,error} = await supabase.auth.getClaims();
  if(error || !claims?.claims?.sub) throw new Error("Unauthorized");

  const {data:aal} = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if(aal?.currentLevel !== "aal2") throw new Error("MFA required");

  const {data:admin} = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id",claims.claims.sub)
    .maybeSingle();

  if(!admin) throw new Error("Forbidden");
  return supabase;
}

export async function savePost(fd:FormData){
  const supabase = await requireAdminAal2();

  const id = clean(fd.get("id"),80);
  const title = clean(fd.get("title"),180);
  const slug = slugify(clean(fd.get("slug"),120) || title);
  const excerpt = clean(fd.get("excerpt"),420);
  const body = clean(fd.get("body"),100000);
  const category = clean(fd.get("category"),40) || "Refleksi";
  const status = clean(fd.get("status"),20) === "published" ? "published" : "draft";

  if(!title || !slug || !body) throw new Error("Judul, slug, dan isi wajib diisi.");

  const payload = {
    title,slug,excerpt,body,category,status,
    published_at: status === "published" ? new Date().toISOString() : null
  };

  const result = id
    ? await supabase.from("posts").update(payload).eq("id",id)
    : await supabase.from("posts").insert(payload);

  if(result.error) throw new Error(result.error.message);

  revalidatePath("/cerita-makna");
  revalidatePath("/admin");
}

export async function deletePost(fd:FormData){
  const supabase = await requireAdminAal2();
  const id = clean(fd.get("id"),80);

  const {error} = await supabase.from("posts").delete().eq("id",id);
  if(error) throw new Error(error.message);

  revalidatePath("/cerita-makna");
  revalidatePath("/admin");
}

export async function signOut(){
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Logout Admin/Penulis gagal:", error);
    throw new Error("Logout belum berhasil. Silakan coba lagi.");
  }

  redirect("/login");
}
