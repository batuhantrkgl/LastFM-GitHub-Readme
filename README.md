# Last.fm GitHub README Widget

Display your Last.fm "Now Playing" information directly in your GitHub README profile!

![Example Widget](https://lastfm-api.batuhantrkgl.tech/api/widget/batuhantrkgl)

## Features

- 🎵 Show your currently playing track in your GitHub README
- 🎨 Automatically extracts colors from album art for a beautiful, dynamic widget
- 🔄 Updates automatically when you play a new track
- 👤 Displays your profile picture with intelligent fallbacks
- ⏱️ Shows "Now playing" or time since last played
- 🌍 Multi-language support with proper Unicode character handling
- 🎨 Theme support (auto, dark, light)
- 🖼️ Smart image fallback system (Last.fm → Spotify → YouTube → Default)
- 🔒 GitHub Content Security Policy (CSP) compatible with base64 image encoding
- 📱 Responsive design that works across different platforms

## Usage

Add this line to your GitHub README.md:

```markdown
![My Last.fm](https://lastfm-api.batuhantrkgl.tech/api/widget/YOUR_LASTFM_USERNAME)
```

Replace `YOUR_LASTFM_USERNAME` with your Last.fm username.

### Theme Options

You can customize the widget appearance with theme parameters:

```markdown
<!-- Auto theme (default) - adapts colors from album art -->
![My Last.fm](https://lastfm-api.batuhantrkgl.tech/api/widget/YOUR_LASTFM_USERNAME)

<!-- Dark theme -->
![My Last.fm](https://lastfm-api.batuhantrkgl.tech/api/widget/YOUR_LASTFM_USERNAME?theme=dark)

<!-- Light theme -->
![My Last.fm](https://lastfm-api.batuhantrkgl.tech/api/widget/YOUR_LASTFM_USERNAME?theme=light)
```

## API Endpoints

- **Widget SVG**: `GET /api/widget/:username`
  - Returns an SVG image showing your currently playing track
  - Supports theme parameter: `?theme=auto|dark|light`
  - GitHub CSP compatible with base64 encoded images
  - Example: `https://lastfm-api.batuhantrkgl.tech/api/widget/batuhantrkgl?theme=dark`

- **Now Playing Data**: `GET /api/nowplaying/:username`
  - Returns JSON data about your currently playing track
  - Example: `https://lastfm-api.batuhantrkgl.tech/api/nowplaying/batuhantrkgl`

- **Album Cover Proxy**: `GET /api/lastfm-image/:size/:hash`
  - Smart fallback system for album covers
  - Tries Last.fm → Spotify → YouTube → Default
  - Supports artist and track parameters for better matching
  - Example: `https://lastfm-api.batuhantrkgl.tech/api/lastfm-image/300x300/hash?artist=Artist&track=Track`

- **Avatar Proxy**: `GET /api/avatar/:username`
  - GitHub avatar proxy with Last.fm fallback
  - Example: `https://lastfm-api.batuhantrkgl.tech/api/avatar/username`

## Self-Hosting

### Prerequisites

- Node.js 14 or higher (or Bun for faster development)
- Last.fm API key and shared secret
- Spotify API credentials (optional, for album cover fallbacks)
- YouTube API key (optional, for album cover fallbacks)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/batuhantrkgl/LastFM-GitHub-Readme.git
   cd LastFM-GitHub-Readme
   ```

2. Install dependencies:
   ```bash
   npm install
   # or if you prefer Bun
   bun install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your API credentials:
   ```env
   # Required
   API_KEY=your_lastfm_api_key
   SHARED_SECRET=your_lastfm_shared_secret
   callback_url=http://localhost:3000/lastfm-official-api/callback
   homepage_url=http://localhost:3000
   
   # Optional (for enhanced album cover fallbacks)
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   YOUTUBE_API_KEY=your_youtube_api_key
   ```

5. Start the server:
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   # or with Bun
   bun run dev
   ```

## Deploying to Vercel

You can easily deploy this application to [Vercel](https://vercel.com) for free:

1. Fork this repository to your GitHub account

2. Sign up for a Vercel account if you don't have one

3. Import your forked repository in Vercel:
   - Go to https://vercel.com/new
   - Select "Import Git Repository"
   - Choose your forked repository

4. Configure the project:
   - Add your environment variables (API_KEY, SHARED_SECRET, etc.) in the Vercel dashboard
   - Use the `.env.vercel.example` file as a reference for the required variables
   - Make sure to set `homepage_url` and `callback_url` to your Vercel deployment URL
   - Vercel will automatically detect the Node.js project and use the correct settings

5. Deploy the project:
   - Click "Deploy"
   - Vercel will build and deploy your application

6. Update your README widget URL:
   - Replace the URL with your new Vercel deployment URL
   - Example: `![My Last.fm](https://your-vercel-app.vercel.app/api/widget/YOUR_LASTFM_USERNAME)`

### Using Your Vercel Deployment

Once deployed, you can use your Last.fm widget in your GitHub README by using the following markdown:

```markdown
![My Last.fm](https://your-vercel-app.vercel.app/api/widget/YOUR_LASTFM_USERNAME)
```

Replace:
- `your-vercel-app.vercel.app` with your actual Vercel deployment URL
- `YOUR_LASTFM_USERNAME` with your Last.fm username

The widget will automatically update whenever you play music on Last.fm. GitHub caches images, so it may take some time for changes to appear in your README.

## Troubleshooting

### Common Issues

1. **Widget not updating**: GitHub caches images. Changes may take 5-10 minutes to appear.
2. **Profile picture not showing**: Ensure your GitHub profile is public or the Last.fm profile has a valid image.
3. **Album covers missing**: The fallback system tries multiple sources. Some obscure tracks may only show default covers.
4. **International characters**: The widget properly handles Unicode characters in artist/track names.

### Debug Endpoints

- **Service Status**: `GET /debug` - Check if the service is running
- **User Data**: `GET /api/nowplaying/:username` - View raw JSON data
- **Image Proxies**: Check individual image URLs in browser to debug fallback behavior

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_KEY` | Your Last.fm API key | ✅ Yes |
| `SHARED_SECRET` | Your Last.fm API shared secret | ✅ Yes |
| `callback_url` | Callback URL for Last.fm authentication | ✅ Yes |
| `homepage_url` | URL where your service is hosted | ✅ Yes |
| `SPOTIFY_CLIENT_ID` | Spotify API client ID (for album cover fallbacks) | ❌ Optional |
| `SPOTIFY_CLIENT_SECRET` | Spotify API client secret (for album cover fallbacks) | ❌ Optional |
| `YOUTUBE_API_KEY` | YouTube Data API key (for album cover fallbacks) | ❌ Optional |

### Getting API Keys

1. **Last.fm API**: Get your API key from [Last.fm API](https://www.last.fm/api/account/create)
2. **Spotify API**: Create an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
3. **YouTube API**: Enable YouTube Data API v3 in [Google Cloud Console](https://console.cloud.google.com/)

## Project Structure

```
├── src/
│   ├── app.js         # Express application setup
│   ├── lastfm.js      # Last.fm API integration
│   ├── media.js       # Media fallback utilities (album covers, avatars)
│   ├── routes.js      # API route handlers
│   ├── server.js      # Server entry point
│   ├── spotify.js     # Spotify API integration (album covers)
│   ├── svg.js         # SVG generation with GitHub CSP compatibility
│   ├── utils.js       # Utility functions
│   └── youtube.js     # YouTube API integration (album covers)
├── .env.example       # Example environment variables
├── .gitignore         # Git ignore file
├── package.json       # Project metadata and dependencies
├── vercel.json        # Vercel deployment configuration
└── README.md          # This file
```

## Technical Features

### Smart Image Fallback System
- **Album Covers**: Last.fm → Spotify → YouTube → Default placeholder
- **User Avatars**: Last.fm profile → GitHub avatar → Default placeholder
- **Unicode Support**: Properly handles international characters in artist/track names
- **Cache System**: In-memory caching to reduce API calls and improve performance

### GitHub Compatibility
- **CSP Compliance**: All images converted to base64 data URLs for GitHub README compatibility
- **Cross-Origin Headers**: Proper CORS configuration for embedding
- **Size Optimization**: Image size limits and compression for fast loading

### API Integration
- **Last.fm**: Primary data source with proper authentication
- **Spotify**: Enhanced album cover discovery with search capabilities
- **YouTube**: Fallback for music videos and additional cover art
- **GitHub**: Avatar fallback system for user profile pictures

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `bun install` or `npm install`
4. Set up your `.env` file with API keys
5. Start development server: `bun run dev` or `npm run dev`
6. Make your changes and test thoroughly
7. Submit a pull request

## Credits

Created by [batuhantrkgl](https://github.com/batuhantrkgl)

### Special Thanks
- Last.fm for providing the music data API
- Spotify for enhanced album cover discovery
- YouTube for additional media fallbacks
- The open-source community for various libraries used in this project
