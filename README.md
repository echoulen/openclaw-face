# OpenClaw Face

A zero-port-exposure agent status visualization system using p5.js heartbeat animation. OpenClaw pushes status to Cloudflare R2, and GitHub Pages polls R2 to display the real-time status.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   OpenClaw      │────▶│  Cloudflare R2  │────▶│  GitHub Pages   │
│   (localhost)   │ PUT │  (status.json)  │ GET │  Face           │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Prerequisites

- Node.js 18+
- pnpm
- Cloudflare R2 account
- GitHub repository with GitHub Pages enabled

## Installation

### 1. Clone and Install Dependencies

```bash
# Install hook dependencies
cd hooks/openclaw-face-status-hooks
pnpm install

# Install face dependencies
cd ../../face
pnpm install
```

### 2. Configure R2 Bucket

Create a bucket in Cloudflare R2 with the following settings:

- **Bucket Name**: `openclaw-status-[your-username]`
- **Public Access**: Enable (read-only)
- **CORS Policy**: Allow GET from all origins

#### CORS Configuration (r2-config.json)

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

Apply CORS via Cloudflare Dashboard or R2 API.

### 3. Set Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your R2 credentials:

```env
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET=openclaw-status-your-username
```

### 4. Enable the Hook

```bash
openclaw hooks enable r2-status
```

### 5. Deploy the Face Dashboard

```bash
cd face
./deploy.sh
```

This will:
1. Build the React application
2. Deploy to `gh-pages` branch
3. GitHub Pages will automatically publish

## Configuration

### R2 Bucket Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/?to=/:account/r2/overview)
2. Create a new R2 bucket named `openclaw-status-[username]`
3. Create an R2 API token with these permissions:
   - Object Read & Write
   - Apply to specific bucket only
4. Note your endpoint URL: `https://[account-id].r2.cloudflarestorage.com`

### CORS Configuration

The R2 bucket must allow GET requests from any origin for the dashboard to work:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### GitHub Pages Setup

1. Go to your repository Settings > Pages
2. Source: "Deploy from a branch"
3. Branch: `gh-pages` / (root)
4. Click Save

## Testing

### Run Tests

```bash
cd hooks/openclaw-face-status-hooks
pnpm test:run
```

### Manual R2 Verification

Check if the status.json is accessible:

```bash
curl https://[account-id].r2.cloudflarestorage.com/openclaw-status-[user]/status.json
```

Expected response:

```json
{
  "busy": true,
  "ts": 1704067200000,
  "sessionKey": "agent:main:main",
  "source": "telegram"
}
```

## Usage

### Start OpenClaw

```bash
openclaw start
```

The hook will automatically:
1. Push `busy: true` on `/new` command
2. Push `busy: false` on `/stop` or `/reset` command

### View Dashboard

Open your GitHub Pages URL:
```
https://[owner].github.io/[repo]/
```

You should see:
- **Green sine wave**: Agent is idle
- **Red pulsing animation**: Agent is busy
- **Gray wave**: Connection lost

## Troubleshooting

### Hook Not Pushing

1. Check environment variables are set:
   ```bash
   echo $R2_ACCESS_KEY_ID
   echo $R2_SECRET_ACCESS_KEY
   echo $R2_ENDPOINT
   echo $R2_BUCKET
   ```

2. Verify R2 credentials have write permission

3. Check OpenClaw logs for hook errors

### Dashboard Not Updating

1. Verify R2 bucket is publicly readable
2. Check browser console for CORS errors
3. Verify the status.json URL is correct in `face/src/config.ts`

### CORS Errors

Ensure your R2 bucket has the correct CORS policy applied. You can verify with:

```bash
curl -I https://[bucket].r2.cloudflarestorage.com/status.json
```

Should return `Access-Control-Allow-Origin: *` header.

## File Structure

```
openclaw-face/
├── README.md                 # This file
├── .env.example              # Environment variables template
├── face/                     # React + p5.js dashboard
│   ├── src/
│   │   ├── App.tsx          # Main application
│   │   ├── config.ts        # Configuration
│   │   ├── types.ts         # TypeScript types
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   └── sketches/        # p5.js sketches
│   ├── deploy.sh            # Deployment script
│   └── package.json
├── hooks/
│   └── r2-status/           # OpenClaw hook
│       ├── HOOK.md          # Hook metadata (YAML frontmatter)
│       ├── handler.ts       # HookHandler implementation
│       ├── test-push.ts     # Integration test script
│       └── __tests__/       # Unit & property tests
└── r2-config.json           # R2 CORS configuration example
```

## Security

- **Zero Port Exposure**: OpenClaw only runs on localhost
- **Read-Only Dashboard**: GitHub Pages cannot write to R2
- **No Credentials in Frontend**: Dashboard uses public R2 URL only
- **Minimal Permissions**: Hook only needs PutObject on status.json

## License

MIT