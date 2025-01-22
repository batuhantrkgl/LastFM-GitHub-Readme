const fetch = require('node-fetch');
const express = require('express');
const crypto = require('crypto');
const Vibrant = require('node-vibrant/node');
const { createCanvas, loadImage } = require('canvas');
const app = express();
require('dotenv').config();

async function getLastFMUserInfo(username) {
    try {
        const response = await fetch(
            `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${process.env.API_KEY}&format=json`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error('Error fetching Last.fm user data:', error);
        return null;
    }
}

function generateSignature(params) {
    const sorted = Object.keys(params)
        .sort()
        .map(key => `${key}${params[key]}`)
        .join('');
    
    return crypto
        .createHash('md5')
        .update(sorted + process.env.SHARED_SECRET)
        .digest('hex');
}

async function getSessionKey(token) {
    try {
        const params = {
            api_key: process.env.API_KEY,
            method: 'auth.getSession',
            token: token
        };
        
        const api_sig = generateSignature(params);
        
        const queryString = new URLSearchParams({
            ...params,
            api_sig: api_sig,
            format: 'json'
        }).toString();

        const response = await fetch(
            `https://ws.audioscrobbler.com/2.0/?${queryString}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.session;
    } catch (error) {
        console.error('Error getting session:', error);
        throw error; // Throw error to see full response in callback
    }
}

async function extractColors(imageUrl) {
    try {
        const palette = await Vibrant.from(imageUrl).getPalette();
        return {
            background: palette.DarkMuted?.hex || '#fbfbfb',
            text: palette.LightVibrant?.hex || '#ffffff',
            accent: palette.Vibrant?.hex || '#1DB954'
        };
    } catch (error) {
        return {
            background: '#fbfbfb',
            text: '#ffffff',
            accent: '#1DB954'
        };
    }
}

async function isImageValid(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

async function getGithubAvatar(username) {
    return `https://github.com/${username}.png`;
}

async function getNowPlaying(username) {
    try {
        const [trackResponse, userResponse] = await Promise.all([
            fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${process.env.API_KEY}&format=json&limit=1`),
            fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${process.env.API_KEY}&format=json`)
        ]);
        
        const trackData = await trackResponse.json();
        const userData = await userResponse.json();
        const track = trackData.recenttracks.track[0];
        
        const isPlaying = track['@attr']?.nowplaying === 'true';
        const timestamp = isPlaying ? Date.now() : new Date(track.date?.uts * 1000).getTime();
        
        // Get Last.fm profile picture
        let profileImage = userData.user.image.find(img => img.size === 'large')['#text'];
        
        // If Last.fm profile picture is invalid, use GitHub avatar
        if (!profileImage || !(await isImageValid(profileImage))) {
            profileImage = await getGithubAvatar(username);
        }

        return {
            isPlaying,
            track: {
                name: track.name,
                artist: track.artist['#text'],
                album: track.album['#text'],
                image: track.image.find(img => img.size === 'large')['#text'],
                url: track.url,
                timestamp
            },
            user: {
                image: profileImage
            }
        };
    } catch (error) {
        console.error('Error fetching now playing:', error);
        return null;
    }
}

async function generateNowPlayingSVG(data) {
    const { track, isPlaying, user } = data;
    const truncate = (str, len) => str.length > len ? str.substring(0, len) + '...' : str;
    
    const colors = await extractColors(track.image);
    const timeAgo = isPlaying ? 'Now playing' : `${Math.floor((Date.now() - track.timestamp) / 60000)}m ago`;

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
            href="${track.image || 'https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png'}"
        />
        
        <!-- User Profile Picture -->
        <clipPath id="profilePic">
            <circle cx="420" cy="30" r="15"/>
        </clipPath>
        <image x="405" y="15" width="30" height="30" clip-path="url(#profilePic)"
            href="${user.image || 'https://lastfm.freetls.fastly.net/i/u/avatar/818148bf1c8f4d4bcb96427dfa5c42b7'}"
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

// Callback route
app.get('/lastfm-official-api/callback', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send('No token provided');
    }

    try {
        const session = await getSessionKey(token);
        if (!session) {
            return res.status(400).send('Failed to get session');
        }

        const userData = await getLastFMUserInfo(session.name);
        res.json({
            username: session.name,
            userData
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            token: token
        });
    }
});

// Add new endpoint for now playing
app.get('/api/nowplaying/:username', async (req, res) => {
    const { username } = req.params;
    const nowPlaying = await getNowPlaying(username);
    
    if (!nowPlaying) {
        return res.status(404).json({ error: 'Failed to fetch now playing data' });
    }
    
    res.json(nowPlaying);
});

// Add SVG endpoint for GitHub README
app.get('/api/widget/:username', async (req, res) => {
    const { username } = req.params;
    const nowPlaying = await getNowPlaying(username);
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, max-age=0');
    
    if (!nowPlaying) {
        // Return a basic SVG if there's an error
        res.send(`<svg width="456" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="456" height="100" fill="#fbfbfb" rx="6"/>
            <text x="228" y="50" font-family="Arial" text-anchor="middle" fill="#666">
                Not playing anything right now
            </text>
        </svg>`);
        return;
    }
    
    res.send(await generateNowPlayingSVG(nowPlaying));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Example usage
(async () => {
    const userData = await getLastFMUserInfo('batuhantrkgl');
    if (userData) {
        console.log('User Info:', {
            name: userData.name,
            playcount: userData.playcount,
            country: userData.country,
            registered: new Date(userData.registered.unixtime * 1000).toISOString()
        });
    }
})();
