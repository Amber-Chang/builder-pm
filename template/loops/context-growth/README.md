# context-growth（知識層成長偵測器 · Phase 1 種子範本）

新專案 day-0 只有技術棧 + 第一版 PRD，`.context/` 知識層（SYSTEM / GLOSSARY / module specs）是**空殼、隨專案長**。問題不是「該不該補知識」，而是 **PM 會忘記「現在該補了」這個時機**。這支偵測器把時機交給 harness 主動抓：**掃專案、報告「哪些知識該補了」**，而不是叫 PM 被動記得。

> 跟 `anti-bloat/`（防膨脹）對稱：anti-bloat 偵測「規則太多該砍」，context-growth 偵測「知識太少該補」。一收一放，同一套 report-only 哲學。

## 它做什麼 / 不做什麼

| | |
|---|---|
| ✅ 做（Phase 1，本範本） | 確定性偵測（無 LLM、便宜、常開）：靜態讀檔，跨四個面向列「知識層成長報告」 |
| 🚫 不做 | **只報告不攔截**——這是「迴圈」不是「關卡」，永遠 exit 0（除非 project-root 讀不到才 exit 1） |
| 🚫 不做（留給 Phase 2） | 知識內容的**草擬**（補哪一節、寫什麼）——由 AI 草擬、**PM 拍板**。貴的判斷才花成本 |
| 🚫 不做 | SYSTEM「真」偵測——重大結構決策本質是判斷題，**無法可靠自動偵測**，這裡只給 proxy 提醒（見下方檢查 4） |

## 四個檢查 → 四個 bucket（附信心分級）

| # | bucket | 信心 | 讀什麼 | 判定 |
|---|--------|------|--------|------|
| 1 | `graduation_candidates` | **A** | `.governance/lessons/*.md` 的 frontmatter `strikes` | `strikes >= 2`（門檻常數）→ 這條雷一犯再犯，該長成 convention |
| 2 | `glossary_candidates` | **A（有噪音）** | `.context/modules/*.md` + `docs/**/*.md` 的 backtick 識別字術語，減 `.context/GLOSSARY.md` 已收錄者 | 差集 = 候選新術語，**交 PM triage**（不自動收） |
| 3 | `spec_coverage_gaps` | **B（proxy）** | 每個 `.context/modules/<name>.md` vs `docs/04-specs/SPEC-*.{md,yaml}` | 沒有任何 SPEC 的**檔名或內容**提到該 module → 缺口 |
| 4 | `system_section_candidates` | **C（proxy · 低信心）** | 每個 module vs `.context/SYSTEM.md` 內文 | SYSTEM 沒提到該 module → 可能該補一節 |

### 為什麼信心分三級

- **A（畢業）**：訊號硬——`strikes` 是 learning-capture 累積的客觀計數，達門檻幾乎一定該動。
- **A（術語）但有噪音**：抽得準（backtick + snake_case 很少誤判），但「該不該進 GLOSSARY」仍是人的取捨，所以只列候選、不自動收。
- **B（SPEC 缺口 · proxy）**：用「module 名有沒有被 spec 提到」當「有沒有契約覆蓋」的**代理指標**。會有偽陽（module 名剛好沒出現但其實有涵蓋），標 `(proxy)` 提醒人複核。
- **C（SYSTEM · proxy · 低信心）**：SYSTEM 該記的是「重大結構決策」，那是判斷題，**沒有可靠的靜態訊號**。這裡只用「module 名沒出現在 SYSTEM」當最弱的提醒，標 `(proxy, 低信心)`。

### 為什麼 SYSTEM 刻意只做 proxy（不做成死殼）

誠實 > 假裝能做到。把「重大結構決策該不該補一節」硬寫成自動規則，只會產生一個沒人信的死殼偵測（要嘛狂誤報、要嘛全靜音）。所以這裡**明說它是低信心 proxy**：它只回答「有哪個 module 連名字都沒在 SYSTEM 出現過」，把「值不值得補一節」留給人。寧可少做、講清楚，也不假裝。

> ⚠️ **短 module 名的子字串誤判**：檢查 3（SPEC 覆蓋）與檢查 4（SYSTEM 章節）都用「module 名是否為子字串出現」來判斷有沒有覆蓋。**module 名越短、越泛用，誤判率越高**——例如 `id` / `type` / `rule` 這種短名會在大量檔案裡誤命中（明明沒專門涵蓋卻被當成有覆蓋 → false negative，缺口被吞掉）。建議 module 命名 **≥ 6 字元、用夠獨特的名字**（如 `segmentation`、`journey-engine`），讓子字串比對的訊雜比夠高。這是 proxy 的固有限制，不是 bug。

## 跟 learning-capture 怎麼組合

兩個 loop **共用同一份 lesson frontmatter 格式**（`slug` / `tags` / `severity` / `strikes` + body `## 摘要` / `## 觸發情境` / `## 正解`）：

- `learning-capture` 負責**收**——把踩雷教訓寫成 lesson、品質閘把關、`strikes` 隨重犯次數累加。
- `context-growth`（本 loop）負責**讀**——同一批 lesson 的 `strikes` 達門檻 → 列為畢業候選，提醒「該從一次性教訓長成常駐 convention 了」。

因為吃同一份 frontmatter，兩 loop 不需互相 import 也能接力。本 loop 的 frontmatter 解析（`parseFrontmatter` / `parseSections`）刻意與 learning-capture 同形狀。

## 怎麼跑

```bash
node check-context-growth.cjs <project-root>            # 人類可讀報告（四區 + 摘要）
node check-context-growth.cjs <project-root> --json     # 機器可讀輸出（測試靠這個斷言）
node check-context-growth.cjs fixtures/sample-project   # 開箱即看「全部響」的範例報告
node check-context-growth.cjs fixtures/clean-project    # 看「全空」的範例報告（該閉嘴時閉嘴）
```

報告開頭標明「Phase 1 · 確定性偵測 · 只報告不攔截」，分四區列候選，結尾一行摘要計數。

## 怎麼跑測試

```bash
node check-context-growth.test.cjs
```

零外部依賴（只用 Node 內建 `fs`/`path`/`node:test`/`node:assert`）。測試用真實子行程黑箱驗證四個偵測「**該響時會響、不該響時會閉嘴**」（mutation testing 精神，design.md §5.5）：

- 兩個 fixture 假專案——`sample-project`（**該觸發全部四個 bucket**）、`clean-project`（**四個 bucket 全空**）——分別證明「會響」與「會閉嘴」。
- 每個偵測都有正反兩個斷言（如 strikes=2 出現、strikes=1 不出現；不在 GLOSSARY 的術語出現、已在的不出現）。
- 另測：確定性（同輸入連跑兩次輸出一致）、預設報告含四區標題 + exit 0、project-root 不存在 → exit 1。

**治理腳本沒人驗，遲早爛掉沒人發現**——這條鐵則沿用 anti-bloat 直接焊進範本。

## 確定性保證

完全靜態讀檔，**不碰 `Date.now()` / `new Date()` / `Math.random()`**。所有目錄列舉都 `.sort()`、術語/候選輸出都排序去重 → 同一專案任何時候跑、任何機器跑，輸出位元一致（測試裡的「確定性」一案直接斷言這點）。

## 閘規則（沿用 anti-bloat）

report-only，**永遠 exit 0**；唯一 exit 1 = `project-root` 不存在 / 不是目錄 / 讀不到。對照 `gates/`（會擋）是刻意分家：本 loop 是迴圈不是關卡，只負責把時機端到 PM 面前。
