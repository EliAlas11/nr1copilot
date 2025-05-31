from fastapi.responses import JSONResponse
from . import runtime

def health_check():
    return {
        "status": "ok",
        "environment": runtime.get_env(),
        "version": runtime.get_version(),
        "timestamp": runtime.get_timestamp(),
    }

def dependencies_check():
    # TODO: Add real checks for MongoDB, Redis, FFmpeg, etc.
    return {
        "status": "ok",
        "dependencies": {
            "mongodb": "ok",
            "redis": "ok",
            "ffmpeg": "ok"
        }
    }
