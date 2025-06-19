/**
 * YouTube API integration functions
 */
const fetch = require('node-fetch').default;

/**
 * Searches for a video on YouTube
 * @param {string} artist - Artist name
 * @param {string} track - Track name
 * @returns {Promise<Object|null>} - Video data or null if not found
 */
async function searchYouTubeVideo(artist, track) {
    try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        
        if (!apiKey) {
            console.error('Missing YouTube API key in environment variables');
            return null;
        }

        const query = encodeURIComponent(`${artist} - ${track} official`);
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=${apiKey}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            return null;
        }

        return data.items[0];
    } catch (error) {
        console.error('Error searching YouTube video:', error);
        return null;
    }
}

/**
 * Gets a thumbnail URL from YouTube for a track
 * @param {string} artist - Artist name
 * @param {string} track - Track name
 * @returns {Promise<string|null>} - Thumbnail URL or null if not found
 */
async function getYouTubeThumbnail(artist, track) {
    try {
        const videoData = await searchYouTubeVideo(artist, track);
        
        if (!videoData || !videoData.snippet || !videoData.snippet.thumbnails) {
            return null;
        }

        // Try to get the high quality thumbnail
        if (videoData.snippet.thumbnails.high) {
            return videoData.snippet.thumbnails.high.url;
        }
        
        // Fallback to default thumbnail
        if (videoData.snippet.thumbnails.default) {
            return videoData.snippet.thumbnails.default.url;
        }

        return null;
    } catch (error) {
        console.error('Error getting YouTube thumbnail:', error);
        return null;
    }
}

module.exports = {
    searchYouTubeVideo,
    getYouTubeThumbnail
};