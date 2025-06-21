/**
 * Express route handlers for the Last.fm GitHub README widget
 */
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch').default;
const { getLastFMUserInfo, getSessionKey, getNowPlaying } = require('./lastfm');
const { generateNowPlayingSVG, generateFallbackSVG } = require('./svg');
const { getAlbumCoverWithFallback, getAvatarWithFallback } = require('./media');

/**
 * Proxy endpoint for Last.fm avatar images with fallback to other sources
 */
router.get('/api/lastfm-image/avatar/:hash', async (req, res) => {
    try {
        // Get the hash from the path parameter
        const { hash } = req.params;
        const lastfmUrl = `https://lastfm.freetls.fastly.net/i/u/avatar/${hash}`;

        // Try the original Last.fm URL first
        let response = await fetch(lastfmUrl);
        
        if (!response.ok) {
            // Fallback to the default avatar
            const fallbackUrl = 'https://lastfm.freetls.fastly.net/i/u/avatar185s/2a96cbd8b46e442fc41c2b86b821562f.png';
            response = await fetch(fallbackUrl);
        }

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
        const { theme = 'auto' } = req.query; // Extract theme from query parameters
        const nowPlaying = await getNowPlaying(username);

        // Validate theme parameter
        const validThemes = ['auto', 'dark', 'light'];
        const validatedTheme = validThemes.includes(theme) ? theme : 'auto';

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-cache, max-age=0');
        // Add Cross-Origin headers to prevent cookies from being sent in cross-site requests
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

        if (!nowPlaying) {
            return res.send(generateFallbackSVG(validatedTheme));
        }

        res.send(await generateNowPlayingSVG(nowPlaying, validatedTheme, username));
    } catch (error) {
        console.error('Widget error:', error);
        res.send(generateFallbackSVG('auto'));
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
 * with fallback to Spotify and YouTube
 */
router.get('/api/lastfm-image/:size/:hash', async (req, res) => {
    try {
        // Get the image URL from the path parameters
        const { size, hash } = req.params;
        const lastfmUrl = `https://lastfm.freetls.fastly.net/i/u/${size}/${hash}`;        // Check if this is an album cover request (typically 300x300)
        if (size === '300x300') {
            // Use the imported getAlbumCoverWithFallback function

            // Get track info from query parameters if available
            const { artist, track } = req.query;

            if (artist && track) {
                console.log(`Album cover request for: ${artist} - ${track}`);
                // Try to get the album cover with fallback
                const imageUrl = await getAlbumCoverWithFallback(lastfmUrl, artist, track);
                console.log(`getAlbumCoverWithFallback returned: ${imageUrl}`);

                // Redirect to the image URL
                if (imageUrl.startsWith('http')) {
                    // For external URLs, fetch and proxy the image
                    const response = await fetch(imageUrl);

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
                    return;
                }
            }
        }

        // If not an album cover or no artist/track info, proceed with normal Last.fm request
        const response = await fetch(lastfmUrl);

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
    } catch (error) {        console.error('Last.fm image proxy error:', error);
        res.status(500).send('Error fetching image');
    }
});

/**
 * Favicon endpoint to prevent 404 errors
 */
router.get('/favicon.ico', (req, res) => {
    res.status(204).send(); // No content
});

/**
 * Proxy endpoint for Last.fm avatar images with GitHub fallback
 */
router.get('/api/lastfm-image/avatar/:hash/:username', async (req, res) => {
    try {
        const { hash, username } = req.params;
        
        // Try Last.fm avatar first with different size formats
        const lastfmUrls = [
            `https://lastfm.freetls.fastly.net/i/u/avatar/${hash}`,
            `https://lastfm.freetls.fastly.net/i/u/avatar/${hash}.png`,
            `https://lastfm.freetls.fastly.net/i/u/avatar185s/${hash}`,
            `https://lastfm.freetls.fastly.net/i/u/avatar185s/${hash}.png`
        ];

        for (const lastfmUrl of lastfmUrls) {
            try {
                const response = await fetch(lastfmUrl);
                if (response.ok) {
                    // Check if this is Last.fm's default/placeholder avatar
                    const contentLength = response.headers.get('content-length');
                    
                    // Last.fm's default avatar is usually very small (around 500-1000 bytes)
                    // If the image is reasonably sized, it's likely a real profile picture
                    if (!contentLength || parseInt(contentLength) > 1500) {
                        const contentType = response.headers.get('content-type');
                        if (contentType) {
                            res.setHeader('Content-Type', contentType);
                        }

                        res.setHeader('Cache-Control', 'public, max-age=86400');
                        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

                        return response.body.pipe(res);
                    }
                }
            } catch (err) {
                console.log(`Last.fm URL failed: ${lastfmUrl}`, err.message);
            }
        }

        // If Last.fm fails or returns a default avatar, try GitHub avatar
        if (username) {
            try {
                const githubUrl = `https://github.com/${username}.png`;
                const githubResponse = await fetch(githubUrl);
                
                if (githubResponse.ok) {
                    const contentType = githubResponse.headers.get('content-type');
                    if (contentType) {
                        res.setHeader('Content-Type', contentType);
                    }

                    res.setHeader('Cache-Control', 'public, max-age=86400');
                    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

                    return githubResponse.body.pipe(res);
                }
            } catch (err) {
                console.log(`GitHub URL failed for user: ${username}`, err.message);
            }
        }

        // Final fallback to default Last.fm avatar
        const fallbackUrl = 'https://lastfm.freetls.fastly.net/i/u/avatar185s/2a96cbd8b46e442fc41c2b86b821562f.png';
        const fallbackResponse = await fetch(fallbackUrl);
        
        if (!fallbackResponse.ok) {
            return res.status(404).send('Avatar image not found');
        }

        const contentType = fallbackResponse.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        fallbackResponse.body.pipe(res);

    } catch (error) {
        console.error('Avatar proxy error:', error);
        res.status(500).send('Error fetching avatar image');
    }
});

/**
 * Fallback proxy endpoint for Last.fm images with any path format
 * This ensures backward compatibility with any existing URLs
 * and provides fallbacks to Spotify and YouTube
 */
router.get('/api/lastfm-image/*path', async (req, res) => {
    try {
        // Get the image URL from the path
        const imagePath = req.params.path || req.path.substring('/api/lastfm-image/'.length);
        const decodedPath = decodeURIComponent(imagePath);
        const lastfmUrl = decodedPath.startsWith('http') ? decodedPath : `https://lastfm.freetls.fastly.net/i/u/${decodedPath}`;

        // Check if this might be an album cover request
        const isAlbumCover = imagePath.includes('300x300') || imagePath.includes('174s') || imagePath.includes('large');

        if (isAlbumCover) {
            // Use the imported getAlbumCoverWithFallback function

            // Get track info from query parameters if available
            const { artist, track } = req.query;

            if (artist && track) {
                // Try to get the album cover with fallback
                const imageUrl = await getAlbumCoverWithFallback(lastfmUrl, artist, track);

                // Handle the image URL
                if (imageUrl.startsWith('http')) {
                    // For external URLs, fetch and proxy the image
                    const response = await fetch(imageUrl);

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
                    return;
                }
            }
        }

        // Check if this might be an avatar request
        const isAvatar = imagePath.includes('avatar');

        if (isAvatar) {
            // Use the imported getAvatarWithFallback function

            // Extract username from path or query
            const username = req.query.username || imagePath.split('/').pop();

            if (username) {
                // Try to get the avatar with fallback
                const imageUrl = await getAvatarWithFallback(lastfmUrl, username);

                // Handle the image URL
                if (imageUrl.startsWith('http')) {
                    // For external URLs, fetch and proxy the image
                    const response = await fetch(imageUrl);

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
                    return;
                }
            }
        }

        // If no fallbacks were used, proceed with normal Last.fm request
        const response = await fetch(lastfmUrl);

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

/**
 * Debug route to test if routes are working
 */
router.get('/debug', (req, res) => {
    res.json({ message: 'Routes are working', timestamp: new Date().toISOString() });
});

module.exports = router;
