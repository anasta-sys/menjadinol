@echo off
setlocal
cd /d C:\menjadinol-v2

echo [1/5] Backup current files...
if not exist _patch_backup_02 mkdir _patch_backup_02
copy /Y lib\admin-auth.ts _patch_backup_02\admin-auth.ts >nul
copy /Y app\writer\page.tsx _patch_backup_02\writer-page.tsx >nul
copy /Y app\admin\superadmin\actions.ts _patch_backup_02\admin-superadmin-actions.ts >nul
copy /Y app\superadmin\actions.ts _patch_backup_02\superadmin-actions.ts >nul

echo [2/5] Removing TypeScript backup files that are still compiled...
del /Q app\superadmin\actions.BACKUP.ts 2>nul
del /Q app\superadmin\actions_.ts 2>nul
del /Q app\superadmin\SuperAdminDashboard.BACKUP.tsx 2>nul
del /Q app\superadmin\page.BACKUP.tsx 2>nul
del /Q lib\admin-auth.BACKUP.ts 2>nul

echo [3/5] Copy patched files...
copy /Y "%~dp0lib\admin-auth.ts" lib\admin-auth.ts >nul
copy /Y "%~dp0app\writer\page.tsx" app\writer\page.tsx >nul
copy /Y "%~dp0app\admin\superadmin\actions.ts" app\admin\superadmin\actions.ts >nul
copy /Y "%~dp0app\superadmin\actions.ts" app\superadmin\actions.ts >nul

echo [4/5] Clearing Next build cache...
if exist .next rmdir /S /Q .next

echo [5/5] Running build...
call npm run build
endlocal
