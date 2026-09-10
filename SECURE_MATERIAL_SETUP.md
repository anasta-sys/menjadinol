# Setup materi PDF/JPG/PNG yang aman

Fitur ini menambahkan lampiran materi ke tulisan folder tanpa membuat bucket Storage menjadi public.

## 1. Jalankan migration Supabase

Buka Supabase > SQL Editor, lalu jalankan isi file:

`supabase/migrations/007_secure_material_attachments.sql`

Migration ini:
- menambah metadata lampiran pada `content_folder_entries`;
- membuat bucket private `learning-materials`;
- membatasi upload/update/delete hanya untuk admin dengan MFA AAL2;
- membatasi tipe file ke PDF/JPEG/PNG dan ukuran maksimal 12 MB.

## 2. Tambahkan service-role secret di LOCAL

Tambahkan ke `.env.local` (JANGAN commit file `.env.local`):

```env
SUPABASE_SERVICE_ROLE_KEY=ISI_SERVICE_ROLE_KEY_SUPABASE
```

Ambil key dari Supabase Project Settings > API. Jangan pernah memakai prefix `NEXT_PUBLIC_` untuk key ini.

## 3. Tambahkan secret yang sama di Vercel

Vercel > Project > Settings > Environment Variables:

- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: service-role key dari Supabase
- Environment: Production (tambahkan Preview bila memang diperlukan)

Lalu redeploy.

## Keamanan yang diterapkan

- Bucket Storage private, bukan public.
- Upload hanya melalui server action admin yang sudah mewajibkan login + MFA AAL2.
- File divalidasi di server berdasarkan magic bytes, bukan hanya ekstensi/MIME dari browser.
- Hanya PDF, JPEG, PNG; maksimal 12 MB.
- Nama object Storage dibuat acak (`crypto.randomUUID`), bukan memakai nama file pengguna.
- Pengunjung hanya menerima signed URL sementara (15 menit) untuk materi pada tulisan yang memang dapat dibaca.
- `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai server-side dan tidak dikirim ke browser.
- File lama dibersihkan ketika lampiran diganti/dihapus atau tulisan/folder dihapus.
