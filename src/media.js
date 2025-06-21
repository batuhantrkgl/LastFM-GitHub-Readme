/**
 * Media utility functions with fallback mechanisms
 */
const fetch = require('node-fetch').default;
const { getSpotifyAlbumCover } = require('./spotify');
const { getYouTubeThumbnail } = require('./youtube');

// Simple in-memory cache for media URLs
const mediaCache = {
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
    set(key, value, ttlSeconds = 3600) { // Cache for 1 hour by default
        this.data[key] = {
            value,
            expiry: Date.now() + (ttlSeconds * 1000)
        };
    }
};

/**
 * Checks if a URL is accessible
 * @param {string} url - URL to check
 * @returns {Promise<boolean>} - Whether the URL is accessible
 */
async function isUrlAccessible(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Gets an album cover URL with fallbacks
 * @param {string} lastfmUrl - Last.fm album cover URL
 * @param {string} artist - Artist name
 * @param {string} track - Track name
 * @returns {Promise<string>} - Album cover URL
 */
async function getAlbumCoverWithFallback(lastfmUrl, artist, track) {
    // Generate a cache key based on the inputs
    const cacheKey = `album_cover_${artist}_${track}`;
    const cachedUrl = mediaCache.get(cacheKey);
    if (cachedUrl) return cachedUrl;

    try {
        // Try Last.fm URL first
        if (lastfmUrl && !lastfmUrl.startsWith('/')) {
            // Check if it's a Last.fm URL and convert it to our proxy URL
            if (lastfmUrl.includes('lastfm.freetls.fastly.net')) {
                // Extract the path from the URL
                const urlParts = lastfmUrl.split('lastfm.freetls.fastly.net/i/u/');
                if (urlParts.length > 1) {
                    const proxyUrl = `/api/lastfm-image/${urlParts[1]}?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`;
                    mediaCache.set(cacheKey, proxyUrl);
                    return proxyUrl;
                }
            }

            // If it's not a Last.fm URL or we couldn't extract the path, use the original URL
            if (await isUrlAccessible(lastfmUrl)) {
                mediaCache.set(cacheKey, lastfmUrl);
                return lastfmUrl;
            }
        }

        // Try Spotify as first fallback
        const spotifyUrl = await getSpotifyAlbumCover(artist, track);
        if (spotifyUrl) {
            mediaCache.set(cacheKey, spotifyUrl);
            return spotifyUrl;
        }

        // Try YouTube as second fallback
        const youtubeUrl = await getYouTubeThumbnail(artist, track);
        if (youtubeUrl) {
            mediaCache.set(cacheKey, youtubeUrl);
            return youtubeUrl;
        }

        // Return a default image if all fallbacks fail
        const defaultUrl = '/api/lastfm-image/300x300/2a96cbd8b46e442fc41c2b86b821562f.png';
        mediaCache.set(cacheKey, defaultUrl);
        return defaultUrl;
    } catch (error) {
        console.error('Error getting album cover with fallback:', error);
        return '/api/lastfm-image/300x300/2a96cbd8b46e442fc41c2b86b821562f.png';
    }
}

/**
 * Gets an avatar image URL with fallbacks
 * @param {string} lastfmUrl - Last.fm avatar URL
 * @param {string} username - Username
 * @returns {Promise<string>} - Avatar URL
 */
async function getAvatarWithFallback(lastfmUrl, username) {
    // Generate a cache key based on the inputs
    const cacheKey = `avatar_${username}`;
    const cachedUrl = mediaCache.get(cacheKey);
    if (cachedUrl) return cachedUrl;

    try {        // Try Last.fm URL first
        if (lastfmUrl && !lastfmUrl.startsWith('/')) {
            // Check if it's a Last.fm URL and convert it to our enhanced proxy URL
            if (lastfmUrl.includes('lastfm.freetls.fastly.net')) {
                // Extract the hash from the URL
                const urlParts = lastfmUrl.split('lastfm.freetls.fastly.net/i/u/');
                if (urlParts.length > 1) {
                    const pathPart = urlParts[1];
                    // Extract just the hash (remove any size prefix and file extension)
                    const hash = pathPart.replace(/^(avatar|avatar185s|300x300|174s|large)\//, '').replace(/\.(png|jpg|jpeg)$/i, '');
                    
                    // Use the enhanced avatar route that includes GitHub fallback
                    const proxyUrl = `/api/lastfm-image/avatar/${hash}/${username}`;
                    mediaCache.set(cacheKey, proxyUrl);
                    return proxyUrl;
                }
            }

            // If it's not a Last.fm URL, check if it's accessible
            if (await isUrlAccessible(lastfmUrl)) {
                mediaCache.set(cacheKey, lastfmUrl);
                return lastfmUrl;
            }
        }        // If Last.fm URL is not available or accessible, try GitHub directly
        const githubUrl = `https://github.com/${username}.png`;
        if (await isUrlAccessible(githubUrl)) {
            mediaCache.set(cacheKey, githubUrl);
            return githubUrl;
        }// Return a default avatar if all fallbacks fail - use a direct external URL to avoid recursion
        const defaultUrl = 'https://lastfm.freetls.fastly.net/i/u/avatar185s/2a96cbd8b46e442fc41c2b86b821562f.png';
        mediaCache.set(cacheKey, defaultUrl);
        return defaultUrl;
    } catch (error) {        console.error('Error getting avatar with fallback:', error);
        return 'https://lastfm.freetls.fastly.net/i/u/avatar185s/2a96cbd8b46e442fc41c2b86b821562f.png';
    }
}

module.exports = {
    getAlbumCoverWithFallback,
    getAvatarWithFallback,
    isUrlAccessible
};
