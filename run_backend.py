import uvicorn
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

if __name__ == "__main__":
    print("--- MOVIEFY BACKEND ---")
    print("Starting local development server on http://localhost:8000")
    print("Make sure you have installed: pip install -r backend/requirements.txt")
    uvicorn.run("backend.index:app", host="0.0.0.0", port=8000, reload=True)
