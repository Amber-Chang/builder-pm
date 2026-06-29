<!-- [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-29 -->
<!-- 功能：/backfill-context slash 指令本體——指示 Claude 執行 brownfield 蒐證 + 草擬三份草稿 + 一份 REPORT -->

# /backfill-context

> 給剛把 builder-pm 接進**既有 code base** 的 PM。這個指令幫你把「藏在舊 code 裡的隱性知識」掃出來，草擬三份草稿（SYSTEM/modules/GLOSSARY 候選）+ 一份 REPORT 進 `.context/.backfill/`，再由你逐份審核、手動搬進正式 `.context/`。

---

## 步驟一：找到專案根目錄 + 跑掃描器

**怎麼找 project-root：**
- 優先用有 `.git` 的目錄（`git rev-parse --show-toplevel` 可查）
- 若不確定，問使用者：「你的專案根目錄是哪一個路徑？」

**跑掃描器：**

```bash
node <builder-pm 安裝路徑>/onboarding/backfill/scan-evidence.cjs <project-root>
```

例如，如果 builder-pm 的 template 安裝在 `~/.claude/builder-pm/`：

```bash
node ~/.claude/builder-pm/onboarding/backfill/scan-evidence.cjs /path/to/my-project
```

掃完後確認輸出：`evidence.json 已寫入：<project-root>/.context/.backfill/evidence.json`

---

## 步驟二：讀取 evidence.json

讀取 `<project-root>/.context/.backfill/evidence.json`，理解：
- `module_tree`：找到哪些模組？各自有多少檔案？
- `terms`：最高頻的 snake_case 識別字是什麼？
- `docs`：README / 文件的標題和第一句話？
- `external_integrations`：用了哪些外部服務？
- `sources_present` / `truncation`：哪些來源有掃到？有沒有被截斷？

---

## 步驟三：抽看關鍵原始碼（選用，增加理解深度）

從 `module_tree` 各模組的 `sample_files` 中，選 **2–5 個** 最重要的檔案讀取，補充對模組職責的理解。不要讀超過 10 個檔案，避免 context 爆炸。

---

## 步驟四：草擬三份草稿 + 一份 REPORT 到 `.context/.backfill/`

依序草擬以下三份草稿（SYSTEM/modules/GLOSSARY 候選）+ 一份 REPORT（全部寫入 `<project-root>/.context/.backfill/`）：

### 4a. `SYSTEM.draft.md`（系統總覽）

內容：
- **專案目的**（從 README + docs 推斷，標 🟡 中信心）
- **主要模組清單**（從 module_tree，標 🟢 高信心）
- **外部整合**（從 external_integrations，標 🟢 高信心）
- **資料流推斷**（從 terms + sample_files 猜測，**一律標 🔴 低信心 + 「待確認」**）

信心橫幅規則：
- 🟢 高信心：來自 module_tree / external_integrations（客觀掃描結果）
- 🟡 中信心：來自 docs / README（文件可能過時）
- 🔴 低信心：推斷資料流 / 模組間關係——**永遠標「待確認」，不可省略**

### 4b. `modules.draft.md`（模組清單）

逐一列出 module_tree 每個模組：
- 模組名稱 + 路徑
- 檔案數 + 語言
- 一句話職責描述（從 sample_files 或 terms 推斷，標信心等級）

### 4c. `GLOSSARY.candidates.md`（術語候選）

列出 `terms` 陣列中的高頻識別字，格式：

```
| 術語 | 出現次數 | 出現位置範例 | 建議定義（待 PM 確認） |
```

說明：這是**候選清單**，不是最終術語表。PM 需逐一確認哪些值得進 GLOSSARY.md，哪些只是程式碼雜訊。

### 4d. `REPORT.md`（掃描報告）

內容：
- **掃了什麼**：git / docs / code 各有沒有掃到（sources_present）
- **框上限狀況**：哪些維度被截斷（truncation）
- **各份草稿的信心摘要**：哪部分可信、哪部分要小心
- **PM 需要判斷的事項清單**：🔴 低信心項目 + 建議確認方式
- **怎麼搬進正式 `.context/`**：
  - `SYSTEM.draft.md` → 確認後重命名為 `.context/SYSTEM.md`
  - `modules.draft.md` → 拆分成 `.context/modules/<name>.md`
  - `GLOSSARY.candidates.md` → PM 篩選後加入 `.context/GLOSSARY.md`

---

## 必須輸出這行（不可省略）

完成草擬後，**一定要在回覆中明確輸出**：

> **永不自動碰正式 `.context/`、永不自動 commit。**
> 以上三份草稿 + REPORT 在 PM 拍板前不會進正式 `.context/`，也不會被 git commit。

---

## 步驟五：引導 PM 審核

完成草擬後，告訴 PM：

1. 先讀 `REPORT.md`——了解整體信心和需要確認的事項
2. 讀 `SYSTEM.draft.md`——確認每個 🔴 低信心區塊的資料流推斷
3. 讀 `modules.draft.md`——補充每個模組的正確職責描述
4. 讀 `GLOSSARY.candidates.md`——逐一決定哪些術語要進術語表
5. 滿意後，手動複製到正式 `.context/`（參考 REPORT.md 的搬移指引）

> 暫存草稿落在 `.context/.backfill/`；掃描器會在該夾內放一個 `.gitignore`（內容 `*`），整夾都被 git 忽略，不會被 `git add -A` 誤收——不論專案是否經 setup.sh 安裝、不論專案根 `.gitignore` 有沒有那條規則。
