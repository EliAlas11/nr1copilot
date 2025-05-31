import os
import datetime

def get_env():
    return os.getenv("ENV", "production")

def get_version():
    # TODO: Read from a version file or env
    return "1.0.0"

def get_timestamp():
    return datetime.datetime.utcnow().isoformat()
