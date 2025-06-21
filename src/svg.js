/**
 * SVG generation functions for the Last.fm GitHub README widget
 */
const { Vibrant } = require('node-vibrant/node');
const { truncate, escapeXml } = require('./utils');
const fetch = require('node-fetch').default;

/**
 * Converts an image URL to a base64 data URL
 * @param {string} imageUrl - URL of the image to convert
 * @returns {Promise<string>} - Base64 data URL or fallback
 */
async function imageToBase64(imageUrl) {
    // If the URL is already a data URL, return it as is
    if (!imageUrl || imageUrl.startsWith('data:')) {
        return imageUrl || '';
    }

    // If it's a relative URL, convert to absolute
    if (imageUrl.startsWith('/')) {
        imageUrl = `http://localhost:3000${imageUrl}`;
    }

    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'GitHub-Readme-Widget/1.0'
            },
            timeout: 10000 // 10 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const buffer = await response.buffer();
        
        // Check if the response is actually an image
        const contentType = response.headers.get('content-type') || 'image/png';
        if (!contentType.startsWith('image/')) {
            throw new Error(`Not an image: ${contentType}`);
        }

        // Limit image size to prevent huge base64 strings
        if (buffer.length > 500000) { // 500KB limit
            throw new Error('Image too large');
        }
        
        const base64 = buffer.toString('base64');
        return `data:${contentType};base64,${base64}`;
    } catch (error) {
        console.error('Error converting image to base64:', error, 'URL:', imageUrl);
        // Return a small transparent placeholder
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }
}

/**
 * Extracts color palette from an image URL
 * @param {string} imageUrl - URL of the image to extract colors from
 * @returns {Promise<Object>} - Object containing background, text, and accent colors
 */
async function extractColors(imageUrl) {
    // If the URL is relative or empty, return default colors
    if (!imageUrl || imageUrl.startsWith('/')) {
        return {
            background: '#fbfbfb',
            text: '#ffffff',
            accent: '#1DB954'
        };
    }

    try {
        const palette = await Vibrant.from(imageUrl).getPalette();
        return {
            background: palette.DarkMuted?.hex || '#fbfbfb',
            text: palette.LightVibrant?.hex || '#ffffff',
            accent: palette.Vibrant?.hex || '#1DB954'
        };
    } catch (error) {
        console.error('Error extracting colors:', error);
        return {
            background: '#fbfbfb',
            text: '#ffffff',
            accent: '#1DB954'
        };
    }
}

/**
 * Generates an SVG for the "now playing" widget
 * @param {Object} data - Now playing data
 * @returns {Promise<string>} - SVG markup
 */
async function generateNowPlayingSVG(data, theme = 'auto', username = 'default') {
    // Validate input data
    if (!data || !data.track || !data.user) {
        console.error('Invalid data provided to generateNowPlayingSVG');
        return generateFallbackSVG(theme);
    }

    const { track, isPlaying, user } = data;

    // Ensure track has all required properties
    if (!track.name || !track.artist || !track.album) {
        console.error('Track data is missing required properties');
        return generateFallbackSVG(theme);
    }

    let colors = await extractColors(track.image || '');

    // Apply theme overrides
    if (theme === 'dark') {
        colors = {
            background: '#1e1e1e',
            text: '#ffffff',
            accent: colors.accent || '#1DB954'
        };
    } else if (theme === 'light') {
        colors = {
            background: '#ffffff',
            text: '#000000',
            accent: colors.accent || '#1DB954'
        };
    }    const timeAgo = isPlaying ? 'Now playing' : `${Math.floor((Date.now() - (track.timestamp || Date.now())) / 60000)}m ago`;

    // Convert images to base64 for GitHub compatibility
    const albumImageUrl = track.image && !track.image.startsWith('/') ? 
        track.image : 
        `/api/lastfm-image/300x300/2a96cbd8b46e442fc41c2b86b821562f.png?artist=${encodeURIComponent(track.artist)}&track=${encodeURIComponent(track.name)}`;
    
    const userImageUrl = user.image || `/api/avatar/${username}`;
    
    const [albumImageBase64, userImageBase64] = await Promise.all([
        imageToBase64(albumImageUrl),
        imageToBase64(userImageUrl)
    ]);

    return `
    <svg width="456" height="100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="background" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:${colors.background};stop-opacity:0.8" />
                <stop offset="100%" style="stop-color:${colors.background};stop-opacity:0.2" />
            </linearGradient>
            <clipPath id="round-corners">
                <rect width="456" height="100" rx="6"/>
            </clipPath>
        </defs>

        <!-- Background -->
        <g clip-path="url(#round-corners)">
            <rect width="456" height="100" fill="url(#background)"/>
            <rect width="456" height="100" fill="rgba(0,0,0,0.1)"/>
        </g>        <!-- Album Art -->
        <clipPath id="albumArt">
            <rect x="20" y="15" width="70" height="70" rx="4"/>
        </clipPath>
        <image x="20" y="15" width="70" height="70" clip-path="url(#albumArt)"
            href="${albumImageBase64}"
        />

        <!-- User Profile Picture -->
        <clipPath id="profilePic">
            <circle cx="420" cy="30" r="15"/>
        </clipPath>
        <image x="405" y="15" width="30" height="30" clip-path="url(#profilePic)"
            href="${userImageBase64}"
        />

        <!-- Playing Animation -->
        ${isPlaying ? `
        <circle cx="105" cy="50" r="3" fill="${colors.accent}">
            <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
        </circle>` : ''}

        <!-- Track Info -->
        <g transform="translate(120, 0)">
            <!-- Limit text width to prevent overlap with profile picture -->
            <text x="0" y="45" font-family="Arial" font-size="16" font-weight="bold" fill="${colors.text}">
                ${truncate(track.name, 25)}
            </text>
            <text x="0" y="65" font-family="Arial" font-size="14" fill="${colors.text}80">
                ${truncate(track.artist, 30)}
            </text>
            <text x="0" y="85" font-family="Arial" font-size="12" fill="${colors.text}60">
                ${truncate(track.album, 35)}
            </text>
        </g>

        <!-- Time Info -->
        <text x="420" y="85" font-family="Arial" font-size="12" fill="${colors.text}80" text-anchor="middle">
            ${escapeXml(timeAgo)}
        </text>
    </svg>`;
}

/**
 * Generates a fallback SVG when no track is playing
 * @param {string} theme - Theme to apply (auto, dark, light)
 * @returns {string} - SVG markup
 */
function generateFallbackSVG(theme = 'auto') {
    let bgColor = '#fbfbfb';
    let textColor = '#666666';

    if (theme === 'dark') {
        bgColor = '#1e1e1e';
        textColor = '#ffffff';
    } else if (theme === 'light') {
        bgColor = '#ffffff';
        textColor = '#000000';
    }

    return `<svg width="456" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="456" height="100" fill="${bgColor}" rx="6"/>
        <text x="228" y="50" font-family="Arial" text-anchor="middle" fill="${textColor}">
            ${escapeXml("Not playing anything right now")}
        </text>
    </svg>`;
}

module.exports = {
    extractColors,
    generateNowPlayingSVG,
    generateFallbackSVG
};
