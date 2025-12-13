/**
 * SVG generation functions for the Last.fm GitHub README widget
 */
const { Vibrant } = require('node-vibrant/node');
const { truncate, escapeXml } = require('./utils');
const fetch = require('node-fetch').default;

/**
 * Get the base URL for the current environment
 */
function getBaseUrl() {
    // Check if we're in production
    if (process.env.NODE_ENV === 'production') {
        // Use the production URL from environment variable or a default
        return process.env.BASE_URL || process.env.homepage_url || 'https://lastfm-api.batuhantrkgl.tech';
    }

    // For development: always use localhost to avoid DNS failures when offline
    // Optional override: BASE_URL_DEV
    return process.env.BASE_URL_DEV || `http://localhost:${process.env.PORT || 3000}`;
}

/**
 * Converts an image URL to a base64 data URL
 * @param {string} imageUrl - URL of the image to convert
 * @returns {Promise<string>} - Base64 data URL or fallback
 */
async function imageToBase64(imageUrl) {
    console.log('Converting image to base64:', imageUrl);

    // If the URL is already a data URL, return it as is
    if (!imageUrl || imageUrl.startsWith('data:')) {
        return imageUrl || '';
    }

    // If it's a relative URL, convert to absolute using the correct base URL
    let absoluteUrl = imageUrl;
    if (imageUrl.startsWith('/')) {
        const baseUrl = getBaseUrl();
        absoluteUrl = `${baseUrl}${imageUrl}`;
        console.log('Converted relative URL to:', absoluteUrl);
    }

    try {
        const response = await fetch(absoluteUrl, {
            headers: {
                'User-Agent': 'GitHub-Readme-Widget/1.0'
            },
            timeout: 10000, // 10 second timeout
            follow: 5 // Follow up to 5 redirects
        });

        if (!response.ok) {
            console.error(`HTTP error for ${absoluteUrl}! status: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const buffer = await response.buffer();

        // Check if the response is actually an image
        const contentType = response.headers.get('content-type') || 'image/png';
        if (!contentType.startsWith('image/')) {
            console.error(`Not an image: ${contentType} for URL: ${absoluteUrl}`);
            throw new Error(`Not an image: ${contentType}`);
        }

        // Limit image size to prevent huge base64 strings
        if (buffer.length > 500000) { // 500KB limit
            throw new Error('Image too large');
        }

        const base64 = buffer.toString('base64');
        console.log(`Successfully converted ${imageUrl} to base64 (${buffer.length} bytes)`);
        return `data:${contentType};base64,${base64}`;
    } catch (error) {
        console.error('Error converting image to base64:', error, 'URL:', imageUrl);

        // For avatar URLs, try GitHub directly as fallback
        if (imageUrl.includes('/api/avatar/')) {
            const username = imageUrl.split('/api/avatar/')[1];
            try {
                console.log(`Trying direct GitHub avatar for ${username}`);
                const githubUrl = `https://github.com/${username}.png`;
                const response = await fetch(githubUrl, { timeout: 5000 });

                if (response.ok) {
                    const buffer = await response.buffer();
                    const base64 = buffer.toString('base64');
                    console.log(`Successfully got GitHub avatar for ${username}`);
                    return `data:image/png;base64,${base64}`;
                }
            } catch (githubError) {
                console.error('GitHub avatar fallback failed:', githubError);
            }
        }

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
    // Add more detailed logging for debugging
    console.log('generateNowPlayingSVG called with:', {
        hasData: !!data,
        hasTrack: !!(data && data.track),
        hasUser: !!(data && data.user),
        theme,
        username
    });

    // Validate input data
    if (!data || !data.track || !data.user) {
        console.error('Invalid data provided to generateNowPlayingSVG', {
            data: data ? 'exists' : 'null',
            track: data?.track ? 'exists' : 'null',
            user: data?.user ? 'exists' : 'null'
        });
        return generateFallbackSVG(theme);
    }

    const { track, isPlaying, user } = data;

    // Ensure track has all required properties
    if (!track.name || !track.artist || !track.album) {
        console.error('Track data is missing required properties', {
            hasName: !!track.name,
            hasArtist: !!track.artist,
            hasAlbum: !!track.album
        });
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
    }

    const timeAgo = isPlaying ? 'Now playing' : `${Math.floor((Date.now() - (track.timestamp || Date.now())) / 60000)}m ago`;

    // Convert images to base64 for GitHub compatibility
    const albumImageUrl = track.image && !track.image.startsWith('/') ?
        track.image :
        `/api/lastfm-image/300x300/2a96cbd8b46e442fc41c2b86b821562f.png?artist=${encodeURIComponent(track.artist)}&track=${encodeURIComponent(track.name)}`;

    // For user images, prefer direct GitHub URL for base64 conversion to avoid proxy issues
    let userImageUrl = user.image || `/api/avatar/${username}`;
    if (userImageUrl.includes('/api/avatar/')) {
        // Extract username and use direct GitHub URL
        const avatarUsername = userImageUrl.split('/api/avatar/')[1] || username;
        userImageUrl = `https://github.com/${avatarUsername}.png`;
    }

    console.log('SVG Generation - Album Image URL:', albumImageUrl);
    console.log('SVG Generation - User Image URL:', userImageUrl);
    console.log('SVG Generation - User object:', JSON.stringify(user, null, 2));

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
        </g>

        <!-- Album Art -->
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
