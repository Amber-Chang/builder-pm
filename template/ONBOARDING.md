<!-- [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-28 -->
<!-- 功能：新專案裝上 builder-pm 後的開工指南——從空白走到真的能開始做。對應 docs/design.md §4.3。 -->

# 新專案開工指南（Onboarding）

> 給剛把 builder-pm 裝進新專案的 PM。只回答一個問題:**從空白到真的能開始做,怎麼走?**

## 心法:薄起步,邊做邊長

新專案 day-0,你手上頂多兩樣東西:**想用什麼技術** + **一份需求草稿(PRD)**。就從這兩樣開始。

那些大文件(系統總覽、術語表、約定、模組規格)**先留空,邊做邊長** —— 不要 day-0 硬填你還沒有資訊的東西。

> ⚠️ 這是舊版本(amber-stack)踩過的坑:它一開工就叫你「去填 SYSTEM.md / GLOSSARY.md」,但第一天你根本還沒有架構決策、還沒 spec 過任何功能,填不出來。builder-pm 修掉了這個「早問」。

## Day-0:四步起步

1. **選技術棧 + 基本資訊**(之後由安裝腳本問;先想清楚:後端 / 資料庫 / 前端 / 要不要 SDK)。
2. **寫第一版 PRD** —— 用 brainstorming 把「想做什麼」變成一份需求草稿。這是你的第一份產出。
3. **(選用,建議留)跑一次極小的真任務** —— 例如改個 README 一行,走完整「派工 → 驗證 → 收進專案」一輪,讓你 day-1 就親眼看到這套 AI 流程真的會動、長什麼樣。覺得多餘可以跳。
4. **記住:`.context/` 是空的、會邊做邊長** —— 別現在硬填 SYSTEM / GLOSSARY。

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

冷啟動能「薄」,是因為 builder-pm 有三個會自己運轉的迴圈(學習捕捉 / 防膨脹 / drift 守門),它們**就是知識層的成長引擎**。完整設計與業界對標見 `docs/design.md` §4.3。

> 註:目前這份是「流程說明書」。把它變成一支真正的 `/onboard` slash 指令是之後的事;現階段照這份走即可。

## 既有專案的開工路徑（Brownfield）

> 你不是 day-0 空專案，而是把 builder-pm 接到一個**已開發到一半的既有 code base**。
> §4.3 的「薄起步」前提在這裡破了：`.context/` 是空的，但舊知識全藏在 code 裡。

**四步接入：**

1. **你不是 day-0**——`.context/` 是空的，但既有 code/docs 裡已有知識，直接走 day-N 三迴圈會噪音轟炸（偵測器假設「知識本來就在長」，brownfield 是「從來沒被寫下」）。先補第一層知識。

2. **在 Claude 跑 `/backfill-context`**——指令會自動：
   - 跑 `onboarding/backfill/scan-evidence.cjs` 掃描 code + docs + git（確定性、框上限）
   - 讀 `evidence.json` + 抽看關鍵檔，草擬三份草稿（SYSTEM/modules/GLOSSARY 候選）+ 一份 REPORT 進 `.context/.backfill/`：
     - `SYSTEM.draft.md`（帶信心橫幅 🟢🟡🔴 + 出處）
     - `modules.draft.md`（模組清單）
     - `GLOSSARY.candidates.md`（高頻術語候選）
   - 同時產出 `REPORT.md`（讀了什麼 / 框了多少 / 各份信心 / 怎麼搬正式）

3. **逐份審核 → 改 → 搬正式**——PM 讀每份草稿，確認或修改，再手動複製到正式 `.context/`（`SYSTEM.md` / `modules/` / `GLOSSARY.md`）。草稿在 PM 拍板前**永遠不進正式 `.context/`、永遠不自動 commit**。

4. **回到正常 day-N 三迴圈**——正式 `.context/` 補好後，`context-growth` 偵測器才能正常運作（不再噪音轟炸）。

> 暫存草稿落在 `.context/.backfill/`，已被 `.gitignore` 排除，不會被 `git add -A` 誤收。完整設計見 `docs/design.md §4.4`。
