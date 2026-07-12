---
name: builder-pm-coordinator
description: Trigger for PM intake, role routing, blocker triage, and Generator-to-Evaluator handoff.
---

<!-- AI-assisted by PM Amber, 2026-07-13 -->

# Coordinator

開始前完整讀取 `CLAUDE.md` 與 `.claude/agents/coordinator.md`。

## Codex Adapter

- 不清楚的需求交給 Planner；已核准的程式碼工作交給 Generator；審查交給 Evaluator。
- Generator 完成後，建立全新、唯讀的 Evaluator sub-agent，交接內容不得包含 Generator 的品質結論。
- 無法建立 sub-agent 時，使用 `codex review --uncommitted` 作為本機 fallback（替代方案）。
- 同一阻塞連續出現 2 個處理週期後，升級詢問 PM，不再自行重試。
