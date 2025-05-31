// BullMQ queue setup for video processing
const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
);

const videoQueue = new Queue("video-processing", { connection });

module.exports = videoQueue;
