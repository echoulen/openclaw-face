# Design Document

## Overview

OpenClaw Face 採用推送-輪詢架構，實現零 port 暴露的安全狀態監控系統。系統由三個主要元件組成：

1. **OpenClaw Hook (r2-status)**: 監聽代理事件並推送狀態至 R2
2. **Cloudflare R2**: 作為狀態資料的中間儲存層
3. **GitHub Pages Face**: 輪詢 R2 並使用 p5.js 視覺化呈現

此設計確保 OpenClaw 不需要開放任何對外端口，所有通訊都是單向推送或公開讀取。

## Architecture

### System Architecture

```
┌─────────────────┐
│   OpenClaw      │
│   (localhost)   │
└────────┬────────┘
         │ Hook Event
         │ (model_call/complete)
         ▼
┌─────────────────┐
│  r2-status Hook │
│  (TypeScript)   │
└────────┬────────┘
         │ PUT status.json
         │ (@aws-sdk/client-s3)
         ▼
┌─────────────────┐
│ Cloudflare R2   │
│ (Object Storage)│
│  status.json    │
└────────┬────────┘
         │ GET (polling 5s)
         │ (public-read)
         ▼
┌─────────────────┐
│ GitHub Pages    │
│  Face           │
│  (React+p5.js)  │
└─────────────────┘
```

### Data Flow

1. **Event Trigger**: OpenClaw 觸發 `agent:model_call` 或 `agent:complete` 事件
2. **Hook Processing**: r2-status hook 接收事件，建立 Status_JSON
3. **R2 Upload**: Hook 使用 S3 SDK 上傳 JSON 至 R2
4. **Polling**: Face 每 5 秒發送 GET 請求至 R2 public URL
5. **Visualization**: Face 解析 JSON 並更新 p5.js 動畫

### Security Model

- **Zero Port Exposure**: OpenClaw 不開放任何監聽端口
- **One-way Push**: Hook 僅推送，不接收外部請求
- **Public Read Only**: R2 bucket 僅允許 GET 操作
- **No Credentials in Frontend**: Face 不包含任何 API key

## Components and Interfaces

### 1. r2-status Hook

**Location**: `hooks/r2-status/`

**Responsibilities**:
- 監聽 OpenClaw 事件
- 建立狀態 JSON 物件
- 上傳至 R2

**Interface**:

```typescript
// hooks/r2-status/index.ts

interface HookConfig {
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2Endpoint: string;
  r2Bucket: string;
}

interface StatusPayload {
  busy: boolean;
  model: string;
  ts: number;
  taskId?: string;
}

class R2StatusHook {
  constructor(config: HookConfig);
  
  // 處理 model_call 事件
  onModelCall(event: ModelCallEvent): Promise<void>;
  
  // 處理 complete 事件
  onComplete(event: CompleteEvent): Promise<void>;
  
  // 上傳狀態至 R2
  private uploadStatus(payload: StatusPayload): Promise<void>;
}
```

**Dependencies**:
- `@aws-sdk/client-s3`: S3Client, PutObjectCommand
- OpenClaw Hook API

**Configuration**:
```typescript
// hooks/r2-status/config.ts
export interface R2Config {
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ENDPOINT: string;  // e.g., https://[account-id].r2.cloudflarestorage.com
  R2_BUCKET: string;    // e.g., openclaw-status-[user]
}
```

### 2. Cloudflare R2 Bucket

**Configuration**:

```json
{
  "bucket": "openclaw-status-[user]",
  "cors": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ],
  "publicAccess": "read-only"
}
```

**Object Structure**:
- Key: `status.json`
- Content-Type: `application/json`
- Size: < 1KB

### 3. Face Frontend

**Location**: `face/`

**Tech Stack**:
- React 18
- TypeScript
- p5.js (via react-p5)
- Material-UI (MUI)
- Vite

**Components**:

```typescript
// face/src/types.ts
export interface AgentStatus {
  busy: boolean;
  model: string;
  ts: number;
  taskId?: string;
}

export interface ConnectionState {
  connected: boolean;
  lastSuccessTime: number;
  failureCount: number;
}

// face/src/components/StatusFetcher.tsx
export class StatusFetcher {
  private r2Url: string;
  private pollInterval: number = 5000;
  
  constructor(r2Url: string);
  
  // 開始輪詢
  startPolling(callback: (status: AgentStatus) => void): void;
  
  // 停止輪詢
  stopPolling(): void;
  
  // 單次獲取
  fetchStatus(): Promise<AgentStatus>;
}

// face/src/components/HeartbeatCanvas.tsx
export interface HeartbeatCanvasProps {
  status: AgentStatus | null;
  connectionState: ConnectionState;
}

export const HeartbeatCanvas: React.FC<HeartbeatCanvasProps>;
```

**p5.js Sketch**:

```typescript
// face/src/sketches/heartbeat.ts
export interface HeartbeatSketch {
  // p5.js setup
  setup(p5: P5, canvasParentRef: Element): void;
  
  // p5.js draw loop
  draw(p5: P5): void;
  
  // 更新狀態
  updateStatus(status: AgentStatus): void;
  
  // 更新連線狀態
  updateConnection(connected: boolean): void;
}
```

**Animation States**:

1. **Idle (Green Sine Wave)**:
   - Color: `rgb(76, 175, 80)` (Material Green 500)
   - Wave: `y = amplitude * sin(frequency * x + phase)`
   - Amplitude: 30px
   - Frequency: 0.02
   - Speed: phase += 0.05

2. **Busy (Red Pulsing)**:
   - Color: `rgb(244, 67, 54)` (Material Red 500)
   - Effect: Scale pulsing + glow
   - Scale: `1.0 + 0.3 * sin(time * 3)`
   - Glow: Shadow blur 20px

3. **Disconnected (Gray Wave)**:
   - Color: `rgb(158, 158, 158)` (Material Gray 500)
   - Wave: Same as idle but gray
   - Opacity: 0.5

**Transition**:
- Duration: 1 second
- Easing: `easeInOutCubic`
- Interpolate color and amplitude

## Data Models

### StatusPayload

```typescript
interface StatusPayload {
  // 代理是否忙碌
  busy: boolean;
  
  // 當前使用的模型名稱
  model: string;
  
  // Unix timestamp (毫秒)
  ts: number;
  
  // 可選的任務 ID
  taskId?: string;
}
```

**Validation Rules**:
- `busy`: 必須為 boolean
- `model`: 非空字串，長度 1-100
- `ts`: 正整數，合理的時間範圍（當前時間 ± 1 小時）
- `taskId`: 可選，若存在則為非空字串

**Example**:
```json
{
  "busy": true,
  "model": "claude-3-5-sonnet",
  "ts": 1704067200000,
  "taskId": "task-abc-123"
}
```

### ConnectionState

```typescript
interface ConnectionState {
  // 是否連線正常
  connected: boolean;
  
  // 最後成功時間 (Unix timestamp)
  lastSuccessTime: number;
  
  // 連續失敗次數
  failureCount: number;
}
```

**State Transitions**:
- `connected: true` → `connected: false`: 當 `failureCount >= 3`
- `connected: false` → `connected: true`: 當請求成功
- `failureCount`: 成功時重置為 0，失敗時 +1

## Correctness Properties

*屬性（Property）是一個特徵或行為，應該在系統的所有有效執行中保持為真。屬性作為人類可讀規範與機器可驗證正確性保證之間的橋樑。*


### Property 1: 事件類型正確映射到忙碌狀態

*對於任何* model_call 事件，處理後產生的 Status_JSON 的 `busy` 欄位應為 `true`；*對於任何* complete 事件，`busy` 欄位應為 `false`

**Validates: Requirements 1.1, 1.2**

### Property 2: Status JSON 包含所有必要欄位

*對於任何* 代理事件，產生的 Status_JSON 應包含 `busy`（boolean）、`model`（非空字串）、`ts`（合理的時間戳）欄位

**Validates: Requirements 1.3, 1.4**

### Property 3: 條件性 taskId 欄位

*對於任何* 包含 taskId 的事件，產生的 Status_JSON 應包含相同的 taskId；*對於任何* 不包含 taskId 的事件，產生的 Status_JSON 不應包含 taskId 欄位或其值為 undefined

**Validates: Requirements 1.5**

### Property 4: R2 上傳目標正確性

*對於任何* 狀態更新，Hook 應調用 R2 PutObject 且 key 參數為 "status.json"，bucket 參數為配置的 bucket 名稱

**Validates: Requirements 1.6, 8.2**

### Property 5: Status JSON 序列化與解析 Round-trip

*對於任何* 有效的 StatusPayload 物件，序列化為 JSON 字串後再解析，應產生等價的物件（所有欄位值相同）

**Validates: Requirements 3.2**

### Property 6: 輪詢失敗後自動恢復

*對於任何* 輪詢失敗序列，當後續請求成功時，Face 應重置失敗計數為 0 並繼續正常輪詢

**Validates: Requirements 3.5, 7.5**

### Property 7: UI 顯示狀態資訊完整性

*對於任何* 有效的 AgentStatus，Face 的 DOM 應包含 model 名稱和格式化的時間戳文字

**Validates: Requirements 4.5, 4.6**

### Property 8: 上傳失敗不中斷運行

*對於任何* R2 上傳失敗情況，Hook 應捕獲錯誤、記錄日誌，且不拋出未處理的異常

**Validates: Requirements 7.1, 7.2**

### Property 9: JSON 大小限制

*對於任何* StatusPayload，序列化後的 JSON 字串長度應小於 1024 bytes

**Validates: Requirements 8.4**

### Property 10: 連線狀態轉換正確性

*對於任何* ConnectionState，當 failureCount >= 3 時 connected 應為 false；當請求成功時 connected 應為 true 且 failureCount 應重置為 0

**Validates: Requirements 3.4, 7.4**

## Error Handling

### Hook Error Handling

**R2 Upload Failures**:
```typescript
try {
  await this.uploadStatus(payload);
} catch (error) {
  console.error('[r2-status] Failed to upload status:', error);
  // 不拋出異常，確保 OpenClaw 繼續運行
}
```

**Configuration Errors**:
- 啟動時驗證環境變數
- 缺少必要配置時記錄錯誤並禁用 hook
- 不影響 OpenClaw 主程序

**Network Timeouts**:
- 設定 5 秒上傳超時
- 超時視為失敗，記錄日誌

### Dashboard Error Handling

**Fetch Failures**:
```typescript
try {
  const response = await fetch(r2Url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const status = await response.json();
  this.onSuccess(status);
} catch (error) {
  this.onFailure(error);
  // 保持上次成功的狀態
  // 繼續輪詢
}
```

**JSON Parse Errors**:
- 捕獲解析錯誤
- 視為連線失敗
- 顯示錯誤訊息但保持輪詢

**Connection State Management**:
```typescript
interface ErrorRecovery {
  maxFailures: 3;           // 連續失敗閾值
  retryInterval: 5000;      // 重試間隔（毫秒）
  showWarningAfter: 3;      // 顯示警告的失敗次數
}
```

**Graceful Degradation**:
1. 0-2 次失敗：顯示上次狀態，灰色波形
2. 3+ 次失敗：顯示連線錯誤訊息
3. 恢復成功：立即恢復正常顯示

## Testing Strategy

### Dual Testing Approach

本專案採用單元測試與屬性測試互補的策略：

- **單元測試**: 驗證特定範例、邊界情況和錯誤條件
- **屬性測試**: 驗證跨所有輸入的通用屬性

兩者共同提供全面的測試覆蓋率：單元測試捕獲具體的 bug，屬性測試驗證一般正確性。

### Property-Based Testing Configuration

**測試框架**: 
- Hook (TypeScript): `fast-check`
- Dashboard (TypeScript/React): `fast-check` + `@testing-library/react`

**配置要求**:
- 每個屬性測試執行 20-50 次迭代（平衡速度與覆蓋率）
- 關鍵屬性（如序列化、狀態轉換）使用 50 次
- 簡單屬性（如欄位驗證）使用 20 次
- 每個測試必須標註對應的設計文件屬性
- 標籤格式: `Feature: openclaw-face, Property {number}: {property_text}`

**屬性測試實作**:
- 每個正確性屬性必須由單一屬性測試實作
- 使用 fast-check 的 arbitrary 生成器產生隨機測試資料
- 測試應該是確定性的（使用固定 seed 可重現）

### Unit Testing Strategy

**Hook 單元測試**:
- Mock S3Client 驗證上傳行為
- 測試環境變數讀取（範例測試）
- 測試錯誤處理（上傳失敗情境）
- 測試配置驗證

**Face 單元測試**:
- Mock fetch API 測試輪詢邏輯
- 測試連線狀態轉換
- 測試 UI 元件渲染（使用 React Testing Library）
- 測試輪詢間隔（範例測試）
- 測試錯誤恢復流程

**Integration Tests**:
- 端到端測試：Mock R2 → Hook 推送 → Face 輪詢
- 測試完整的狀態更新流程
- 測試錯誤情境下的系統行為

### Test Coverage Goals

- Hook: 90%+ 程式碼覆蓋率
- Face: 85%+ 程式碼覆蓋率（排除 p5.js 視覺化程式碼）
- 所有 10 個屬性都有對應的屬性測試
- 關鍵錯誤路徑都有單元測試覆蓋

### Testing Tools

```json
{
  "devDependencies": {
    "fast-check": "^3.15.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "vitest": "^1.0.4",
    "msw": "^2.0.11"
  }
}
```

## Implementation Notes

### Hook Implementation

**File Structure**:
```
hooks/r2-status/
├── index.ts          # Hook 入口點
├── config.ts         # 配置管理
├── uploader.ts       # R2 上傳邏輯
├── types.ts          # TypeScript 型別定義
└── __tests__/
    ├── hook.test.ts
    └── uploader.test.ts
```

**Key Considerations**:
- 使用 async/await 處理非同步上傳
- 實作 exponential backoff（可選，未來增強）
- 記錄詳細的除錯日誌
- 環境變數驗證在啟動時執行

### Dashboard Implementation

**File Structure**:
```
face/
├── src/
│   ├── App.tsx                    # 主應用程式
│   ├── components/
│   │   ├── HeartbeatCanvas.tsx   # p5.js canvas 包裝
│   │   ├── StatusDisplay.tsx     # 狀態資訊顯示
│   │   └── ConnectionIndicator.tsx # 連線狀態指示器
│   ├── hooks/
│   │   └── useStatusPolling.ts   # 輪詢邏輯 hook
│   ├── sketches/
│   │   └── heartbeat.ts          # p5.js sketch
│   ├── types.ts
│   └── config.ts
├── public/
│   └── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

**Key Considerations**:
- 使用 `react-p5` 整合 p5.js
- 使用 React hooks 管理輪詢狀態
- 使用 MUI 的 theme 確保一致的視覺風格
- 實作 requestAnimationFrame 優化動畫效能
- 使用 localStorage 持久化最後狀態（可選）

### Deployment

**Hook Deployment**:
1. 編譯 TypeScript: `tsc`
2. 複製到 OpenClaw hooks 目錄
3. 設定環境變數
4. 啟用: `openclaw hooks enable r2-status`

**Face Deployment**:
1. 建置: `pnpm build`
2. 輸出到 `dist/`
3. 推送到 `gh-pages` 分支
4. GitHub Pages 自動部署

**Environment Setup**:
```bash
# .env.example
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
R2_BUCKET=openclaw-status-[user]
```

### Performance Considerations

**Hook Performance**:
- 上傳操作非阻塞（async）
- 失敗不影響 OpenClaw 效能
- JSON 序列化開銷極小（< 1ms）

**Face Performance**:
- 輪詢間隔 5 秒，避免過度請求
- p5.js 動畫使用 requestAnimationFrame
- React 元件使用 memo 避免不必要的重渲染
- Fetch 請求使用 AbortController 支援取消

**Network Efficiency**:
- Status JSON < 1KB，傳輸快速
- R2 CDN 提供低延遲讀取
- CORS preflight 快取 1 小時

### Security Considerations

**Credential Management**:
- Hook: 環境變數儲存憑證，不提交到版本控制
- Dashboard: 完全無憑證，僅讀取公開 URL

**Data Privacy**:
- Status JSON 不包含敏感資訊
- Model 名稱和 taskId 為公開資訊
- 無使用者個人資料

**Network Security**:
- 所有通訊使用 HTTPS
- R2 bucket 僅允許 GET 操作
- 無需身份驗證的公開讀取

### Monitoring and Observability

**Hook Monitoring**:
- 記錄每次上傳的成功/失敗
- 記錄上傳延遲
- 記錄錯誤堆疊

**Face Monitoring**:
- 顯示連線狀態
- 顯示最後更新時間
- 顯示失敗計數（開發模式）

**Metrics** (可選，未來增強):
- 上傳成功率
- 平均上傳延遲
- 輪詢失敗率
- 使用者活躍時間
