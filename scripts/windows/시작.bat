@echo off
chcp 65001 >nul
title 학교 시간표 프로그램
cd /d "%~dp0"

set "NODE_EXE=%~dp0node\node.exe"
set "APP_DIR=%~dp0app"
set "DATA_DIR=%~dp0data"
set "DB_FILE=%DATA_DIR%\timetable.db"
set "TEMPLATE=%~dp0template\timetable.db"

if not exist "%NODE_EXE%" (
  echo [오류] Node.js 실행 파일이 없습니다. 배포 ZIP이 손상되었을 수 있습니다.
  pause
  exit /b 1
)

if not exist "%APP_DIR%\server.js" (
  echo [오류] 앱 파일이 없습니다. 배포 ZIP이 손상되었을 수 있습니다.
  pause
  exit /b 1
)

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

if not exist "%DB_FILE%" (
  if not exist "%TEMPLATE%" (
    echo [오류] 빈 데이터베이스 템플릿이 없습니다.
    pause
    exit /b 1
  )
  copy /Y "%TEMPLATE%" "%DB_FILE%" >nul
  echo 새 데이터베이스를 생성했습니다.
)

for %%I in ("%DB_FILE%") do set "DB_ABS=%%~fI"
set "DATABASE_URL=file:%DB_ABS:\=/%"
set "PORT=3000"
set "HOSTNAME=127.0.0.1"
set "NODE_ENV=production"

echo.
echo  학교 시간표 프로그램을 시작합니다...
echo  브라우저: http://127.0.0.1:3000
echo  종료: 이 창을 닫으세요.
echo.

start "" "http://127.0.0.1:3000/"

cd /d "%APP_DIR%"
"%NODE_EXE%" server.js

echo.
echo 프로그램이 종료되었습니다.
pause
