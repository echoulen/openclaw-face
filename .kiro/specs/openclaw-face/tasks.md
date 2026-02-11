# Implementation Plan: OpenClaw Face

## Overview

本實作計畫將 OpenClaw Face 分為三個主要階段：Hook 開發、Face 前端開發、以及整合測試。每個階段都包含核心實作和對應的測試任務，確保增量驗證功能正確性。

## Tasks

- [x] 1. 設定專案結構和核心型別定義
  - 建立 `hooks/r2-status/` 目錄結構
  - 建立 `face/` 目錄結構
  - 定義共用的 TypeScript 型別（StatusPayload, ConnectionState）
  - 設定 TypeScript 編譯配置
  - 安裝必要的依賴套件（@aws-sdk/client-s3, fast-check, vitest）
  - _Requirements: 10.1, 10.2, 10.3, 10.6_

- [x] 2. 實作 R2 Status Hook 核心功能
  - [x] 2.1 實作配置管理模組（config.ts）
    - 從環境變數讀取 R2 配置
    - 驗證必要的環境變數存在
    - 匯出型別安全的配置物件
    - _Requirements: 2.4, 6.2_
  
  - [x] 2.2 實作 R2 上傳器（uploader.ts）
    - 建立 S3Client 實例（連接 R2 endpoint）
    - 實作 uploadStatus 函式（PutObject 到 status.json）
    - 實作錯誤處理和日誌記錄
    - 設定 5 秒上傳超時
    - _Requirements: 1.6, 7.1, 7.2_
  
  - [x] 2.3 實作 Hook 主邏輯（index.ts）
    - 實作 onModelCall 事件處理器（設定 busy: true）
    - 實作 onComplete 事件處理器（設定 busy: false）
    - 建立 StatusPayload 物件（包含 busy, model, ts, taskId）
    - 整合上傳器進行狀態推送
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Checkpoint - 確保 Hook 測試通過
  - 執行所有 Hook 測試，確保通過
  - 如有問題請詢問使用者

- [x] 4. 設定 Face 專案基礎
  - [x] 4.1 初始化 Vite + React + TypeScript 專案
    - 使用 `pnpm create vite` 建立專案
    - 配置 TypeScript 嚴格模式
    - 安裝 React 18 和相關型別定義
    - _Requirements: 10.1, 10.2, 10.4_
  
  - [x] 4.2 安裝和配置 UI 依賴
    - 安裝 Material-UI (MUI)
    - 安裝 p5.js 和 react-p5
    - 安裝測試工具（vitest, @testing-library/react, fast-check）
    - 配置 Vite 測試環境
    - _Requirements: 10.5, 10.3_
  
  - [x] 4.3 建立型別定義和配置
    - 定義 AgentStatus 介面
    - 定義 ConnectionState 介面
    - 建立 config.ts（R2 public URL）
    - _Requirements: 1.3, 1.4, 1.5_

- [x] 5. 實作 Face 狀態輪詢邏輯
  - [x] 5.1 實作 useStatusPolling 自訂 Hook
    - 實作每 5 秒的輪詢邏輯
    - 實作 fetch 請求和 JSON 解析
    - 實作錯誤處理和重試邏輯
    - 實作 ConnectionState 管理（失敗計數、連線狀態）
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. 實作 p5.js 心率動畫
  - [x] 6.1 建立 Heartbeat Sketch（heartbeat.ts）
    - 實作 setup 函式（建立 400x200 canvas）
    - 實作 draw 函式（繪製動畫迴圈）
    - 實作閒置狀態：綠色 sin 波動畫
    - 實作忙碌狀態：紅色脈動放大動畫
    - 實作斷線狀態：灰色波形
    - 實作狀態轉換動畫（1 秒平滑過渡）
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7_
  
  - [x] 6.2 建立 HeartbeatCanvas React 元件
    - 使用 react-p5 包裝 p5.js sketch
    - 接收 status 和 connectionState props
    - 更新 sketch 狀態當 props 改變
    - _Requirements: 4.1, 4.2, 4.7_

- [x] 7. 實作 Face UI 元件
  - [x] 7.1 建立 StatusDisplay 元件
    - 顯示當前模型名稱
    - 顯示最新更新時間（格式化）
    - 顯示 taskId（若存在）
    - 使用 MUI Typography 元件
    - _Requirements: 4.5, 4.6_
  
  - [x] 7.2 建立 ConnectionIndicator 元件
    - 顯示連線狀態指示器
    - 顯示失敗計數（開發模式）
    - 顯示連線錯誤訊息（失敗 >= 3 次）
    - 使用 MUI Alert 元件
    - _Requirements: 3.4, 7.4_

- [-] 8. 整合 Face 主應用程式
  - [ ] 8.1 建立 App.tsx 主元件
    - 整合 useStatusPolling hook
    - 整合 HeartbeatCanvas 元件
    - 整合 StatusDisplay 元件
    - 整合 ConnectionIndicator 元件
    - 使用 MUI ThemeProvider 設定主題
    - _Requirements: 3.1, 4.1, 4.5, 4.6_

- [ ] 9. Checkpoint - 確保 Face 功能正常
  - 手動測試 Dashboard 基本功能
  - 如有問題請詢問使用者

- [ ] 10. 建立部署腳本和文件
  - [ ] 10.1 建立 Hook 部署腳本
    - 建立 `hooks/r2-status/deploy.sh`
    - 編譯 TypeScript
    - 複製到 OpenClaw hooks 目錄
    - _Requirements: 6.1_
  
  - [ ] 10.2 建立 Face 部署腳本
    - 建立 `face/deploy.sh`
    - 執行 `pnpm build`
    - 推送 dist/ 到 gh-pages 分支
    - _Requirements: 6.3, 6.5_
  
  - [ ] 10.3 建立測試腳本
    - 建立 `hooks/r2-status/test-push.sh`
    - 模擬事件觸發測試 Hook 推送
    - _Requirements: 6.4_
  
  - [ ] 10.4 建立環境變數範例檔案
    - 建立 `.env.example`
    - 記錄所有必要的環境變數
    - _Requirements: 2.4, 6.2_
  
  - [ ] 10.5 建立 README 文件
    - 撰寫安裝指南
    - 撰寫配置指南（R2 bucket 設定、CORS）
    - 撰寫部署指南
    - 撰寫測試指南
    - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.3_

- [ ] 11. R2 Bucket 配置文件
  - [ ] 11.1 建立 R2 配置文件
    - 建立 `r2-config.json`（CORS 規則範例）
    - 記錄 bucket 命名規範
    - 記錄 IAM 權限設定
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ] 12. Final Checkpoint - 完整系統驗證
  - 手動測試完整流程（Hook → R2 → Dashboard）
  - 驗證部署腳本可執行
  - 確認文件完整性
  - 如有問題請詢問使用者

## Notes

- 所有測試任務已移除，專注於核心功能實作
- 每個任務都參照具體的需求編號以確保可追溯性
- Checkpoint 任務確保增量驗證
- 部署腳本和文件確保系統可正確部署和使用
