@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "ml\.venv\Scripts\python.exe" (
  echo Falta o ambiente Python em ml\.venv. Veja o README, secao Como rodar a demo.
  pause
  exit /b 1
)
echo Desenha Ai, So! - conferindo o estande...
"ml\.venv\Scripts\python.exe" scripts\conferir_demo.py
set RESULTADO=%ERRORLEVEL%
echo.
pause
exit /b %RESULTADO%
