<!-- AI-assisted by PM Amber, 2026-07-13 -->

# {{PROJECT_NAME}} · Codex 協作入口

## 共用治理正本

開始任何工作前，必須完整讀完 `CLAUDE.md`。雖然檔名保留 Claude 字樣，它是所有 AI runtime 的共用治理正本；本檔不得複製其中的 10 條核心規範，避免兩份規則日後產生落差。

永遠使用繁體中文。專業術語需附白話解釋；遇到不確定事項、高風險操作、資料庫 migration（資料庫結構變更）、資安或商業邏輯時，先詢問 PM，不得自行決定。

## 角色路由

- PRD、SPEC 或需求範圍不清楚：讀取並使用 `.agents/skills/planner/SKILL.md`。
- 已核准規格的 production code（正式產品程式碼）：讀取並使用 `.agents/skills/generator/SKILL.md`。
- 任務路由、阻塞排除或交接：讀取並使用 `.agents/skills/coordinator/SKILL.md`。
- 本機或 Pull Request review（程式碼審查）：讀取並使用 `.agents/skills/evaluator/SKILL.md`。

`.claude` 目錄必須保留，因為共用契約仍引用其中內容；Codex 的入口則是 `AGENTS.md` 與 `.agents`，不得因此搬移或複製共用契約。

## 獨立審查

Generator 不得自行審查或給出品質結論。Coordinator 必須建立全新、唯讀的 Evaluator sub-agent（子代理），交接時不得附帶 Generator 的品質結論，避免影響獨立判斷。若無法建立 sub-agent，改用 `codex review --uncommitted`。

本機審查只能回報 `LOCAL PASS` 或 `LOCAL FAIL`。正式 GitHub PR 必須使用 `codex-pr-review` 的 `pr-review-agent`；若缺少 plugin、PR、`gh` 驗證或專案知識，必須回報 `PR REVIEW BLOCKED`，不得靜默降級為一般 diff review（差異檢查）。

## Brownfield 專案

既有專案（brownfield）需先讀取 `.claude/commands/backfill-context.md` 並執行等效流程。所有草稿必須先交 PM 審閱，取得核准後才能移入正式 `.context`。
