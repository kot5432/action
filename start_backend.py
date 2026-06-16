import uvicorn
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.core.database import init_database

if __name__ == "__main__":
    init_database()
    uvicorn.run("backend.api.fastapi_app:app", host="localhost", port=8000, reload=False)
