"use server";

import {
  createContentFolder,
  deleteContentFolder,
  createFolderEntry,
  deleteFolderEntry,
} from "@/app/admin/folder-actions";

/*
 * Compatibility wrappers.
 * Sistem Ruang Belajar sekarang memakai:
 * content_folders + content_folder_entries.
 * Tidak ada lagi dependency ke learning_collections / learning_articles.
 */

export async function createCollection(fd: FormData) {
  const next = new FormData();

  next.set("section", "ruang-belajar");
  next.set("title", String(fd.get("title") ?? ""));
  next.set("slug", String(fd.get("slug") ?? ""));
  next.set(
    "description",
    String(fd.get("description") ?? "")
  );

  return createContentFolder(next);
}

export async function deleteCollection(fd: FormData) {
  const next = new FormData();
  next.set("id", String(fd.get("id") ?? ""));

  return deleteContentFolder(next);
}

export async function createLearningArticle(fd: FormData) {
  const next = new FormData();

  next.set(
    "folder_id",
    String(
      fd.get("folder_id") ??
      fd.get("collection_id") ??
      ""
    )
  );

  next.set("title", String(fd.get("title") ?? ""));
  next.set("slug", String(fd.get("slug") ?? ""));
  next.set("excerpt", String(fd.get("excerpt") ?? ""));
  next.set("body", String(fd.get("body") ?? ""));
  next.set("table_data", String(fd.get("table_data") ?? ""));
  next.set("status", String(fd.get("status") ?? "draft"));

  return createFolderEntry(next);
}

export async function deleteLearningArticle(fd: FormData) {
  const next = new FormData();
  next.set("id", String(fd.get("id") ?? ""));

  return deleteFolderEntry(next);
}
