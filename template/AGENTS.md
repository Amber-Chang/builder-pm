<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->

# {{PROJECT_NAME}} · Codex 協作入口

## 共用治理正本

開始任何工作前，必須完整讀完 `CLAUDE.md`。雖然檔名保留 Claude 字樣，它是所有 AI runtime 的共用治理正本；本檔不得複製其中的 10 條核心規範，避免兩份規則日後產生落差。

語言、術語解釋、安全邊界與不確定事項的處理方式，皆由 `CLAUDE.md` 統一治理，本檔不重複列出。

## 角色路由

- PRD、SPEC 或需求範圍不清楚：讀取並使用 `.agents/skills/planner/SKILL.md`。
- 需要從訪談、正式文件或其他知識來源整理需求：選用 `.agents/skills/knowledge-curation/SKILL.md`，並依其指向使用 canonical Skill。
- 已核准規格的 production code（正式產品程式碼）：讀取並使用 `.agents/skills/generator/SKILL.md`。
- 任務路由、阻塞排除或交接：讀取並使用 `.agents/skills/coordinator/SKILL.md`。
- 本機或 Pull Request review（程式碼審查）：讀取並使用 `.agents/skills/evaluator/SKILL.md`。

`.claude` 目錄必須保留，因為共用契約仍引用其中內容；Codex 的入口則是 `AGENTS.md` 與 `.agents`，不得因此搬移或複製共用契約。

## 獨立審查

Generator 完成後，Coordinator 必須遵循 `.agents/skills/evaluator/SKILL.md`；該檔案是 Codex 審查流程與結果的唯一正式契約。

## Brownfield 專案

既有專案（brownfield）需先讀取 `.claude/commands/backfill-context.md` 並執行等效流程。所有草稿必須先交 PM 審閱，取得核准後才能移入正式 `.context`。
