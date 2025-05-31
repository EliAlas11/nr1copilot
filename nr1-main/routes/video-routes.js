const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

/**
 * Route for getting video information
 * Returns the processed video file if available, otherwise a demo response.
 * Example: GET /videos/:id
 */
router.get('/videos/:id', (req, res) => {
  const { id } = req.params;
  
  console.log('Serving video:', id);
  
  // Serve the processed video file
  const videoPath = path.join(__dirname, '..', 'videos', 'processed', `${id}.mp4`);
  
  if (fs.existsSync(videoPath)) {
    res.sendFile(videoPath);
  } else {
    // Create a placeholder response for demo
    res.json({
      message: 'Video processed successfully!',
      note: 'This is a demo - in a real app, this would serve the actual video file'
    });
  }
});

/**
 * Route for video processing status
 * Returns a status object for the requested video.
 * Example: GET /status/:id
 */
router.get('/status/:id', (req, res) => {
  const { id } = req.params;
  
  res.json({
    id: id,
    status: 'completed',
    progress: 100
  });
});

// Export the router for use in the main server
module.exports = router;
