# SKILLS — 這個專案怎麼挑 skill

<!-- [AI-ASSISTED] 模板 by builder-pm -->
<!-- 這份是 skill 清單的單一正本(SSOT);角色合約只指回這裡,不各自重列,避免 drift。 -->

## 使用原則（從實戰提煉,別丟）
- 只在**真有幫助**時用;不為了「有 skill 可用」而硬用。
- 一次只用**最小必要**組合。
- 不用 skill 反而更快,就直接做。

## 角色 ↔ 常駐 skill

| 角色 | skill | 何時用 |
|------|-------|--------|
| Planner | `brainstorming` | 收斂方向、把想法變 PRD / SPEC |
| Generator | `test-driven-development` | 主邏輯實作、易回歸的功能 |
| Generator | `openspec`（opt-in）| 走正式 SDD：把功能轉成 change（proposal / spec / tasks）再實作 |
| Evaluator | `requesting-code-review` | 功能完成、進 review gate 前 |
| Evaluator | Codex 第二模型審查（opt-in）| 要兩個不同模型交叉審 PR 時 |

> opt-in 的兩項（openspec / Codex 審查）由 `setup.sh` 安裝時詢問;沒裝時對應角色用紀律版（見各角色合約）。

## 專案專用 skill（自己加）

> day-0 留空。按專案需要把 skill drop 進 `.claude/skills/`,在這裡補一列（標「哪個角色用 + 何時用」）。

| skill | 角色 | 何時用 |
|-------|------|--------|
| （範例）`ui-ux-pro-max` | Generator | 方向已清楚、要補視覺層次 / 設計系統時 |

## 先別用太重的
- 重型多階段流程型 skill：只有確定要走標準開發流程時再用,別預設掛上。
