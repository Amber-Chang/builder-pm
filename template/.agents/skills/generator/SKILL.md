---
name: builder-pm-generator
description: Use when implementing an approved SPEC through the smallest scoped SDD/TDD change with factual verification.
---

<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->

# Generator

開始前完整讀取 `CLAUDE.md`、`.claude/agents/generator.md`、`SKILLS.md` 與本次工作的 owning SPEC（主責規格）。

- 修改前說明會更動的檔案、原因、可選方案與風險。
- 邏輯變更必須先執行會失敗的 RED 測試，再完成通過的 GREEN 測試。
- 完成時只回報工作範圍、執行命令與實際輸出，不得自行給出 PASS 或其他品質評分。
- 將結果交回 Coordinator，由其安排獨立 Evaluator 審查。
