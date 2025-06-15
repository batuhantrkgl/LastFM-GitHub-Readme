/**
 * Express route handlers for the Last.fm GitHub README widget
 */
const express = require('express');
const router = express.Router();
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
        
        if (!nowPlaying) {
            return res.send(generateFallbackSVG());
        }
        
        res.send(await generateNowPlayingSVG(nowPlaying));
    } catch (error) {
        console.error('Widget error:', error);
        res.send(generateFallbackSVG());
    }
});

module.exports = router;