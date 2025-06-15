/**
 * Utility functions for the Last.fm GitHub README widget
 */
const crypto = require('crypto');

/**
 * Generates a signature for Last.fm API authentication
 * @param {Object} params - Parameters to include in the signature
 * @returns {string} - MD5 hash signature
 */
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

/**
 * Checks if an image URL is valid by making a HEAD request
 * @param {string} url - The image URL to check
 * @returns {Promise<boolean>} - Whether the image URL is valid
 */
async function isImageValid(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Gets a GitHub avatar URL for a username
 * @param {string} username - GitHub username
 * @returns {string} - GitHub avatar URL
 */
function getGithubAvatar(username) {
    return `https://github.com/${username}.png`;
}

/**
 * Truncates a string if it exceeds a certain length
 * @param {string} str - String to truncate
 * @param {number} len - Maximum length
 * @returns {string} - Truncated string
 */
function truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '...' : str;
}

module.exports = {
    generateSignature,
    isImageValid,
    getGithubAvatar,
    truncate
};