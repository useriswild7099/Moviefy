from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
import traceback
import os
import sys

app = FastAPI(title="MOVIEFY API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Try importing our modules with error capture ──
_import_errors = []
try:
    import resume_parser
except Exception as e:
    _import_errors.append(f"resume_parser: {e}")
    resume_parser = None

try:
    import recommender
except Exception as e:
    _import_errors.append(f"recommender: {e}")
    recommender = None

# ── Constants ──
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx"}


@app.get("/api")
@app.get("/api/")
def read_root() -> dict:
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "movies.db")
    return {
        "message": "MOVIEFY API is running",
        "status": "healthy" if not _import_errors else "degraded",
        "import_errors": _import_errors,
        "db_exists": os.path.exists(db_path),
        "db_path": db_path,
        "cwd": os.getcwd(),
        "files_in_dir": os.listdir(os.path.dirname(os.path.abspath(__file__)))[:20],
        "python_version": sys.version,
    }


@app.post("/api/upload")
async def upload_resume(file: UploadFile = File()):
    """Parse a resume file and extract a career profile."""
    if resume_parser is None:
        raise HTTPException(status_code=500, detail=f"Parser not loaded: {_import_errors}")

    try:
        filename = file.filename or "unknown"
        ext = ""
        if "." in filename:
            ext = "." + filename.rsplit(".", 1)[-1].lower()

        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{ext}'. Please upload a PDF or DOCX file.",
            )

        file_bytes = await file.read()
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large ({len(file_bytes) // 1024}KB). Maximum is 5MB.",
            )

        profile = resume_parser.parse_resume(filename, file_bytes)

        if not profile.get("found_skills") and not profile.get("skill_gaps"):
            profile["_warning"] = "No skills detected. The file may be image-based or unreadable."

        return {"filename": filename, "profile": profile}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] upload_resume failed: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process resume: {str(e)}",
        )


class ProfileRequest(BaseModel):
    found_skills: List[str] = []
    skill_gaps: List[str] = []
    industry: str = "General"
    career_stage: str = "Entry-level"
    raw_text_length: int = 0


@app.post("/api/recommendations")
def get_recommendations(profile: ProfileRequest) -> dict:
    """Match profile skills to movie database using multi-signal scoring."""
    if recommender is None:
        raise HTTPException(status_code=500, detail=f"Recommender not loaded: {_import_errors}")

    try:
        recs = recommender.generate_recommendations(profile.model_dump(), top_n=10)
        return {"recommendations": recs}
    except Exception as e:
        print(f"[ERROR] get_recommendations failed: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Recommendation error: {str(e)}",
        )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print(f"[UNHANDLED ERROR] {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Unexpected error: {str(exc)}"},
    )
