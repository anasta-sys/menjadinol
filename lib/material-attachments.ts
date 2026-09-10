const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;
const BUCKET = "learning-materials";

export const MATERIAL_BUCKET = BUCKET;
export const MATERIAL_MAX_BYTES = MAX_ATTACHMENT_BYTES;

export type ValidatedMaterial = {
  bytes: Uint8Array;
  mime: "application/pdf" | "image/jpeg" | "image/png";
  extension: "pdf" | "jpg" | "png";
  originalName: string;
  size: number;
};

function safeOriginalName(name: string) {
  return name
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]/g, "-")
    .trim()
    .slice(0, 180) || "materi";
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export async function validateMaterialFile(
  value: FormDataEntryValue | null
): Promise<ValidatedMaterial | null> {
  if (!(value instanceof File) || value.size === 0) return null;

  if (value.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("Ukuran PDF/JPG/PNG maksimal 12 MB.");
  }

  const bytes = new Uint8Array(await value.arrayBuffer());

  let mime: ValidatedMaterial["mime"];
  let extension: ValidatedMaterial["extension"];

  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    mime = "application/pdf";
    extension = "pdf";
  } else if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    mime = "image/jpeg";
    extension = "jpg";
  } else if (
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    mime = "image/png";
    extension = "png";
  } else {
    throw new Error("File ditolak. Hanya PDF, JPG/JPEG, atau PNG yang valid.");
  }

  return {
    bytes,
    mime,
    extension,
    originalName: safeOriginalName(value.name),
    size: value.size,
  };
}

export function materialStoragePath(
  folderId: string,
  extension: ValidatedMaterial["extension"]
) {
  const safeFolder = folderId.replace(/[^a-zA-Z0-9-]/g, "");
  return `${safeFolder}/${crypto.randomUUID()}.${extension}`;
}
