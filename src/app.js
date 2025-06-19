/**
 * Main application file for the Last.fm GitHub README widget
 */
const express = require('express');
const routes = require('./routes');
require('dotenv').config();

// Create Express application
const app = express();

// Check for required environment variables
const requiredEnvVars = ['API_KEY', 'SHARED_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error(`Error: Missing required environment variables: ${missingEnvVars.join(', ')}`);
    console.error('Please create a .env file based on .env.example');
    process.exit(1);
}

// Register routes
app.use(routes);

// Add a simple home route
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Last.fm GitHub README Widget</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        line-height: 1.6;
                    }
                    code {
                        background-color: #f4f4f4;
                        padding: 2px 5px;
                        border-radius: 3px;
                    }
                    pre {
                        background-color: #f4f4f4;
                        padding: 10px;
                        border-radius: 5px;
                        overflow-x: auto;
                    }
                </style>
            </head>
            <body>
                <h1>Last.fm GitHub README Widget</h1>
                <p>This service provides a widget to display your Last.fm "now playing" information in your GitHub README.</p>

                <h2>Usage</h2>
                <p>Add the following to your GitHub README.md:</p>
                <pre>![My Last.fm](${process.env.homepage_url || 'https://your-deployment-url.com'}/api/widget/YOUR_LASTFM_USERNAME)</pre>

                <h3>Theming</h3>
                <p>You can customize the widget appearance with the <code>theme</code> query parameter:</p>
                <ul>
                    <li><code>?theme=auto</code> (default) - Uses colors extracted from the album art</li>
                    <li><code>?theme=dark</code> - Dark theme with white text</li>
                    <li><code>?theme=light</code> - Light theme with black text</li>
                </ul>
                <p>Example with theme:</p>
                <pre>![My Last.fm](${process.env.homepage_url || 'https://your-deployment-url.com'}/api/widget/YOUR_LASTFM_USERNAME?theme=dark)</pre>

                <h2>API Endpoints</h2>
                <ul>
                    <li><code>/api/widget/:username</code> - Get an SVG widget showing your currently playing track</li>
                    <li><code>/api/nowplaying/:username</code> - Get JSON data about your currently playing track</li>
                </ul>

                <h2>Example</h2>
                <p>Here's an example of the widget:</p>
                <img src="/api/widget/batuhantrkgl" alt="Example widget" />

                <p><a href="https://github.com/batuhantrkgl/LastFM-GitHub-Readme">View on GitHub</a></p>
            </body>
        </html>
    `);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).send('Internal Server Error');
});

module.exports = app;
