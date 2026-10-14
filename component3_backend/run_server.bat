@echo off
title Component 3: Financial Monitoring & Tax Compliance API
echo =========================================================================
echo   Starting Component 3: AI-Based Financial Monitoring & Tax API
echo   URL:        http://127.0.0.1:8000
echo   Interactive Swagger Docs: http://127.0.0.1:8000/docs
echo =========================================================================
cd /d "%~dp0"
..\fraud_detection_ml\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
