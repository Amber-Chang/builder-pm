# PM-AI 開發治理包 · 設計底稿(方案 B)

> 狀態:🚧 進行中 checkpoint ｜ 更新:2026-06-28 ｜ 正本在 builder-pm repo(唯一正本;原 cora-governance-notes 副本 2026-06-28 起停止同步 — 同一事實兩處會 drift,見 §5.5)
> 由 brainstorming 對話累積;本檔只記「已拍板」與「待辦」,不重述討論過程。
> 2026-06-27 新增 §2.5 Harness 角色分層(基於 PM 手繪心智圖 + 全 `.claude/` 掃描)。
> 2026-06-27 重心校正:forward 種新專案為主線(非回套 cora);新增 §1.5 種子骨架;盲區報告 `docs/archive/gap-audit.md`。
> 2026-06-28 全治理 **116 檔逐檔深讀**(取代片段盤點)→ `docs/archive/inventory-deep.md`;本檔套入 6 條修正(模組⑥跨樹依賴 / OpenSpec 雙軌 / 雙語+去硬編+未啟用≠死碼 / error-patterns 修正 / fail-closed 閘+機密衛生 / 派工貼引文+model 分層)。
> 2026-06-28 新增 §5.5 Drift 守門 + `gates/drift-fact-check` 範本;翻 cora 出生史確認 **amber-stack = builder-pm v1**,v2 定位 = v1 種子 + 三個自我維持迴圈(防膨脹/學習/drift),見 §1。
> 2026-06-28 新增 §4.1 防膨脹(規則降級)迴圈 + `loops/anti-bloat/` 範本(grounding:Hermes `Curator` OSS + cora 自身鐘擺 telemetry;雙背書)。
> 2026-06-28 新增 §4.2 學習捕捉引擎 + `loops/learning-capture/` 範本(grounding:Hermes `background_review` 自動捕捉);**自我修正**舊筆記「Hermes 沒自動 nudge=行銷話術」之誤(Rule #12)。§1 北極星 PM 角色校準=治理包非 runtime。三迴圈設計全鎖定。
> 2026-06-28 新增 §4.3 冷啟動 onboarding + 知識層成長偵測(種子缺陷 #2);grounding v1 `setup.sh` + cora `.context/` 真實成長史 + 三迴圈當成長引擎。修 v1「day-0 叫 PM 填 SYSTEM」早問 bug。偵測「何時該填」**誠實分級**:GLOSSARY/conventions 可確定性偵測、SYSTEM 是判斷題只能 proxy(Rule #12 不過度承諾 + §5.5 死殼鐵則)。prototype `loops/context-growth/`(commit f8376f0,codex 審無 BLOCK)。
> 2026-06-28 新增 §1.6 更新模型(PM 拍板「刻意不做跨專案推送」);種子缺陷 #4 結論=決定不建自動 propagation(scaffold 非 live dependency,grown 內容永不覆蓋)。**四個種子缺陷至此全結案。**
> 2026-06-28 新增 §1.7 安裝架構(薄核心 + opt-in 模組走 plugin 介面)+ §2.5.7 skill 路由層;PM 逐步拍板:4 角色全套 / `SKILLS.md` 單一正本 + 3 通用 skill 預接 / openspec+Codex 審查走 opt-in 且設計成「裝 plugin」介面(非搬檔)/ review-agent 抽獨立 plugin = seed 後下一里程碑 / openspec 歸 Generator 做 SDD(修對話誤標,對回 §2.5.4)。

---

## 1. 目標與已定參數

- **北極星**(2026-06-27 校正;2026-06-28 PM 再校準角色):抽出 cora「邊開發邊堆疊」長出來的治理裡**最重要的穩定骨架**,讓**未來新專案一成案(day1)就有可依賴的工作流可跑**。重點是 **forward 種新專案,不是 backport 回 cora**。
  - **PM 角色(2026-06-28 PM 親口校準,取代舊說「PM 不寫 code 也驅動得動」)**:harness 的目的是讓 **PM 在需求明確時,靠 AI 輔助 + 各種 harness 機制,開發出「幾乎可上線的產品原型」**;部署 / 壓測 / 更深的技術細節仍交資深工程師。→ 直接定調 builder-pm 是**治理包(riding Claude Code 的 hook)非自建 runtime**:目標是把需求變成可上線原型,不是去維護一個 agent 執行環境(那偏離北極星,連 portfolio 論述都歪)。
- **核心比喻**:包 = **種子 + 長樹機制**,不是 cora 長成的整棵樹。cora 後期的複雜度(多模型 / 契約 gate / 跨模型 reviewer)讓每個新專案靠「學習機制」隨需長出來,不是 day1 全內建。
- **血統與 v2 定位**(2026-06-28,翻 cora 出生史得出):builder-pm **不是從零發明**。cora 是 2026-03 從模板 **`amber-stack`**(`tvbs-amberchang`,private)scaffold 出來的,而 amber-stack 自述就是「AI collaboration framework for PM-driven product development with Claude Code」—— builder-pm 的**同一使命**。所以 **amber-stack = v1**(已驗證好用:結構 / 12-agent 團隊 / 4 條設計原則含 Single Source of Truth / `setup.sh` 冷啟動問答 / `{{placeholder}}` 填空)。
  - **但 v1 只有「種子」、沒有「長樹機制」** → 種下去就沒人管 → 三個症狀:**會膨脹 / 不會自我精進 / 抓不到文字+code drift**(amber-stack 明寫了「每條規則只存一處」,cora 還是 drift 成 README 12 條 vs CLAUDE 13 條 → 證明**寫下原則 ≠ 守得住**)。
  - **builder-pm = v2 = amber-stack 種子 + 三個自我維持迴圈**(這就是 §7「種子缺陷 4 修」存在的理由):
    - **防膨脹迴圈** —— 規則零遵循自動鬆綁/退役(不只會加)→ §4.1 + §1.5 種子缺陷 #1 · 🚧 設計鎖定 + 種子 prototype(`loops/anti-bloat/`)
    - **學習迴圈** —— 踩雷自動捕捉 → 累積 → 畢業成規則 → §4.2 種子缺陷 #3 · 🚧 設計鎖定 + 種子 prototype(`loops/learning-capture/`,grounded Hermes `background_review`)
    - **drift 守門迴圈** —— 文字/契約不一致會擋 → §5.5 · ✅ 已建可跑 prototype
  - 一句話:**v1 給你會枯的漂亮盆栽;v2 加上會自己澆水/修枝/不亂長的機制。**
- **範圍**(已定):先萃取**通用種子骨架**;**「套回 cora」降為選用後路**(非主線)。
- **深度**(已定):**文件為主 + 極少硬關卡**(核心永遠 2 個;模組可各帶專屬硬關卡 — 見 gap-audit B2)。
- **方案**(已定):**B = 一頁核心 + 選用模組**,複雜度由「開幾個模組」決定。
- **盲區報告**:`docs/archive/gap-audit.md`(28 個確認盲區);triage 尺從「加回/divergence/config」改為「**種子(day1 必備)vs 該隨專案長出來**」。

## 1.5 種子骨架:新專案 day1 的最小穩定骨架 — ✅ 鎖定(2026-06-27)

> 重心所在。判準:**種子(成案那天必備、ship 進每個新專案)vs 該隨專案長出來(靠學習機制隨需長,不 day1 內建)**。

**🌱 種子(day1 ship):**
- 核心憲章 10 條(§2)
- harness 4 角色 + Coordinator 分流(§2.5)—— PM 不寫 code 也驅動得動的工作流
- 2 個硬關卡(§5)
- 學習機制(§4)**且必須能升級也能降級**(零遵循的規則要自動鬆綁,否則新專案會長成重 cora)
- **冷啟動 onboarding 流程**:第一份 SPEC / CONVENTIONS / SYSTEM 怎麼起、裝包到能上工的引導(模板 ≠ 流程)→ ✅ 設計鎖定 §4.3(薄起步 + 知識層成長偵測)
- **domain 知識庫容器 + context 載入路由**(空模板;Planner/Generator 的領域脈絡靠這層供給)
- **編碼約定 / 架構禁區空模板**(每專案必填,照抄通用版 = 失效)
- **雙語慣例表**(繁中產品 day1 必備):code 註解 / godoc / 變數 = 英文;markdown 正文 / commit / PR / issue = 繁中;yaml structural keys / enum / ID 保留英文。附反例「PM 講中文 ≠ 註解也寫中文」;派工 prompt 模板要預填此邊界(否則派 sub-agent 收到全英文交付)
- **provenance 去硬編紀律**:做實體檔前全 repo 掃 `/Users/`、repo slug、token/key,一律改 templated/env 佔位;種子 settings 模板絕不含明文 secret(cora 現狀 `settings.local.json` 明文存 key = 反例)
- **盤點分類紀律「未啟用機制 ≠ 死碼」**:逐檔裁決前先看讀/寫路徑是否接線;「地基鋪好尚未接線」(如 cora `error-patterns.json`)不是死碼,別反射性砍(此尺直接防 §6 對照搬家砍錯承重牆)
- **Drift 守門原則**(§5.5):文件 DRY(同一事實只寫一處)> 偵測;任何 drift checker 必附測試否則不准進包(cora 親身教訓:死殼 + 維護怪獸)

**🌳 該長出來(不 ship,隨專案長):**
- 多模型 / `.codex` 第二治理樹(加第二個模型家族才需要)⚠️ 但**不是純可選**:模組⑥(PR 防呆)對 `.codex/review-agent/lib/github.cjs` 有 live `require` 依賴 → 要帶 ⑥ 就得內聯該 helper 或連帶拉進這支 lib,不能「砍 .codex + 留 ⑥」並存(見 §3 註)
- 契約一致性 gate / codegen drift(有規格契約才需要)
- 跨模型 reviewer 的 false-positive 校準 / Rescue 例外(有第二模型才需要)
- drift 容忍中間層、real-path UAT、Engineer-led 輕量路徑、併發鎖定 / worktree、branch hygiene 三段式

**🔧 種子本身要補的缺陷(來自 gap-audit,做實體檔時處理):**
- 學習迴圈對稱化(升級 + **降級** / 規則 fitness review)→ ✅ 設計鎖定 §4.1 + 🚧 prototype `loops/anti-bloat/`(照 Hermes Curator DNA + override 訊號)
- 冷啟動流程(目前只有空模板,缺「怎麼起步」的流程)→ ✅ 設計鎖定 §4.3(薄起步 + 知識層成長偵測;修 v1「day-0 填 SYSTEM」早問 bug)· 🚧 prototype `loops/context-growth/` 待派工
- 捕捉引擎要真的會動 —— **§4「半自動 hook 捕捉」cora 其實沒有** → ✅ 設計鎖定 §4.2 + 🚧 prototype `loops/learning-capture/`(grounded Hermes `background_review`,觸發走 Claude Code hook 非自建 runtime)
- 跨專案版本治理(可重用包必備:核心/模組更新怎麼傳到 N 個已裝專案)

> 完整 28 盲區 + triage 見 `docs/archive/gap-audit.md`。

## 1.6 更新模型:開工模板,非自動更新套件 — ✅ 鎖定(2026-06-28,PM 拍板「刻意不做跨專案推送」)

> 對應 §7 種子缺陷 #4「跨專案版本治理」。**結論:刻意不建自動推送引擎**;#4 = 「想清楚後決定不做」,非遺漏。

**判斷**:builder-pm 是 **scaffold(開工模板),不是 live dependency(會自動更新的套件)**。裝進新專案後,專案就「長成自己的樣子」,硬把核心/模組更新推回去會與長出來的內容打架(PM 2026-06-28 洞見:「都長成那專案的樣子了,更新下去搞不好互斥」)。

**兩類內容、兩種待遇**:

| 內容 | 更新待遇 |
|------|---------|
| 引擎/機制(`loops/*` `gates/*` 的 code、hooks、核心憲章)| 專案不手改 → **可手動重新拉**新版(無衝突);不自動推 |
| 專案長出來的(`.context/` 知識層、`.governance/` lessons/conventions)| **永不覆蓋** —— 各專案本就該分歧,這是設計目的 |

**刻意不做**:跨 N 專案的自動 propagation 引擎(版本廣播 / 自動 merge)。某專案要某支引擎修補 → 自己手動重新拉那幾支檔即可;無中央推送、無自動 merge。

**業界佐證(≥3,portfolio;對應 Rule #7)**:

| 對標 | 證據 |
|------|------|
| **cookiecutter** | scaffold 完即你的、不回流更新 —— 主流模板工具預設 |
| **copier / `rails app:update`** | 少數「想支援模板更新」的,用 3-way merge → **實際會產生衝突**,正是 PM 擔心的「互斥」的實證 |
| **npm / library 模型** | 更新能流動**只因**你不改 `node_modules`;一旦 fork 改它更新就回不去 —— 印證「不手改的才可更新」分界 |

**結論**:四個種子缺陷(#1 防膨脹 / #2 冷啟動 / #3 捕捉引擎 / #4 跨專案版本治理)**至此全結案**(#1#2#3 = 建機制;#4 = 決定不建、記錄理由)。

## 1.7 安裝架構:薄核心 + opt-in 模組(走 plugin 介面)— ✅ 鎖定(2026-06-28,PM 逐步拍板)

> 里程碑:把 builder-pm 從「設計稿 + 散裝範本」變成**真能一鍵安裝的包**(`setup.sh` 問答 → 填 `{{placeholder}}` → 砍用不到 → `git init`)。amber-stack(v1)的 `setup.sh` 為問答骨架;v2 把「會裝進新專案的東西」圈進 `template/`,界線比 v1 乾淨(v1 設計稿與種子混在 repo 根、靠 setup.sh 手動砍)。

**PM 戳到的接縫 ①scaffold vs ②tool**:builder-pm 混了兩種「散佈方式天生不同」的內容 ——

| 類型 | 例子 | 天生散佈方式 |
|------|------|------------|
| **① 鷹架**(複製一次、專案自己擁有、會改)| 核心憲章 · 4 角色合約 · `.context` 模板 · loops/gates 紀律 | 留在 seed / `setup.sh`(copy-once)|
| **② 工具**(要版本控管、會更新、多專案共用)| `review-agent` · openspec · skill 包 | **變 plugin**(install + 版本 + 更新)|

**薄核心(always-on,每個新專案都有)**:`CLAUDE.md`(§2 憲章)· `.claude/agents/{coordinator,planner,generator,evaluator}.md`(空白員工合約)· `SKILLS.md` + 3 通用 skill(§2.5.7)· `.context/` 四空模板 · `loops/`+`gates/` · `ONBOARDING.md` · `setup.sh`。

**opt-in 模組(`setup.sh` 問「要不要裝」)**:
- **openspec** → Generator 的 SDD 流程(§2.5.7);選了才跑 `openspec init` 生最新 skill,標明需先裝 CLI。
- **Codex 雙模型審查** → `review-agent` + `pr-review-agent` skill 接成 Evaluator 第二模型;沒裝時 Evaluator 用單模型獨立審(鐵律「寫的≠驗的」仍在)。

**關鍵設計:opt-in 模組設成「裝 plugin」介面,不把 ② 類工具搬進 `template/`**。理由:② 是重型 + 會更新,vendor 進種子 = 過期 + 養肥(撞 §1.5 anti-bloat)。
- `review-agent` 已驗證**自給自足**(只用 Node 內建 + 內部 require、52K、無外部套件無硬編 key)→ 天生 plugin 形狀 → **抽成獨立 repo + plugin = seed 之後的下一個里程碑**。
- **Codex 做得成 plugin**(查證:superpowers plugin 同時帶 `.claude-plugin/` + `.codex-plugin/` + `hooks-codex.json` 多介面 adapter)→ 不必每專案手抄 `.codex/skills`。
- 過渡期(plugin 未生)`setup.sh` 的模組選項暫指向 cora 既有並標明;介面 forward-compatible,plugin 落地後把「copy 檔」換成「install plugin」即可,核心不動。

**這是 §1.6 的成熟版,不是推翻**:§1.6 說「引擎可手動重拉新版」—— plugin 就是「手動重拉」的**正式機制**(版本化、像 npm/VS Code 外掛)。§1.6 的 scaffold≠live-dependency 仍成立:① 鷹架 copy-once 不回流;② 工具走 plugin 才有受控更新流。

**業界佐證(≥3,portfolio;對應 Rule #7)**:

| 對標 | 證據 |
|------|------|
| **cookiecutter / rails new** | 鷹架 copy-once、你自己擁有 → 對應 ① 留 seed |
| **npm / VS Code Marketplace** | 工具版本化、可更新、多專案共用 → 對應 ② 走 plugin |
| **VS Code `.vscode/extensions.json`** | 只**推薦**外掛、不把外掛塞進 repo;裝不裝 / 哪版留給專案 → 對應 SKILLS.md「推薦不綁死」(§2.5.7)|
| **superpowers plugin** | 一個 repo 帶多介面 adapter → 實證「Codex 工具做得成 plugin」|

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

**派工紀律(讓分流不淪空殼)**:Coordinator / Planner 派 Generator 時,要把該讀的 SPEC / 契約引文**摘要貼進 prompt 內文**,不是丟一個連結 —— 實證(cora #214)丟連結 → LLM 跳讀漏掉某段 → 違約。「有 context 路由」不等於「路由真有效」。

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

> **model 分層 by role(harness 成本/延遲槓桿)**:cora 用高檔模型(opus)給 Planner / 契約決策(architect / product-copilot)、標準檔(sonnet)給 Generator / Evaluator / 協調(dev / reviewer / qa / main)。這是「依角色調 harness 檔次」的現成成本槓桿 → 種子的名冊 config 該預留「角色 → 模型檔次」欄位。

### 2.5.5 放進包的三層

- **核心 +1 鐵律**:4 帽不混戴 / 最少做到「寫的 ≠ 驗的」(永遠在,連單人專案配一個 AI 也適用 —— 用另一個 session/agent 來驗即達成)。
- **模組②(雙人驗證)** 吃下 鐵律 1+2 細節 + 「**空白員工合約**」agent 骨架模板(回報紀律 / 禁止 / Composition 三段預先填好,技術棧留白)。
- **模組④(多 agent 派工)** 吃下 角色表 + 6 派工 pattern(Pipeline / Fan-out / Expert Pool / Producer-Reviewer / Supervisor / Hierarchical)+ 角色↔agent 對照表模板;標「專案夠大才開」。
- **名冊內容**(養哪些 agent、什麼技術棧)= **專案 config**,不進通用包。

### 2.5.6 待補的洞(對應 PM 圖)

- **洞 2:工具 vs 紀律要分層** —— PM 圖把 Generator 寫成「轉成 openspec 的 SDD+TDD」,但 openspec 綁特定 CLI(掃描歸 cora 專屬)。通用包要把「**SDD+TDD 是紀律**」與「**openspec 是 cora 選的工具**」分兩層,別專案抽換工具不影響紀律。cora 自己照用 openspec 沒問題。 → ✅ 2026-06-28 落地 §2.5.7:openspec 歸 Generator SDD、走 opt-in(§1.7);紀律與工具正式分兩層。
- **洞 3:自家 SPEC 系統 vs OpenSpec「二選一」** —— cora 同時有自家 `docs/04-specs/SPEC-*` 與一整套 OpenSpec(CLI + `openspec/` 目錄 + propose/apply/archive/explore 四件套 skill),兩套平行且**命令撞名**(`explore` vs `opsx:explore`、`cora-start` vs `opsx:propose`)。種子**預設只帶一套** spec/propose/explore 流程;OpenSpec 整套標為 **cora 選用工具(grow)**,新專案明確要才開,否則兩套打架、PM 困惑。 → 2026-06-28 修正:openspec 改走 **first-class opt-in**(`setup.sh` 問、選了才裝、當 Generator 唯一 spec 流程故不撞名),非單純「預設不帶」;見 §1.7。

### 2.5.7 skill 路由層:角色 ↔ skill(SKILLS.md 單一正本)— ✅ 鎖定(2026-06-28)

> 來源:PM 拿 personal-site 的 `SKILLS.md` 當參考(按場景挑 skill、最小必要、不為有而硬用)。關鍵洞:**4 角色 = 工作四階段,「場景」自然折進「角色」**,不必搞「場景 × 角色」二維(YAGNI)。

**機制**:種子 ship 一份 **`SKILLS.md`(角色標記版索引)= skill 清單單一正本**(§5.5 DRY:同一事實只寫一處);每個角色合約放一小段「我會用的 skill」指回它 + 留 `{{空白}}` 給專案加場景專用的。

**3 個通用 skill 預接(輕薄版,不 vendor 重型外部包)**:

| 角色 | 預接 skill | 性質 |
|------|-----------|------|
| Planner | `brainstorming` | 通用·常駐 |
| **Generator** | `test-driven-development` + **`openspec`(SDD)** | TDD 常駐;openspec 走 opt-in(§1.7)|
| Evaluator | `requesting-code-review` | 通用·常駐 |
| Coordinator | —(分流大腦,不需要)| — |

**openspec 歸 Generator 不歸 Planner**(對回 §2.5.4 + §2.5.6 洞 2):SDD(先有 spec 再實作)是 Generator 的**紀律**;Planner 做更前面的模糊收斂(brainstorming → PRD)。沒裝 openspec 時 Generator 照樣做 SDD —— 用「先讀 spec、對齊、再實作」紀律版,不靠特定工具。

**紀律隨種子帶走**:SKILLS.md 內含 personal-site 那句「只在真有幫助時用、不為有 skill 而硬用、最小必要組合」—— 與 anti-bloat(§4.1)同一靈魂。

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

> ⚠️ **模組⑥ 不是乾淨獨立模組**(2026-06-28 deep-inventory):cora `pr-merge-harness/check-pr-merge.cjs` 頂層 `require('.codex/review-agent/lib/github.cjs')`(跨 `.codex` 樹 live 依賴)。種子化 ⑥ 時要嘛**內聯** github helper、要嘛標明**連帶拉進**該 lib;不可「砍 .codex + 留 ⑥」並存。做實體檔前先 `grep -rE "require|import"` 把所有跨樹/跨模組依賴攤出來,別把任何模組當乾淨獨立。

## 4. 記憶 / 學習模組 — ✅ 鎖定(本次重點,最完整)

> ⚠️ 2026-06-27 校正(gap-audit):(1) 本節「半自動捕捉」的 hook 在 cora **不存在**(無 Stop/SessionEnd hook、捕捉 100% 手寫且停更 45 天)→ cora 端是**淨新建**(非從 cora 萃取),但**有 Hermes `background_review` 完整對標可借**(2026-06-28 重查修正,非憑空發明,見 §4.2);(2) 畢業只有「升級」是單向缺陷,需補對稱**降級**(零遵循/高 override 的規則自動列鬆綁候選),見 §1.5。
>
> ⚠️ 2026-06-28 補(deep-inventory):(3) **「純建議=零執法」已有 cora 鐵證**(從風險臆測升為已驗證依據):main agent 連續 5 次違反 PM「不要寫 memory」指示 → `ai-status-index` 違規表結論「靠自律已證明反覆失守」→ cora 建 `block-memory-write` PreToolUse hook 物理攔截。即 **DISCIPLINE 在 LLM 上會系統性失守,必要時得用 hook 兜底**。(4) `error-patterns.json` **不是死碼**(修正 gap-audit 駁回):cora `knowledge.cjs` 有完整 load/search/add、`review-packet.cjs` 已把它組進 live packet → **讀路徑已接、寫路徑未啟用、零資料**;種子刻意不鏡像的理由改成「不重建 cora 的自我累積 bug 知識庫(屬 grow,有第二模型 reviewer 才需要)」,非「死碼所以不管」。

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

### 4.1 防膨脹(規則降級)= 畢業的鏡像 — ✅ 設計鎖定(2026-06-28)

> grounding:Hermes **`Curator`**(已上線 OSS,有測試 + 文件 + issue #7816,見 repo `website/docs/user-guide/features/curator.md`)+ cora 自身鐘擺 telemetry(**雙背書:外部 OSS 設計 + 內部實證**,對應 Rule #7「不用直覺覆蓋業界 pattern」)。Curator 把「沒人用的 skill」沿 `active → stale → archived` 推、**從不刪只封存可還原**;builder-pm 把同一形狀搬來治「沒人遵守的規則」。

**為何非建不可**:學習迴圈(§4 畢業)只會「往上加」,不補降級 → 新專案規則只增不減,終究長回那個重到記不住的 cora(正是要逃離的)。防膨脹是它缺的對稱另一半 —— **與畢業共用同一套 strike + frontmatter,只是反方向跑**。

**訊號(旁掛 sidecar,不污染規則正文 = Curator `.usage.json` 模式):**
- **主訊號 = override 率**(規則觸發了卻被繞)。cora 鐵證:Rule #6「連續 ≥ 2 次 override 同 PR → 視為規則本身有問題」、Rule #8 因 telemetry `8/8 done_def:false` 砍半。**這是 builder-pm 與 Curator 唯一分家處** —— 規則的成本在「高摩擦」不在「閒置」(Curator 治 skill 用閒置正確;治規則要用 override)。
- **副訊號 = 休眠**(長期零觸發),照 Curator inactivity 模型,低優先。
- sidecar(`.governance/rule-usage.json`)屬本機 telemetry → **gitignore 不進 repo**(沿用 §4 界線 + 既有 telemetry Rule)。換機/交接會重置 strike 計數 → 由 first-run 寬限窗承接(= Curator fresh-install 行為),可接受。**只有「降級決定」進 repo**(規則移檔 = commit)。

**兩段式 run(= Curator 便宜偵測 + opt-in 判斷):**
1. **確定性偵測(無 LLM、便宜、常開)**:算 strike、跨門檻列「規則健身報告」;**只報告不攔截**(防膨脹是迴圈、不是關卡)。
2. **判斷(opt-in)**:AI 草擬鬆綁/退役建議,**PM 拍板**。貴的判斷才花成本(= Curator 的 LLM consolidation 預設 OFF)。

**觸發**:閒置檢查非 cron(session 收尾 / 隔 N 個 PR 一次),不打斷工作(= Curator 的 idle-check 而非 daemon)。

**安全欄(非協商,全抄 Curator 踩過的坑):**
1. **核心憲章 10 條 = protected**,永不自動退役(= Curator 硬編 protected built-ins,如 `plan` 撐 `/plan`)。
2. **never delete** —— 只降級/鬆綁/標 stale,移進 `.governance/retired/` 可還原;動前先快照(= Curator 跑前自動 tar 快照 + 一鍵 rollback)。
3. **first-run 寬限窗** —— 新專案無 override 史 → 不立即退役任何規則(= Curator seed-on-first-sight,直接解「種子 day1 無資料」)。
4. **PM pin** —— 可釘任何規則豁免(= Curator pin)。
5. **jurisdiction** —— 只管「畢業上來 / 模組帶的」規則,**絕不碰 PM 手寫拍板的核心意圖**(= Curator only-agent-created,人手寫的一律不動)。

**降級階梯(對應升級階梯)**:規則被繞 → friction strike +1 → 跨門檻列候選 → PM 審 → 鬆綁(條件放寬 / 降風險級)或 退役(移 `.governance/retired/`,可還原)。

**種子實作**:`loops/anti-bloat/` 提供最小、自帶測試的 **Phase 1**(確定性偵測 + protected 清單 + 寬限窗 + dry-run 報告)當範本(示範「對的防膨脹自動化長怎樣」);Phase 2 判斷留給 AI/PM,不寫死。與 §5.5 drift 範本並列,但 `gates/`(會擋)vs `loops/`(只報告)刻意分家。

### 4.2 學習捕捉引擎:讓捕捉「真的會動」— ✅ 設計鎖定(2026-06-28)

> grounding:Hermes `agent/background_review.py`(每回合 fork 便宜 aux 模型回顧該回合)+ nudge config。**這是三迴圈最後一個**(種子缺陷 #3)。cora §4 設想的「半自動捕捉」是對的方向,但 cora 自己沒做(捕捉 100% 手寫、停更 45 天);Hermes 證明它是**可上線的真機制**,我們搬它的形狀。

**結構性限制 + 解法(2026-06-28 PM 釐清身份方向)**:builder-pm 是**治理包、不掌控對話迴圈**(乘客非車),不能像 Hermes 每 N 回合 fork 自己。但 **Claude Code 把觸發點開放成 hook**,Hermes 三觸發全做得出來 → **不需變 runtime**(變 runtime 會砍掉零基建/PM day1 能用/可攜三命根,見 §1 北極星校準):

| Hermes 用迴圈做的 | builder-pm 用 hook 做 | config 對標 |
|------|------|------|
| context 消失前 flush(最重要,最後一次補捉)| **PreCompact hook**(SessionEnd 不行:session 已終止、模型無回合,純 stdout 只進 log 收不到)| `flush_min_turns:6` |
| 每 N 回合 nudge「考慮存」 | **Stop hook + 自存計數器** | `nudge_interval:10` |
| 複雜任務後存 skill | Stop hook + 條件 | `creation_nudge_interval:15` |
| 當場 AI 紀律(PM 一糾正就草擬)+ `/lesson` 顯式後門 | charter 紀律 + slash 指令 | — |

**捕捉品質閘(Hermes review prompt 純 prompt,可整段搬,最有價值的可攜部分):**
- **該記的訊號(任一觸發即行動)**:PM 糾正你的風格/語氣/格式/冗長(「太囉嗦」「直接給答案」「別這樣排版」=第一級訊號)、PM 糾正你的流程/步驟順序、冒出非顯而易見的技巧/修法/debug 路徑、載入的 skill 被證明錯/缺步驟 → 當下 patch。
- **🔑 絕不記的反模式(cora §4 只有薄版,這是 Hermes 硬教訓)**:
  1. **環境依賴的失敗**(缺 binary / 沒裝套件 / 沒設憑證 / command not found)—— PM 自己能修,不是耐久規則。
  2. **對工具的負面斷言**(「X 壞了」「browser 不能用」)—— 會「**硬化成 agent 之後幾個月拿來拒絕自己的藉口**」,即使原問題早修好。要記就記**修法**(裝什麼/設什麼),不記「這工具不能用」。
  3. **已解的暫時錯**(retry 成功 → 教訓是 retry pattern,不是那個錯)。
  4. **一次性敘事**(「總結今天行情」不是一類工作,不值得成規則/skill)。
- **偏向記**:「Nothing to save 不該是預設;什麼都沒記 = 錯過學習,不是中性結果。」
- **擺放紀律(= 捕捉時就防膨脹,與 §4.1 同系統)**:先 patch 既有 skill/規則 > 才開新的;新名**必須 class-level**,**禁** PR 號 / error 字串 / 「fix-X / 今天這題」當名 ——「只對今天有意義的名字就是錯的」。
- **Memory vs Lesson 分流**:Memory 記「使用者是誰 + 當前狀態」;Lesson/Skill 記「這類任務怎麼做」。PM 的風格/流程偏好 → 進治理規則本文,不只進 memory。

**種子實作**:`loops/learning-capture/` —
- **品質閘 linter(可測核心,runtime 無關)**:給一則草擬教訓,確定性檢查 §4 HARDLINE 必填欄位 + 擋上面 4 種反模式 + 擋 session-artifact 命名 → PASS/REJECT。**這是讓捕捉能長久的關鍵**(沒品質閘 → cora 那種手寫停更 + 爛條堆積)。
- **觸發 hook(讓它真的會動)**:最小 PreCompact nudge hook —— context 壓縮前,用 `hookSpecificOutput.additionalContext` JSON 把品質閘 checklist + 草擬模板**注入給模型**(官方唯一會讓模型收到 hook 輸出的管道),逼 AI 在 context 消失前補捉。**踩雷修正(2026-06-29,查 Claude Code 官方文件)**:原型曾用 `SessionEnd` + 純 stdout —— 但 SessionEnd 在 session 已終止時觸發、模型無下一回合,純 stdout 又只進 debug log 模型看不到 → nudge 等於印給空氣;已改 PreCompact + additionalContext。**這條本身就是「寫了機制 ≠ 它會動」的活案例。**
- **草擬 prompt**:載入式 capture 指令,內嵌上面整段品質閘(Hermes review prompt 繁中化)。

**不做**:RAG、SQLite/向量庫(過度工程;規模不到。要 filter 用 frontmatter,要 session 搜尋未來用 FTS5 關鍵字,與 LESSONS 分離)。

**參考來源**:Hermes-agent 真實程式碼 —— `agent/memory_manager.py`(turn 前 prefetch / turn 後 sync 的生命週期)+ 捕捉引擎 `agent/background_review.py`(每回合 fork 便宜 aux 模型回顧該回合、決定要不要寫)+ HARDLINE 品質閘在 review prompt 內。

> ⚠️ **2026-06-28 自我修正(Rule #12,對真 code 重查)**:本節舊筆記曾寫「Hermes 的 periodic nudge 是行銷話術、程式碼無此機制、捕捉 100% 靠顯式 /learn」—— **這是錯的**。`agent/background_review.py` + config(`memory.nudge_interval:10` 每 10 回合提醒存記憶、`memory.flush_min_turns:6` context 消失前 flush、`skills.creation_nudge_interval:15` 複雜任務後存 skill)證明 Hermes **有完整、可設定、自動週期的捕捉引擎**。詳見 §4.2。

### 4.3 冷啟動 onboarding + 知識層成長偵測 — ✅ 設計鎖定(2026-06-28)

> 種子缺陷 #2。grounding:v1 `amber-stack/setup.sh`(安裝半套已驗證)+ cora `.context/` **真實成長史**(逐檔實證,見下)+ §4.1/§4.2/§5.5 三迴圈(知識層的成長引擎)。放 §4 下因知識層**靠學習迴圈長**,與 §4.1/§4.2 同系統。

**v1 的 bug(冷啟動為何被標成缺陷)**:`setup.sh` 結尾叫 PM「Next steps:填 SYSTEM.md / 填 GLOSSARY.md」—— 這是**早問 bug**:要 PM 在 day-0 填兩個那時根本沒資訊可填的檔(SYSTEM 要先有架構決策、GLOSSARY 要先 spec 過功能)。真實 day-0 PM 手上頂多**技術選型 + 第一版 PRD**。

**修正後的序列(薄起步 → 邊做邊長):**

```
Day-0(薄)
  setup.sh 選技術棧 + 專案名 → 裝 (A) 通用機制預填 + (B) 知識容器空殼 + git init
  第一份產出 = 第一版 PRD(接 brainstorming);❌ 不在 day-0 填 SYSTEM/GLOSSARY
Day-N(邊做邊長)
  PRD → 第一份 SPEC → 第一次派工 → 邊建,(B) 知識層才長;三迴圈當成長引擎
```

裝下去兩類:**(A) 通用機制·預填**(核心憲章 / 4 角色 / 2 硬關卡 / 三迴圈 / 雙語慣例,每專案一樣、PM 不碰);**(B) 知識容器·空殼**(`.context/SYSTEM`、`GLOSSARY`、conventions/架構禁區、module specs,隨專案長)。

**知識層四檔怎麼長(全有 cora 實證):**

| 檔 | 觸發 → 怎麼長(JIT) | cora 實證 | 成長引擎 |
|----|----------------------|----------|---------|
| **module specs**(`SPEC-NNN`)| 要做新功能才寫該支 SPEC(逐功能、用到才寫)| SPEC-001→011 一路按功能加上來 | 模組⑤ / Planner |
| **GLOSSARY** | SPEC 引入新術語 → 進表,每條指回正本 doc | 每列 `正確詞｜禁用｜Notes(PRD §)`;created 3/25→updated 4/21 長出 | §5.5 drift 守門 |
| **conventions / 架構禁區** | 同類雷 ≥2 次 → 畢業成 convention | `engineer-style-patterns.md` 自述「**從 PR #341/#344/#345/#346 抽取**」,每條附 PR | §4 畢業↑ + §4.1 防膨脹↓ |
| **SYSTEM.md** | 重大結構決策才補一節(低頻、人主導)| Apr 21 寫完後幾乎沒動 = 結構級 | architect 起草,PM 確認 |

> **收口**:冷啟動之所以能「薄」,正因**三迴圈會在 day-N 把知識層長出來**。三迴圈不是跟冷啟動分開的兩件事 —— 它們**就是知識層的成長引擎**。v1=薄種子但不會長(PM 被丟在空模板前);v2=一樣薄的種子 **+ 會自己長知識層的三迴圈**。

**偵測「何時該填」(PM 要求:harness 主動抓時機,非被動查表)— 誠實分級(沿 §5.5 A/B/C):**

| 檔 | 訊號 | 可偵測性 | 怎麼偵測 |
|----|------|:---:|---------|
| conventions | lesson `strikes≥2` | ✅ **A·已建一半** | 掃 `.governance/lessons/*` frontmatter → nudge 畢業(= 學習迴圈計數,免費)|
| GLOSSARY | docs 用到的術語不在表內 | ✅ A(噪音需 triage)| diff「changed docs 的 backtick 術語」−「GLOSSARY 已有」→ 列候選 |
| module specs | 改 production code 無 owning SPEC | 🟡 B 中等 | 改 code 的模組無對應 SPEC → nudge(= cora SDD 紀律雛形)|
| SYSTEM.md | 「重大結構決策」 | 🔴 **C·無法全自動** | 判斷題;只能抓 proxy:新增 `modules/X.md` 但 SYSTEM 沒動 → 提醒「要不要補一節」 |

> ⚠️ **不過度承諾**(Rule #12):SYSTEM 是 C 類**判斷題、無法可靠自動偵測**,只給 proxy 提醒,別假裝能。GLOSSARY/conventions 才是 A 類可確定性偵測。
> ⚠️ **死殼陷阱**(§5.5 鐵則):cora `check-terminology.sh` 正是「偵測術語」做成**死殼**的反例。會動版本 = **只列候選、不強制**(report-only)+ **必附測試**(否則別生)。

**形狀**:**不是新第四迴圈** —— 主要是把既有三迴圈的訊號接到知識層 + 加兩支小偵測器(glossary-candidate / spec-coverage)。與 §4.1 同形:確定性偵測(report-only)→ AI/PM 草擬 → PM 拍板填。**loops/(只報告)非 gates/(會擋)**:不能逼人寫 glossary。

**`/onboard` 引導流程**:① 確認技術棧 → ② 帶 PM 起第一版 PRD(接 brainstorming)→ ③〔選用·可跳,**建議留**〕day-1 跑一次極小真派工,讓 PM 親眼看「派工→驗證→commit」整條 harness 會動 → ④ 講清楚「`.context` 是空的、會這樣長」+ 附上面成長表。

**種子實作**(✅ 已建):`loops/context-growth/` Phase-1 偵測器(glossary-candidate + lesson-graduation + spec-coverage + system proxy,自帶測試、report-only,commit f8376f0)+ `onboarding/context-templates/` 四份 `.context/` 空骨架(各檔頂端帶「我會這樣長」+ 成長觸發 + 偵測器掛勾註記,修掉 v1 早問 bug)+ `onboarding/ONBOARDING.md` 開工流程文件(day-0 四步 + day-N 成長表)。註:目前 `/onboard` 是流程文件,變成真 slash 指令留待後續。

**業界佐證(≥3 對標,portfolio;對應 Rule #7)**

| 對標 | 在做什麼(白話) | 對應本節 |
|------|----------------|---------|
| **Walking skeleton**(Cockburn / GOOS)| 先讓一條極薄端到端跑起來,其餘長出來 | 薄冷啟動 |
| **arc42 / evolutionary architecture docs** | 架構文件隨專案演進,非前期一次寫完 | SYSTEM/.context 成長 |
| **Living Documentation**(Cyrille Martraire)| 文件由工作觸發 / 衍生,不是憑空寫 | 偵測「何時該填」 |
| **ESLint warn-level / coverage report** | 報告不阻斷;覆蓋率報「哪裡沒測」 | report-only loop / spec-coverage 偵測 |

> 佐證結論:業界主流是「薄起步 + 文件隨工作長 + 偵測缺口用 report-only」—— 與本節完全一致。連結待 finalize 時補查(arc42.org / diataxis.fr / Living Documentation 書)。

### 4.4 brownfield 導入:`/backfill-context`(既有專案冷讀草擬知識層)— ✅ 鎖定(2026-06-29)

> §4.3 的鏡像場景(§4.3 是 greenfield day-0,本節是 brownfield 半成品專案 day-N 導入)。產出自 brainstorming Q1–Q6 逐題拍板。設計正本在此;原 `docs/superpowers/specs/2026-06-29-brownfield-context-backfill-design.md` 為草擬來源(位置不對,Coordinator 處理)。

**問題(為何 §4.3 不夠)**:§4.3 是**為全新專案 day-0 設計**——`.context/` 裝下去是空殼,靠三迴圈 day-N 邊做邊長。把這包接到一個**已開發到一半的既有專案**時兩個假設都破:

- `.context/` 仍空,**舊專案藏在 code 裡的知識完全沒被捕捉**(沒人會回頭手填一整個既有系統的 SYSTEM/GLOSSARY)。
- `loops/context-growth` 偵測器**方向相反**:你一動既有 code,spec-coverage / glossary-candidate 會狂噴「沒有對應 SPEC / 一堆術語沒進表」→ **噪音轟炸**而非補齊(那支偵測器假設「知識本來就在長」,brownfield 是「知識從來沒被寫下」)。

→ 需要一個**一次性**的「冷讀現有專案 → 草擬 `.context/`」能力,把 day-N 偵測器降噪到可用。

**已拍板 6 決定(Q1–Q6):**

| # | 決定 | 為什麼 |
|---|------|--------|
| Q1 | **通用能力**,不對著特定專案設計 | 治理包要可攜(§1 北極星)|
| Q2 | **隨需指令** `/backfill-context`(在 Claude 跑)+ `setup.sh` 偵測到既有專案時**提醒**去跑 | shell 跑不了 AI 草擬,只能提醒;一次性動作不該常駐 |
| Q3 | 第一版草擬**三份**:SYSTEM + modules 清單 + GLOSSARY 候選 | CONVENTIONS 交回原機制(見下方非目標)|
| Q4 | 讀取來源:**code + 專案現有文件 + git 歷史**(git 歷史需框上限)| 三來源互補;git 是「為什麼這樣做」的線索 |
| Q5 | 草稿落地:寫**暫存區** `.context/.backfill/`,PM 逐份核可才搬正式 | 草稿 ≠ 真相(§4.3/§5.5 同魂);正式檔在 PM 拍板前永不含 AI 猜的 |
| Q6 | 內部架構:**方案 B = 確定性蒐證(證據包)+ AI 草擬** | 蒐證層可測(§5.5 鐵則)、草擬層判斷;兩層分離 |

**非目標(YAGNI,刻意不做):**
- ❌ 不草擬 **CONVENTIONS** —— 維持「同類雷 ≥2 次畢業」機制(§4 畢業)。憑 code 反推「架構禁區」最易亂講、變死殼(§5.5)。
- ❌ 不加新角色(不在四角色 harness 加 archivist,對 v1 過度設計)。
- ❌ 不自動搬正式 —— 草稿永不自動進正式 `.context/`,一律 PM 拍板(Q5)。

**元件與檔案落點**(沿用本包「腳本 + 自帶測試 + README + fixtures」形狀,同 `loops/context-growth/`;皆進 `template/` 種子):

```
template/
  onboarding/backfill/                 ← 新增:確定性蒐證層(onboarding=開工一次性,非 loops 的 recurring)
    scan-evidence.cjs                  # 掃描器:讀 code/docs/git → evidence.json
    scan-evidence.test.cjs             # 自帶測試(§5.5 鐵則:checker 必附測試,否則別生)
    fixtures/                          # 測試用假專案(sample / no-git / empty)
    README.md                          # 用途 / evidence.json 格式 / 框上限 / 怎麼跑
  .claude/commands/
    backfill-context.md                ← 新增:隨需 slash 指令本體(本包第一個真指令)
```

- 蒐證層放 `onboarding/`(開工一次性)**而非 `loops/`**(recurring 迴圈)—— 語意才對;這也是 `template/onboarding/` 的第一個子目錄(目前不存在,本案新建)。
- 這是本包第一個真 slash 指令(`/onboard` 目前仍只是 `template/ONBOARDING.md` 流程文件,且 `template/.claude/` 目前無 `commands/` 夾)→ 順手立「指令怎麼寫」範本,未來 `/onboard` 跟進。
- 核心:**蒐證層(可測、確定性)** 與 **草擬層(AI 判斷)** 分離 —— 對齊 §4.1/§4.3「確定性偵測 → AI 草擬 → PM 拍板」三段。

**`evidence.json` 結構**(確定性蒐證層唯一輸出;欄位齊全才能讓 AI 草擬有據、REPORT 能誠實交代框了多少):

```jsonc
{
  "schema_version": 1,
  "project_root": "<掃描根,相對或絕對>",
  "limits": {                    // 這次跑的框上限快照(讓 REPORT 能說「我框了多少」)
    "module_top_n": 20,
    "max_files_scanned": 500,
    "git_log_last_n": 100,
    "top_terms_n": 50,
    "doc_extract_max": 50
  },
  "sources_present": {           // 優雅降級:哪些來源在/不在
    "git": true,
    "docs": true,
    "dependency_manifests": ["package.json"]   // 找到的依賴檔清單(沒有則空陣列)
  },
  "truncation": {                // 誠實:哪些來源因框上限被截斷(REPORT 要明列)
    "modules_truncated": false,
    "files_truncated": false,
    "git_truncated": false,
    "docs_truncated": false
  },
  "module_tree": [               // 候選模組清單(信心 🟢 高:來自資料夾結構)
    {
      "name": "segmentation",
      "path": "src/segmentation",
      "file_count": 42,
      "languages": ["ts"],
      "sample_files": ["src/segmentation/index.ts"]   // 給 AI 抽看用,框上限
    }
  ],
  "terms": [                     // 高頻識別字/術語 + 出處(信心 🟡:GLOSSARY 候選)
    {
      "term": "journey_id",
      "frequency": 87,
      "samples": [{ "file": "src/journey/store.ts", "line": 14 }]   // 框上限 N 筆
    }
  ],
  "docs": [                      // 文件擷取(信心 🟡:餵 SYSTEM 目的)
    { "path": "README.md", "title": "Journey Engine", "first_sentence": "..." }
  ],
  "git_log": [                   // git 標題(框上限近 N 筆;非 git repo → 空陣列)
    { "subject": "feat: add segmentation rules" }
  ],
  "external_integrations": [     // 依賴推外部整合(信心 🟢 高:依賴檔)
    { "name": "@aws-sdk/client-ses", "source": "package.json", "inferred_kind": "email/SES" }
  ]
}
```

> 設計取捨:`evidence.json` **刻意不寫 `generated_at` 時間戳** —— 對齊 `context-growth`「不碰 `Date.now()`」的確定性保證(同輸入位元一致 → 測試可斷言、重跑可比對)。「何時跑的」由 REPORT(AI 層產出)記。

**掃描器框上限**(預設值;皆寫成頂端具名常數讓專案可調,`limits` 同步寫進 `evidence.json` 供 REPORT 引用):

| 常數 | 預設 | 管什麼 | 超過時 |
|------|:---:|--------|--------|
| `MODULE_TOP_N` | 20 | 候選模組數(按 source 檔數排序取前 N)| `truncation.modules_truncated=true`,REPORT 明列「只取前 20 大模組」 |
| `MAX_FILES_SCANNED` | 500 | 詞頻掃描讀檔總數上限 | `files_truncated=true` |
| `GIT_LOG_LAST_N` | 100 | 讀近 N 筆 commit 標題 | `git_truncated=true` |
| `TOP_TERMS_N` | 50 | GLOSSARY 候選詞數(按頻率取前 N)| 依詞頻截斷,REPORT 註明 |
| `DOC_EXTRACT_MAX` | 50 | 擷取標題+首句的 doc 數上限 | `docs_truncated=true` |

> ⚠️ **預設值待 PM 拍板**:以上數字是依「中型 repo 一次跑完不爆、又夠 AI 草擬有料」估的,非鐵律;真實大 repo 驗過再調。Generator 寫成具名常數即可,別硬編散在邏輯裡。

**資料流:**

```
PM 在既有專案裝好 builder-pm → 在 Claude 跑 /backfill-context
  │
  1) 跑 scan-evidence.cjs(確定性、框上限、優雅降級)
  │     → .context/.backfill/evidence.json
  │
  2) AI 讀 evidence.json + 抽看 sample_files 關鍵檔 → 草擬進暫存區
  │     .context/.backfill/SYSTEM.draft.md          (帶信心橫幅 + 出處)
  │     .context/.backfill/modules.draft.md
  │     .context/.backfill/GLOSSARY.candidates.md
  │     .context/.backfill/REPORT.md   (讀了什麼/框了多少/各份信心/哪裡要你判斷/怎麼搬正式)
  │
  3) PM 逐份審 → 改 → 「搬正式」(覆寫對應 .context/ 正式檔)
        正式 .context/ 在 PM 拍板前永遠不含 AI 猜的內容
```

**信心標記表**(讓「草稿 ≠ 真相」可操作;每條草擬內容帶信心 + 出處,🔴/🟡 在草稿裡用顯眼橫幅標出):

| 草擬內容 | 信心 | 出處 |
|---------|:---:|------|
| 主要模組清單、外部整合 | 🟢 高 | 資料夾結構 / 依賴檔(`module_tree` / `external_integrations`)|
| 系統目的(SYSTEM)| 🟡 中 | README/docs;找不到 → 標「請你補」 |
| 資料流(SYSTEM)| 🔴 低 | AI 推測,明顯標「待確認」 |
| GLOSSARY 候選詞 | 🟡 中(待 triage)| 高頻識別字,全部當候選、PM triage(不自動收)|

**錯誤處理**(對齊 §4.3/§5.5「不靜默截斷、誠實降級」):
- **來源缺失**(非 git repo / 沒 docs / 空專案)→ 掃描器**優雅降級**:跳過該來源、`sources_present` 標 false、對應陣列空、**不丟例外**,並在 REPORT 註明「跳過 X(找不到)」。
- **大型 repo** → 照框上限掃,`truncation.*` 標 true,REPORT **明列被截斷了什麼**(不假裝全讀)。
- **重跑安全**:重跑只覆寫 `.context/.backfill/` 暫存區,**永不自動碰正式檔**;正式 `.context/` 對應檔已有內容 → 先警告、不蓋。
- **`.context/.backfill/` 不進 commit**(雙保險):① `template/.gitignore` 排除 `**/.context/.backfill/`(setup.sh 安裝路徑);② **掃描器 `main()` 在 `.context/.backfill/` 內自寫一個 `.gitignore`(內容 `*`)自保** —— 覆蓋「裸 backfill」(未跑 setup.sh、project-root 是另一個既有專案)情境,不依賴專案根 `.gitignore`、不污染使用者既有檔。(2026-06-29 端到端實測 personal-site 發現裸跑時暫存夾無保護 → 修補。)

**測試要求**(§5.5 鐵則「checker 必附測試,否則別生」;蒐證層必測,AI 草擬層是判斷題不做單元測試)。`scan-evidence.test.cjs` 沿 `context-growth` 黑箱子行程 + fixtures 假專案模式,具體案例:

*結構驗證(`fixtures/sample-project/`,來源齊全)*
1. `module_tree` 抽出預期模組(fixture 有 `src/segmentation/` → evidence 含 `name:"segmentation"` + `file_count`)。
2. `terms` 含高頻識別字,每筆有 `frequency` + `samples`(file:line 出處)。
3. `docs` 抽出 README 的 `title` + `first_sentence`。
4. `external_integrations` 從 `package.json` 推出依賴(fixture 放 `@aws-sdk/client-ses` → evidence 命中)。
5. `schema_version` / `limits` / `sources_present` / `truncation` 欄位齊全。

*降級驗證(某來源缺失)*
6. **非 git repo**(`fixtures/no-git-project/` 無 `.git`)→ `sources_present.git=false`、`git_log=[]`、**不丟例外**。
7. **無 docs**(fixture 無 `docs/` 且無 README)→ `docs=[]`、`sources_present` 標明、不丟例外。
8. **空專案**(`fixtures/empty-project/` 只有空目錄)→ 證據包結構仍完整、各陣列空、exit 0。

*框上限驗證*
9. 模組數 > `MODULE_TOP_N` → `module_tree` 長度 = `MODULE_TOP_N`、`truncation.modules_truncated=true`。

*確定性驗證*
10. 同一 fixture 連跑兩次 → `evidence.json` 位元一致(排序去重、不寫時間戳)。

*錯誤路徑*
11. `project-root` 不存在 / 不是目錄 → exit 非 0(對齊 `context-growth`)。

> ⚠️ **git fixture 策略待 Generator 定**:fixture 內無法塞巢狀 `.git`。兩條路任選 —— (a) 測試時在 `os.tmpdir()` 起臨時 repo `git init` + 假 commit 餵 git 來源;(b) 把 git 讀取抽成可注入的 provider,測試餵假 log。「非 git repo 降級」案(#6)用無 `.git` 的 fixture 即可,不受此限。

*缺陷修補回歸(2026-06-29 端到端實測 personal-site 後補,測試數 11→14)*
12. `external_integrations` 命中現代棧:fixture 加 `@supabase/supabase-js`/`posthog-js` → 各命中並標 `inferred_kind`;且**雜訊排除**(`react` 框架不入)。← 原白名單僅 15 條(AWS/Stripe…)漏抓 Supabase/PostHog,擴充至 18 core + 3 optional;app 框架(next/react)刻意不收(PM 拍板,避免稀釋 🟢 高信心欄 + `next` startsWith 誤命中 `next-auth`)。
13. 掃完後 `<root>/.context/.backfill/.gitignore` 存在且內容嚴格 `*\n`(寫在 `main()`,`scan()` 維持純函式)。
14. 臨時 `git init` + `git add -A` → `git status --porcelain` 不含 `.context/`(實證暫存草稿不被誤收)。

**與既有東西整合:**
- **`setup.sh`**:沿用既有「目標夾已存在且非空」偵測(step 2 的 `[ -e "$TARGET_ABS" ] && [ -n "$(ls -A ...)" ]`,**copy 前**就判得到)。在那裡設旗標 `BROWNFIELD_DETECTED=y`(更精準可加判 `[ -d "$TARGET_ABS/.git" ]`),在 §7 收尾「下一步」**加一行提醒**:「偵測到像既有專案 → 裝好後在 Claude 跑 `/backfill-context` 草擬 `.context/`」。(shell 跑不了 AI,只能提醒)
- **`ONBOARDING.md`**:加「**既有專案的開工路徑**」小節,對比現有「Day-0 四步」(全新專案)。大綱:① 一句話「你不是 day-0 空專案,而是把 builder-pm 接到既有 code」→ ② 跑 `/backfill-context` 草擬三份進 `.context/.backfill/` → ③ 逐份審核、改、搬正式 → ④ 之後回到正常 day-N 三迴圈(此時 context-growth 偵測器才不會噪音轟炸)。
- **`docs/design.md`**:本節(§4.4)即記錄(對齊「只記已拍板」紀律)。

**Done Definition:**
- **Goal**:既有專案裝好 builder-pm 後跑 `/backfill-context`,能產出三份草稿(SYSTEM/modules/GLOSSARY 候選)+ REPORT 進 `.context/.backfill/`;`scan-evidence.cjs` 有通過的 `scan-evidence.test.cjs`(涵蓋上方案例);`setup.sh` 與 `ONBOARDING.md` 有 brownfield 提醒/路徑;本決定記進 design.md §4.4。
- **Out of scope**:CONVENTIONS 草擬;`--promote` 自動搬;`/onboard` 指令化;builder-pm 自我 dogfood(拿自己當 brownfield 試跑)。

**未來(本案範圍外):**
- `--promote` 小幫手(v1 由 PM 手動搬,REPORT 寫清楚怎麼搬)。
- CONVENTIONS 的 brownfield 草擬(待 v1 驗證價值後再評估)。
- 把 `/onboard` 也做成真 slash 指令(跟隨本案立下的指令範本)。

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

**補(2026-06-28 deep-inventory):**
- **第三類「人工 fail-closed 啟用閘」(grow,非自動關卡)**:cora 對資安敏感功能(SES 憑證 / SSRF / Git push)採「code 已 merge 但需真人資安工程師簽核才准**啟用**」紀律(合入 ≠ 上線)。這是不靠 code、純靠 PM/工程紀律的安全邊界,與契約 gate(gap-audit B2)不同類;種子保留此 **pattern**,gate 內容隨專案長。
- **機密進出衛生**:攔截① 只防 AI 產物**出站**;要再防(a)**入站** —— secret 貼進對話 / `.env` 進 repo;(b)**設定檔現狀** —— cora `settings.local.json` / `.mcp.json` 明文存 ClickUp key 是反例。種子 settings 模板**絕不含明文 key**,README 明標 cora 現狀為反面教材。

## 5.5 Drift 守門:三類 × 解法階層 — ✅ 鎖定(2026-06-28)

> 來源:PM 提問「文件雙重維護 / drift 能不能用腳本可靠避免」+ 讀 cora 三支 drift 腳本實況。結論:**能,但預防 > 偵測,最關鍵那層不需腳本。**

**cora 的教訓(反面教材)**:寫了 3 支 drift 腳本 —— `check-drift.sh` 窄到只認一個 role 名(靠 11 條手刻 regex,自己變維護怪獸)、`check-file-linkage.sh` 純嘮叨、`check-terminology.sh` 死殼。**沒一支抓得到「README 12 條 vs CLAUDE.md 13 條」。「寫支腳本」不是銀彈,腳本本身會 drift。**

**drift 三類 × 自動化難度:**

| 類型 | 例子 | 能自動化 | 正解 |
|------|------|:---:|------|
| **A 字面事實重複** | 規則數 / 路徑 / 版本 / 清單長度 | ✅ 便宜 | **去重(別寫兩遍)> 偵測** |
| **B 壞掉的引用** | 連到已改名 §X / 已移走的檔 | ✅ 中等 | link / anchor checker |
| **C 語意矛盾** | ADR vs SPEC 欄位名、per-commit vs per-PR | ❌ 腳本做不到 | LLM / 人 |

**解法階層:**
1. **預防 > 偵測** —— 能去重就去重(單一真相來源)。最省最可靠,**不需腳本**。
2. **非重複不可 → 小而有測試的 gate**(A / B 類)。
3. **語意層(C)→ LLM / 人**,做成「定期定點掃」非「每次手翻」(此層「靠 agent 翻文件」是對的工具,不是失敗)。

**鐵則**:任何 drift checker **要嘛附測試 + owner,要嘛別生** —— 否則就是下一個死殼(`check-terminology`)或維護怪獸(`check-drift` 的 11 條 regex)。這條是 cora 親身教訓,直接焊進種子。

**種子實作**:`gates/drift-fact-check/` 提供一個最小、自帶測試的「字面事實一致性」檢查當**範本**(示範「對的自動化長怎樣」),非通用神器。

**業界佐證(2026-06-28 · ≥3 對標 + 證據;對應 Rule #7「不用直覺覆蓋業界 pattern」)**

本節「預防 > 偵測」階層與「checker 必附測試」鐵則,**不是憑感覺排的** —— 與業界主流一致,可被外部檢視:

| 對標 | 在做什麼(白話) | 對應本節 | 用者 / 來源 |
|------|----------------|---------|------------|
| **cog (cogapp)** `--check` | 真相只寫一處,程式自動長進文件,CI 確認沒漂掉 | 預防派 | [nedbatchelder.com/code/cog](https://nedbatchelder.com/code/cog/index.html) |
| **`go generate` + `git diff --exit-code`** | CI 重跑自動產生再比對,有差就擋(= cora codegen-drift CI) | 預防派 | [Go 社群通用](https://github.com/golangci/golangci-lint/issues/20) |
| **syncpack** | monorepo 多份設定檔的版本號不一致就 CI 報錯 | 偵測派(= 本節 prototype 同型) | [syncpack.dev](https://syncpack.dev/)(AWS / 微軟 / Vercel / DataDog) |
| **Stryker(mutation testing)** | 「測試的測試」:故意塞 bug 看測試會不會變紅,證明測試自己會 fail | 測試原理(prototype「漂移那題」= 手動版) | [stryker-mutator.io](https://stryker-mutator.io/docs/)(微軟 .NET 內建) |

**佐證結論**:業界偏「預防」(cog / go generate 讓文件不給機會漂移),「偵測」(syncpack)是去重不掉時的補保險 —— 與本節階層完全一致。**「測試要能 fail」由 mutation testing 整套技術背書**,prototype 的正反兩題即其手動體現。

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
- [x] 全治理盤點 → 28 盲區報告 `docs/archive/gap-audit.md`
- [x] 全治理 **116 檔逐檔深讀**(取代片段盤點)→ `docs/archive/inventory-deep.md`;套入 6 條修正(2026-06-28)
- [x] **種子缺陷 4 修全結案**(2026-06-28):~~#1 學習迴圈補降級~~ ✅ §4.1 `loops/anti-bloat/` / ~~#2 冷啟動~~ ✅ §4.3 + `loops/context-growth/`(f8376f0,codex 審無 BLOCK)/ ~~#3 捕捉引擎~~ ✅ §4.2 `loops/learning-capture/` / ~~#4 跨專案版本治理~~ ✅ §1.6 **決定刻意不做**(scaffold 非 live dependency,記錄理由)
- [x] 冷啟動 `.md` 收尾(2026-06-28):`onboarding/context-templates/`(SYSTEM/GLOSSARY/CONVENTIONS/modules 四份空骨架)+ `onboarding/ONBOARDING.md` 開工流程文件 → **§4.3 種子實作全到位**
- [x] 把種子骨架寫成實體檔 + 4 角色空白員工合約 + `setup.sh` 安裝器(§1.7 架構鎖定)— **完成** 2026-06-29:薄核心 9 檔 + 51 rename 進 `template/`;`setup.sh` 三道把關過(codex 審 3 finding 修畢、M1 symlink 種子防護用變異測試殺死);builder-pm 已 push 上 GitHub
- [x] 洞 2:「SDD+TDD 紀律」與「openspec 工具」分兩層 → §2.5.7(openspec 歸 Generator SDD、opt-in)(2026-06-28)
- [x] **review-agent 抽成獨立 repo + plugin**(2026-06-29):`Amber-Chang/codex-pr-review`(private,config 載入器通用化、消費端自供 + 安全預設)+ 補 `.claude-plugin/` manifest → Claude Code 一鍵裝(`/plugin marketplace add` + `/plugin install`);`setup.sh` Codex 模組已接此一鍵流程
- [x] (收尾)cora-governance-notes 舊設計副本(`pm-governance-pack-design.md`)2026-06-29 換成指回 builder-pm 正本的指標(避免讀到舊版);同目錄 `governance-inventory-draft.md` 為獨立盤點底稿、不在此次清理範圍、保留
- [ ] 「該長出來」清單(§1.5 🌳)做成進階模組 / known-divergence,**非主線**
- [x] Drift 守門原則定案 → §5.5(三類 × 解法階層 + checker 必附測試鐵則)(2026-06-28)
- [ ] drift-fact-check 最小 prototype(`gates/drift-fact-check/`,自帶測試)→「對的自動化長怎樣」範本
- [ ] (cora 側·非主線)修 README「12 條」A 類 drift:正解是**去重/引用**(README 不報數字、指向 CLAUDE.md),非加偵測腳本
- [ ] (選用後路)套回 cora 的對照搬家(§6;可用 gap-audit + 全 `.claude/` 掃描當底稿)
- [x] **brownfield 導入 `/backfill-context`** → §4.4(2026-06-29 設計鎖定 + 實作 + 端到端實測,PR #3):確定性蒐證層 `scan-evidence.cjs`(自帶測試 §5.5 鐵則)+ 草擬指令 `backfill-context.md` + `setup.sh`/`ONBOARDING.md` brownfield 提醒,走 Planner/Generator/Evaluator 流水線。2026-06-29 拿 `personal-site` 端到端實測:草擬層產出堪用(信心分級正確、資料流誠實標待確認),並揪出 2 個掃描器缺陷(`external_integrations` 白名單漏現代棧 / 暫存夾裸跑無 gitignore 保護)→ 同流水線修補,Evaluator PASS(測試 11→14)
