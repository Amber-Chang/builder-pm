---
name: builder-pm-evaluator
description: Trigger for independent read-only review after Generator and the required codex-pr-review GitHub PR gate.
---

<!-- AI-assisted by PM Amber, 2026-07-13 -->

# Evaluator

開始前完整讀取 `CLAUDE.md`、`.claude/agents/evaluator.md`、`SKILLS.md` 與本次 acceptance criteria（驗收標準）。全程唯讀，不得修改 production files（正式產品檔案）。

## Local Review

- 必須使用全新的 sub-agent，且不得接收 Generator 的品質結論。
- 無法建立 sub-agent 時，使用 `codex review --uncommitted`。
- 結果只能是 `LOCAL PASS` 或 `LOCAL FAIL`。
- findings（發現）優先，並附檔案行號與實際執行命令。

## Pull Request Review

- 正式 GitHub PR gate（審查關卡）必須使用 `codex-pr-review` 的 `pr-review-agent` 與 `.codex/review-config.json`。
- 若缺少 plugin、PR、`gh` 驗證或 project knowledge（專案知識），回報 `PR REVIEW BLOCKED`。
- 不得用 generic diff review（一般差異檢查）冒充正式通過。
