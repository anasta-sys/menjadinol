MONITORING PATCH - MENJADI NOL

Isi paket: 11 file dari monitoring-auth-audit.txt yang sudah ditambahkan pencatatan error teknis ke Monitoring Sistem.

PENTING:
- Ini file pengganti, bukan aplikasi.
- Backup project / commit dulu sebelum replace.
- Jangan replace file .bak.
- Error pengguna normal (OTP salah/kedaluwarsa, link invalid, role tidak sesuai, input invalid) tidak sengaja dijadikan log teknis.
- Setelah replace, jalankan: npm run build
- Jika build sukses, baru test localhost.

Catatan: paket hanya mencakup file yang ada di monitoring-auth-audit.txt.
