import logging
import colorlog
import os
from .config import settings

def setup_logging():
    log_level = logging.INFO if settings.ENV == "production" else logging.DEBUG
    log_format = "%(log_color)s[%(asctime)s] [%(levelname)s] %(message)s"
    colorlog.basicConfig(
        level=log_level,
        format=log_format,
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler()]
    )
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    if settings.LOG_FILE_PATH:
        file_handler = logging.FileHandler(settings.LOG_FILE_PATH)
        file_handler.setLevel(log_level)
        formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s")
        file_handler.setFormatter(formatter)
        logging.getLogger().addHandler(file_handler)
