@echo off
setlocal
cd /d C:\menjadinol-v2

echo ==========================================
echo MENJADINOL V2 - PATCH 08
echo Fix global useSearchParams + Suspense
echo ==========================================

if not exist "app\layout.tsx" (
  echo ERROR: Jalankan patch untuk C:\menjadinol-v2
  pause
  exit /b 1
)

if not exist "_safe_backups" mkdir "_safe_backups"
copy /Y "app\layout.tsx" "_safe_backups\layout.before-patch08.txt" >nul

copy /Y "%~dp0app\layout.tsx" "app\layout.tsx" >nul
if errorlevel 1 (
  echo ERROR: gagal replace app\layout.tsx
  pause
  exit /b 1
)

if exist ".next" rmdir /s /q ".next"

echo.
echo Menjalankan npm run build...
call npm run build
set BUILD_RESULT=%ERRORLEVEL%

echo.
if "%BUILD_RESULT%"=="0" (
  echo ==========================================
  echo BUILD BERHASIL - PATCH 08 SELESAI
  echo ==========================================
) else (
  echo ==========================================
  echo BUILD MASIH MENEMUKAN ERROR BARU
  echo Kirim bagian error terbaru ke ChatGPT.
  echo ==========================================
)
pause
exit /b %BUILD_RESULT%
