@echo off
setlocal
cd /d C:\menjadinol-v2

echo ==========================================
echo MENJADINOL V2 - PATCH 07
echo Membersihkan folder backup dari TypeScript
echo ==========================================

if exist "_patch_backup_05" (
  echo Memindahkan _patch_backup_05 agar tidak ikut build...
  if exist "C:\menjadinol-v2-backup-patch05" rmdir /s /q "C:\menjadinol-v2-backup-patch05"
  move "_patch_backup_05" "C:\menjadinol-v2-backup-patch05" >nul
)

if exist "_patch_backup_02" (
  echo Memindahkan _patch_backup_02 agar tidak ikut build...
  if exist "C:\menjadinol-v2-backup-patch02" rmdir /s /q "C:\menjadinol-v2-backup-patch02"
  move "_patch_backup_02" "C:\menjadinol-v2-backup-patch02" >nul
)

if exist "_patch_backup_03" (
  echo Memindahkan _patch_backup_03 agar tidak ikut build...
  if exist "C:\menjadinol-v2-backup-patch03" rmdir /s /q "C:\menjadinol-v2-backup-patch03"
  move "_patch_backup_03" "C:\menjadinol-v2-backup-patch03" >nul
)

if exist "_patch_backup_04" (
  echo Memindahkan _patch_backup_04 agar tidak ikut build...
  if exist "C:\menjadinol-v2-backup-patch04" rmdir /s /q "C:\menjadinol-v2-backup-patch04"
  move "_patch_backup_04" "C:\menjadinol-v2-backup-patch04" >nul
)

if exist "_patch_backup_06" (
  echo Memindahkan _patch_backup_06 agar tidak ikut build...
  if exist "C:\menjadinol-v2-backup-patch06" rmdir /s /q "C:\menjadinol-v2-backup-patch06"
  move "_patch_backup_06" "C:\menjadinol-v2-backup-patch06" >nul
)

if exist ".next" (
  echo Menghapus cache .next...
  rmdir /s /q ".next"
)

echo.
echo Menjalankan build ulang...
call npm run build

echo.
echo ==========================================
echo PATCH 07 selesai.
echo ==========================================
pause
