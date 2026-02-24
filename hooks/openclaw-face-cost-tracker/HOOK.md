---
name: openclaw-face-cost-tracker
description: "Track AI costs by calculating token usage with delayed aggregation on message events"
metadata:
  {
    "openclaw":
      {
        "emoji": "💰",
        "events": ["message"],
        "requires": { "env": ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_ENDPOINT", "R2_BUCKET"] },
      },
  }
---

# OpenClaw Face Cost Tracker

Tracks AI costs by analyzing OpenClaw session files and uploading cost data to Cloudflare R2.

## What It Does

- On `message:received` event → schedules cost calculation after 1 minute
- If another `message:received` occurs within 1 minute → resets the timer
- After 1 minute of inactivity → calculates cost from session files and uploads to R2
- Upload failures are caught and logged — they never interrupt OpenClaw operation

## Cost JSON Schema

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
      "cacheWriteTokens": 0
    }
  },
  "messageCount": 1
}
```

## Requirements

- Cloudflare R2 bucket with public-read access
- R2 API token with `PutObject` permission
- OpenClaw session files must exist

## Configuration

Set environment variables (same as R2 Status Hook):

| Variable | Description |
|----------|-------------|
| `R2_ACCESS_KEY_ID` | R2 API Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API Secret Access Key |
| `R2_ENDPOINT` | R2 endpoint URL |
| `R2_BUCKET` | Bucket name |

## Implementation Details

- Uses 1-minute delay to batch multiple messages
- Parses JSONL session files from `~/.openclaw/agents/main/sessions/`
- Calculates costs using OpenClaw's pre-calculated values when available
- Falls back to token-based calculation with per-model pricing
