/**
 * Last.fm API integration functions
 */
const fetch = require('node-fetch').default;
const { generateSignature, isImageValid, getGithubAvatar } = require('./utils');

// Simple in-memory cache with expiration
const cache = {
    data: {},
    get(key) {
        const item = this.data[key];
        if (!item) return null;

        // Check if the item has expired
        if (Date.now() > item.expiry) {
            delete this.data[key];
            return null;
        }

        return item.value;
    },
    set(key, value, ttlSeconds = 60) {
        this.data[key] = {
            value,
            expiry: Date.now() + (ttlSeconds * 1000)
        };
    }
};

/**
 * Gets Last.fm user information
 * @param {string} username - Last.fm username
 * @returns {Promise<Object|null>} - User data or null if error
 */
async function getLastFMUserInfo(username) {
    const cacheKey = `user_info_${username}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;

    try {
        const response = await fetch(
            `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${process.env.API_KEY}&format=json`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        cache.set(cacheKey, data.user, 300); // Cache for 5 minutes
        return data.user;
    } catch (error) {
        console.error('Error fetching Last.fm user data:', error);
        return null;
    }
}

/**
 * Gets a session key from Last.fm
 * @param {string} token - Last.fm authentication token
 * @returns {Promise<Object|null>} - Session data or null if error
 */
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
        throw error;
    }
}

/**
 * Gets the currently playing or most recent track for a user
 * @param {string} username - Last.fm username
 * @returns {Promise<Object|null>} - Now playing data or null if error
 */
async function getNowPlaying(username) {
    const cacheKey = `now_playing_${username}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;

    try {
        const [trackResponse, userResponse] = await Promise.all([
            fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${process.env.API_KEY}&format=json&limit=1`),
            fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${process.env.API_KEY}&format=json`)
        ]);

        const trackData = await trackResponse.json();
        const userData = await userResponse.json();

        // Check if track data exists and has at least one track
        if (!trackData.recenttracks || !trackData.recenttracks.track || !trackData.recenttracks.track.length) {
            console.error('No tracks found for user:', username);
            return null;
        }

        const track = trackData.recenttracks.track[0];

        const isPlaying = track['@attr']?.nowplaying === 'true';
        const timestamp = isPlaying ? Date.now() : new Date(track.date?.uts * 1000).getTime();

        // Get Last.fm profile picture
        let profileImage = '';

        // Check if user data exists and has image information
        if (userData && userData.user && userData.user.image && Array.isArray(userData.user.image)) {
            const largeImage = userData.user.image.find(img => img.size === 'large');
            if (largeImage && largeImage['#text']) {
                profileImage = largeImage['#text'];
            }
        }

        // If Last.fm profile picture is invalid or not found, use GitHub avatar
        if (!profileImage || !(await isImageValid(profileImage))) {
            profileImage = getGithubAvatar(username);
        }

        // Safely extract track properties with fallbacks
        const trackName = track.name || 'Unknown Track';
        const artistName = track.artist && track.artist['#text'] ? track.artist['#text'] : 'Unknown Artist';
        const albumName = track.album && track.album['#text'] ? track.album['#text'] : 'Unknown Album';

        // Safely extract track image
        let trackImage = '';
        if (track.image && Array.isArray(track.image)) {
            const largeImage = track.image.find(img => img.size === 'large');
            if (largeImage && largeImage['#text']) {
                trackImage = largeImage['#text'];
            }
        }

        const result = {
            isPlaying,
            track: {
                name: trackName,
                artist: artistName,
                album: albumName,
                image: trackImage || '/api/lastfm-image/300x300/2a96cbd8b46e442fc41c2b86b821562f.png',
                url: track.url || '#',
                timestamp
            },
            user: {
                image: profileImage
            }
        };

        // Cache for a shorter time if currently playing (30 seconds), longer if not (5 minutes)
        const cacheTTL = isPlaying ? 30 : 300;
        cache.set(cacheKey, result, cacheTTL);

        return result;
    } catch (error) {
        console.error('Error fetching now playing:', error);
        return null;
    }
}

module.exports = {
    getLastFMUserInfo,
    getSessionKey,
    getNowPlaying
};
