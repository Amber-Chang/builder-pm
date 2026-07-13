# SKILLS — 這個專案怎麼挑 skill

<!-- [AI-ASSISTED] 模板 by builder-pm -->
<!-- 這份是 skill 清單的單一正本(SSOT);角色合約只指回這裡,不各自重列,避免 drift。 -->

## 使用原則（從實戰提煉,別丟）
- 只在**真有幫助**時用;不為了「有 skill 可用」而硬用。
- 一次只用**最小必要**組合。
- 不用 skill 反而更快,就直接做。

本檔是角色與 skill 路由的單一正本（SSOT,Single Source of Truth）,只記「誰在何時使用哪個 skill」,不重複角色契約。Claude Code 的專案 skill 放在 `.claude/skills/`;Codex 的角色 adapter 放在 `.agents/skills/`,並引用 `.claude/agents/` 的共用角色契約。

## 角色 ↔ 常駐 skill

| 角色 | skill | 何時用 |
|------|-------|--------|
| Planner | `brainstorming` | 收斂方向、把想法變 PRD / SPEC |
| Planner | `knowledge-curation`（opt-in）| 從知識來源整理候選摘要；PM 核准後才協助更新 PRD / SPEC |
| Generator | `test-driven-development` | 主邏輯實作、易回歸的功能 |
| Generator | `openspec`（opt-in）| 走正式 SDD：把功能轉成 change（proposal / spec / tasks）再實作 |
| Evaluator | `requesting-code-review` | 功能完成、進 review gate 前 |
| Evaluator | `pr-review-agent`（`codex-pr-review`）| GitHub PR 建立後執行正式 PR gate；Codex / 雙平台必須啟用 |

> `openspec` 仍是 opt-in。Codex PR 審查只有在 **Claude-only** 專案作為第二模型時是選用；Codex 或雙平台專案的正式 GitHub PR gate 必須使用 `codex-pr-review` 的 `pr-review-agent`。外掛缺少、PR / 授權 / 知識來源不可用時回報 `PR REVIEW BLOCKED`,不可用本機 `LOCAL PASS` 取代。

## 專案專用 skill（自己加）

> day-0 留空。按專案需要新增 skill,Claude Code 放 `.claude/skills/`,Codex 放 `.agents/skills/`,並在這裡補一列（標「哪個角色用 + 何時用」）。若兩平台共用同一套行為,保留一份角色契約、以薄 adapter 引用,不要複製兩份造成 drift（內容逐漸不一致）。

| skill | 角色 | 何時用 |
|-------|------|--------|
| （範例）`ui-ux-pro-max` | Generator | 方向已清楚、要補視覺層次 / 設計系統時 |

`knowledge-curation` 是 Planner 的選用工作流，不會自動把候選內容升格為正式知識或規格；必須先取得 PM 核准。

## 先別用太重的
- 重型多階段流程型 skill：只有確定要走標準開發流程時再用,別預設掛上。
