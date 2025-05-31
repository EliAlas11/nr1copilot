// videoWorkerThread.js
const { parentPort, workerData } = require("worker_threads");
const ffmpeg = require("fluent-ffmpeg");

// Example: workerData = { inputPath, outputPath, ... }
ffmpeg(workerData.inputPath)
  .setStartTime(0)
  .setDuration(30)
  .videoCodec("libx264")
  .audioCodec("aac")
  .outputOptions([
    "-preset",
    "fast",
    "-crf",
    "23",
    "-movflags",
    "+faststart",
    "-vf",
    "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p",
    "-aspect",
    "9:16",
  ])
  .on("end", () => {
    parentPort.postMessage({ status: "done", output: workerData.outputPath });
  })
  .on("error", (err) => {
    parentPort.postMessage({ status: "error", error: err.message });
    // TODO: Add alerting/monitoring for worker errors
  })
  .save(workerData.outputPath);
