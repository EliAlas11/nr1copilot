import os
from rq import Worker, Queue, Connection
from ..config import settings
from ..services.video_service import process_video_job_service
from ..queue.video_queue import redis_conn

listen = ['video-processing']

if __name__ == '__main__':
    with Connection(redis_conn):
        worker = Worker(list(map(Queue, listen)))
        worker.work()
