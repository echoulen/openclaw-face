# openclaw-face-hooks

OpenClaw hook that pushes agent busy/idle status to Cloudflare R2 on command events. Designed for zero-port-exposure status visualization.

## How It Works

```
┌─────────────┐  command:new   ┌──────────────┐  PUT status.json  ┌────────────────┐
│  OpenClaw    │──────────────▶│  This Hook   │─────────────────▶│  Cloudflare R2 │
│  (Agent)    │  command:stop  │  (handler.ts)│                  │  (Public)      │
└─────────────┘  command:reset └──────────────┘                  └────────────────┘
```

- `/new` command → uploads `{ "busy": true, ... }`
- `/stop` or `/reset` command → uploads `{ "busy": false, ... }`
- Errors are logged but never interrupt OpenClaw operation

## Installation

### Via npm (Hook Pack)

```bash
npm install openclaw-face-hooks
```

OpenClaw will automatically discover hooks via the `openclaw.hooks` field in `package.json`.

### Manual

Clone into your OpenClaw hooks directory:

```bash
cd ~/.openclaw/hooks
git clone <repo-url> openclaw-face-hooks
cd openclaw-face-hooks
pnpm install
```

## Configuration

### 1. Create a Cloudflare R2 Bucket

- **Public Access**: Enable (read-only)
- **CORS**: Allow GET from all origins

### 2. Set Environment Variables

Create a `.env` file in the hook directory or set them in your shell:

```env
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET=openclaw-status-your-username
```

| Variable | Description |
|----------|-------------|
| `R2_ACCESS_KEY_ID` | Cloudflare R2 API Access Key ID |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 API Secret Access Key |
| `R2_ENDPOINT` | R2 endpoint URL |
| `R2_BUCKET` | R2 bucket name |

### 3. Enable the Hook

```bash
openclaw hooks enable openclaw-face-hooks
```

### 4. Verify

```bash
openclaw hooks list
```

You should see `📡 openclaw-face-hooks ✓` in the output.

## Status JSON Schema

The hook uploads the following JSON to `status.json` in your R2 bucket:

```json
{
  "busy": true,
  "ts": 1704067200000,
  "sessionKey": "agent:main:main",
  "source": "telegram"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `busy` | `boolean` | `true` when agent is processing, `false` when idle |
| `ts` | `number` | Unix timestamp in milliseconds |
| `sessionKey` | `string?` | Session identifier |
| `source` | `string?` | Command source channel (e.g., `telegram`, `whatsapp`) |

## Events

This hook listens to the following [OpenClaw events](https://docs.openclaw.ai/automation/hooks#event-types):

| Event | Action |
|-------|--------|
| `command` (general) | Listens to all command events |
| `action: new` | Upload `busy: true` |
| Any other action | Upload `busy: false` |

## Testing

### Unit Tests

```bash
pnpm test:run
```

### Integration Test (requires R2 credentials)

```bash
pnpm test:push
```

This simulates command events and pushes status to your R2 bucket.

## Project Structure

```
openclaw-face-hooks/
├── HOOK.md          # Hook metadata (YAML frontmatter)
├── handler.ts       # HookHandler implementation
├── test-push.ts     # R2 integration test
├── package.json     # npm module with openclaw.hooks field
├── tsconfig.json    # TypeScript config (IDE/test only)
└── __tests__/       # Unit & property-based tests
```

## License

MIT
