@echo off
setlocal
set ROOT=C:\menjadinol-v2
set PATCH=%~dp0

echo [1/4] Backup actions lama...
if not exist "%ROOT%\_patch_backup_03" mkdir "%ROOT%\_patch_backup_03"
if exist "%ROOT%\app\superadmin\actions.ts" copy /Y "%ROOT%\app\superadmin\actions.ts" "%ROOT%\_patch_backup_03\app-superadmin-actions.ts" >nul
if exist "%ROOT%\app\admin\superadmin\actions.ts" copy /Y "%ROOT%\app\admin\superadmin\actions.ts" "%ROOT%\_patch_backup_03\app-admin-superadmin-actions.ts" >nul

echo [2/4] Replace actions di DUA lokasi...
copy /Y "%PATCH%app\superadmin\actions.ts" "%ROOT%\app\superadmin\actions.ts" >nul
copy /Y "%PATCH%app\admin\superadmin\actions.ts" "%ROOT%\app\admin\superadmin\actions.ts" >nul

echo [3/4] Hapus cache build...
if exist "%ROOT%\.next" rmdir /S /Q "%ROOT%\.next"

echo [4/4] Verifikasi export...
findstr /C:"export async function changeStaffRole" "%ROOT%\app\superadmin\actions.ts"
findstr /C:"export async function deactivateStaff" "%ROOT%\app\superadmin\actions.ts"

cd /D "%ROOT%"
echo.
echo Menjalankan npm run build...
npm run build
endlocal
