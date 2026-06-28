#!/usr/bin/env node
// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-28
// 功能：Claude Code SessionEnd hook——context 消失前把捕捉品質閘 checklist + 教訓草擬模板印到
//        stdout，逼 AI 在 session 結束前回顧「有沒有該記的雷」（觸發層，讓學習捕捉「真的會動」）。

'use strict';

const fs = require('fs');

// 容錯讀 stdin（Claude Code 會餵 hook JSON；內容用不到，純為不阻塞管線。空 stdin / TTY 不可爆）
function readStdin() {
  if (process.stdin.isTTY) return '';
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (e) {
    return '';
  }
}

const NUDGE = `──────────────────────────────────────────────
🧠 學習捕捉 nudge（SessionEnd）— context 即將消失，走之前回顧一次
──────────────────────────────────────────────
「Nothing to save」不該是預設：什麼都沒記 = 錯過學習，不是中性結果。

▍該記的訊號（任一觸發就草擬一則教訓）
  - PM 糾正你的風格 / 語氣 / 格式 / 冗長（「太囉嗦」「直接給答案」「別這樣排版」）
  - PM 糾正你的流程 / 步驟順序
  - 冒出非顯而易見的技巧 / 修法 / debug 路徑
  - 載入的 skill 被證明錯 / 缺步驟 → 當下 patch 既有的

🔑 4 種絕不記的反模式（記了反而有害）
  1. 環境依賴的失敗（缺 binary / 沒裝套件 / 沒設憑證 / command not found）→ PM 自己能修，不是耐久規則
  2. 對工具的負面斷言（「X 壞了」「browser 不能用」）→ 會硬化成日後拒絕自己的藉口；要記就記「修法」
  3. 已解的暫時錯（retry 成功 → 教訓是 retry pattern，不是那個錯）
  4. 一次性敘事（「總結今天行情」不是一類工作，不值得成規則 / skill）

▍擺放紀律：先 patch 既有教訓 / 規則 ＞ 才開新的；新名必須 class-level（禁 PR 號 / error 字串 / 「fix-X / 今天這題」）

──────────────────────────────────────────────
📝 教訓草擬模板（複製、填好，丟給 check-lesson-quality.cjs 驗）
──────────────────────────────────────────────
---
slug: <kebab-case、class-level>
tags: [<至少一個>]
severity: low|medium|high
strikes: 1
---

## 摘要
<一行，≤ 120 字>

## 觸發情境
<什麼時候會踩到>

## 正解
<正確做法>

驗證：node check-lesson-quality.cjs <你的草稿>.md
──────────────────────────────────────────────
`;

function main() {
  readStdin(); // 內容忽略，純為消化 hook 管線輸入、避免阻塞
  process.stdout.write(NUDGE);
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { NUDGE, readStdin, main };
