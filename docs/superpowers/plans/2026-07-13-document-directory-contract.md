# 文件目錄契約實作計畫

> **給 Codex：** 執行本計畫時，請使用 `superpowers:executing-plans`，逐項完成並在每個檢查點回報。

**目標：** 讓新安裝的專案以 `docs/01-prd/` 與 `docs/02-spec/` 管理正式需求與規格，並提供可手動執行的結構檢查、PRD/SPEC 關聯驗證與可選用的知識整理 Skill。

**架構：** `template/` 是安裝來源。新增的文件契約檢查器只驗證正式文件的檔名、frontmatter、ID 與關聯；既有的 context-growth loop 只負責 SPEC 覆蓋率，改為讀取新位置。知識整理功能以加法方式放進新的 Claude/Codex Skill，不變更既有 Claude Code 的角色或 Skill。

**技術：** Node.js 內建 `node:test`、CommonJS、Markdown frontmatter、Bash 安裝腳本。

---

## 檔案結構

```text
template/
  docs/
    01-prd/
      README.md
      PRD-TEMPLATE.md
    02-spec/
      README.md
      SPEC-TEMPLATE.md
  .claude/skills/knowledge-curation/SKILL.md
  .agents/skills/knowledge-curation/SKILL.md
  loops/document-contract/
    check-document-contract.cjs
    check-document-contract.test.cjs
    fixtures/
  loops/context-growth/
    check-context-growth.cjs
    check-context-growth.test.cjs
    fixtures/
  AGENTS.md
  ONBOARDING.md
  SKILLS.md
README.md
docs/design.md
setup.sh
setup.test.cjs
```

## 1. 建立正式文件目錄與範本

**檔案：**
- 新增：`template/docs/01-prd/README.md`
- 新增：`template/docs/01-prd/PRD-TEMPLATE.md`
- 新增：`template/docs/02-spec/README.md`
- 新增：`template/docs/02-spec/SPEC-TEMPLATE.md`

**步驟：**
1. 在 `01-prd` 說明正式 PRD 的檔名規則：`PRD-<三位數>-<slug>.md`。
2. 在 `02-spec` 說明正式 SPEC 的檔名規則：`SPEC-<三位數>-<slug>.md`，每一份 SPEC 必須指定一份主要 PRD。
3. PRD 範本加入 `id`、`status`、`title` frontmatter，以及目標、非目標、驗收條件段落。
4. SPEC 範本加入 `id`、`status`、`title`、`related_prd` frontmatter，以及目標、非目標、驗收條件、實作注意事項段落。
5. 不建立 `inbox/`、`research/`、`decisions/` 空目錄，避免把尚未需要的分類寫死。

**驗證：** `rg -n "related_prd|PRD-<三位數>|SPEC-<三位數>" template/docs/01-prd template/docs/02-spec`

## 2. 以 TDD 實作文件契約檢查器

**檔案：**
- 新增：`template/loops/document-contract/check-document-contract.cjs`
- 新增：`template/loops/document-contract/check-document-contract.test.cjs`
- 新增：`template/loops/document-contract/fixtures/valid-project/docs/01-prd/PRD-001-onboarding.md`
- 新增：`template/loops/document-contract/fixtures/valid-project/docs/02-spec/SPEC-001-onboarding-flow.md`
- 新增：`template/loops/document-contract/fixtures/invalid-project/docs/01-prd/PRD-001-duplicate.md`
- 新增：`template/loops/document-contract/fixtures/invalid-project/docs/01-prd/PRD-001-other.md`
- 新增：`template/loops/document-contract/fixtures/invalid-project/docs/02-spec/SPEC-001-missing-link.md`
- 新增：`template/loops/document-contract/fixtures/invalid-project/docs/04-specs/SPEC-099-legacy.md`

**步驟：**
1. 先寫失敗測試，涵蓋有效專案、重複 ID、檔名與 frontmatter ID 不一致、SPEC 指向不存在 PRD、舊的 `docs/04-specs/` 留有 Markdown 文件。
2. 執行：`node --test template/loops/document-contract/check-document-contract.test.cjs`，確認測試因模組尚不存在而失敗。
3. 實作最小公開介面：`parseFrontmatter`、`scanFormalDocuments`、`analyze`、`main`。
4. 檢查器排除 `README.md` 與 `*-TEMPLATE.md`，其他正式目錄下 Markdown 均須符合命名規則。
5. `analyze` 回傳排序穩定的 errors 與由 `related_prd` 導出的 PRD-to-SPEC 關聯資料；CLI 支援 `--json`，有錯誤時以 exit code 1 結束。
6. 不在此工具中自動搬移、重新命名或刪除文件。

**驗證：** `node --test template/loops/document-contract/check-document-contract.test.cjs`

## 3. 遷移既有 SPEC 覆蓋率掃描器

**檔案：**
- 修改：`template/loops/context-growth/check-context-growth.cjs`
- 修改：`template/loops/context-growth/check-context-growth.test.cjs`
- 搬移：`template/loops/context-growth/fixtures/sample-project/docs/04-specs/SPEC-001-journey.md`
- 搬移：`template/loops/context-growth/fixtures/clean-project/docs/04-specs/SPEC-001-journey.md`

**步驟：**
1. 先修改測試 fixture，使目前實作因仍掃描 `docs/04-specs/` 而失敗。
2. 執行：`node --test template/loops/context-growth/check-context-growth.test.cjs`，確認失敗原因是舊路徑。
3. 將 `checkSpecCoverage` 的掃描根目錄改為 `docs/02-spec/`。
4. 既有「規格未覆蓋」的行為與輸出格式保持不變，僅變更文件所在位置。
5. 以 fixture 證明舊目錄不再被納入覆蓋率掃描。

**驗證：** `node --test template/loops/context-growth/check-context-growth.test.cjs`

## 4. 新增可選用的知識整理 Skill

**檔案：**
- 新增：`template/.claude/skills/knowledge-curation/SKILL.md`
- 新增：`template/.agents/skills/knowledge-curation/SKILL.md`
- 修改：`template/AGENTS.md`
- 修改：`template/SKILLS.md`

**步驟：**
1. 建立 canonical Claude Skill，流程固定為：判斷來源類型、閱讀既有正式文件、產出候選摘要、標示信心與待確認問題、等待 PM 核准、才協助建立或更新 PRD/SPEC。
2. Skill 必須明確禁止：自動把候選內容升格為正式文件、把來源材料當成已驗證事實、把敏感逐字稿放入 Git、實作 Obsidian、雙向連結、排程或第二大腦功能。
3. 新增 Codex adapter，僅負責導向 canonical Skill，不複製工作流程內容。
4. 在 `AGENTS.md` 與 `SKILLS.md` 將它列為選用的 Planner 工作流；既有 `brainstorming`、`code-review`、`tdd` 與角色設定不變。

**驗證：** `rg -n "knowledge-curation|自動.*正式|敏感" template/.claude/skills template/.agents/skills template/AGENTS.md template/SKILLS.md`

## 5. 更新安裝導引、專案說明與測試

**檔案：**
- 修改：`template/ONBOARDING.md`
- 修改：`README.md`
- 修改：`docs/design.md`
- 修改：`setup.sh`
- 修改：`setup.test.cjs`

**步驟：**
1. ONBOARDING 與 README 說明正式文件放在 `docs/01-prd/`、`docs/02-spec/`，可選資料夾在第一次有真實需求時才建立。
2. 說明 PRD/SPEC 以 `related_prd` 建立關聯，關聯表由檢查器導出，不維護第三份人工對照表。
3. 說明限制：新安裝採用新結構；既有專案不會被安裝腳本自動遷移；敏感原始材料留在受控外部位置，只把安全摘要納入 Git。
4. 在 `setup.sh` 的下一步提示中，將第一份 PRD 的位置指向 `docs/01-prd/`。
5. 擴充 `setup.test.cjs`，驗證安裝後存在兩個正式目錄、範本、文件契約檢查器與新的知識整理 Skill；不要變更受 SHA 保護的既有 Claude Code 邏輯。

**驗證：** `node --test setup.test.cjs`

## 6. 全面驗證與交付前審查

**檔案：**
- 修改：本計畫執行所需的所有上述檔案

**步驟：**
1. 執行：`node --test`。
2. 執行：`node template/loops/document-contract/check-document-contract.cjs template/loops/document-contract/fixtures/valid-project --json`，確認成功且關聯資料正確。
3. 執行：`node template/loops/document-contract/check-document-contract.cjs template/loops/document-contract/fixtures/invalid-project --json`，確認以非零狀態失敗且錯誤具體。
4. 執行：`git diff --check`，確認沒有空白錯誤。
5. 檢查 `git diff`，確認沒有修改 `template/.claude/agents/`、既有 `template/.claude/skills/` 或其他與 Claude Code 基線受保護的檔案。
6. 進行程式碼審查，特別檢查檔名規則、錯誤排序、缺失目錄、空 frontmatter、跨平台路徑與 legacy 目錄處理。

**驗證：** `node --test`
