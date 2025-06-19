/**
 * Spotify API integration functions
 */
const fetch = require('node-fetch').default;

// Simple in-memory cache for Spotify access tokens
const tokenCache = {
    token: null,
    expiry: 0,
    isValid() {
        return this.token && Date.now() < this.expiry;
    }
};

/**
 * Gets a Spotify access token using client credentials
 * @returns {Promise<string>} - Spotify access token
 */
async function getSpotifyToken() {
    // Return cached token if it's still valid
    if (tokenCache.isValid()) {
        return tokenCache.token;
    }

    try {
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.error('Missing Spotify credentials in environment variables');
            return null;
        }

        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Cache the token
        tokenCache.token = data.access_token;
        tokenCache.expiry = Date.now() + (data.expires_in * 1000);
        
        return data.access_token;
    } catch (error) {
        console.error('Error getting Spotify token:', error);
        return null;
    }
}

/**
 * Searches for a track on Spotify
 * @param {string} artist - Artist name
 * @param {string} track - Track name
 * @returns {Promise<Object|null>} - Track data or null if not found
 */
async function searchSpotifyTrack(artist, track) {
    try {
        const token = await getSpotifyToken();
        if (!token) {
            return null;
        }

        const query = encodeURIComponent(`artist:${artist} track:${track}`);
        const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.tracks || !data.tracks.items || data.tracks.items.length === 0) {
            return null;
        }

        return data.tracks.items[0];
    } catch (error) {
        console.error('Error searching Spotify track:', error);
        return null;
    }
}

/**
 * Gets album cover URL from Spotify for a track
 * @param {string} artist - Artist name
 * @param {string} track - Track name
 * @returns {Promise<string|null>} - Album cover URL or null if not found
 */
async function getSpotifyAlbumCover(artist, track) {
    try {
        const trackData = await searchSpotifyTrack(artist, track);
        
        if (!trackData || !trackData.album || !trackData.album.images || trackData.album.images.length === 0) {
            return null;
        }

        // Get the medium-sized image (usually 300x300)
        const mediumImage = trackData.album.images.find(img => img.width === 300);
        if (mediumImage) {
            return mediumImage.url;
        }

        // Fallback to the first image if no medium-sized image is found
        return trackData.album.images[0].url;
    } catch (error) {
        console.error('Error getting Spotify album cover:', error);
        return null;
    }
}

module.exports = {
    getSpotifyToken,
    searchSpotifyTrack,
    getSpotifyAlbumCover
};