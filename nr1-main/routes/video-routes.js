const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const videoQueue = require("../queue/videoQueue");

/**
 * Route for getting video information
 * Returns the processed video file if available, otherwise a demo response.
 * Example: GET /videos/:id
 */
router.get("/videos/:id", (req, res) => {
  const { id } = req.params;

  console.log("Serving video:", id);

  // Serve the processed video file
  const videoPath = path.join(
    __dirname,
    "..",
    "videos",
    "processed",
    `${id}.mp4`,
  );

  if (fs.existsSync(videoPath)) {
    res.sendFile(videoPath);
  } else {
    // Create a placeholder response for demo
    res.json({
      message: "Video processed successfully!",
      note: "This is a demo - in a real app, this would serve the actual video file",
    });
  }
});

/**
 * Route for video processing status
 * Returns a status object for the requested video.
 * Example: GET /status/:id
 */
router.get("/status/:id", (req, res) => {
  const { id } = req.params;

  res.json({
    id: id,
    status: "completed",
    progress: 100,
  });
});

/**
 * Route for submitting a video processing job
 * Example: POST /videos/process { videoId, url }
 */
router.post("/videos/process", async (req, res) => {
  try {
    const { videoId, url } = req.body;
    if (!videoId && !url) {
      return res.status(400).json({ error: "videoId or url is required" });
    }
    // Add job to BullMQ queue
    const job = await videoQueue.add("process", { videoId, url });
    res.json({ success: true, jobId: job.id });
  } catch (error) {
    console.error("Error adding job to queue:", error);
    res.status(500).json({ error: "Failed to queue video processing job" });
  }
});

/**
 * Route for checking job status
 * Example: GET /videos/job/:jobId
 */
router.get("/videos/job/:jobId", async (req, res) => {
  try {
    const job = await videoQueue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    const state = await job.getState();
    const progress = job._progress || 0;
    res.json({
      jobId: job.id,
      state,
      progress,
      result: job.returnvalue || null,
      failedReason: job.failedReason || null,
    });
  } catch {
    res.status(500).json({ error: "Failed to get job status" });
  }
});

// Advanced clip customization (stub)
router.post('/customize', (req, res) => {
  // TODO: Implement real customization logic
  res.json({ success: false, message: 'Customization not implemented.' });
});

// Dashboard analytics (stub)
router.get('/dashboard', (req, res) => {
  // TODO: Return real dashboard data
  res.json({ success: true, data: { userStats: {}, clipStats: {} } });
});

// Export the router for use in the main server
module.exports = router;
