from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
import traceback
import os
import sys

# ── Resolve paths relative to THIS file ──
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
FRONTEND_DIST = os.path.join(PROJECT_ROOT, "frontend", "dist")

# Add backend dir to path so sibling imports work
sys.path.insert(0, BACKEND_DIR)

import resume_parser
import recommender

app = FastAPI(title="MOVIEFY API")

# Configure CORS (needed for dev mode, harmless in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Constants ──
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx"}


# ── API Routes ──
@app.get("/api")
@app.get("/api/")
def read_root() -> dict:
    return {"message": "MOVIEFY API is running", "status": "healthy"}


@app.post("/api/upload")
async def upload_resume(file: UploadFile = File()):
    """Parse a resume file and extract a career profile."""
    try:
        # ── Validate file extension ──
        filename = file.filename or "unknown"
        ext = ""
        if "." in filename:
            ext = "." + filename.rsplit(".", 1)[-1].lower()

        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{ext}'. Please upload a PDF or DOCX file.",
            )

        # ── Validate file size ──
        file_bytes = await file.read()
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large ({len(file_bytes) // 1024}KB). Maximum is 5MB.",
            )

        # ── Parse resume ──
        profile = resume_parser.parse_resume(filename, file_bytes)

        # ── Sanity check the parsed result ──
        if not profile.get("found_skills") and not profile.get("skill_gaps"):
            profile["_warning"] = "No skills detected. The file may be image-based or unreadable."

        return {"filename": filename, "profile": profile}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] upload_resume failed: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process resume. Please ensure it's a valid PDF or DOCX file.",
        )


class ProfileRequest(BaseModel):
    found_skills: List[str] = []
    skill_gaps: List[str] = []
    skill_categories: dict = {}
    technologies: List[str] = []
    action_profile: dict = {}
    industry: str = "General"
    secondary_industry: str = None
    vibe: str = "Pragmatic Builder"
    secondary_vibe: str = None
    career_stage: str = "Entry-level"
    years_of_experience: int = 0
    raw_text_length: int = 0
    entities: dict = {}



@app.post("/api/recommendations")
def get_recommendations(profile: ProfileRequest) -> dict:
    """Match profile skills to movie database using multi-signal scoring."""
    try:
        recs = recommender.generate_recommendations(profile.model_dump(), top_n=10)
        return {"recommendations": recs}
    except Exception as e:
        print(f"[ERROR] get_recommendations failed: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail="Recommendation engine encountered an error. Please try again.",
        )


# ── Serve the pre-built React frontend ──
# This MUST come after API routes so /api/* is handled first
if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    # Serve any other static files at root (favicon, manifest, etc.)
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve static files or fall back to index.html for SPA routing."""
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        # SPA fallback: serve index.html for any unmatched route
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def no_frontend():
        return {"message": "Frontend not built. Run: cd frontend && npm install && npm run build"}


# ── Global exception handler ──
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print(f"[UNHANDLED ERROR] {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )
