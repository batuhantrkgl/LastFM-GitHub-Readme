/**
 * Utility functions for the Last.fm GitHub README widget
 */
const crypto = require('crypto');
const fetch = require('node-fetch');

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
    // Use a proxy approach to avoid cross-site cookie issues
    // Instead of directly linking to GitHub, create a local endpoint to fetch the avatar
    // This way, the browser makes a request to the same origin
    return `/api/avatar/${username}`;
}

/**
 * Escapes special characters for XML
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeXml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Truncates a string if it exceeds a certain length and escapes XML special characters
 * @param {string} str - String to truncate
 * @param {number} len - Maximum length
 * @returns {string} - Truncated and escaped string
 */
function truncate(str, len) {
    if (!str) return '';
    const truncated = str.length > len ? str.substring(0, len) + '...' : str;
    return escapeXml(truncated);
}

module.exports = {
    generateSignature,
    isImageValid,
    getGithubAvatar,
    escapeXml,
    truncate
};
