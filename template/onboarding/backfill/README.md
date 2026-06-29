<!-- [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-29 -->
<!-- 功能：brownfield 蒐證掃描器說明——用途 / evidence.json 格式 / 框上限 / 怎麼跑 -->

# backfill（蒐證掃描器 · brownfield 冷讀草擬）

> 給剛把 builder-pm 接進**已開發到一半的既有 code base** 的 PM。`.context/` 是空的，但舊知識全藏在 code 裡。這支掃描器一次性掃描 code / docs / git，輸出 `evidence.json`，再由 `/backfill-context` 指令讓 AI 讀 evidence 草擬三份草稿（SYSTEM/modules/GLOSSARY 候選）+ 一份 REPORT 進 `.context/`。

## 怎麼跑

```bash
node onboarding/backfill/scan-evidence.cjs <project-root>
# 例：
node onboarding/backfill/scan-evidence.cjs /path/to/my-project
```

掃完後，`evidence.json` 會寫入 `<project-root>/.context/.backfill/evidence.json`。接著在 Claude 跑 `/backfill-context` 讀取它並草擬文件。

## 怎麼跑測試

```bash
node scan-evidence.test.cjs
```

零外部依賴（只用 Node 內建 `fs` / `path` / `node:test` / `node:assert`）。11 個測試涵蓋：結構驗證 × 5、降級驗證 × 3、框上限 × 1、確定性 × 1、錯誤路徑 × 1。

## evidence.json 格式

| 欄位 | 說明 |
|------|------|
| `schema_version` | 固定為 `1` |
| `project_root` | 掃描根目錄絕對路徑 |
| `limits` | 本次使用的框上限常數（見下方表格） |
| `sources_present` | `{ git: bool, docs: bool, dependency_manifests: [...] }` |
| `truncation` | 各維度是否被截斷（bool） |
| `module_tree` | 模組清單，每筆 `{ name, path, file_count, languages, sample_files }` |
| `terms` | 高頻 snake_case 識別字，每筆 `{ term, frequency, samples[{file, line}] }` |
| `docs` | 文件摘要，每筆 `{ path, title, first_sentence }` |
| `git_log` | git 提交記錄，每筆 `{ subject }` |
| `external_integrations` | 外部整合推斷，每筆 `{ name, source, inferred_kind }` |

## 框上限

| 常數 | 預設值 | 說明 |
|------|--------|------|
| `MODULE_TOP_N` | 20 | 最多回傳幾個模組 |
| `MAX_FILES_SCANNED` | 500 | 最多掃幾個程式碼檔案（terms 用） |
| `GIT_LOG_LAST_N` | 100 | 最多取幾筆 git 提交 |
| `TOP_TERMS_N` | 50 | 最多回傳幾個高頻術語 |
| `DOC_EXTRACT_MAX` | 50 | 最多處理幾個文件檔 |

## 確定性保證

完全靜態讀檔，**不碰 `Date.now()` / `new Date()` / `Math.random()`**。所有目錄列舉都 `.sort()`、輸出都排序 → 同一專案任何時候跑、任何機器跑，`evidence.json` 位元一致（測試 10 直接斷言這點）。

## 注意：不自動修改正式 `.context/` 檔案

掃描器只**寫入** `<project-root>/.context/.backfill/evidence.json`（暫存區）。草擬後的 `.context/` 正式文件（`SYSTEM.md` / `modules/` / `GLOSSARY.md`）需 PM 審核後**手動搬移**，scanner 和 `/backfill-context` 都永不自動碰正式 `.context/`、永不自動 commit。掃描器同時在 `.context/.backfill/` 內寫一個 `.gitignore`（內容 `*`），確保整個暫存夾被 git 忽略——不依賴專案根 `.gitignore` 或 setup.sh。
