# Last.fm GitHub README Widget

Display your Last.fm "Now Playing" information directly in your GitHub README profile!

![Example Widget](https://lastfm-api.batuhantrkgl.tech/api/widget/batuhantrkgl)

## Features

- 🎵 Show your currently playing track in your GitHub README
- 🎨 Automatically extracts colors from album art for a beautiful, dynamic widget
- 🔄 Updates automatically when you play a new track
- 👤 Displays your profile picture
- ⏱️ Shows "Now playing" or time since last played

## Usage

Add this line to your GitHub README.md:

```markdown
![My Last.fm](https://lastfm-api.batuhantrkgl.tech/api/widget/YOUR_LASTFM_USERNAME)
```

Replace `YOUR_LASTFM_USERNAME` with your Last.fm username.

## API Endpoints

- **Widget SVG**: `GET /api/widget/:username`
  - Returns an SVG image showing your currently playing track
  - Example: `https://lastfm-api.batuhantrkgl.tech/api/widget/batuhantrkgl`

- **Now Playing Data**: `GET /api/nowplaying/:username`
  - Returns JSON data about your currently playing track
  - Example: `https://lastfm-api.batuhantrkgl.tech/api/nowplaying/batuhantrkgl`

## Self-Hosting

### Prerequisites

- Node.js 14 or higher
- Last.fm API key and shared secret

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/batuhantrkgl/LastFM-GitHub-Readme.git
   cd LastFM-GitHub-Readme
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your Last.fm API credentials and other settings.

5. Start the server:
   ```bash
   npm start
   ```

For development with auto-reload:
```bash
npm run dev
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

## Environment Variables

| Variable | Description |
|----------|-------------|
| `API_KEY` | Your Last.fm API key |
| `SHARED_SECRET` | Your Last.fm API shared secret |
| `callback_url` | Callback URL for Last.fm authentication |
| `homepage_url` | URL where your service is hosted |

## Project Structure

```
├── src/
│   ├── app.js         # Express application setup
│   ├── lastfm.js      # Last.fm API integration
│   ├── routes.js      # API route handlers
│   ├── server.js      # Server entry point
│   ├── svg.js         # SVG generation
│   └── utils.js       # Utility functions
├── .env.example       # Example environment variables
├── .env.vercel.example # Example environment variables for Vercel
├── .gitignore         # Git ignore file
├── index.js           # Main entry point
├── package.json       # Project metadata and dependencies
├── README.md          # This file
└── vercel.json        # Vercel deployment configuration
```

## License

MIT

## Credits

Created by [batuhantrkgl](https://github.com/batuhantrkgl)
