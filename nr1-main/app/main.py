import os
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .config import settings
from .logging_config import setup_logging
from .utils.health import health_check, dependencies_check

# Load environment variables
load_dotenv()

# Setup logging
setup_logging()

app = FastAPI(title="Viral Clip Generator", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
app.mount("/public", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "public")), name="public")

# Health check endpoints
@app.get("/health", tags=["Health"])
def health():
    return health_check()

@app.get("/health/dependencies", tags=["Health"])
def health_dependencies():
    return dependencies_check()

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "error": str(exc), "path": str(request.url)},
    )

from .routes import video, analytics, feedback, i18n, auth, user

app.include_router(video.router)
app.include_router(analytics.router)
app.include_router(feedback.router)
app.include_router(i18n.router)
app.include_router(auth.router)
app.include_router(user.router)
