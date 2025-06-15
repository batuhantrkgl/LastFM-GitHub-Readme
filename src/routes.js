/**
 * Express route handlers for the Last.fm GitHub README widget
 */
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch').default;
const { getLastFMUserInfo, getSessionKey, getNowPlaying } = require('./lastfm');
const { generateNowPlayingSVG, generateFallbackSVG } = require('./svg');

/**
 * Callback route for Last.fm authentication
 */
router.get('/lastfm-official-api/callback', async (req, res) => {
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
        console.error('Authentication error:', error);
        res.status(500).json({
            error: error.message,
            token: token
        });
    }
});

/**
 * API endpoint for getting now playing information
 */
router.get('/api/nowplaying/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const nowPlaying = await getNowPlaying(username);

        if (!nowPlaying) {
            return res.status(404).json({ error: 'Failed to fetch now playing data' });
        }

        res.json(nowPlaying);
    } catch (error) {
        console.error('Now playing error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * SVG widget endpoint for GitHub README
 */
router.get('/api/widget/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const nowPlaying = await getNowPlaying(username);

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-cache, max-age=0');
        // Add Cross-Origin headers to prevent cookies from being sent in cross-site requests
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

        if (!nowPlaying) {
            return res.send(generateFallbackSVG());
        }

        res.send(await generateNowPlayingSVG(nowPlaying));
    } catch (error) {
        console.error('Widget error:', error);
        res.send(generateFallbackSVG());
    }
});

/**
 * Proxy endpoint for GitHub avatars to avoid cross-site cookie issues
 */
router.get('/api/avatar/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const response = await fetch(`https://github.com/${username}.png`);

        if (!response.ok) {
            return res.status(404).send('Avatar not found');
        }

        // Forward the content type header
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // Set cache headers
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        // Add Cross-Origin headers
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        // Stream the response
        response.body.pipe(res);
    } catch (error) {
        console.error('Avatar proxy error:', error);
        res.status(500).send('Error fetching avatar');
    }
});

/**
 * Proxy endpoint for Last.fm images to avoid cross-origin resource policy issues
 */
router.get('/api/lastfm-image/:size/:hash', async (req, res) => {
    try {
        // Get the image URL from the path parameters
        const { size, hash } = req.params;
        const fullUrl = `https://lastfm.freetls.fastly.net/i/u/${size}/${hash}`;

        const response = await fetch(fullUrl);

        if (!response.ok) {
            return res.status(404).send('Image not found');
        }

        // Forward the content type header
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // Set cache headers
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        // Add Cross-Origin headers
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        // Stream the response
        response.body.pipe(res);
    } catch (error) {
        console.error('Last.fm image proxy error:', error);
        res.status(500).send('Error fetching image');
    }
});

/**
 * Proxy endpoint for Last.fm avatar images
 */
router.get('/api/lastfm-image/avatar/:hash', async (req, res) => {
    try {
        // Get the hash from the path parameter
        const { hash } = req.params;
        const fullUrl = `https://lastfm.freetls.fastly.net/i/u/avatar/${hash}`;

        const response = await fetch(fullUrl);

        if (!response.ok) {
            return res.status(404).send('Avatar image not found');
        }

        // Forward the content type header
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // Set cache headers
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        // Add Cross-Origin headers
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        // Stream the response
        response.body.pipe(res);
    } catch (error) {
        console.error('Last.fm avatar image proxy error:', error);
        res.status(500).send('Error fetching avatar image');
    }
});

/**
 * Fallback proxy endpoint for Last.fm images with any path format
 * This ensures backward compatibility with any existing URLs
 */
router.get('/api/lastfm-image/*path', async (req, res) => {
    try {
        // Get the image URL from the path
        const imagePath = req.params.path || req.path.substring('/api/lastfm-image/'.length);
        const decodedPath = decodeURIComponent(imagePath);
        const fullUrl = decodedPath.startsWith('http') ? decodedPath : `https://lastfm.freetls.fastly.net/i/u/${decodedPath}`;

        const response = await fetch(fullUrl);

        if (!response.ok) {
            return res.status(404).send('Image not found');
        }

        // Forward the content type header
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // Set cache headers
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        // Add Cross-Origin headers
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        // Stream the response
        response.body.pipe(res);
    } catch (error) {
        console.error('Last.fm fallback image proxy error:', error);
        res.status(500).send('Error fetching image');
    }
});

module.exports = router;
