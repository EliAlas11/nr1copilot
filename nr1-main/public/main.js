// main.js - Modularized JS for Viral Clip Generator

// Configuration
const API_BASE_URL = "/api";
let currentVideoId = null;
let validationTimeout = null;
let socket;

// Theme management
function setupTheme() {
  const themeToggle = document.getElementById("themeToggle");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark" || (!savedTheme && prefersDark.matches)) {
    document.body.classList.add("dark-mode");
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
      localStorage.setItem("theme", "dark");
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      localStorage.setItem("theme", "light");
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
  });
}

// Notification system
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = "fadeOut 0.3s ease-out";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Progress management
function updateProgress(percent, text = "") {
  const progressContainer = document.getElementById("progressContainer");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  if (percent > 0) {
    progressContainer.style.display = "block";
    progressFill.style.width = percent + "%";
    progressText.textContent = text || `${percent}%`;
  } else {
    progressContainer.style.display = "none";
  }
}

// Enhanced YouTube ID extraction
function extractVideoId(url) {
  if (!url || typeof url !== "string") return null;
  url = url.trim().replace(/\s+/g, "");
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1] && match[1].length === 11) return match[1];
  }
  return null;
}

// Enhanced URL validation with visual feedback
function setupURLValidation() {
  const urlInput = document.getElementById("youtubeUrl");
  const validationStatus = document.getElementById("validationStatus");
  const validationText = document.getElementById("validationText");
  urlInput.addEventListener("input", function () {
    const url = this.value.trim();
    if (validationTimeout) clearTimeout(validationTimeout);
    if (!url) {
      validationStatus.style.display = "none";
      this.style.borderColor = "";
      return;
    }
    const videoId = extractVideoId(url);
    if (url.length > 10 && !videoId) {
      showValidationStatus("invalid", "Invalid YouTube URL format");
      this.style.borderColor = "#fd746c";
    } else if (videoId) {
      showValidationStatus("valid", "Valid YouTube URL detected");
      this.style.borderColor = "#4facfe";
      // Server validation with debounce
      validationTimeout = setTimeout(async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/validate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url }),
          });
          const data = await response.json();
          if (data.success && data.isValid) {
            showValidationStatus("valid", "Video is accessible and ready for processing");
            this.style.borderColor = "#00f2fe";
          } else if (data.warning) {
            showValidationStatus("warning", data.warning);
            this.style.borderColor = "#fee140";
          } else {
            showValidationStatus("invalid", data.error || "Video may not be accessible");
            this.style.borderColor = "#fd746c";
          }
        } catch (error) {
          console.warn("Real-time validation failed:", error);
        }
      }, 1000);
    }
  });
}

function showValidationStatus(type, message) {
  const validationStatus = document.getElementById("validationStatus");
  const validationText = document.getElementById("validationText");
  validationStatus.className = `validation-status ${type}`;
  validationStatus.style.display = "flex";
  validationText.textContent = message;
  const icon = validationStatus.querySelector("i");
  switch (type) {
    case "valid": icon.className = "fas fa-check-circle"; break;
    case "invalid": icon.className = "fas fa-times-circle"; break;
    case "warning": icon.className = "fas fa-exclamation-triangle"; break;
  }
}

// Enhanced video info display
async function showVideoInfo(videoId) {
  const videoInfoDiv = document.getElementById("videoInfo");
  try {
    videoInfoDiv.innerHTML = `<h3><i class="fas fa-spinner fa-spin"></i> Loading Video Information...</h3>`;
    videoInfoDiv.style.display = "block";
    const response = await fetch(`${API_BASE_URL}/info/${videoId}`);
    let info = await response.json();
    if (response.ok && info && info.success) {
      const minutes = Math.floor(info.duration / 60);
      const seconds = (info.duration % 60).toString().padStart(2, "0");
      videoInfoDiv.innerHTML = `
        <h3><i class="fas fa-info-circle"></i> Video Information</h3>
        <p><strong>Title:</strong> ${info.title || "Unknown Title"}</p>
        <p><strong>Author:</strong> ${info.author || "Unknown Author"}</p>
        <p><strong>Duration:</strong> ${minutes}:${seconds}</p>
        <p><strong>Views:</strong> ${parseInt(info.viewCount || 0).toLocaleString()}</p>
        <div style="margin-top: 15px; padding: 10px; background: rgba(79, 172, 254, 0.1); border-radius: 8px; color: #4facfe;">
          <i class="fas fa-check"></i> Video is ready for processing!
        </div>
      `;
    } else {
      const errorMessage = (info && info.error) || `Failed to get video information (Status: ${response.status})`;
      throw new Error(errorMessage);
    }
  } catch (error) {
    videoInfoDiv.innerHTML = `
      <h3><i class="fas fa-exclamation-triangle"></i> Video Information Error</h3>
      <div style="color: #fd746c; padding: 15px; background: rgba(253, 116, 108, 0.1); border-radius: 8px;">
        <p><strong>Error:</strong> ${error.message}</p>
        <div style="margin-top: 10px; font-size: 0.9rem;">
          <strong>Common causes:</strong><br>
          • Video is private or deleted<br>
          • Age-restricted content<br>
          • Regional restrictions<br>
          • Invalid YouTube URL<br>
          • Server connectivity issues
        </div>
      </div>
    `;
  }
}

// Main processing function
async function processVideo() {
  const url = document.getElementById("youtubeUrl").value.trim();
  if (!url) {
    showNotification("Please enter a YouTube video URL", "error");
    return;
  }
  const videoId = extractVideoId(url);
  if (!videoId) {
    showNotification("Invalid YouTube URL format", "error");
    return;
  }
  setLoadingState(true);
  try {
    updateProgress(10, "Validating video...");
    const validateResponse = await fetch(`${API_BASE_URL}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url }),
    });
    const validateData = await validateResponse.json();
    if (!validateData.success || !validateData.isValid) {
      throw new Error(validateData.error || validateData.warning || "Video validation failed");
    }
    currentVideoId = validateData.videoId;
    updateProgress(15, "Getting video information...");
    await showVideoInfo(currentVideoId);
    // Simulate progress
    const progressStages = [
      { percent: 25, text: "Preparing download..." },
      { percent: 40, text: "Downloading video..." },
      { percent: 60, text: "Analyzing content..." },
      { percent: 80, text: "Creating viral clip..." },
      { percent: 95, text: "Finalizing..." },
    ];
    let stageIndex = 0;
    const progressInterval = setInterval(() => {
      if (stageIndex < progressStages.length) {
        const stage = progressStages[stageIndex];
        updateProgress(stage.percent, stage.text);
        stageIndex++;
      } else {
        clearInterval(progressInterval);
      }
    }, 3000);
    // Process video
    const response = await fetch(`${API_BASE_URL}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: currentVideoId, url: url }),
    });
    let data = await response.json();
    clearInterval(progressInterval);
    if (!response.ok || !data || !data.success) {
      const errorMessage = (data && data.error) || `Processing failed (Status: ${response.status})`;
      throw new Error(errorMessage);
    }
    updateProgress(100, "Complete!");
    setTimeout(() => {
      showVideoResult(data);
      updateProgress(0);
    }, 1000);
  } catch (error) {
    updateProgress(0);
    showError(error.message || "Unknown error occurred during processing");
    showNotification(error.message || "Unknown error", "error");
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(isLoading) {
  const processBtn = document.getElementById("processBtn");
  const exampleBtn = document.getElementById("exampleBtn");
  const loader = document.getElementById("loader");
  processBtn.disabled = isLoading;
  exampleBtn.disabled = isLoading;
  if (isLoading) {
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Processing...</span>';
    loader.style.display = "block";
  } else {
    processBtn.innerHTML = '<i class="fas fa-magic"></i><span>Create Viral Clip</span>';
    loader.style.display = "none";
  }
}

function showVideoResult(data) {
  const resultDiv = document.getElementById("result");
  const videoUrl = window.location.origin + data.url;
  resultDiv.innerHTML = `
    <div class="result-success">
      <h2><i class="fas fa-check-circle" aria-label="Success"></i> Your Viral Clip is Ready!</h2>
      ${data.originalTitle ? `<p style="margin: 15px 0;"><strong>From:</strong> ${data.originalTitle}</p>` : ""}
      <div class="video-container">
        <video controls preload="metadata" playsinline aria-label="Processed viral video">
          <source src="${videoUrl}" type="video/mp4">
          Your browser does not support video playback.
        </video>
      </div>
      <div class="actions">
        <a href="${videoUrl}" download="viral-clip-${data.videoId}.mp4" class="action-btn" aria-label="Download viral clip">
          <i class="fas fa-download" aria-label="Download"></i> Download
        </a>
        <a href="#" onclick="shareVideo('${videoUrl}')" class="action-btn" aria-label="Share viral clip">
          <i class="fas fa-share-alt" aria-label="Share"></i> Share
        </a>
      </div>
      <p style="margin: 20px 0; font-weight: 500;">Perfect for:</p>
      <div class="platforms">
        <div class="platform-icon tiktok" title="TikTok" aria-label="TikTok"><i class="fab fa-tiktok" aria-label="TikTok"></i></div>
        <div class="platform-icon instagram" title="Instagram" aria-label="Instagram"><i class="fab fa-instagram" aria-label="Instagram"></i></div>
        <div class="platform-icon youtube" title="YouTube" aria-label="YouTube"><i class="fab fa-youtube" aria-label="YouTube"></i></div>
        <div class="platform-icon twitter" title="Twitter" aria-label="Twitter"><i class="fab fa-twitter" aria-label="Twitter"></i></div>
      </div>
    </div>
  `;
  resultDiv.style.display = "block";
  resultDiv.scrollIntoView({ behavior: "smooth" });
  showNotification("Viral clip created successfully!", "success");
}

function showError(message) {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = `
    <div class="result-error">
      <h2><i class="fas fa-exclamation-triangle"></i> Error</h2>
      <p style="margin: 15px 0;">${message}</p>
      <div style="margin-top: 20px; font-size: 0.9rem; opacity: 0.8;">
        <strong>Tips:</strong><br>
        • Make sure the YouTube URL is correct and public<br>
        • Videos should be between 10 seconds and 30 minutes<br>
        • Age-restricted or private videos cannot be processed<br>
        • Try using a different video if the issue persists
      </div>
    </div>
  `;
  resultDiv.style.display = "block";
  resultDiv.scrollIntoView({ behavior: "smooth" });
}

function showExample() {
  const resultDiv = document.getElementById("result");
  const videoUrl = "/api/videos/sample";
  resultDiv.innerHTML = `
    <div class="result-success">
      <h2><i class="fas fa-play" aria-label="Example"></i> Example Viral Clip</h2>
      <div class="video-container">
        <video controls preload="metadata" playsinline aria-label="Example viral video">
          <source src="${videoUrl}" type="video/mp4">
          Your browser does not support video playback.
        </video>
      </div>
      <p style="margin: 20px 0; font-weight: 500;">Perfect for:</p>
      <div class="platforms">
        <div class="platform-icon tiktok" title="TikTok" aria-label="TikTok"><i class="fab fa-tiktok" aria-label="TikTok"></i></div>
        <div class="platform-icon instagram" title="Instagram" aria-label="Instagram"><i class="fab fa-instagram" aria-label="Instagram"></i></div>
        <div class="platform-icon youtube" title="YouTube" aria-label="YouTube"><i class="fab fa-youtube" aria-label="YouTube"></i></div>
        <div class="platform-icon twitter" title="Twitter" aria-label="Twitter"><i class="fab fa-twitter" aria-label="Twitter"></i></div>
      </div>
    </div>
  `;
  resultDiv.style.display = "block";
  resultDiv.scrollIntoView({ behavior: "smooth" });
  showNotification("Example viral clip loaded!", "success");
}

function shareVideo(videoUrl) {
  if (navigator.share) {
    navigator.share({
      title: "Check out this viral clip!",
      text: "I created this amazing viral clip!",
      url: videoUrl,
    }).catch((error) => {
      fallbackShare(videoUrl);
    });
  } else {
    fallbackShare(videoUrl);
  }
}

function fallbackShare(videoUrl) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(videoUrl).then(() => {
      showNotification("Video URL copied to clipboard!", "success");
    }).catch(() => {
      showNotification(`Share this URL: ${videoUrl}`, "info");
    });
  } else {
    showNotification(`Share this URL: ${videoUrl}`, "info");
  }
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.id === "youtubeUrl") {
      e.preventDefault();
      processVideo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      processVideo();
    }
    if (e.key === "Escape") {
      const resultDiv = document.getElementById("result");
      if (resultDiv.style.display === "block") {
        resultDiv.style.display = "none";
        updateProgress(0);
      }
    }
  });
}

// Modal management
function showModal(id) { document.getElementById(id).style.display = 'flex'; document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; document.body.style.overflow = ''; }
function showAuthModal() { showModal('authModal'); }
function showHelpModal() { showModal('helpModal'); }
function showFeedbackModal() { showModal('feedbackModal'); }
function showPrivacyModal() { showModal('privacyModal'); }
function showTOSModal() { showModal('tosModal'); }
function showCustomizeModal() { showModal('customizeModal'); }

document.addEventListener('DOMContentLoaded', function() {
  setupTheme();
  setupURLValidation();
  setupKeyboardShortcuts();
  // Auth form (stub)
  document.getElementById('authForm').onsubmit = function(e) {
    e.preventDefault();
    showNotification('Login/Signup is not yet implemented.', 'warning');
    closeModal('authModal');
  };
  // Feedback form (stub)
  document.getElementById('feedbackForm').onsubmit = function(e) {
    e.preventDefault();
    showNotification('Thank you for your feedback!', 'success');
    closeModal('feedbackModal');
  };
  // Customize form (stub)
  document.getElementById('customizeForm').onsubmit = function(e) {
    e.preventDefault();
    showNotification('Customization applied (not yet functional).', 'info');
    closeModal('customizeModal');
  };
  // Dashboard (stub)
  document.getElementById('dashboardBtn').onclick = function() {
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('dashboardContent').innerHTML = '<p>Analytics and usage stats coming soon.</p>';
    window.scrollTo({top:0,behavior:'smooth'});
  };
  // Language selector (stub)
  document.getElementById('languageSelect').onchange = function() {
    showNotification('Language switching is not yet implemented.', 'info');
  };
  // PWA install prompt (stub)
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('pwaPrompt').style.display = 'block';
  });
  document.getElementById('pwaPrompt')?.querySelector('.btn-primary')?.addEventListener('click', function() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        document.getElementById('pwaPrompt').style.display = 'none';
      });
    }
  });
  document.getElementById('pwaPrompt')?.querySelector('.btn-link')?.addEventListener('click', function() {
    document.getElementById('pwaPrompt').style.display = 'none';
  });
  // Offline notice
  window.addEventListener('offline', () => {
    document.getElementById('offlineNotice').style.display = 'block';
  });
  window.addEventListener('online', () => {
    document.getElementById('offlineNotice').style.display = 'none';
  });
  // Add customize button to main actions
  (function addCustomizeBtn(){
    const nav = document.querySelector('.buttons');
    if(nav && !document.getElementById('customizeBtn')){
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.id = 'customizeBtn';
      btn.setAttribute('aria-label','Customize Clip');
      btn.innerHTML = '<i class="fas fa-sliders-h" aria-hidden="true"></i> <span>Customize</span>';
      btn.onclick = showCustomizeModal;
      nav.insertBefore(btn, nav.children[1]);
    }
  })();
});
