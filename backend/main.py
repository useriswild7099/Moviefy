from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import parser
import recommender
import auto_updater
import threading


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan: pre-warm caches and start background tasks."""
    # ── Startup ──
    # 1. Pre-warm the TF-IDF recommendation cache (critical for performance)
    recommender.warm_cache()
    
    # 2. Spawn the Wikipedia updater in a background thread
    thread = threading.Thread(target=auto_updater.update_movies_from_internet)
    thread.daemon = True
    thread.start()
    
    yield
    # ── Shutdown ── (nothing to clean up)


app = FastAPI(title="MOVIEFY API", lifespan=lifespan)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict:
    return {"message": "MOVIEFY API is running", "status": "healthy"}


@app.post("/api/upload")
async def upload_resume(file: UploadFile = File()):
    """Parse a resume file and extract a career profile."""
    file_bytes = await file.read()
    profile = parser.parse_resume(file.filename, file_bytes)
    return {"filename": file.filename, "profile": profile}


class ProfileRequest(BaseModel):
    found_skills: list
    skill_gaps: list
    industry: str
    career_stage: str
    raw_text_length: int


@app.post("/api/recommendations")
def get_recommendations(profile: ProfileRequest) -> dict:
    """Match profile skills to movie database using multi-signal scoring."""
    recs = recommender.generate_recommendations(profile.model_dump(), top_n=10)
    return {"recommendations": recs}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
