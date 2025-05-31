// utils/extractVideoId.js
// Professional, robust YouTube video ID extraction
module.exports = function extractVideoId(url) {
  try {
    if (!url || typeof url !== "string") return null;
    url = url.trim().replace(/\s+/g, "");
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /[?&]v=([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] && match[1].length === 11) return match[1];
    }
    return null;
  } catch (error) {
    return null;
  }
};
