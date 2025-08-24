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
 * Gets album cover from Last.fm track.getInfo API
 * @param {string} artist - Artist name
 * @param {string} track - Track name
 * @returns {Promise<string|null>} - Album cover URL or null if not found
 */
async function getLastFMAlbumCover(artist, track) {
    try {
        if (!process.env.API_KEY) {
            console.error('API_KEY environment variable not set for Last.fm');
            return null;
        }

        const response = await fetch(
            `https://ws.audioscrobbler.com/2.0/?method=track.getinfo&api_key=${process.env.API_KEY}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`,
            { timeout: 10000 } // 10 second timeout
        );

        if (!response.ok) {
            console.error(`Last.fm API error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        if (!data.track || !data.track.album || !data.track.album.image) {
            console.log('No album info found in Last.fm API response');
            return null;
        }

        // Get the largest available image
        const images = data.track.album.image;
        if (Array.isArray(images)) {
            const largeImage = images.find(img => img.size === 'extralarge') ||
                             images.find(img => img.size === 'large') ||
                             images.find(img => img.size === 'medium');

            if (largeImage && largeImage['#text'] && !largeImage['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f')) {
                return largeImage['#text'];
            }
        }

        return null;
    } catch (error) {
        console.error('Error getting Last.fm album cover:', error);
        return null;
    }
}

/**
 * Checks if a URL is accessible
 * @param {string} url - URL to check
 * @returns {Promise<boolean>} - Whether the URL is accessible
 */
async function isUrlAccessible(url) {
    try {
        const response = await fetch(url, { 
            method: 'HEAD',
            timeout: 5000 // 5 second timeout
        });
        return response.ok;
    } catch (error) {
        console.log(`URL not accessible: ${url} - ${error.message}`);
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
    if (cachedUrl) {
        console.log(`Cache hit for ${artist} - ${track}: ${cachedUrl}`);
        return cachedUrl;
    }

    console.log(`Searching album cover for: ${artist} - ${track}`);

    try {
        // Try Last.fm API first if we don't have a good URL
        if (!lastfmUrl || lastfmUrl.startsWith('/') ||
            lastfmUrl.includes('2a96cbd8b46e442fc41c2b86b821562f') ||
            lastfmUrl.includes('818148bf1c8f4d4bcb96427dfa5c42b7')) {
            console.log(`Getting Last.fm album cover via API for: ${artist} - ${track}`);
            const lastfmApiUrl = await getLastFMAlbumCover(artist, track);
            if (lastfmApiUrl) {
                console.log(`Last.fm API success: ${lastfmApiUrl}`);
                mediaCache.set(cacheKey, lastfmApiUrl);
                return lastfmApiUrl;
            }
        }

        // Try Last.fm URL first
        if (lastfmUrl && !lastfmUrl.startsWith('/')) {
            console.log(`Checking Last.fm URL: ${lastfmUrl}`);

            // Check if this is a known default/placeholder image hash
            const isDefaultHash = lastfmUrl.includes('2a96cbd8b46e442fc41c2b86b821562f') ||
                                  lastfmUrl.includes('818148bf1c8f4d4bcb96427dfa5c42b7');

            if (!isDefaultHash && await isUrlAccessible(lastfmUrl)) {
                // For Last.fm URLs, we should check if it's not a default image
                // Default/placeholder images are usually very small
                try {
                    const response = await fetch(lastfmUrl, { 
                        method: 'HEAD',
                        timeout: 5000
                    });
                    const contentLength = response.headers.get('content-length');
                    if (contentLength && parseInt(contentLength) > 5000) {
                        console.log(`Last.fm URL is valid with size: ${contentLength}`);
                        mediaCache.set(cacheKey, lastfmUrl);
                        return lastfmUrl;
                    } else {
                        console.log(`Last.fm URL too small (${contentLength}), likely placeholder`);
                    }
                } catch (err) {
                    console.log(`Error checking Last.fm URL: ${err.message}`);
                }
            } else {
                console.log(`Last.fm URL is default hash or not accessible`);
            }
        }

        // Try Spotify as first fallback
        console.log(`Last.fm failed, trying Spotify for: ${artist} - ${track}`);
        const spotifyUrl = await getSpotifyAlbumCover(artist, track);
        if (spotifyUrl) {
            console.log(`Spotify success: ${spotifyUrl}`);
            mediaCache.set(cacheKey, spotifyUrl);
            return spotifyUrl;
        }

        // Try YouTube as second fallback
        console.log(`Spotify failed, trying YouTube for: ${artist} - ${track}`);
        const youtubeUrl = await getYouTubeThumbnail(artist, track);
        if (youtubeUrl) {
            console.log(`YouTube success: ${youtubeUrl}`);
            mediaCache.set(cacheKey, youtubeUrl);
            return youtubeUrl;
        }

        // Return a direct external default image URL if all fallbacks fail
        // This avoids the localhost issue in svg.js
        console.log(`All fallbacks failed for: ${artist} - ${track}, using default image`);
        const defaultUrl = 'https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png';
        mediaCache.set(cacheKey, defaultUrl, 300); // Cache for only 5 minutes for fallbacks
        return defaultUrl;
    } catch (error) {
        console.error('Error getting album cover with fallback:', error);
        // Return direct external URL instead of relative path
        return 'https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png';
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

    try {
        // Try Last.fm URL first
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
        }

        // If Last.fm URL is not available or accessible, try GitHub directly
        const githubUrl = `https://github.com/${username}.png`;
        if (await isUrlAccessible(githubUrl)) {
            mediaCache.set(cacheKey, githubUrl);
            return githubUrl;
        }

        // Return a default avatar if all fallbacks fail - use a direct external URL to avoid recursion
        const defaultUrl = 'https://lastfm.freetls.fastly.net/i/u/avatar185s/2a96cbd8b46e442fc41c2b86b821562f.png';
        mediaCache.set(cacheKey, defaultUrl);
        return defaultUrl;
    } catch (error) {
        console.error('Error getting avatar with fallback:', error);
        return 'https://lastfm.freetls.fastly.net/i/u/avatar185s/2a96cbd8b46e442fc41c2b86b821562f.png';
    }
}

module.exports = {
    getAlbumCoverWithFallback,
    getAvatarWithFallback,
    isUrlAccessible,
    getLastFMAlbumCover
};
