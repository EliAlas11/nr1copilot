import boto3
from ..config import settings

s3 = boto3.client(
    's3',
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
)

def upload_file_to_s3(file_path: str, key: str):
    try:
        s3.upload_file(file_path, settings.AWS_S3_BUCKET, key, ExtraArgs={"ACL": "public-read"})
        return {"success": True, "key": key}
    except Exception as e:
        return {"success": False, "error": str(e)}
