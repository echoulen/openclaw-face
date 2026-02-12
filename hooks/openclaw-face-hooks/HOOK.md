---
name: openclaw-face-hooks
description: "Push agent busy/idle status to Cloudflare R2 on command events"
metadata:
  {
    "openclaw":
      {
        "emoji": "📡",
        "events": ["command:new", "command:stop", "command:reset"],
        "requires": { "env": ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_ENDPOINT", "R2_BUCKET"] },
      },
  }
---

# R2 Status Hook

Pushes agent busy/idle status to Cloudflare R2 as `status.json` on command events. Designed for zero-port-exposure status visualization — a GitHub Pages dashboard polls R2 to display real-time agent state.

## What It Does

- On `/new` command → uploads `{ "busy": true, ... }` to R2
- On `/stop` or `/reset` command → uploads `{ "busy": false, ... }` to R2
- Upload failures are caught and logged — they never interrupt OpenClaw operation

## Status JSON Schema

```json
{
  "busy": true,
  "ts": 1704067200000,
  "sessionKey": "agent:main:main",
  "source": "telegram"
}
```

## Requirements

- Cloudflare R2 bucket with public-read access
- R2 API token with `PutObject` permission

## Configuration

Set environment variables:

| Variable | Description |
|----------|-------------|
| `R2_ACCESS_KEY_ID` | R2 API Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API Secret Access Key |
| `R2_ENDPOINT` | R2 endpoint URL (e.g., `https://[account-id].r2.cloudflarestorage.com`) |
| `R2_BUCKET` | Bucket name (e.g., `openclaw-status-alice`) |
