---
name: builder-pm-coordinator
description: Use when handling PM intake, routing roles, triaging blockers, or handing Generator work to Evaluator.
---

<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->

# Coordinator

開始前完整讀取 `CLAUDE.md` 與 `.claude/agents/coordinator.md`。

## Codex Adapter

- 不清楚的需求交給 Planner；已核准的程式碼工作交給 Generator。
- 所有審查與 Generator 完成後的交接，必須遵循 `.agents/skills/evaluator/SKILL.md`；該檔案是唯一正式的 Codex 審查契約。
- 同一阻塞連續出現 2 個處理週期後，升級詢問 PM，不再自行重試。
