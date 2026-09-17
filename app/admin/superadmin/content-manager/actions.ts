"use server";

import {
  publishEntry as publishEntryOriginal,
  unpublishEntry as unpublishEntryOriginal,
  deleteEntry as deleteEntryOriginal,
} from "../actions";

// Next.js "use server" mengharuskan export berupa async function.
// Wrapper ini tetap memakai action Superadmin lama yang sudah berjalan.
export async function publishEntry(entryId: string) {
  return await publishEntryOriginal(entryId);
}

export async function unpublishEntry(entryId: string) {
  return await unpublishEntryOriginal(entryId);
}

export async function deleteEntry(entryId: string) {
  return await deleteEntryOriginal(entryId);
}
