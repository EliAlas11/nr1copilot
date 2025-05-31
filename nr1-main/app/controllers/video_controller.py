from fastapi import HTTPException, status
from ..services.video_service import (
    validate_youtube_url_service,
    get_video_info_service,
    process_video_job_service,
    check_job_status_service,
    serve_processed_video_service,
    serve_sample_video_service,
)

def validate_youtube_url(data):
    url = data.get("url")
    if not url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing YouTube URL.")
    return validate_youtube_url_service(url)

def get_video_info(video_id: str):
    return get_video_info_service(video_id)

def process_video_job(data):
    return process_video_job_service(data)

def check_job_status(job_id: str):
    return check_job_status_service(job_id)

def serve_processed_video(video_id: str):
    return serve_processed_video_service(video_id)

def serve_sample_video():
    return serve_sample_video_service()
