# OpenClaw Face Cost Tracker

OpenClaw hook for tracking AI costs with delayed aggregation to avoid frequent calculations.

## Features

- **Delayed Calculation**: Waits 1 minute after the last message before calculating costs
- **Batch Processing**: Multiple messages within 1 minute are batched together
- **Session-based**: Calculates costs per session from OpenClaw JSONL files
- **R2 Storage**: Uploads cost data to Cloudflare R2 for easy access
- **Pre-calculated Costs**: Uses OpenClaw's own cost calculations when available
- **Fallback Calculation**: Calculates from token usage when pre-calculated costs aren't available

## Installation

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables (create `.env` file):
```env
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET=your-bucket-name
```

3. Test the hook:
```bash
pnpm test:push
```

## How It Works

1. **Message Received**: When a `message:received` event occurs, the hook schedules a cost calculation for 1 minute later
2. **Timer Reset**: If another message is received within that minute, the timer resets
3. **Cost Calculation**: After 1 minute of inactivity, the hook:
   - Reads JSONL session files from `~/.openclaw/agents/main/sessions/`
   - Parses usage data from the last hour
   - Calculates costs using model-specific pricing
   - Uploads results to R2 as `cost.json`

## Cost Data Format

The cost data uploaded to R2 follows this schema:

```json
{
  "timestamp": "2026-02-24T19:23:00.000Z",
  "sessionKey": "agent:main:main",
  "totalCost": 0.0159,
  "models": {
    "claude-sonnet-4-5": {
      "cost": 0.0159,
      "inputTokens": 100,
      "outputTokens": 500,
      "cacheReadTokens": 27000,
      "cacheWriteTokens": 0,
      "messageCount": 1
    }
  },
  "messageCount": 1,
  "lastMessageTime": "2026-02-24T19:22:45.000Z"
}
```

## Model Pricing

The hook uses pricing from `pricing.json` in the hook directory. 

To update pricing:

1. Edit `pricing.json` in the hook directory
2. Restart the hook to reload the pricing

The pricing file format:
```json
{
  "claude-sonnet-4-5-20251101": {
    "input": 3.00,
    "output": 15.00,
    "cacheWrite": 3.75,
    "cacheRead": 0.30
  },
  "claude-opus-4-5-20251101": {
    "input": 15.00,
    "output": 75.00,
    "cacheWrite": 18.75,
    "cacheRead": 1.50
  }
}
```

**Note**: If a model is not found in the pricing file, its cost will be calculated as $0.

## Integration with OpenClaw

This hook is designed to work with OpenClaw's hook system. Once installed, it will automatically:

1. Listen for message events
2. Schedule delayed cost calculations
3. Upload results to your R2 bucket

You can then build a dashboard (like the one in openclaw-face) to display the cost data from R2.

## Development

- **Test**: `pnpm test` - Run unit tests
- **Test Run**: `pnpm test:run` - Run tests once
- **Test Push**: `pnpm test:push` - Test R2 upload functionality

## License

MIT
