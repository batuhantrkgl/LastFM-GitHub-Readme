/**
 * SVG generation functions for the Last.fm GitHub README widget
 */
const { Vibrant } = require('node-vibrant/node');
const { truncate } = require('./utils');

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
async function generateNowPlayingSVG(data) {
    // Validate input data
    if (!data || !data.track || !data.user) {
        console.error('Invalid data provided to generateNowPlayingSVG');
        return generateFallbackSVG();
    }

    const { track, isPlaying, user } = data;

    // Ensure track has all required properties
    if (!track.name || !track.artist || !track.album) {
        console.error('Track data is missing required properties');
        return generateFallbackSVG();
    }

    const colors = await extractColors(track.image || '');
    const timeAgo = isPlaying ? 'Now playing' : `${Math.floor((Date.now() - (track.timestamp || Date.now())) / 60000)}m ago`;

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
        </g>

        <!-- Album Art -->
        <clipPath id="albumArt">
            <rect x="20" y="15" width="70" height="70" rx="4"/>
        </clipPath>
        <image x="20" y="15" width="70" height="70" clip-path="url(#albumArt)"
            href="${track.image || '/api/lastfm-image/300x300/2a96cbd8b46e442fc41c2b86b821562f.png'}"
        />

        <!-- User Profile Picture -->
        <clipPath id="profilePic">
            <circle cx="420" cy="30" r="15"/>
        </clipPath>
        <image x="405" y="15" width="30" height="30" clip-path="url(#profilePic)"
            href="${user.image || '/api/lastfm-image/avatar/818148bf1c8f4d4bcb96427dfa5c42b7'}"
        />

        <!-- Playing Animation -->
        ${isPlaying ? `
        <circle cx="105" cy="50" r="3" fill="${colors.accent}">
            <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
        </circle>` : ''}

        <!-- Track Info -->
        <g transform="translate(120, 0)">
            <text x="0" y="45" font-family="Arial" font-size="16" font-weight="bold" fill="${colors.text}">
                ${truncate(track.name, 30)}
            </text>
            <text x="0" y="65" font-family="Arial" font-size="14" fill="${colors.text}80">
                ${truncate(track.artist, 35)}
            </text>
            <text x="0" y="85" font-family="Arial" font-size="12" fill="${colors.text}60">
                ${truncate(track.album, 40)}
            </text>
        </g>

        <!-- Time Info -->
        <text x="420" y="85" font-family="Arial" font-size="12" fill="${colors.text}80" text-anchor="middle">
            ${timeAgo}
        </text>
    </svg>`;
}

/**
 * Generates a fallback SVG when no track is playing
 * @returns {string} - SVG markup
 */
function generateFallbackSVG() {
    return `<svg width="456" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="456" height="100" fill="#fbfbfb" rx="6"/>
        <text x="228" y="50" font-family="Arial" text-anchor="middle" fill="#666">
            Not playing anything right now
        </text>
    </svg>`;
}

module.exports = {
    extractColors,
    generateNowPlayingSVG,
    generateFallbackSVG
};
