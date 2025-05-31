# Deployment Guide for Viral Clip Generator on Render.com

## Introduction

This guide explains how to deploy the Viral Clip Generator website on Render.com in simple, clear steps.

## Deployment Requirements

1. A Render.com account
2. A GitHub account (optional, but recommended for automatic deployment)

## Deployment Steps

### 1. Upload the Code to GitHub (Optional but Recommended)

1. Create a new repository on GitHub
2. Upload all project files to the repository
3. Make sure to include `package.json`, `render.yaml`, and `nr1-main/server.js` (note: your main server file is in the `nr1-main` subfolder)

### 2. Create a New Service on Render.com

1. Log in to your Render.com account
2. Click the "New" button and select "Web Service"
3. Choose "Build and deploy from a Git repository" if you used GitHub
4. Or select "Upload Files" if you want to upload files directly

### 3. Configure the Service

If using GitHub:

1. Select the repository you uploaded the code to
2. The `render.yaml` file will be detected automatically and used for configuration

If uploading files directly:

1. Set the following options:
   - **Name**: viral-clip-generator
   - **Environment**: Node
   - **Build Command**: cd nr1-main && npm install
   - **Start Command**: cd nr1-main && node server.js
   - **Health Check Path**: /health

### 4. Set Environment Variables

Add the following environment variables:

- **NODE_ENV**: production

### 5. Set Up Persistent Storage

1. Go to the "Disks" section in your service settings
2. Add a new disk:
   - **Name**: viral-clips-data
   - **Mount Path**: /opt/render/project/src/nr1-main/videos
   - **Size**: 1 GB (increase as needed)

### 6. Start Deployment

1. Click the "Create Web Service" button
2. Wait for the build and deployment to finish
3. You will get a link to your deployed site (e.g., https://viral-clip-generator.onrender.com)

## Testing the Site After Deployment

1. Open the link provided by Render
2. Make sure the homepage loads correctly
3. Try entering a YouTube video URL and click "Make Viral!"
4. Check that video preview and download work as expected

## Troubleshooting

If you encounter any issues:

1. Check the service logs in the Render dashboard
2. Make sure all environment variables are set correctly
3. Ensure the persistent disk is configured properly

## Updating the Site

To update the site after deployment:

1. If using GitHub, just push changes to the repository and Render will redeploy automatically
2. If uploading files directly, update the files through the Render dashboard

## Additional Notes

- You can adjust bandwidth and memory settings from the Render dashboard as needed
- For better performance, consider upgrading to a paid plan on Render
- Monitor resource usage to avoid extra charges

# Deployment Guide for nr1copilot

This guide will help you deploy the Viral Clip Generator in a production environment.

## 1. Prerequisites

- Node.js v14 or higher
- npm
- FFmpeg (system-wide, or use the included installer)
- Linux server (recommended)
- HTTPS (recommended for public deployment)

## 2. Environment Setup

### Install dependencies

```bash
cd nr1copilot/nr1-main
npm install
```

### Set environment variables (optional)

- `PORT`: The port the server will run on (default: 5000)
- `NODE_ENV`: Set to `production` for production mode

## 3. Running the Server

### Development

```bash
npm run dev
```

### Production (recommended)

Install PM2 if not already installed:

```bash
npm install -g pm2
```

Start the server with PM2:

```bash
pm2 start server.js --name viral-clip-generator
```

## 4. HTTPS Setup

If deploying publicly, use a reverse proxy (like Nginx) to enable HTTPS.

## 5. File Storage

- Processed and temporary videos are stored in `nr1-main/videos/processed` and `nr1-main/videos/temp`.
- Old files are cleaned up automatically every 30 minutes.

## 6. Logging

- By default, errors and logs are output to the console.
- **Production best practice:**
  - Use a logging service (e.g., Loggly, Papertrail, Datadog) or redirect logs to a file for easier monitoring and debugging.
  - To log to a file, you can use the `morgan` middleware in your `server.js`:
    ```js
    const morgan = require("morgan");
    const fs = require("fs");
    const path = require("path");
    if (process.env.NODE_ENV === "production") {
      const logStream = fs.createWriteStream(
        path.join(__dirname, "server.log"),
        { flags: "a" },
      );
      app.use(morgan("combined", { stream: logStream }));
    }
    ```
  - On Render.com, you can also view logs in the Render dashboard under the "Logs" tab for your service.
- **Tip:** Regularly review your logs for errors, warnings, and performance issues.
- **Security:** Never log sensitive user data (like passwords or payment info).

## 7. Testing

- Test with various YouTube URLs (public, private, age-restricted, long, short, etc.).
- Test on both desktop and mobile browsers.

## 8. Security

- Helmet and CORS are enabled by default.
- Rate limiting is enabled on all API endpoints.

## 9. Troubleshooting

- Ensure FFmpeg is installed and accessible.
- Check server logs for errors.
- Make sure the server has write permissions to the `videos/` directory.

## Advanced Cloud & Queue Deployment

- Ensure Redis and AWS S3 are provisioned and accessible from your Render.com service.
- Set the following environment variables in Render.com:
  - `REDIS_URL` (Redis connection string)
  - `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` (S3 config)
- The app will automatically use BullMQ for job queueing, worker threads for processing, and S3 for video storage.
- WebSocket (socket.io) is enabled for real-time progress updates.
- Service worker is registered for offline support.

## Troubleshooting

- Check Render logs for Redis/S3 connection issues.
- Ensure all environment variables are set and correct.
- For large video jobs, ensure your Render plan supports background workers and WebSocket connections.

---

For more details, see the main README.md.
