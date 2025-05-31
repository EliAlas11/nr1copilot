import ffmpeg
import os

def process_video(input_path: str, output_path: str, start: int = 0, duration: int = 60):
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
