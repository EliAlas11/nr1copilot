"""
FFmpeg Service Layer

- Handles video processing using ffmpeg-python.
- All business logic, validation, and error handling for video processing is centralized here.
- Designed for auditability, security, and testability (Stripe/Netflix standards).
- All functions are stateless and side-effect free except for file I/O.
- TODO: Add logging, error reporting, and resource usage monitoring for production.
"""

import ffmpeg
from typing import Dict, Any
import os

def process_video(input_path: str, output_path: str, start: int = 0, duration: int = 60) -> Dict[str, Any]:
    """
    Process a video file using FFmpeg.
    Args:
        input_path (str): Path to the input video file.
        output_path (str): Path to the output video file.
        start (int): Start time in seconds.
        duration (int): Duration in seconds.
    Returns:
        dict[str, Any]: On success: {"success": True, "output": str}. On error: {"success": False, "error": str}.
    """
    try:
        (
            ffmpeg
            .input(input_path, ss=start, t=duration)
            .output(output_path, vcodec='libx264', acodec='aac', strict='experimental')
            .overwrite_output()
            .run()
        )
        return {"success": True, "output": output_path}
    except ffmpeg.Error as e:
        return {"success": False, "error": str(e)}
