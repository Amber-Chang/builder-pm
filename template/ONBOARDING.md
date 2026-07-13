<!-- [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-28 -->
<!-- 功能：新專案裝上 builder-pm 後的開工指南——從空白走到真的能開始做。對應 https://github.com/Amber-Chang/builder-pm/blob/main/maintainers/design.md §6.4。 -->

# 新專案開工指南（Onboarding）

> 給剛把 builder-pm 裝進新專案的 PM。只回答一個問題:**從空白到真的能開始做,怎麼走?**

## 心法:薄起步,邊做邊長

新專案 day-0,你手上頂多兩樣東西:**想用什麼技術** + **一份需求草稿(PRD)**。就從這兩樣開始。

那些大文件(系統總覽、術語表、約定、模組規格)**先留空,邊做邊長** —— 不要 day-0 硬填你還沒有資訊的東西。

> ⚠️ 這是舊版本(amber-stack)踩過的坑:它一開工就叫你「去填 SYSTEM.md / GLOSSARY.md」,但第一天你根本還沒有架構決策、還沒 spec 過任何功能,填不出來。builder-pm 修掉了這個「早問」。

## Day-0:四步起步

1. **選技術棧 + 基本資訊**(之後由安裝腳本問;先想清楚:後端 / 資料庫 / 前端 / 要不要 SDK)。
2. **寫第一版 PRD** —— 用 brainstorming 把「想做什麼」變成一份需求草稿，放在 `docs/01-prd/PRD-001-<slug>.md`。這是你的第一份產出。
3. **(選用,建議留)跑一次極小的真任務** —— 例如改個 README 一行,走完整「派工 → 驗證 → 收進專案」一輪,讓你 day-1 就親眼看到這套 AI 流程真的會動、長什麼樣。覺得多餘可以跳。
4. **記住:`.context/` 是空的、會邊做邊長** —— 別現在硬填 SYSTEM / GLOSSARY。

## 每次動工前：先確認工作分支

當需求、計畫與風險都確認後，第一次修改追蹤檔案前先執行：

```bash
node gates/branch-hygiene/check-branch.cjs . --json
```

如果結果是 `protected-branch`，請先依 `WORKFLOW.md` 從最新 `main` 建立工作分支，再開始實作。若工作區有其他人尚未提交的變更，停止並詢問，不要自行 stash、rebase、reset、checkout 或覆蓋檔案。`/explore` 的唯讀工作不需要建立分支。

正式文件先記兩條規則：PRD 放 `docs/01-prd/`，SPEC 放 `docs/02-spec/`；每份 SPEC 都用 `related_prd` 指向一份主要 PRD。單一 PRD 對多份 SPEC 的對照由檢查器導出，不維護人工第三張表。新安裝採這個新結構，既有專案不會自動遷移，請由 PM 與工程師另行規劃。

不要預先建立 `docs/inbox/`、`docs/research/` 或 `docs/decisions/`；首次真的需要時才建立。敏感逐字稿留在受控外部位置，Git 只放安全摘要。

## Day-N:知識層怎麼自己長出來

邊做邊長,而且系統會**主動提醒你「現在該補哪份了」**(跑 `loops/context-growth` 偵測器):

| 要補的 | 什麼時候補 | 系統怎麼提醒你 |
|--------|-----------|---------------|
| **模組規格(SPEC)** | 要做一個新功能時,先寫那個功能的規格 | 偵測到「改了某模組的 code、卻沒有對應 SPEC」 |
| **術語表(GLOSSARY)** | 寫 SPEC 冒出新名詞時 | 偵測到「文件用了某術語、表裡卻沒有」→ 列候選 |
| **約定(CONVENTIONS)** | 同一類雷踩第 2 次時 | 偵測到某條 lesson 累積 strikes ≥ 2 → 提醒「該畢業成約定」 |
| **系統總覽(SYSTEM)** | 做了重大結構決策時 | 只能粗略提醒(這種「重大決策」電腦判斷不準,最後靠你自己)|

> 重點:你**不用記**這些時機 —— 偵測器會掃過專案、把「該補的」列給你看,但**只提醒、不擋你做事**。

## 為什麼這樣設計

冷啟動能「薄」,是因為 builder-pm 有三個會自己運轉的迴圈(學習捕捉 / 防膨脹 / drift 守門),它們**就是知識層的成長引擎**。完整設計與業界對標見[設計文件 §6.4](https://github.com/Amber-Chang/builder-pm/blob/main/maintainers/design.md)。

> 註:目前這份是「流程說明書」。把它變成一支真正的 `/onboard` slash 指令是之後的事;現階段照這份走即可。

## Codex 驗收（依安裝模式）

本次安裝狀態：{{CODEX_REVIEW_POLICY}}

### Claude-only：停用或選用第二模型

若本次未啟用 Codex review，本節其餘內容僅供日後評估，不阻擋交付。若已啟用，它是 Claude 獨立驗收之外的選用第二模型額外審查，不取代既有 Claude review，也不是 Claude-only runtime 的必要 PR Gate。

### Codex-only／雙平台：必要 PR Gate

Codex 的讀取順序是 `AGENTS.md` → 共用治理正本 `CLAUDE.md`;角色分流由 `.agents/skills/` 的四個 adapter 負責,實際角色契約仍引用 `.claude/agents/`。Codex-only（僅 Codex）保留 `.claude` 是因為這些是兩平台共用合約,**不是 Codex runtime（執行入口）**;Codex runtime 仍是 `AGENTS.md` + `.agents/skills/`。

在 Codex-only 或雙平台安裝中，開發完成後必須啟動一個**全新、唯讀的 Evaluator subagent（子代理）**做本機獨立驗收；若環境無法啟動 subagent,才使用 fallback（備援）指令：

```bash
codex review --uncommitted
```

本機結果只有 `LOCAL PASS` / `LOCAL FAIL`。`LOCAL PASS` 只表示目前工作樹通過本機驗收,**不是 `PR PASS`,也不代表正式交付完成**。

建立正式 GitHub PR 後還有第二階段：Codex-only 或雙平台安裝必須由 `codex-pr-review` 外掛的 `pr-review-agent` 通過正式必要 PR gate（關卡）,結果為 `PR PASS` / `PR FAIL` / `PR REVIEW BLOCKED`。缺少外掛、找不到 PR、GitHub 授權失效或必要知識來源不可讀時,不得略過或把本機結果升格,必須回報 `PR REVIEW BLOCKED`。安裝提示不等於已啟用；請 reload Codex 並確認能找到 `pr-review-agent`。

## 既有專案的開工路徑（Brownfield）

> 你不是 day-0 空專案，而是把 builder-pm 接到一個**已開發到一半的既有 code base**。
> [設計文件 §6.4](https://github.com/Amber-Chang/builder-pm/blob/main/maintainers/design.md)的「薄起步」前提在這裡破了：`.context/` 是空的，但舊知識全藏在 code 裡；brownfield 接入設計見同文件 §6.5。

**四步接入：**

1. **你不是 day-0**——`.context/` 是空的，但既有 code/docs 裡已有知識，直接走 day-N 三迴圈會噪音轟炸（偵測器假設「知識本來就在長」，brownfield 是「從來沒被寫下」）。先補第一層知識。

2. **回填既有脈絡**——Claude Code 跑 `/backfill-context`;Codex 則明確要求它遵循 `.claude/commands/backfill-context.md`。兩者都只產生草稿,仍由 PM 審核與批准後才搬入正式 `.context/`。流程會：
   - 跑 `onboarding/backfill/scan-evidence.cjs` 掃描 code + docs + git（確定性、框上限）
   - 讀 `evidence.json` + 抽看關鍵檔，草擬三份草稿（SYSTEM/modules/GLOSSARY 候選）+ 一份 REPORT 進 `.context/.backfill/`：
     - `SYSTEM.draft.md`（帶信心橫幅 🟢🟡🔴 + 出處）
     - `modules.draft.md`（模組清單）
     - `GLOSSARY.candidates.md`（高頻術語候選）
   - 同時產出 `REPORT.md`（讀了什麼 / 框了多少 / 各份信心 / 怎麼搬正式）

3. **逐份審核 → 改 → 搬正式**——PM 讀每份草稿，確認或修改，再手動複製到正式 `.context/`（`SYSTEM.md` / `modules/` / `GLOSSARY.md`）。草稿在 PM 拍板前**永遠不進正式 `.context/`、永遠不自動 commit**。

4. **回到正常 day-N 三迴圈**——正式 `.context/` 補好後，`context-growth` 偵測器才能正常運作（不再噪音轟炸）。

> 暫存草稿落在 `.context/.backfill/`，已被 `.gitignore` 排除，不會被 `git add -A` 誤收。完整設計見[設計文件 §6.5](https://github.com/Amber-Chang/builder-pm/blob/main/maintainers/design.md)。
