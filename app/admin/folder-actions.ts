"use server";
import { requireAdminSession } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sanitizeRichText, richTextHasContent } from "@/lib/rich-text";
import { MATERIAL_BUCKET, materialStoragePath, validateMaterialFile } from "@/lib/material-attachments";
import { sendContentNotificationEmail } from "@/lib/content-notification-email";

type Section =
  | "tentang"
  | "artikel"
  | "layanan"
  | "ruang-belajar"
  | "ruang-jeda"
  | "kontak";

const allowedSections = new Set<Section>([
  "tentang",
  "artikel",
  "layanan",
  "ruang-belajar",
  "ruang-jeda",
  "kontak",
]);

function clean(v: FormDataEntryValue | null, max: number) {
  return String(v ?? "").trim().slice(0, max);
}

function slugify(v: string) {
  return v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function parseTableData(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      !Array.isArray(parsed.headers) ||
      !Array.isArray(parsed.rows)
    ) {
      throw new Error("Format tabel tidak valid.");
    }

    const headers = parsed.headers
      .slice(0, 10)
      .map((v: unknown) => String(v ?? "").trim().slice(0, 120));

    const rows = parsed.rows
      .slice(0, 100)
      .map((row: unknown) =>
        headers.map((_: string, i: number) =>
          String(Array.isArray(row) ? (row[i] ?? "") : "")
            .trim()
            .slice(0, 500)
        )
      );

    return { headers, rows };
  } catch {
    throw new Error("Format tabel tidak valid.");
  }
}


async function uploadMaterial(
  supabase: any,
  folderId: string,
  value: FormDataEntryValue | null
) {
  const material = await validateMaterialFile(value);
  if (!material) return null;

  const path = materialStoragePath(folderId, material.extension);
  const { error } = await supabase.storage
    .from(MATERIAL_BUCKET)
    .upload(path, material.bytes, {
      contentType: material.mime,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw new Error(`Upload materi gagal: ${error.message}`);

  return {
    path,
    name: material.originalName,
    mime: material.mime,
    size: material.size,
  };
}

async function removeMaterial(
  supabase: any,
  path: string | null | undefined
) {
  if (!path) return;
  const { error } = await supabase.storage.from(MATERIAL_BUCKET).remove([path]);
  if (error) console.error("Gagal menghapus materi dari storage:", error.message);
}

function publicPath(section: Section) {
  return section === "layanan" ? "/perjalanan" : `/${section}`;
}

async function requireAdminAal2() {
  const session = await requireAdminSession();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Konfigurasi server Supabase belum lengkap.");
  }

  const adminDb = createServiceClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  /*
   * Data ini hanya dipakai untuk email notifikasi konten.
   * Tidak mengubah session, role, MFA, atau permission yang sudah berjalan.
   */
  const { data: profile, error: profileError } = await adminDb
    .from("admin_users")
    .select("email,display_name")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Gagal mengambil profil untuk notifikasi email:",
      profileError.message
    );
  }

  return {
    supabase: adminDb,
    userId: session.userId,
    role: session.role,

    email:
      (profile?.email as string | null) ??
      null,

    displayName:
      (profile?.display_name as string | null) ??
      null,

    isWriter: session.role === "writer",

    isAdmin:
      session.role === "admin" ||
      session.role === "superadmin",

    isSuperAdmin:
      session.role === "superadmin",
  };
}

async function getFolderSection(
  supabase: any,
  folderId: string
): Promise<Section> {
  const { data, error } = await supabase
    .from("content_folders")
    .select("section")
    .eq("id", folderId)
    .maybeSingle();

  if (error || !data || !allowedSections.has(data.section as Section)) {
    throw new Error("Fitur tidak ditemukan.");
  }

  return data.section as Section;
}

async function getEntryMeta(
  supabase: any,
  entryId: string
) {
  const { data, error } = await supabase
    .from("content_folder_entries")
    .select("folder_id,attachment_path,author_id,status")
    .eq("id", entryId)
    .maybeSingle();

  if (error || !data) throw new Error("Tulisan tidak ditemukan.");

  const section = await getFolderSection(supabase, data.folder_id);
  return {
    section,
    folderId: data.folder_id as string,
    attachmentPath: (data.attachment_path as string | null) ?? null,
    authorId: (data.author_id as string | null) ?? null,
    status: (data.status as string | null) ?? null,
  };
}

async function getEntrySection(
  supabase: any,
  entryId: string
): Promise<Section> {
  return (await getEntryMeta(supabase, entryId)).section;
}

export async function createContentFolder(fd: FormData) {
  const { supabase, isWriter } = await requireAdminAal2();

  if (isWriter) {
    throw new Error("Penulis tidak dapat membuat fitur.");
  }

  const section = clean(fd.get("section"), 30) as Section;
  if (!allowedSections.has(section)) throw new Error("Bagian tidak valid.");

  const title = clean(fd.get("title"), 120);
  const slug = slugify(clean(fd.get("slug"), 120) || title);
  const description = clean(fd.get("description"), 500);
  const parentId = clean(fd.get("parent_id"), 80) || null;

  if (!title || !slug) throw new Error("Nama fitur wajib diisi.");

  if (parentId) {
    const { data: parent, error: parentError } = await supabase
      .from("content_folders")
      .select("id,section")
      .eq("id", parentId)
      .maybeSingle();

    if (parentError || !parent) {
      throw new Error("Fitur induk tidak ditemukan.");
    }

    if (parent.section !== section) {
      throw new Error("Subfitur harus berada pada bagian yang sama dengan fitur induk.");
    }
  }

  const { error } = await supabase.from("content_folders").insert({
    section,
    title,
    slug,
    description,
    parent_id: parentId,
    is_published: true,
  });

  if (error) throw new Error(error.message);

  revalidatePath(publicPath(section));
  revalidatePath("/admin");
}

export async function updateContentFolder(fd: FormData) {
  const { supabase, isWriter } = await requireAdminAal2();

  if (isWriter) {
    throw new Error("Penulis tidak dapat mengubah fitur.");
  }

  const id = clean(fd.get("id"), 80);
  if (!id) throw new Error("ID fitur tidak valid.");

  const section = await getFolderSection(supabase, id);
  const title = clean(fd.get("title"), 120);
  const slug = slugify(clean(fd.get("slug"), 120) || title);
  const description = clean(fd.get("description"), 500);
  const parentId = clean(fd.get("parent_id"), 80) || null;

  if (!title || !slug) throw new Error("Nama fitur wajib diisi.");

  if (parentId) {
    const { data: parent, error: parentError } = await supabase
      .from("content_folders")
      .select("id,section")
      .eq("id", parentId)
      .maybeSingle();

    if (parentError || !parent) {
      throw new Error("Fitur induk tidak ditemukan.");
    }

    if (parent.section !== section) {
      throw new Error("Subfitur harus berada pada bagian yang sama dengan fitur induk.");
    }
  }

  const { error } = await supabase
    .from("content_folders")
    .update({ title, slug, description })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(publicPath(section));
  revalidatePath("/admin");
}

export async function deleteContentFolder(fd: FormData) {
  const { supabase, isSuperAdmin } = await requireAdminAal2();

  if (!isSuperAdmin) {
    throw new Error("Hanya Superadmin yang dapat menghapus fitur.");
  }

  const id = clean(fd.get("id"), 80);
  if (!id) throw new Error("Data fitur tidak valid.");

  const section = await getFolderSection(supabase, id);

  const { data: attachmentRows } = await supabase
    .from("content_folder_entries")
    .select("attachment_path")
    .eq("folder_id", id);

  const { error } = await supabase
    .from("content_folders")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  const paths = (attachmentRows ?? [])
    .map((row: any) => row.attachment_path as string | null)
    .filter(Boolean) as string[];
  if (paths.length) {
    const { error: storageError } = await supabase.storage
      .from(MATERIAL_BUCKET)
      .remove(paths);
    if (storageError) console.error("Gagal membersihkan materi fitur:", storageError.message);
  }

  revalidatePath(publicPath(section));
  revalidatePath("/admin");
}

export async function createFolderEntry(fd: FormData) {
  const {
    supabase,
    userId,
    role,
    email,
    displayName,
  } = await requireAdminAal2();

  const folderId = clean(fd.get("folder_id"), 80);
  if (!folderId) throw new Error("Fitur tidak valid.");

  const section = await getFolderSection(supabase, folderId);

  const title = clean(fd.get("title"), 180);
  const slug = slugify(clean(fd.get("slug"), 120) || title);
  const excerpt = clean(fd.get("excerpt"), 420);
  const body =
    sanitizeRichText(
      String(
        fd.get("body") ?? ""
      ),
      500000
    );
  const tableData = parseTableData(fd.get("table_data"));
  const hasTable =
    Array.isArray((tableData as any).headers) &&
    (tableData as any).headers.length > 0;

  const rawStatus = clean(fd.get("status"), 20);

const status =
  role === "writer"
    ? rawStatus === "review"
      ? "review"
      : "draft"
    : rawStatus === "published"
      ? "published"
      : rawStatus === "review"
        ? "review"
        : "draft";

  const attachment = await uploadMaterial(supabase, folderId, fd.get("attachment"));

  if (!title || !slug || (!richTextHasContent(body) && !hasTable && !attachment)) {
    if (attachment) await removeMaterial(supabase, attachment.path);
    throw new Error("Isi tulisan, tabel, atau materi PDF/JPG/PNG/WEBP atau video wajib diisi.");
  }

  const { error } = await supabase
    .from("content_folder_entries")
    .insert({
      folder_id: folderId,
      title,
      slug,
      excerpt,
      body,
      table_data: tableData,
      attachment_path: attachment?.path ?? null,
      attachment_name: attachment?.name ?? null,
      attachment_mime: attachment?.mime ?? null,
      attachment_size: attachment?.size ?? null,
      status,

      // Penulis asli = akun admin yang membuat tulisan.
      // Nilai ini tidak diubah lagi saat tulisan diedit oleh admin lain.
      author_id: userId,

      // Audit internal.
      updated_by: userId,
      last_published_by:
        status === "published"
          ? userId
          : null,

      published_at:
        status === "published"
          ? new Date().toISOString()
          : null,
    });

    if (error) {
    if (attachment) await removeMaterial(supabase, attachment.path);
    throw new Error(error.message);
  }

  /*
   * Notifikasi dikirim hanya setelah konten berhasil masuk database.
   * Kegagalan email tidak membatalkan penyimpanan konten.
   */
  if (email) {
    try {
      await sendContentNotificationEmail({
        to: email,
        name: displayName,
        title,
        section,
        status: status as "draft" | "review" | "published",
      });
    } catch (emailError) {
      console.error(
        "Email notifikasi konten baru gagal:",
        emailError
      );
    }
  }

  revalidatePath(publicPath(section));
  revalidatePath("/admin");
}

export async function updateFolderEntry(fd: FormData) {
  const {
    supabase,
    userId,
    role,
    email,
    displayName,
  } = await requireAdminAal2();

  const id = clean(fd.get("id"), 80);
  if (!id) throw new Error("ID tulisan tidak valid.");

  const entryMeta = await getEntryMeta(supabase, id);

  if (
    role === "writer" &&
    entryMeta.authorId !== userId
  ) {
    throw new Error("Penulis hanya dapat mengubah tulisan miliknya sendiri.");
  }

  const section = entryMeta.section;

  const title = clean(fd.get("title"), 180);
  const slug = slugify(clean(fd.get("slug"), 120) || title);
  const excerpt = clean(fd.get("excerpt"), 420);
  const body =
    sanitizeRichText(
      String(
        fd.get("body") ?? ""
      ),
      500000
    );
  const tableData = parseTableData(fd.get("table_data"));
  const hasTable =
    Array.isArray((tableData as any).headers) &&
    (tableData as any).headers.length > 0;

  const rawStatus = clean(fd.get("status"), 20);

  const status =
    role === "writer"
      ? rawStatus === "review"
        ? "review"
        : "draft"
      : rawStatus === "published"
        ? "published"
        : rawStatus === "review"
          ? "review"
          : "draft";

  const removeAttachment = clean(fd.get("remove_attachment"), 10) === "yes";
  const newAttachment = await uploadMaterial(
    supabase,
    entryMeta.folderId,
    fd.get("attachment")
  );
  const finalAttachmentPath = newAttachment?.path ?? (removeAttachment ? null : entryMeta.attachmentPath);

  if (!title || !slug || (!richTextHasContent(body) && !hasTable && !finalAttachmentPath)) {
    if (newAttachment) await removeMaterial(supabase, newAttachment.path);
    throw new Error("Isi tulisan, tabel, atau materi PDF/JPG/PNG/WEBP atau video wajib diisi.");
  }

  const attachmentPatch = newAttachment
    ? {
        attachment_path: newAttachment.path,
        attachment_name: newAttachment.name,
        attachment_mime: newAttachment.mime,
        attachment_size: newAttachment.size,
      }
    : removeAttachment
      ? {
          attachment_path: null,
          attachment_name: null,
          attachment_mime: null,
          attachment_size: null,
        }
      : {};

  const { error } = await supabase
    .from("content_folder_entries")
    .update({
      title,
      slug,
      excerpt,
      body,
      table_data: tableData,
      ...attachmentPatch,
      status,

      // author_id sengaja TIDAK diubah.
      // Penulis tetap akun yang pertama kali membuat tulisan.
      updated_by: userId,

      // Hanya diperbarui saat tindakan ini mem-publish tulisan.
      ...(role !== "writer" && status === "published"
        ? {
            last_published_by: userId,
          }
        : {}),

      published_at:
        role !== "writer" && status === "published"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", id);

  if (error) {
    if (newAttachment) await removeMaterial(supabase, newAttachment.path);
    throw new Error(error.message);
  }

   if ((newAttachment || removeAttachment) && entryMeta.attachmentPath) {
    await removeMaterial(supabase, entryMeta.attachmentPath);
  }

  /*
   * Notifikasi dikirim hanya setelah perubahan konten
   * berhasil disimpan ke database.
   * Jika email gagal, perubahan konten tetap tersimpan.
   */
  if (email) {
    try {
      await sendContentNotificationEmail({
        to: email,
        name: displayName,
        title,
        section,
        status: status as "draft" | "review" | "published",
      });
    } catch (emailError) {
      console.error(
        "Email notifikasi perubahan konten gagal:",
        emailError
      );
    }
  }

  revalidatePath(publicPath(section));
  revalidatePath("/admin");
}

export async function deleteFolderEntry(fd: FormData) {
  const { supabase, isSuperAdmin } = await requireAdminAal2();

  if (!isSuperAdmin) {
    throw new Error("Hanya Superadmin yang dapat menghapus tulisan.");
  }

  const id = clean(fd.get("id"), 80);
  if (!id) throw new Error("Data tulisan tidak valid.");

  const entryMeta = await getEntryMeta(supabase, id);
  const section = entryMeta.section;

  const { error } = await supabase
    .from("content_folder_entries")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  await removeMaterial(supabase, entryMeta.attachmentPath);

  revalidatePath(publicPath(section));
  revalidatePath("/admin");
}


export async function deleteContentFolderAndRedirect(fd: FormData) {
  const { supabase, isSuperAdmin } = await requireAdminAal2();

  if (!isSuperAdmin) {
    throw new Error("Hanya Superadmin yang dapat menghapus fitur.");
  }

  const id = clean(fd.get("id"), 80);
  if (!id) throw new Error("Data fitur tidak valid.");

  const section = await getFolderSection(supabase, id);

  const { data: attachmentRows } = await supabase
    .from("content_folder_entries")
    .select("attachment_path")
    .eq("folder_id", id);

  const { error } = await supabase
    .from("content_folders")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  const paths = (attachmentRows ?? [])
    .map((row: any) => row.attachment_path as string | null)
    .filter(Boolean) as string[];
  if (paths.length) {
    const { error: storageError } = await supabase.storage
      .from(MATERIAL_BUCKET)
      .remove(paths);
    if (storageError) console.error("Gagal membersihkan materi fitur:", storageError.message);
  }

  revalidatePath(publicPath(section));
  revalidatePath("/admin");

  redirect(publicPath(section));
}

