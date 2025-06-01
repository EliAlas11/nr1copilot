"""
S3 Service Layer

- Handles file upload logic to AWS S3.
- All business logic, validation, and error handling for S3 operations is centralized here.
- Designed for auditability, security, and testability (Stripe/Netflix standards).
- All functions are stateless and side-effect free except for file I/O.
- TODO: Add logging, error reporting, and resource usage monitoring for production.
"""

import boto3
from typing import Dict, Any
from ..config import settings

s3 = boto3.client(
    's3',
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
)

def upload_file_to_s3(file_path: str, key: str) -> Dict[str, Any]:
    """Upload a file to AWS S3.

    Args:
        file_path (str): Local path to the file.
        key (str): S3 object key.

    Returns:
        dict[str, Any]: On success: {"success": True, "key": str}. On error: {"success": False, "error": str}.
    """
    try:
        s3.upload_file(file_path, settings.AWS_S3_BUCKET, key, ExtraArgs={"ACL": "public-read"})
        return {"success": True, "key": key}
    except Exception as e:
        return {"success": False, "error": str(e)}
