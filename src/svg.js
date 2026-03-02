/**
 * SVG generation functions for the Last.fm GitHub README widget
 */
const { Vibrant } = require("node-vibrant/node");
const { truncate, escapeXml } = require("./utils");
const fetch = require("node-fetch").default;

/**
 * Get the base URL for the current environment
 */
function getBaseUrl() {
  // Check if we're in production
  if (process.env.NODE_ENV === "production") {
    // Use the production URL from environment variable or a default
    return (
      process.env.BASE_URL ||
      process.env.homepage_url ||
      "https://lastfm-api.batuhantrkgl.tech"
    );
  }

  // For development: always use localhost to avoid DNS failures when offline
  // Optional override: BASE_URL_DEV
  return (
    process.env.BASE_URL_DEV || `http://localhost:${process.env.PORT || 3000}`
  );
}

/**
 * Formats a timestamp into a human-readable "time ago" string.
 * @param {number} timestamp - The timestamp in milliseconds.
 * @returns {string} - The formatted time ago string.
 */
function formatTimeAgo(timestamp) {
  if (!timestamp) return "";

  const now = Date.now();
  const diffMs = now - timestamp;

  if (diffMs < 0) return "in the future";

  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Converts an image URL to a base64 data URL
 * @param {string} imageUrl - URL of the image to convert
 * @returns {Promise<string>} - Base64 data URL or fallback
 */
async function imageToBase64(imageUrl) {
  console.log("Converting image to base64:", imageUrl);

  // If the URL is already a data URL, return it as is
  if (!imageUrl || imageUrl.startsWith("data:")) {
    return imageUrl || "";
  }

  // If it's a relative URL, convert to absolute using the correct base URL
  let absoluteUrl = imageUrl;
  if (imageUrl.startsWith("/")) {
    const baseUrl = getBaseUrl();
    absoluteUrl = `${baseUrl}${imageUrl}`;
    console.log("Converted relative URL to:", absoluteUrl);
  }

  try {
    const response = await fetch(absoluteUrl, {
      headers: {
        "User-Agent": "GitHub-Readme-Widget/1.0",
      },
      timeout: 10000, // 10 second timeout
      follow: 5, // Follow up to 5 redirects
    });

    if (!response.ok) {
      console.error(
        `HTTP error for ${absoluteUrl}! status: ${response.status}`,
      );
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const buffer = await response.buffer();

    // Check if the response is actually an image
    const contentType = response.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) {
      console.error(`Not an image: ${contentType} for URL: ${absoluteUrl}`);
      throw new Error(`Not an image: ${contentType}`);
    }

    // Limit image size to prevent huge base64 strings
    if (buffer.length > 500000) {
      // 500KB limit
      throw new Error("Image too large");
    }

    const base64 = buffer.toString("base64");
    console.log(
      `Successfully converted ${imageUrl} to base64 (${buffer.length} bytes)`,
    );
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Error converting image to base64:", error, "URL:", imageUrl);

    // For avatar URLs, try GitHub directly as fallback
    if (imageUrl.includes("/api/avatar/")) {
      const username = imageUrl.split("/api/avatar/")[1];
      try {
        console.log(`Trying direct GitHub avatar for ${username}`);
        const githubUrl = `https://github.com/${username}.png`;
        const response = await fetch(githubUrl, { timeout: 5000 });

        if (response.ok) {
          const buffer = await response.buffer();
          const base64 = buffer.toString("base64");
          console.log(`Successfully got GitHub avatar for ${username}`);
          return `data:image/png;base64,${base64}`;
        }
      } catch (githubError) {
        console.error("GitHub avatar fallback failed:", githubError);
      }
    }

    // Return a small transparent placeholder
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }
}

/**
 * Extracts color palette from an image URL
 * @param {string} imageUrl - URL of the image to extract colors from
 * @param {string} theme - Theme to apply (auto, dark, light)
 * @returns {Promise<Object>} - Object containing background, text, and accent colors
 */
async function extractColors(imageUrl, theme = "auto") {
  const fallback = () => {
    if (theme === "dark")
      return { background: "#1e1e1e", text: "#ffffff", accent: "#1DB954" };
    if (theme === "light")
      return { background: "#ffffff", text: "#000000", accent: "#1DB954" };
    return { background: "#fbfbfb", text: "#666666", accent: "#1DB954" };
  };

  // If the URL is empty, return default colors
  if (!imageUrl) {
    return fallback();
  }

  let absoluteUrl = imageUrl;
  if (imageUrl.startsWith("/")) {
    const baseUrl = getBaseUrl();
    absoluteUrl = `${baseUrl}${imageUrl}`;
  }

  try {
    // Fetch image as buffer directly to prevent Vibrant internal fetcher issues
    const response = await fetch(absoluteUrl, {
      headers: { "User-Agent": "GitHub-Readme-Widget/1.0" },
      timeout: 10000,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.buffer();

    const palette = await Vibrant.from(buffer).getPalette();

    const vibrantColors = [
      palette.DarkVibrant,
      palette.Vibrant,
      palette.LightVibrant,
    ].filter((c) => c !== null);
    vibrantColors.sort((a, b) => b.population - a.population);

    const mutedColors = [
      palette.DarkMuted,
      palette.Muted,
      palette.LightMuted,
    ].filter((c) => c !== null);
    mutedColors.sort((a, b) => b.population - a.population);

    let background, text, accent;

    if (theme === "dark") {
      const darkColors = [
        palette.DarkMuted,
        palette.DarkVibrant,
        palette.Muted,
      ].filter((c) => c !== null);
      darkColors.sort((a, b) => b.population - a.population);
      const darkDominant =
        darkColors[0] || palette.Vibrant || vibrantColors[0] || mutedColors[0];

      background = darkDominant?.hex || "#1e1e1e";
      text = "#ffffff";

      accent = palette.Vibrant || palette.LightVibrant || vibrantColors[0];
      if (accent === darkDominant || !accent) {
        accent = palette.LightVibrant || palette.Muted || darkDominant;
      }
      accent = accent?.hex || "#1DB954";
    } else if (theme === "light") {
      const lightColors = [
        palette.LightMuted,
        palette.LightVibrant,
        palette.Muted,
      ].filter((c) => c !== null);
      lightColors.sort((a, b) => b.population - a.population);
      const lightDominant =
        lightColors[0] || palette.Vibrant || vibrantColors[0] || mutedColors[0];

      background = lightDominant?.hex || "#ffffff";
      text = "#000000";

      accent = palette.DarkVibrant || palette.Vibrant || vibrantColors[0];
      if (accent === lightDominant || !accent) {
        accent = palette.DarkVibrant || palette.Muted || lightDominant;
      }
      accent = accent?.hex || "#1DB954";
    } else {
      const dominant = vibrantColors[0] || mutedColors[0] || palette.Vibrant;
      background = dominant?.hex || "#fbfbfb";
      text = dominant?.titleTextColor || "#ffffff";

      accent = palette.Vibrant;
      if (accent === dominant || !accent) {
        accent =
          palette.LightVibrant ||
          palette.DarkVibrant ||
          palette.Muted ||
          palette.LightMuted ||
          dominant;
      }
      accent = accent?.hex || "#1DB954";
    }

    return { background, text, accent };
  } catch (error) {
    console.error("Error extracting colors:", error.message);
    return fallback();
  }
}

/**
 * Generates an SVG for the "now playing" widget
 * @param {Object} data - Now playing data
 * @returns {Promise<string>} - SVG markup
 */
async function generateNowPlayingSVG(
  data,
  theme = "auto",
  username = "default",
) {
  // Add more detailed logging for debugging
  console.log("generateNowPlayingSVG called with:", {
    hasData: !!data,
    hasTrack: !!(data && data.track),
    hasUser: !!(data && data.user),
    theme,
    username,
  });

  // Validate input data
  if (!data || !data.track || !data.user) {
    console.error("Invalid data provided to generateNowPlayingSVG", {
      data: data ? "exists" : "null",
      track: data?.track ? "exists" : "null",
      user: data?.user ? "exists" : "null",
    });
    return generateFallbackSVG(theme);
  }

  const { track, isPlaying, user } = data;

  // Ensure track has all required properties
  if (!track.name || !track.artist || !track.album) {
    console.error("Track data is missing required properties", {
      hasName: !!track.name,
      hasArtist: !!track.artist,
      hasAlbum: !!track.album,
    });
    return generateFallbackSVG(theme);
  }

  // Convert images to base64 for GitHub compatibility
  const albumImageUrl =
    track.image && !track.image.startsWith("/")
      ? track.image
      : `/api/lastfm-image/300x300/2a96cbd8b46e442fc41c2b86b821562f.png?artist=${encodeURIComponent(track.artist)}&track=${encodeURIComponent(track.name)}`;

  let colors = await extractColors(albumImageUrl, theme);

  const timeAgo = isPlaying
    ? "Now playing"
    : formatTimeAgo(track.timestamp || Date.now());

  // For user images, prefer direct GitHub URL for base64 conversion to avoid proxy issues
  let userImageUrl = user.image || `/api/avatar/${username}`;
  if (userImageUrl.includes("/api/avatar/")) {
    // Extract username and use direct GitHub URL
    const avatarUsername = userImageUrl.split("/api/avatar/")[1] || username;
    userImageUrl = `https://github.com/${avatarUsername}.png`;
  }

  console.log("SVG Generation - Album Image URL:", albumImageUrl);
  console.log("SVG Generation - User Image URL:", userImageUrl);
  console.log("SVG Generation - User object:", JSON.stringify(user, null, 2));

  const [albumImageBase64, userImageBase64] = await Promise.all([
    imageToBase64(albumImageUrl),
    imageToBase64(userImageUrl),
  ]);

  // Generate equalizer bars animation
  const equalizer = isPlaying
    ? `
        <g transform="translate(105, 50)">
            <rect x="0" y="-3" width="3" height="6" fill="${colors.accent}" rx="1">
                <animate attributeName="height" values="6;14;6" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="y" values="-3;-7;-3" dur="0.8s" repeatCount="indefinite" />
            </rect>
            <rect x="5" y="-6" width="3" height="12" fill="${colors.accent}" rx="1">
                <animate attributeName="height" values="12;6;12" dur="0.85s" repeatCount="indefinite" />
                <animate attributeName="y" values="-6;-3;-6" dur="0.85s" repeatCount="indefinite" />
            </rect>
            <rect x="10" y="-4" width="3" height="8" fill="${colors.accent}" rx="1">
                <animate attributeName="height" values="8;16;8" dur="0.9s" repeatCount="indefinite" />
                <animate attributeName="y" values="-4;-8;-4" dur="0.9s" repeatCount="indefinite" />
            </rect>
            <rect x="15" y="-3" width="3" height="6" fill="${colors.accent}" rx="1">
                <animate attributeName="height" values="6;10;6" dur="0.95s" repeatCount="indefinite" />
                <animate attributeName="y" values="-3;-5;-3" dur="0.95s" repeatCount="indefinite" />
            </rect>
        </g>`
    : "";

  const fontStack =
    "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif";

  return `
    <svg width="456" height="110" viewBox="0 0 456 110" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="background" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${colors.background};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${colors.background};stop-opacity:0.85" />
            </linearGradient>
            <linearGradient id="overlay" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:${colors.accent};stop-opacity:0.1" />
                <stop offset="100%" style="stop-color:${colors.accent};stop-opacity:0.05" />
            </linearGradient>
            <clipPath id="round-corners">
                <rect width="456" height="110" rx="12"/>
            </clipPath>
            <clipPath id="albumArt">
                <rect x="20" y="20" width="70" height="70" rx="6"/>
            </clipPath>
            <clipPath id="profilePic">
                <circle cx="420" cy="30" r="16"/>
            </clipPath>
            <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.15"/>
            </filter>
        </defs>

        <!-- Background -->
        <g clip-path="url(#round-corners)">
            <rect width="456" height="110" fill="url(#background)"/>
            <rect width="456" height="110" fill="url(#overlay)"/>
        </g>

        <!-- Album Art -->
        <rect x="19" y="19" width="72" height="72" fill="rgba(0,0,0,0.1)" rx="7"/> <!-- Shadow border -->
        <image x="20" y="20" width="70" height="70" clip-path="url(#albumArt)"
            href="${albumImageBase64}"
        />

        <!-- User Profile Picture -->
        <circle cx="420" cy="30" r="17" fill="${colors.background}" opacity="0.3"/> <!-- Border halo -->
        <image x="404" y="14" width="32" height="32" clip-path="url(#profilePic)"
            href="${userImageBase64}"
        />

        <!-- Playing Animation -->
        ${equalizer}

        <!-- Track Info -->
        <g transform="translate(135, 0)">
            <text x="0" y="48" font-family="${fontStack}" font-size="16" font-weight="700" fill="${colors.text}">
                ${truncate(track.name, 23)}
            </text>
            <text x="0" y="68" font-family="${fontStack}" font-size="14" font-weight="500" fill="${colors.text}" opacity="0.85">
                ${truncate(track.artist, 28)}
            </text>
            <text x="0" y="87" font-family="${fontStack}" font-size="12" font-weight="400" fill="${colors.text}" opacity="0.65">
                ${truncate(track.album, 32)}
            </text>
        </g>

        <!-- Time Info -->
        <g transform="translate(420, 85)">
            <text x="0" y="0" font-family="${fontStack}" font-size="11" font-weight="400" fill="${colors.text}" opacity="0.6" text-anchor="middle">
                ${escapeXml(timeAgo)}
            </text>
        </g>
    </svg>`;
}

/**
 * Generates a fallback SVG when no track is playing
 * @param {string} theme - Theme to apply (auto, dark, light)
 * @returns {string} - SVG markup
 */
function generateFallbackSVG(theme = "auto") {
  let bgColor = "#fbfbfb";
  let textColor = "#666666";

  if (theme === "dark") {
    bgColor = "#1e1e1e";
    textColor = "#ffffff";
  } else if (theme === "light") {
    bgColor = "#ffffff";
    textColor = "#000000";
  }

  const fontStack =
    "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif";

  return `<svg width="456" height="110" viewBox="0 0 456 110" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="fallbackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${bgColor};stop-opacity:0.9" />
            </linearGradient>
            <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.1"/>
            </filter>
        </defs>

        <rect width="456" height="110" fill="url(#fallbackGradient)" rx="12"/>
        <text x="228" y="60" font-family="${fontStack}" font-size="14" font-weight="500" text-anchor="middle" fill="${textColor}" opacity="0.8">
            ${escapeXml("Not playing anything right now")}
        </text>
    </svg>`;
}

module.exports = {
  extractColors,
  generateNowPlayingSVG,
  generateFallbackSVG,
};
