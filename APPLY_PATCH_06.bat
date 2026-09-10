@echo off
setlocal
set ROOT=C:\menjadinol-v2
set HERE=%~dp0

echo === PATCH 06 MENJADINOL V2 ===
if not exist "%ROOT%\package.json" (
  echo ERROR: %ROOT% tidak ditemukan.
  pause
  exit /b 1
)

mkdir "%ROOT%\_patch_backup_06" 2>nul
copy /Y "%ROOT%\app\superadmin\actions.ts" "%ROOT%\_patch_backup_06\app-superadmin-actions.ts" >nul 2>nul
copy /Y "%ROOT%\app\admin\superadmin\actions.ts" "%ROOT%\_patch_backup_06\app-admin-superadmin-actions.ts" >nul 2>nul
copy /Y "%ROOT%\lib\admin-auth.ts" "%ROOT%\_patch_backup_06\admin-auth.ts" >nul 2>nul

copy /Y "%HERE%app\superadmin\actions.ts" "%ROOT%\app\superadmin\actions.ts" >nul
copy /Y "%HERE%app\admin\superadmin\actions.ts" "%ROOT%\app\admin\superadmin\actions.ts" >nul
copy /Y "%HERE%lib\admin-auth.ts" "%ROOT%\lib\admin-auth.ts" >nul

REM TypeScript compiles backup files too, so remove/rename stale .ts backups in app/superadmin.
if exist "%ROOT%\app\superadmin\actions.BACKUP.ts" ren "%ROOT%\app\superadmin\actions.BACKUP.ts" actions.BACKUP.txt
if exist "%ROOT%\app\superadmin\actions_.ts" ren "%ROOT%\app\superadmin\actions_.ts" actions_.txt
if exist "%ROOT%\lib\admin-auth.BACKUP.ts" ren "%ROOT%\lib\admin-auth.BACKUP.ts" admin-auth.BACKUP.txt

if exist "%ROOT%\.next" rmdir /S /Q "%ROOT%\.next"

echo.
echo Verifikasi export...
findstr /C:"export async function changeStaffRole" "%ROOT%\app\superadmin\actions.ts"
findstr /C:"export async function deactivateStaff" "%ROOT%\app\superadmin\actions.ts"
findstr /C:"export async function requireRole" "%ROOT%\lib\admin-auth.ts"

echo.
cd /D "%ROOT%"
call npm run build
set ERR=%ERRORLEVEL%

echo.
if "%ERR%"=="0" (
  echo BUILD BERHASIL - PATCH 06 SELESAI
) else (
  echo BUILD MASIH ERROR - kirim error terbaru ke ChatGPT.
)
pause
exit /b %ERR%
