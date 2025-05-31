from fastapi import APIRouter, HTTPException, status, Query
from ..controllers.video_controller import (
    validate_youtube_url,
    get_video_info,
    process_video_job,
    check_job_status,
    serve_processed_video,
    serve_sample_video,
)

router = APIRouter(prefix="/api/v1/videos", tags=["Videos"])

@router.post("/validate")
def validate(data: dict):
    return validate_youtube_url(data)

@router.get("/info/{video_id}")
def info(video_id: str):
    return get_video_info(video_id)

@router.post("/process")
def process(data: dict):
    return process_video_job(data)

@router.get("/job/{job_id}")
def job_status(job_id: str):
    return check_job_status(job_id)

@router.get("/serve/{video_id}")
def serve(video_id: str):
    return serve_processed_video(video_id)

@router.get("/sample")
def sample():
    return serve_sample_video()
