@echo off
setlocal
set "F5_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined F5_NODE set "F5_NODE=%%N"
if not defined F5_NODE (
  echo Node.js 24 is required.
  pause
  exit /b 1
)
call codex mcp add f5-reference -- "%F5_NODE%" "%~dp0server.mjs"
if errorlevel 1 (
  echo Registration failed. Check the Codex CLI message above.
  pause
  exit /b 1
)
echo Registered f5-reference. Open a new Codex chat to use it.
pause
