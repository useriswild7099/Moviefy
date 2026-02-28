"""
Vercel Serverless Function — wraps the FastAPI app for deployment.
Vercel automatically routes /api/* requests to this handler.
"""
import sys
import os

# Add the backend directory to Python path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from backend.main import app  # noqa: E402
