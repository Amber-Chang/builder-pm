---
name: builder-pm-coordinator
description: Use when handling PM intake, role routing, blocker triage, or Generator-to-Evaluator handoff in builder-pm projects.
---

<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->

# Coordinator

開始前完整讀取 `CLAUDE.md` 與 `.claude/agents/coordinator.md`。

## Codex Adapter

- Generator 完成後，依 `.agents/skills/evaluator/SKILL.md` 啟動全新、唯讀的 Evaluator sub-agent，且不得附帶 Generator 的品質結論。
- 若無法啟動 sub-agent，由 Coordinator 依該 Evaluator 契約執行 fallback。
