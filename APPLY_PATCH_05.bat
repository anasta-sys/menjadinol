@echo off
setlocal EnableExtensions
set "ROOT=C:\menjadinol-v2"
set "HERE=%~dp0"

echo ==============================================
echo MENJADINOL V2 - PATCH 05
echo ==============================================

if not exist "%ROOT%\package.json" (
  echo ERROR: Project tidak ditemukan di %ROOT%
  pause
  exit /b 1
)

set "BACKUP=%ROOT%\_patch_backup_05"
if not exist "%BACKUP%" mkdir "%BACKUP%"
if not exist "%BACKUP%\app\admin\superadmin" mkdir "%BACKUP%\app\admin\superadmin"
if not exist "%BACKUP%\app\superadmin" mkdir "%BACKUP%\app\superadmin"
if not exist "%BACKUP%\app\writer" mkdir "%BACKUP%\app\writer"
if not exist "%BACKUP%\lib" mkdir "%BACKUP%\lib"

copy /Y "%ROOT%\app\admin\superadmin\actions.ts" "%BACKUP%\app\admin\superadmin\actions.ts" >nul 2>&1
copy /Y "%ROOT%\app\superadmin\actions.ts" "%BACKUP%\app\superadmin\actions.ts" >nul 2>&1
copy /Y "%ROOT%\app\writer\page.tsx" "%BACKUP%\app\writer\page.tsx" >nul 2>&1
copy /Y "%ROOT%\lib\admin-auth.ts" "%BACKUP%\lib\admin-auth.ts" >nul 2>&1

echo [1/5] Replace file TypeScript yang benar...
copy /Y "%HERE%files\app\admin\superadmin\actions.ts" "%ROOT%\app\admin\superadmin\actions.ts" >nul || goto :fail
copy /Y "%HERE%files\app\superadmin\actions.ts" "%ROOT%\app\superadmin\actions.ts" >nul || goto :fail
copy /Y "%HERE%files\app\writer\page.tsx" "%ROOT%\app\writer\page.tsx" >nul || goto :fail
copy /Y "%HERE%files\lib\admin-auth.ts" "%ROOT%\lib\admin-auth.ts" >nul || goto :fail

echo [2/5] Hapus file backup .ts/.tsx yang ikut dikompilasi...
del /Q "%ROOT%\app\superadmin\actions.BACKUP.ts" 2>nul
del /Q "%ROOT%\app\superadmin\actions_.ts" 2>nul
del /Q "%ROOT%\app\superadmin\SuperAdminDashboard.BACKUP.tsx" 2>nul
del /Q "%ROOT%\lib\admin-auth.BACKUP.ts" 2>nul

for /R "%ROOT%\app" %%F in (*.BACKUP.ts *.BACKUP.tsx) do del /Q "%%F" 2>nul

echo [3/5] Verifikasi patch...
findstr /C:"admin: any" "%ROOT%\app\admin\superadmin\actions.ts" >nul || goto :verifyfail
findstr /C:"password: string;" "%ROOT%\app\admin\superadmin\actions.ts" >nul || goto :verifyfail
findstr /C:"export async function changeStaffRole" "%ROOT%\app\superadmin\actions.ts" >nul || goto :verifyfail
findstr /C:"export async function deactivateStaff" "%ROOT%\app\superadmin\actions.ts" >nul || goto :verifyfail
findstr /C:"user: { id: userId }" "%ROOT%\lib\admin-auth.ts" >nul || goto :verifyfail

echo [4/5] Bersihkan cache build...
if exist "%ROOT%\.next" rmdir /S /Q "%ROOT%\.next"
if exist "%ROOT%\tsconfig.tsbuildinfo" del /Q "%ROOT%\tsconfig.tsbuildinfo"

echo [5/5] Build ulang...
cd /D "%ROOT%"
call npm run build
if errorlevel 1 goto :buildfail

echo.
echo ==============================================
echo BUILD BERHASIL - PATCH 05 SELESAI
echo ==============================================
pause
exit /b 0

:verifyfail
echo.
echo ERROR: Patch tidak ter-copy dengan benar. Jangan lanjut build.
pause
exit /b 2

:buildfail
echo.
echo Build masih menemukan error berikutnya.
echo Kirim error TERBARU ke ChatGPT.
pause
exit /b 3

:fail
echo.
echo ERROR saat copy file patch.
pause
exit /b 4
