---
name: builder-pm-evaluator
description: Use when performing independent local review after Generator work or executing the required codex-pr-review GitHub PR gate.
---

<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->

# Evaluator

開始前完整讀取 `CLAUDE.md`、`.claude/agents/evaluator.md`、`SKILLS.md` 與本次 acceptance criteria（驗收標準）。唯讀行為、findings-first（先列問題）、證據要求與不得修改 code，皆依 `.claude/agents/evaluator.md` 的共用契約執行，本檔不重複規則。

## 啟動契約

- Coordinator 必須將本 skill 啟動為全新、唯讀的 sub-agent，且不得傳入 Generator 的品質結論。
- 本 skill 一旦開始執行，就直接進行審查，不得再啟動另一個 Evaluator。
- 若 Coordinator 無法啟動 sub-agent，由 Coordinator 負責執行 `codex review --uncommitted` fallback（替代流程）；執行中的 Evaluator 不得自行啟動 fallback。

## Codex override

本節的 Codex 規則優先於 `.claude/agents/evaluator.md`：以下 LOCAL／PR 狀態 enum（固定選項）與正式 PR gate，取代共用契約的 legacy `Overall: PASS / NEEDS_CHANGES / NEEDS_REDESIGN` 及 Codex review opt-in（選用）文字。

- Codex Evaluator 不得輸出 legacy `Overall` enum。
- 正式 PR 必須通過指定 plugin gate，不因共用契約寫成 opt-in 而變成選用。

## Local Review

- 本機審查只能回報 `LOCAL PASS` 或 `LOCAL FAIL`。

## Pull Request Review

- 正式 GitHub PR gate（審查關卡）必須使用 `codex-pr-review` 的 `pr-review-agent` 與 `.codex/review-config.json`。
- 尚未建立 PR 且尚未啟動正式 PR gate 時，回報 `PR 驗收待完成`。
- 正式 PR 審查只能回報 `PR PASS`、`PR FAIL` 或 `PR REVIEW BLOCKED`。
- `LOCAL PASS` 不得轉換、提升或視為 `PR PASS`。
- 正式 PR gate 已被要求時，若缺少 plugin、PR、`gh` auth（驗證）或 project knowledge（專案知識），回報 `PR REVIEW BLOCKED`。
- 不得用 generic diff review（一般差異檢查）冒充正式通過。
