@echo off
title Component 3: Financial Monitoring and Tax Compliance API
echo =========================================================================
echo   Starting Component 3: Financial Monitoring and Tax Compliance API
echo   URL:                      http://127.0.0.1:8000
echo   Interactive Swagger Docs: http://127.0.0.1:8000/docs
echo =========================================================================

cd /d "%~dp0"

set "PY_EXE="

if exist "C:\Users\dhanu\OneDrive\Desktop\fraud_detection_ml\venv\Scripts\python.exe" (
    set "PY_EXE=C:\Users\dhanu\OneDrive\Desktop\fraud_detection_ml\venv\Scripts\python.exe"
) else if exist "..\fraud_detection_ml\venv\Scripts\python.exe" (
    set "PY_EXE=..\fraud_detection_ml\venv\Scripts\python.exe"
) else if exist "..\..\fraud_detection_ml\venv\Scripts\python.exe" (
    set "PY_EXE=..\..\fraud_detection_ml\venv\Scripts\python.exe"
) else (
    set "PY_EXE=python"
)

echo Using Python: %PY_EXE%
echo Starting Uvicorn Server...
echo.

"%PY_EXE%" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

pause
