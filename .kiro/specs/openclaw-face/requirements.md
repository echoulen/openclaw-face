# Requirements Document

## Introduction

OpenClaw Face 是一個安全的代理狀態視覺化系統，使用 p5.js 心率動畫顯示 OpenClaw 代理的忙碌狀態。系統採用零 port 暴露架構，OpenClaw 透過 hook 主動推送狀態至 Cloudflare R2，外部 GitHub Pages 透過 polling 讀取並視覺化呈現。

## Glossary

- **OpenClaw**: 本地運行的 AI 代理系統
- **Hook**: OpenClaw 的事件監聽機制，可在特定事件觸發時執行自定義邏輯
- **R2**: Cloudflare R2 物件儲存服務
- **Status_JSON**: 包含代理狀態的 JSON 檔案 `{ busy: boolean, model: string, ts: number, taskId?: string }`
- **Dashboard**: 基於 p5.js 的視覺化前端頁面
- **Heartbeat_Animation**: 心率動畫，閒置時為綠色 sin 波，忙碌時為紅色脈動放大效果
- **Polling**: 前端定期（每 5 秒）向 R2 發送 HTTP GET 請求以獲取最新狀態

## Requirements

### Requirement 1: Hook 狀態推送

**User Story:** 作為 OpenClaw 系統，我想在模型調用和任務完成時自動推送狀態，以便外部系統能即時了解代理的忙碌狀態。

#### Acceptance Criteria

1. WHEN `agent:model_call` 事件觸發時，THE Hook SHALL 建立 Status_JSON 並設定 `busy: true`
2. WHEN `agent:complete` 事件觸發時，THE Hook SHALL 建立 Status_JSON 並設定 `busy: false`
3. WHEN 建立 Status_JSON 時，THE Hook SHALL 包含當前時間戳記（`ts` 欄位）
4. WHEN 建立 Status_JSON 時，THE Hook SHALL 包含模型名稱（`model` 欄位）
5. WHERE taskId 可用時，THE Hook SHALL 在 Status_JSON 中包含 `taskId` 欄位
6. WHEN Status_JSON 建立完成後，THE Hook SHALL 將其上傳至 R2 bucket 的 `status.json` key
7. WHEN 上傳至 R2 時，THE Hook SHALL 在 2 秒內完成操作

### Requirement 2: R2 儲存配置

**User Story:** 作為系統管理員，我想正確配置 R2 bucket，以便前端能安全地讀取狀態資料。

#### Acceptance Criteria

1. THE R2_Bucket SHALL 命名為 `openclaw-status-[user]` 格式
2. THE R2_Bucket SHALL 配置 CORS 規則允許所有來源的 GET 請求
3. THE R2_Bucket SHALL 設定為 public-read 權限
4. WHEN Hook 連接 R2 時，THE Hook SHALL 使用環境變數 `R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_ENDPOINT`、`R2_BUCKET`
5. THE Hook SHALL 僅擁有 `PutObject` 權限於 `status.json` key

### Requirement 3: 前端狀態輪詢

**User Story:** 作為前端應用程式，我想定期獲取最新的代理狀態，以便更新視覺化顯示。

#### Acceptance Criteria

1. THE Dashboard SHALL 每 5 秒執行一次 HTTP GET 請求至 R2 public URL
2. WHEN 請求成功時，THE Dashboard SHALL 解析 Status_JSON
3. WHEN 請求失敗時，THE Dashboard SHALL 顯示灰色波形並保持上次成功的狀態資訊
4. WHEN 連續請求失敗超過 3 次時，THE Dashboard SHALL 顯示連線錯誤訊息
5. THE Dashboard SHALL 在請求失敗後繼續嘗試輪詢

### Requirement 4: 視覺化動畫

**User Story:** 作為使用者，我想透過直觀的動畫了解代理的忙碌狀態，以便快速掌握系統運作情況。

#### Acceptance Criteria

1. WHEN `busy` 為 `false` 時，THE Dashboard SHALL 顯示綠色 sin 波動畫
2. WHEN `busy` 為 `true` 時，THE Dashboard SHALL 顯示紅色脈動放大動畫
3. THE Dashboard SHALL 在 400x200 像素的 canvas 上繪製動畫
4. WHEN 狀態改變時，THE Dashboard SHALL 在 1 秒內平滑過渡至新動畫
5. THE Dashboard SHALL 顯示當前模型名稱
6. THE Dashboard SHALL 顯示最新更新時間
7. WHEN 無有效狀態資料時，THE Dashboard SHALL 顯示灰色波形

### Requirement 5: 安全性要求

**User Story:** 作為系統管理員，我想確保系統不暴露任何本地端口，以便維持最高的安全性。

#### Acceptance Criteria

1. THE OpenClaw SHALL 僅在 localhost 上運行
2. THE Hook SHALL 不開啟任何對外監聽的網路端口
3. THE R2_Bucket SHALL 僅允許 public-read 權限，不允許 public-write
4. THE Dashboard SHALL 不包含任何 API key 或敏感憑證
5. WHEN 執行 `netstat -an | grep 18789` 時，THE System SHALL 僅顯示 localhost 綁定

### Requirement 6: 部署與配置

**User Story:** 作為開發者，我想簡化部署流程，以便快速啟用和測試系統。

#### Acceptance Criteria

1. THE Hook SHALL 透過 `openclaw hooks enable r2-status` 命令啟用
2. THE Hook SHALL 從環境變數讀取 R2 配置
3. THE Dashboard SHALL 部署至 GitHub Pages 的 gh-pages 分支
4. THE System SHALL 提供測試腳本驗證 Hook 推送功能
5. THE System SHALL 提供部署腳本自動化 GitHub Pages 發布流程

### Requirement 7: 錯誤處理與容錯

**User Story:** 作為系統，我想在網路異常或服務中斷時優雅降級，以便提供最佳的使用者體驗。

#### Acceptance Criteria

1. WHEN R2 上傳失敗時，THE Hook SHALL 記錄錯誤日誌並繼續運行
2. WHEN R2 上傳失敗時，THE Hook SHALL 不中斷 OpenClaw 的正常運作
3. WHEN Dashboard 無法連接 R2 時，THE Dashboard SHALL 顯示最後成功獲取的狀態
4. WHEN Dashboard 長時間無法連接 R2 時，THE Dashboard SHALL 顯示連線狀態警告
5. THE Dashboard SHALL 在網路恢復後自動恢復正常輪詢

### Requirement 8: 效能與成本

**User Story:** 作為專案負責人，我想確保系統在免費額度內運行，以便實現零成本部署。

#### Acceptance Criteria

1. THE System SHALL 在 Cloudflare R2 免費額度內運行（10GB 儲存、100 萬次寫入、1000 萬次讀取）
2. WHEN Hook 推送狀態時，THE Hook SHALL 僅更新單一檔案（`status.json`）
3. THE Dashboard SHALL 限制輪詢頻率為每 5 秒一次
4. THE Status_JSON SHALL 保持最小檔案大小（< 1KB）
5. THE System SHALL 不產生任何額外的雲端服務費用

### Requirement 9: 瀏覽器相容性

**User Story:** 作為使用者，我想在主流瀏覽器上正常使用 Dashboard，以便在不同環境下監控代理狀態。

#### Acceptance Criteria

1. THE Dashboard SHALL 在 Chrome 最新版本上正常運行
2. THE Dashboard SHALL 在 Firefox 最新版本上正常運行
3. THE Dashboard SHALL 在 Safari 最新版本上正常運行
4. THE Dashboard SHALL 在 macOS 環境下正常運行
5. WHEN 瀏覽器不支援 p5.js 時，THE Dashboard SHALL 顯示不支援訊息

### Requirement 10: 開發工具鏈

**User Story:** 作為開發者，我想使用現代化的開發工具，以便提高開發效率和程式碼品質。

#### Acceptance Criteria

1. THE Dashboard SHALL 使用 React.js 作為 UI 框架
2. THE Dashboard SHALL 使用 TypeScript 提供型別安全
3. THE Dashboard SHALL 使用 pnpm 作為套件管理工具
4. THE Dashboard SHALL 使用 Vite 作為建置工具
5. THE Dashboard SHALL 使用 Material-UI (MUI) 作為 UI 元件庫
6. THE Hook SHALL 使用 TypeScript 撰寫
7. THE Hook SHALL 使用 `@aws-sdk/client-s3` SDK 連接 R2
