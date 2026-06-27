# PM-AI 開發治理包 · 設計底稿(方案 B)

> 狀態:🚧 進行中 checkpoint ｜ 更新:2026-06-27 ｜ 正本在 builder-pm repo,本機 cora-governance-notes 為同步副本
> 由 brainstorming 對話累積;本檔只記「已拍板」與「待辦」,不重述討論過程。
> 2026-06-27 新增 §2.5 Harness 角色分層(基於 PM 手繪心智圖 + 全 `.claude/` 掃描)。
> 2026-06-27 重心校正:forward 種新專案為主線(非回套 cora);新增 §1.5 種子骨架;盲區報告 `docs/gap-audit.md`。

---

## 1. 目標與已定參數

- **北極星**(2026-06-27 校正):抽出 cora「邊開發邊堆疊」長出來的治理裡**最重要的穩定骨架**,讓**未來新專案一成案(day1)就有可依賴的工作流可跑**(PM 不寫 code 也驅動得動)。重點是 **forward 種新專案,不是 backport 回 cora**。
- **核心比喻**:包 = **種子 + 長樹機制**,不是 cora 長成的整棵樹。cora 後期的複雜度(多模型 / 契約 gate / 跨模型 reviewer)讓每個新專案靠「學習機制」隨需長出來,不是 day1 全內建。
- **範圍**(已定):先萃取**通用種子骨架**;**「套回 cora」降為選用後路**(非主線)。
- **深度**(已定):**文件為主 + 極少硬關卡**(核心永遠 2 個;模組可各帶專屬硬關卡 — 見 gap-audit B2)。
- **方案**(已定):**B = 一頁核心 + 選用模組**,複雜度由「開幾個模組」決定。
- **盲區報告**:`docs/gap-audit.md`(28 個確認盲區);triage 尺從「加回/divergence/config」改為「**種子(day1 必備)vs 該隨專案長出來**」。

## 1.5 種子骨架:新專案 day1 的最小穩定骨架 — ✅ 鎖定(2026-06-27)

> 重心所在。判準:**種子(成案那天必備、ship 進每個新專案)vs 該隨專案長出來(靠學習機制隨需長,不 day1 內建)**。

**🌱 種子(day1 ship):**
- 核心憲章 10 條(§2)
- harness 4 角色 + Coordinator 分流(§2.5)—— PM 不寫 code 也驅動得動的工作流
- 2 個硬關卡(§5)
- 學習機制(§4)**且必須能升級也能降級**(零遵循的規則要自動鬆綁,否則新專案會長成重 cora)
- **冷啟動 onboarding 流程**:第一份 SPEC / CONVENTIONS / SYSTEM 怎麼起、裝包到能上工的引導(模板 ≠ 流程)
- **domain 知識庫容器 + context 載入路由**(空模板;Planner/Generator 的領域脈絡靠這層供給)
- **編碼約定 / 架構禁區空模板**(每專案必填,照抄通用版 = 失效)

**🌳 該長出來(不 ship,隨專案長):**
- 多模型 / `.codex` 第二治理樹(加第二個模型家族才需要)
- 契約一致性 gate / codegen drift(有規格契約才需要)
- 跨模型 reviewer 的 false-positive 校準 / Rescue 例外(有第二模型才需要)
- drift 容忍中間層、real-path UAT、Engineer-led 輕量路徑、併發鎖定 / worktree、branch hygiene 三段式

**🔧 種子本身要補的缺陷(來自 gap-audit,做實體檔時處理):**
- 學習迴圈對稱化(升級 + **降級** / 規則 fitness review)
- 冷啟動流程(目前只有空模板,缺「怎麼起步」的流程)
- 捕捉引擎要真的會動 —— **§4「半自動 hook 捕捉」cora 其實沒有**,屬淨新建待實作(見 §4 校正)
- 跨專案版本治理(可重用包必備:核心/模組更新怎麼傳到 N 個已裝專案)

> 完整 28 盲區 + triage 見 `docs/gap-audit.md`。

## 2. 核心憲章(一頁 / 10 條 / 4 桶)— ✅ 鎖定

```
A. 動手前(想清楚)
  1. 不猜就問 / 先驗證 —— 事實問題先讀檔或跑工具,不確定就問,禁「應該是/我猜」
  2. 簡單優先 —— 只寫最小可解,不臆測功能/抽象/防呆            (Karpathy)
  3. 改之前先講「計畫+風險+選項」→ PM 拍板才動
B. 動手時(有紀律)
  4. 探索 vs 開發分模式 —— 探索=唯讀絕不動;開發=照第3條
  5. 外科手術式改動 —— 只動該動的,配合既有風格,不順手重構/刪無關碼  (Karpathy)
C. 交付時(可信+乾淨)
  6. 完成 = 驗證過 —— 不准自己說「looks good」,要附跑過的指令+結果
  7. 發現風險標出來給 PM,不默默處理
  8. 本機 AI 產物不進產品 commit/PR                          ★硬關卡①★
  9. commit/PR 寫緊 —— 標 [AI-ASSISTED] / 不確定標 [NEED-REVIEW] / 不寫流水帳
D. 之後(會學習)
  10. 踩過的雷寫進 repo 的 LESSONS;同雷 ≥2 次 → 升級成規則/關卡/skill/升包
```
口訣:**想清楚 → 有紀律 → 可信乾淨 → 會學習**

## 2.5 Harness:角色分層與 block 分流(agent 團隊)— ✅ 鎖定(2026-06-27)

> 來源:PM 手繪 harness 心智圖(2026-06-27)+ cora `.claude/HARNESS-ROLES.md`(5 角 / 3 紀律)+ 全 `.claude/` 掃描(實證:9 個 agent 定義骨架 100% 一致、零例外)。

### 2.5.1 交付線 = 4 個角色的流水線

```
你(人)⇄ Coordinator ──派工──→ Planner ──派工──→ Generator ──提交審查──→ Evaluator
        (Main agent)         (PM agent)        (Dev / UX agent)      (code reviewer)
          ↑                  brainstorm        SDD + TDD            交互檢查
          │                  → PRD/SPEC                                 │
          └────────────────── 發現 block,回報 ←──────────────────────────┘
```

- **角色 ≠ agent 名字**(沿用 cora 正交原則):同一個 agent 可戴不同帽子。cora 原本 5 角的第 5 角「Read-only 探索」在本包併入核心原則 #4(探索模式),交付線上只剩 4 角。

### 2.5.2 block 分流:Coordinator 是「分流大腦」,不是傳聲筒

Evaluator 發現 block **不直接踢回 Generator**(那會逼「寫 code 的」去修「規格沒寫清楚」的問題 → 無限迴圈)。改成回報 Coordinator,由 Coordinator 判**根因在哪一層**再分流:

| 根因層 | 症狀 | 踢回 |
|--------|------|------|
| 實作層 | code 寫錯 / 沒跑過 test / 漏 edge case | → Generator 修 |
| 規格層 | SPEC 沒講清楚 / 自相矛盾 / 漏了某情境 | → Planner 補 SPEC |
| 判斷層 | 兩 AI 各執一詞 / 商業取捨 / 動到高風險面 | → escalate 給 Human |

**逃生門(防 Coordinator 自己誤判)**:同一個 block 繞 ≥ 2 次仍未解 → **強制 escalate Human**,Coordinator 不准再自己分流。對應 cora「連續 2 次同問題 = 規則/判斷本身有問題」的計數邏輯,也呼應「禁止反射性 retry,先產根因分析」。

### 2.5.3 三條交接鐵律(焊進每個 agent 檔,不靠 PM 記)

1. **Generator 不自評** —— 回報只陳述事實(跑了什麼指令 + 結果),禁「looks good / 應該沒問題」品質判斷。
2. **Generator → Evaluator 強制交接** —— Evaluator 必須**與 Generator 不同 agent**;PASS / FAIL 都要附可驗證證據(指令輸出 + 引用行號)。
3. **Planner / Evaluator 不寫 production code** —— Evaluator 發現 bug **不准自己改**,回報 Coordinator 重新派 Generator(保獨立性)。

### 2.5.4 通用 vs cora:框是通用、框下的工具是 cora 填的

PM 心智圖每個角色框「下面那行字」全是 cora 的**工具選擇**,不是角色本身 —— 這天然分好了通用核心與專案配置:

| 角色框(🟢 通用·進核心) | cora 的填法(🔴 可抽換) | 在通用包是 |
|------|------|------|
| Coordinator | Main agent · PM 直接對話 | 核心 + 名冊 config(誰當) |
| Planner | PM agent · `brainstorming` → PRD/SPEC | 核心 + 模組⑤ |
| Generator | dev / UX agent · `openspec` 的 SDD+TDD | 核心 + 模組③ + config(用不用 openspec)|
| Evaluator | code reviewer · Claude × Codex 交互檢查 | 核心 + 模組② |

### 2.5.5 放進包的三層

- **核心 +1 鐵律**:4 帽不混戴 / 最少做到「寫的 ≠ 驗的」(永遠在,連單人專案配一個 AI 也適用 —— 用另一個 session/agent 來驗即達成)。
- **模組②(雙人驗證)** 吃下 鐵律 1+2 細節 + 「**空白員工合約**」agent 骨架模板(回報紀律 / 禁止 / Composition 三段預先填好,技術棧留白)。
- **模組④(多 agent 派工)** 吃下 角色表 + 6 派工 pattern(Pipeline / Fan-out / Expert Pool / Producer-Reviewer / Supervisor / Hierarchical)+ 角色↔agent 對照表模板;標「專案夠大才開」。
- **名冊內容**(養哪些 agent、什麼技術棧)= **專案 config**,不進通用包。

### 2.5.6 待補的洞(對應 PM 圖)

- **洞 2:工具 vs 紀律要分層** —— PM 圖把 Generator 寫成「轉成 openspec 的 SDD+TDD」,但 openspec 綁特定 CLI(掃描歸 cora 專屬)。通用包要把「**SDD+TDD 是紀律**」與「**openspec 是 cora 選的工具**」分兩層,別專案抽換工具不影響紀律。cora 自己照用 openspec 沒問題。

## 3. 模組清單(選用,按專案形狀開)— ✅ 鎖定(細節可微調)

| 模組 | 何時開 | 含硬關卡 |
|------|--------|:---:|
| ① 寫 code 品質 = `karpathy-guidelines` skill | 會寫 code | — |
| ② 雙人驗證 harness(寫的≠驗的;覆蓋 code + 契約 docs) | 要可信交付 | ✅ code |
| ③ Backend / TDD(改 service/RBAC/audit/migration 先寫失敗 test) | 有後端 code | — |
| ④ 多 agent 派工(main 派工 SOP + sub-agent 回報) | 任務大到要拆 | — |
| ⑤ 契約文件(SPEC 驅動 + 交叉引用驗證) | 有規格契約 | — |
| ⑥ PR 合併防呆(conflict/base/CI gate) | 用 GitHub PR | — |

開法範例:簡單新專案=核心+①②;cora=核心+全開。

## 4. 記憶 / 學習模組 — ✅ 鎖定(本次重點,最完整)

> ⚠️ 2026-06-27 校正(gap-audit):(1) 本節「半自動捕捉」的 hook 在 cora **不存在**(無 Stop/SessionEnd hook、捕捉 100% 手寫且停更 45 天)→ 屬**淨新建待實作**,非從 cora 萃取;(2) 畢業只有「升級」是單向缺陷,需補對稱**降級**(零遵循/高 override 的規則自動列鬆綁候選),見 §1.5。

**存**:markdown + YAML frontmatter,**進 repo、每專案各有**(不放 ~/.claude,換機不丟、交接看得到)。
```
<repo>/.governance/
  LESSONS.md          # 一行索引 × N(開機載,永遠輕)
  lessons/<slug>.md   # 一雷一檔 + frontmatter(tags / severity / strikes)
```
> 界線:只有「精選教訓」進 repo;telemetry/.jsonl 永遠不進(沿用既有 Rule)。

**捕捉**:**半自動 —— AI/hook 主動,PM 只點頭**(PM 從不需「記得觸發」)。
| 觸發 | 誰發起 | PM 動作 |
|------|--------|---------|
| 機器可判定失敗(gate擋/CI紅/harness FAIL) | `Stop`/`SessionEnd` hook 自動記候選 | 不用(事後看) |
| AI 判讀失敗(PM 糾正 / 返工) | AI 當場草擬一行 | 一鍵點頭/改 |
| 收尾 nudge(session 結束問「有沒有該記的雷」) | hook/AI | 一鍵點頭 |
| `/lesson` 指令 | PM(可選後門) | 想補才打 |

**判定式**:`(出事或差點出事) 且 (會再發生/對下次有用)`;過濾一次性 typo / 純環境問題 / 已有教訓涵蓋(→ 那條 strike+1)。

**品質閘**:硬性教訓模板(學 Hermes HARDLINE)—— 一條必須含:一行摘要≤N字 + 觸發情境 + 正解 + tags + strikes。不合格不收。**靠寫入即精簡防肥,不上 RAG/SQL。**

**畢業**:strike 2 → 升級成 規則 / 硬關卡 / skill / 升上包(通用教訓播種未來專案)。

**不做**:RAG、SQLite/向量庫(過度工程;規模不到。要 filter 用 frontmatter,要 session 搜尋未來用 FTS5 關鍵字,與 LESSONS 分離)。

**參考來源**:Hermes-agent 真實程式碼 —— `agent/memory_manager.py`(turn 前 prefetch / turn 後 sync 的生命週期)+ `agent/learn_prompt.py`(`/learn` 顯式蒸餾 + HARDLINE 品質標準)。README 的「periodic nudge」查證為行銷話術,程式碼無此機制。

## 5. 硬關卡(共 2 個)— ✅ 鎖定

> 整個包只有「2 個自動攔截」,其餘全是「建議」。攔截=做錯直接擋住,AI 講不過去。

**白話:**
- **攔截 ①「包包檢查」**:每次 AI 要把改動收進專案前,自動看有沒有夾帶到「AI 自己的草稿/紀錄檔」,有就擋下來要先拿掉。
- **攔截 ②「兩個簽名」**:AI 想把寫好的**程式碼**(不含文件)收進專案時,自動檢查「有沒有另一個審查者簽過名」,沒有就擋。
  - 極限:只能確認「有人簽名」,不能確認審查有認真做 → 是「別忘記找人看」的減速丘,不是品質保證;真品質靠模組②雙人審查。
  - 只擋程式碼,不擋文件(機器看不出文件有沒有被認真審)。

**實作(沿用 cora 現成,抽象成通用版):**
- 兩個都做成「每次存檔必跑的客戶端檢查」;CI 版當選用加強(各家 CI 不同,不強綁)。
- ① 比對「要收進去的檔名」是否命中可設定的 AI 產物清單(刪除放行);沿用 cora `no-claude-telemetry-leak` 模式。
- ② 偵測有無程式碼改動 + commit 訊息有無簽核字樣;沿用 cora `pre-commit-codex-check` 模式,把「codex」抽象成「evaluator」。跳關沿用(純文件/翻譯/rename / PM 明文 override / 工程師自負+留紀錄)。
- 安裝:包附「一鍵設定」,丟進新專案就自動開啟,不用手接線。

## 6. 套回 cora(選用後路,非主線)— ⬜ 待執行

> 2026-06-27 重心校正後,「套回 cora」**降為選用後路**:主線是 forward 種新專案(§1 / §1.5)。若哪天要把輕量包裝回 cora 取代舊治理,以下仍適用,但不是這個包的存在理由。

3 件事:
1. **對照搬家** —— cora 每條舊治理逐一決定:進新核心 / 變模組 / 退休。
2. **救回記憶** —— `~/.claude` 那 23 條教訓(換機就不見)搬進 repo 的 `.governance/LESSONS`,交接看得到。
3. **開 2 個攔截** —— 在 cora 打開「包包檢查」+「兩個簽名」。

## 7. 待辦 open items

- [x] 在 GitHub 開新 repo(builder-pm),把這個包做成真的可重用專案(← PM 2026-06-26 決定)
- [x] Harness 角色分層定案 → §2.5(← PM 手繪圖 2026-06-27)
- [x] 重心校正 forward-first + 新增 §1.5 種子骨架(← PM 2026-06-27)
- [x] 全治理盤點 → 28 盲區報告 `docs/gap-audit.md`
- [ ] **種子缺陷 4 修**(學習迴圈補降級 / 冷啟動流程 / 捕捉引擎真的會動 / 跨專案版本治理)
- [ ] 把種子骨架(§1.5 🌱 那串)寫成實體檔案 + agent 骨架模板(空白員工合約)
- [ ] 洞 2:核心把「SDD+TDD 紀律」與「openspec 工具」分兩層寫(§2.5.6)
- [ ] 「該長出來」清單(§1.5 🌳)做成進階模組 / known-divergence,**非主線**
- [ ] (選用後路)套回 cora 的對照搬家(§6;可用 gap-audit + 全 `.claude/` 掃描當底稿)
