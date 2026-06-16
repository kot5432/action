@echo off
cd /d C:\Users\kkyog\cousor\action

echo Starting ActionTracker...
echo.

echo [1/3] Starting Tracker Agent...
start "ActionTracker - Tracker" cmd /k "python backend/tracker/event_tracker.py"

timeout /t 2 /nobreak

echo [2/3] Starting API Server...
start "ActionTracker - API" cmd /k "python backend/api/fastapi_app.py"

timeout /t 2 /nobreak

echo [3/3] Starting Frontend...
start "ActionTracker - Frontend" cmd /k "cd frontend-react && npm run dev"

echo.
echo All components started!
echo Dashboard: http://localhost:5173
echo API Docs: http://127.0.0.1:8000/docs
echo.
pause
