# PM-AI 開發治理包 · 設計底稿(方案 B)

> 狀態:🚧 進行中 checkpoint ｜ 更新:2026-07-13 ｜ 正本:builder-pm repo(唯一正本)
> **這份文件是什麼**:由 brainstorming 對話累積的設計底稿,只記「已拍板」與「待辦」,不重述討論過程。
> 完整變更史見附錄 A;brownfield 實作規格(schema / 框上限 / 測試)正本在 code 旁,索引見附錄 B。

---

## 專案 Skill 治理

正式 project Skill 必須先由 PM 核准、固定外部來源版本，再納入 Git。`SKILLS.md` 提供人類可讀的路由表；`loops/skill-registry/check-skill-registry.cjs` 以 fail-closed 檢查重複名稱、路由衝突、採用紀錄、canonical / Codex adapter 與受保護 Claude Code 路徑。個人全域 Skill 不在本專案管理範圍。

## 0. 這個包是什麼(全局脈絡)

> 後面各節都建立在這條主線上;這裡講一次,後面只引用、不重述。

### 北極星與 PM 角色

**北極星**:抽出 cora「邊開發邊堆疊」長出來的治理裡**最重要的穩定骨架**,讓**未來新專案一成案(day1)就有可依賴的工作流可跑**。重點是 **forward 種新專案,不是 backport 回 cora**。

**PM 角色定位**(2026-06-28 PM 親口校準):harness 的目的是讓 **PM 在需求明確時,靠 AI 輔助 + harness 機制,開發出「幾乎可上線的產品原型」**;部署 / 壓測 / 更深技術細節仍交資深工程師。→ 直接定調:builder-pm 是**治理包(riding Claude Code 的 hook),不是自建 runtime**。目標是把需求變成可上線原型,不是維護一個 agent 執行環境(那會偏離北極星,連 portfolio 論述都歪)。

### 血統:v1 → v2

builder-pm **不是從零發明**。cora 是 2026-03 從模板 **`amber-stack`**(`tvbs-amberchang`,private)scaffold 出來的,而 amber-stack 自述就是「AI collaboration framework for PM-driven product development with Claude Code」—— 與 builder-pm **同一使命**。

- **amber-stack = v1**(已驗證好用):結構 / 12-agent 團隊 / 4 條設計原則(含 Single Source of Truth)/ `setup.sh` 冷啟動問答 / `{{placeholder}}` 填空。
- **但 v1 只有「種子」、沒有「長樹機制」** → 種下去沒人管 → 三個症狀:**會膨脹 / 不會自我精進 / 抓不到文字+code drift**。(amber-stack 明寫「每條規則只存一處」,cora 還是 drift 成 README 12 條 vs CLAUDE 13 條 → 證明**寫下原則 ≠ 守得住**。)
- **builder-pm = v2 = amber-stack 種子 + 三個自我維持迴圈**。

### 核心比喻:種子 + 長樹機制

包 = **種子 + 長樹機制**,不是 cora 長成的整棵樹。cora 後期的複雜度(多模型 / 契約 gate / 跨模型 reviewer)讓每個新專案靠「學習機制」**隨需長出來**,不是 day1 全內建。

> 一句話:**v1 給你會枯的漂亮盆栽;v2 加上會自己澆水/修枝/不亂長的機制。**

### 三個自我維持迴圈

| 迴圈 | 做什麼 | 狀態 | 詳見 |
|------|--------|------|------|
| **防膨脹** | 規則零遵循 → 自動鬆綁/退役(不只會加)| 🚧 設計鎖定 + prototype `loops/anti-bloat/` | §6.3 |
| **學習** | 踩雷自動捕捉 → 累積 → 畢業成規則 | 🚧 設計鎖定 + prototype `loops/learning-capture/` | §6.1 / §6.2 |
| **drift 守門** | 文字/契約不一致會擋 | ✅ 已建可跑 prototype | §8 |

### 四個種子缺陷(全結案)

來自盲區盤點(`docs/archive/gap-audit.md`),做實體檔時逐一處理 ——

| # | 缺陷 | 結論 | 詳見 |
|---|------|------|------|
| #1 | 學習迴圈只升不降(缺防膨脹)| ✅ 建機制 | §6.3 |
| #2 | 冷啟動只有空模板、缺流程 | ✅ 建機制 | §6.4 |
| #3 | 捕捉引擎其實 cora 沒做 | ✅ 建機制 | §6.2 |
| #4 | 跨專案版本治理 | ✅ **決定刻意不做**(記錄理由)| §2 |

### 已定基調

- **範圍**:先萃取**通用種子骨架**;「套回 cora」降為**選用後路**(§9),非主線。
- **深度**:**文件為主 + 極少硬關卡**(核心永遠 2 個;模組可各帶專屬硬關卡)。
- **方案**:**B = 一頁核心 + 選用模組**,複雜度由「開幾個模組」決定。
- **盲區報告**:`docs/archive/gap-audit.md`(28 個確認盲區);triage 尺 = 「**種子(day1 必備)vs 該隨專案長出來**」。

---

## 1. Day-1 種子骨架 — ✅ 鎖定(2026-06-27)

> 重心所在。判準:**種子(成案那天必備、ship 進每個新專案)vs 該長出來(靠學習機制隨需長,不 day1 內建)**。

**🌱 種子(day1 ship):**
- 核心憲章 10 條(§3)
- harness 4 角色 + Coordinator 分流(§4)—— PM 不寫 code 也驅動得動的工作流
- 2 個硬關卡(§7)
- 學習機制(§6)**且必須能升級也能降級**(零遵循的規則要自動鬆綁,否則新專案會長成重 cora)
- **冷啟動 onboarding 流程**:第一份 SPEC / CONVENTIONS / SYSTEM 怎麼起、裝包到能上工的引導(模板 ≠ 流程)→ §6.4
- **domain 知識庫容器 + context 載入路由**(空模板;Planner/Generator 的領域脈絡靠這層供給)
- **編碼約定 / 架構禁區空模板**(每專案必填,照抄通用版 = 失效)
- **雙語慣例表**(繁中產品 day1 必備):code 註解 / godoc / 變數 = 英文;markdown 正文 / commit / PR / issue = 繁中;yaml structural keys / enum / ID 保留英文。附反例「PM 講中文 ≠ 註解也寫中文」;派工 prompt 模板要預填此邊界(否則派 sub-agent 收到全英文交付)
- **provenance 去硬編紀律**:做實體檔前全 repo 掃 `/Users/`、repo slug、token/key,一律改 templated/env 佔位;種子 settings 模板絕不含明文 secret(cora `settings.local.json` 明文存 key = 反例)
- **盤點分類紀律「未啟用機制 ≠ 死碼」**:逐檔裁決前先看讀/寫路徑是否接線;「地基鋪好尚未接線」(如 cora `error-patterns.json`)不是死碼,別反射性砍(此尺直接防 §9 對照搬家砍錯承重牆)
- **Drift 守門原則**(§8):文件 DRY(同一事實只寫一處)> 偵測;任何 drift checker 必附測試否則不准進包

**🌳 該長出來(不 ship,隨專案長):**
- 完整的多模型 / `.codex` 第二治理樹（review-agent 程式、知識庫、校準資料）不隨種子 ship,有需要才長；但這不包含最小 `.codex/review-config.json`。選 Codex / 雙平台,或 Claude-only 啟用 Codex review 時,安裝器會 ship 該設定檔,提供 `pr-review-agent` 所需知識來源路由。
- 契約一致性 gate / codegen drift(有規格契約才需要)
- 跨模型 reviewer 的 false-positive 校準 / Rescue 例外(有第二模型才需要)
- drift 容忍中間層、real-path UAT、Engineer-led 輕量路徑、併發鎖定 / worktree、branch hygiene 三段式

> 四個種子缺陷的結案狀態見 §0;完整 28 盲區 + triage 見 `docs/archive/gap-audit.md`。

---

## 2. 安裝與更新架構 — ✅ 鎖定(2026-06-28,PM 逐步拍板)

> 里程碑:把 builder-pm 從「設計稿 + 散裝範本」變成**引導式安裝包**(`setup.sh` 問答 → 填 `{{placeholder}}` → 砍用不到 → `git init`)。v2 把「會裝進新專案的東西」圈進 `template/`,界線比 v1 乾淨(v1 設計稿與種子混在 repo 根、靠 setup.sh 手動砍)。外部 plugin 仍需使用者啟用 / reload 並驗證 skill,不屬於自動安裝完成範圍。

### 2.0 雙 runtime adapter 決策 — ✅ 已實作(2026-07-13)

- `setup.sh` 提供 Claude Code / Codex / 兩者三種安裝選擇。
- `CLAUDE.md` 與 `.claude/` 維持位元不變並保留為共用治理與角色契約；`AGENTS.md` + `.agents/skills/` 是薄的 Codex adapter,不複製契約。Codex-only 也保留 `.claude`,但其 runtime 入口仍是 `AGENTS.md` + `.agents/skills/`。
- Codex 開發完成先由全新 Evaluator subagent 做本機審查（無法啟動時 fallback `codex review --uncommitted`）,只產生 `LOCAL PASS` / `LOCAL FAIL`；GitHub PR 再由 `pr-review-agent` 產生 `PR PASS` / `PR FAIL` / `PR REVIEW BLOCKED`。`LOCAL PASS` 不等於正式交付完成。
- Codex / 雙平台的正式 PR gate 必須使用 `codex-pr-review`。目前 CLI 相容性實測為 `codex plugin marketplace add` 可用,但 `codex plugin install` 並非所有版本都有；文件只能要求使用者啟用 / reload 後驗證 `pr-review-agent` skill,不得宣稱外掛會自動啟用。
- 安裝採 staging copy（先組裝暫存內容再複製）並限制刪除範圍；Claude-only 安裝到 brownfield（既有專案）時,不得刪除原有 `AGENTS.md` 或 `.agents/`。

### 2.1 兩類內容:scaffold vs tool

builder-pm 混了兩種「散佈方式天生不同」的內容 ——

| 類型 | 例子 | 天生散佈方式 |
|------|------|------------|
| **① 鷹架**(複製一次、專案自己擁有、會改)| 核心憲章 · 4 角色合約 · `.context` 模板 · loops/gates 紀律 | 留在 seed / `setup.sh`(copy-once)|
| **② 工具**(要版本控管、會更新、多專案共用)| `review-agent` · openspec · skill 包 | **已以 plugin 發布**(版本化 + 更新)|

### 2.2 薄核心 + 依平台啟用模組(走 plugin 介面)

**薄核心(always-on,每個新專案都有)**:`CLAUDE.md`(§3 憲章)· `.claude/agents/{coordinator,planner,generator,evaluator}.md`(空白員工合約)· `SKILLS.md` + 3 通用 skill(§4.6)· `.context/` 四空模板 · `loops/`+`gates/` · `ONBOARDING.md` · `setup.sh`。選 Codex / 雙平台,或 Claude-only 啟用 Codex review 時,另 ship 最小 `.codex/review-config.json`;它是 plugin 知識路由設定,不是完整第二治理樹。

**依平台處理的模組**:
- **openspec** → Generator 的 SDD 流程(§4.6);選了才跑 `openspec init` 生最新 skill,標明需先裝 CLI。
- **Codex PR 審查** → Claude-only 可選擇 `codex-pr-review` 作第二模型；Codex / 雙平台的正式 PR gate 必須使用其 `pr-review-agent`。只有 Claude-only 未啟用 plugin 時可維持單模型獨立審；Codex / 雙平台若 plugin、PR、授權或知識來源不可用,正式狀態只能是 `PR REVIEW BLOCKED`,不得靜默降級為單模型 PASS。

**關鍵設計:外部工具走 plugin 介面,不把 ② 類工具搬進 `template/`**。理由:② 是重型 + 會更新,vendor 進種子 = 過期 + 養肥(撞 §6.3 anti-bloat)。
- `review-agent` 已驗證**自給自足**(只用 Node 內建 + 內部 require、52K、無外部套件無硬編 key)→ 天生 plugin 形狀 → 已抽成獨立 repo + plugin(見 §10)。
- `codex-pr-review` repo 已同時具備 `.claude-plugin/` 與 `.codex-plugin/` manifest,不必每專案手抄 review skill；`setup.sh` 依平台提供啟用指引,但不宣稱自動啟用。
- CLI 相容性邊界：目前可用 `codex plugin marketplace add`,但 `codex plugin install` 並非所有版本皆提供。marketplace add 只加入來源,不代表 plugin 已可用；使用者仍須 enable / reload 並驗證 `pr-review-agent`。

### 2.3 更新模型:開工模板,非自動更新套件(PM 拍板「刻意不做跨專案推送」)

> 對應種子缺陷 #4。**結論:刻意不建自動推送引擎**;#4 = 「想清楚後決定不做」,非遺漏。

**判斷**:builder-pm 是 **scaffold(開工模板),不是 live dependency(會自動更新的套件)**。裝進新專案後,專案就「長成自己的樣子」,硬把核心/模組更新推回去會與長出來的內容打架(PM 洞見:「都長成那專案的樣子了,更新下去搞不好互斥」)。

| 內容 | 更新待遇 |
|------|---------|
| 引擎/機制(`loops/*` `gates/*` 的 code、hooks、核心憲章)| 專案不手改 → **可手動重新拉**新版(無衝突);不自動推 |
| 專案長出來的(`.context/` 知識層、`.governance/` lessons/conventions)| **永不覆蓋** —— 各專案本就該分歧,這是設計目的 |

**刻意不做**:跨 N 專案的自動 propagation 引擎(版本廣播 / 自動 merge)。某專案要某支引擎修補 → 自己手動重新拉那幾支檔即可。

**§2.2 是 §2.3 的成熟版,不是推翻**:§2.3 說「引擎可手動重拉新版」—— plugin 就是「手動重拉」的**正式機制**(版本化、像 npm/VS Code 外掛)。scaffold≠live-dependency 仍成立:① 鷹架 copy-once 不回流;② 工具走 plugin 才有受控更新流。

**業界佐證(≥3,portfolio;對應 Rule #7「不用直覺覆蓋業界 pattern」):**

| 對標 | 證據 | 對應 |
|------|------|------|
| **cookiecutter / rails new** | scaffold 完即你的、不回流更新 —— 主流模板工具預設 | ① 留 seed |
| **copier / `rails app:update`** | 少數想支援模板更新的,用 3-way merge → **實際會產生衝突**,正是 PM 擔心的「互斥」實證 | 不做自動推送 |
| **npm / library 模型** | 更新能流動**只因**你不改 `node_modules`;一旦 fork 改它更新就回不去 | 「不手改的才可更新」分界 |
| **npm / VS Code Marketplace** | 工具版本化、可更新、多專案共用 | ② 走 plugin |
| **VS Code `.vscode/extensions.json`** | 只**推薦**外掛、不把外掛塞進 repo | SKILLS.md「推薦不綁死」(§4.6)|
| **superpowers plugin** | 一個 repo 帶多介面 adapter | 實證「Codex 工具做得成 plugin」|

---

## 3. 核心憲章(一頁 / 10 條 / 4 桶)— ✅ 鎖定

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

---

## 4. Harness:4 角色流水線與 block 分流 — ✅ 鎖定(2026-06-27)

> 來源:PM 手繪 harness 心智圖 + cora `.claude/HARNESS-ROLES.md`(5 角 / 3 紀律)+ 全 `.claude/` 掃描(實證:9 個 agent 定義骨架 100% 一致、零例外)。

### 4.1 交付線 = 4 個角色的流水線

```
你(人)⇄ Coordinator ──派工──→ Planner ──派工──→ Generator ──提交審查──→ Evaluator
        (Main agent)         (PM agent)        (Dev / UX agent)      (code reviewer)
          ↑                  brainstorm        SDD + TDD            交互檢查
          │                  → PRD/SPEC                                 │
          └────────────────── 發現 block,回報 ←──────────────────────────┘
```

**角色 ≠ agent 名字**(沿用 cora 正交原則):同一個 agent 可戴不同帽子。cora 原本第 5 角「Read-only 探索」在本包併入核心原則 #4(探索模式),交付線上只剩 4 角。

### 4.2 block 分流:Coordinator 是「分流大腦」,不是傳聲筒

Evaluator 發現 block **不直接踢回 Generator**(那會逼「寫 code 的」去修「規格沒寫清楚」的問題 → 無限迴圈)。改成回報 Coordinator,由 Coordinator 判**根因在哪一層**再分流:

| 根因層 | 症狀 | 踢回 |
|--------|------|------|
| 實作層 | code 寫錯 / 沒跑過 test / 漏 edge case | → Generator 修 |
| 規格層 | SPEC 沒講清楚 / 自相矛盾 / 漏了某情境 | → Planner 補 SPEC |
| 判斷層 | 兩 AI 各執一詞 / 商業取捨 / 動到高風險面 | → escalate 給 Human |

**逃生門(防 Coordinator 自己誤判)**:同一個 block 繞 ≥ 2 次仍未解 → **強制 escalate Human**,Coordinator 不准再自己分流。對應 cora「連續 2 次同問題 = 規則/判斷本身有問題」計數邏輯。

**派工紀律(讓分流不淪空殼)**:Coordinator / Planner 派 Generator 時,要把該讀的 SPEC / 契約引文**摘要貼進 prompt 內文**,不是丟一個連結 —— 實證(cora #214)丟連結 → LLM 跳讀漏掉某段 → 違約。「有 context 路由」不等於「路由真有效」。

### 4.3 三條交接鐵律(焊進每個 agent 檔,不靠 PM 記)

1. **Generator 不自評** —— 回報只陳述事實(跑了什麼指令 + 結果),禁「looks good / 應該沒問題」品質判斷。
2. **Generator → Evaluator 強制交接** —— Evaluator 必須**與 Generator 不同 agent**;PASS / FAIL 都要附可驗證證據(指令輸出 + 引用行號)。
3. **Planner / Evaluator 不寫 production code** —— Evaluator 發現 bug **不准自己改**,回報 Coordinator 重新派 Generator(保獨立性)。

### 4.4 通用 vs cora:框是通用、框下的工具是 cora 填的

PM 心智圖每個角色框「下面那行字」全是 cora 的**工具選擇**,不是角色本身 —— 這天然分好了通用核心與專案配置:

| 角色框(🟢 通用·進核心) | cora 的填法(🔴 可抽換) | 在通用包是 |
|------|------|------|
| Coordinator | Main agent · PM 直接對話 | 核心 + 名冊 config(誰當) |
| Planner | PM agent · `brainstorming` → PRD/SPEC | 核心 + 模組⑤ |
| Generator | dev / UX agent · `openspec` 的 SDD+TDD | 核心 + 模組③ + config(用不用 openspec)|
| Evaluator | code reviewer · Claude × Codex 交互檢查 | 核心 + 模組② |

> **model 分層 by role(harness 成本/延遲槓桿)**:cora 用高檔模型(opus)給 Planner / 契約決策、標準檔(sonnet)給 Generator / Evaluator / 協調。這是「依角色調 harness 檔次」的現成成本槓桿 → 種子的名冊 config 該預留「角色 → 模型檔次」欄位。

### 4.5 放進包的三層

- **核心 +1 鐵律**:4 帽不混戴 / 最少做到「寫的 ≠ 驗的」(永遠在,連單人專案配一個 AI 也適用 —— 用另一個 session/agent 來驗即達成)。
- **模組②(雙人驗證)** 吃下 鐵律 1+2 細節 + 「**空白員工合約**」agent 骨架模板(回報紀律 / 禁止 / Composition 三段預先填好,技術棧留白)。
- **模組④(多 agent 派工)** 吃下 角色表 + 6 派工 pattern(Pipeline / Fan-out / Expert Pool / Producer-Reviewer / Supervisor / Hierarchical)+ 角色↔agent 對照表模板;標「專案夠大才開」。
- **名冊內容**(養哪些 agent、什麼技術棧)= **專案 config**,不進通用包。

### 4.6 skill 路由層:角色 ↔ skill(SKILLS.md 單一正本)— ✅ 鎖定(2026-06-28)

> 來源:PM 拿 personal-site 的 `SKILLS.md` 當參考(按場景挑 skill、最小必要、不為有而硬用)。關鍵洞:**4 角色 = 工作四階段,「場景」自然折進「角色」**,不必搞「場景 × 角色」二維(YAGNI)。

**機制**:種子 ship 一份 **`SKILLS.md`(角色標記版索引)= skill 清單單一正本**(§8 DRY:同一事實只寫一處);每個角色合約放一小段「我會用的 skill」指回它 + 留 `{{空白}}` 給專案加場景專用的。

**3 個通用 skill 預接(輕薄版,不 vendor 重型外部包):**

| 角色 | 預接 skill | 性質 |
|------|-----------|------|
| Planner | `brainstorming` | 通用·常駐 |
| **Generator** | `test-driven-development` + **`openspec`(SDD)** | TDD 常駐;openspec 走 opt-in(§2.2)|
| Evaluator | `requesting-code-review` | 通用·常駐 |
| Coordinator | —(分流大腦,不需要)| — |

**openspec 歸 Generator 不歸 Planner**:SDD(先有 spec 再實作)是 Generator 的**紀律**;Planner 做更前面的模糊收斂(brainstorming → PRD)。沒裝 openspec 時 Generator 照樣做 SDD —— 用「先讀 spec、對齊、再實作」紀律版,不靠特定工具。

**紀律隨種子帶走**:SKILLS.md 內含 personal-site 那句「只在真有幫助時用、不為有 skill 而硬用、最小必要組合」—— 與 anti-bloat(§6.3)同一靈魂。

> **已解的兩個洞**(原 PM 圖待補):
> - **洞 2:工具 vs 紀律分層** —— 「SDD+TDD 是紀律」與「openspec 是 cora 選的工具」分兩層,別專案抽換工具就影響紀律 → ✅ 落地本節 + §2.2(openspec 走 opt-in)。
> - **洞 3:自家 SPEC vs OpenSpec「二選一」** —— cora 同時有自家 `docs/04-specs/SPEC-*` 與整套 OpenSpec,兩套命令撞名(`explore` vs `opsx:explore`)。種子改走 **first-class opt-in**:選了才裝、當 Generator 唯一 spec 流程故不撞名(見 §2.2)。

---

## 5. 選用模組(按專案形狀開)— ✅ 鎖定(細節可微調)

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

---

## 6. 學習、防膨脹與知識成長機制 — ✅ 鎖定(本次重點,最完整)

> 三迴圈裡的「學習」「防膨脹」住這節;「drift 守門」獨立在 §8(靠近硬關卡)。冷啟動(§6.4)與 brownfield 導入(§6.5)是 onboarding,**用**這些迴圈當成長引擎。

### 6.1 記憶 / 學習:存什麼、捕捉、品質閘、畢業

> ⚠️ **校正(gap-audit + deep-inventory)**:
> 1. 本節「半自動捕捉」的 hook 在 cora **不存在**(無 Stop/SessionEnd hook、捕捉 100% 手寫且停更 45 天)→ cora 端是**淨新建**,但**有 Hermes `background_review` 完整對標可借**(§6.2),非憑空發明。
> 2. 畢業只有「升級」是單向缺陷,需補對稱**降級**(§6.3)。
> 3. **「純建議=零執法」已有 cora 鐵證**:main agent 連續 5 次違反 PM「不要寫 memory」指示 → cora 建 `block-memory-write` PreToolUse hook 物理攔截。即 **DISCIPLINE 在 LLM 上會系統性失守,必要時得用 hook 兜底**。
> 4. `error-patterns.json` **不是死碼**:cora `knowledge.cjs` 有完整 load/search/add、`review-packet.cjs` 已組進 live packet → **讀路徑已接、寫路徑未啟用、零資料**;種子不鏡像的理由是「不重建 cora 的自我累積 bug 知識庫(屬 grow,有第二模型 reviewer 才需要)」,非「死碼所以不管」。

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

### 6.2 學習捕捉引擎:讓捕捉「真的會動」— ✅ 設計鎖定(2026-06-28)

> grounding:Hermes `agent/background_review.py`(每回合 fork 便宜 aux 模型回顧該回合)+ nudge config。**這是三迴圈最後一個**(種子缺陷 #3)。§6.1 設想的「半自動捕捉」方向對,但 cora 自己沒做;Hermes 證明它是**可上線的真機制**,我們搬它的形狀。

**結構性限制 + 解法**:builder-pm 是**治理包、不掌控對話迴圈**(乘客非車),不能像 Hermes 每 N 回合 fork 自己。但 **Claude Code 把觸發點開放成 hook**,Hermes 三觸發全做得出來 → **不需變 runtime**(變 runtime 會砍掉零基建/PM day1 能用/可攜三命根,見 §0 北極星):

| Hermes 用迴圈做的 | builder-pm 用 hook 做 | config 對標 |
|------|------|------|
| context 消失前 flush(最重要,最後一次補捉)| **PreCompact hook**(SessionEnd 不行:session 已終止、純 stdout 只進 log 收不到)| `flush_min_turns:6` |
| 每 N 回合 nudge「考慮存」 | **Stop hook + 自存計數器** | `nudge_interval:10` |
| 複雜任務後存 skill | Stop hook + 條件 | `creation_nudge_interval:15` |
| 當場 AI 紀律(PM 一糾正就草擬)+ `/lesson` 顯式後門 | charter 紀律 + slash 指令 | — |

**捕捉品質閘(Hermes review prompt 純 prompt,可整段搬,最有價值的可攜部分):**
- **該記的訊號(任一觸發即行動)**:PM 糾正你的風格/語氣/格式/冗長(「太囉嗦」「直接給答案」「別這樣排版」=第一級訊號)、PM 糾正你的流程/步驟順序、冒出非顯而易見的技巧/修法/debug 路徑、載入的 skill 被證明錯/缺步驟 → 當下 patch。
- **🔑 絕不記的反模式(Hermes 硬教訓,cora §6.1 只有薄版):**
  1. **環境依賴的失敗**(缺 binary / 沒裝套件 / 沒設憑證)—— PM 自己能修,不是耐久規則。
  2. **對工具的負面斷言**(「X 壞了」)—— 會「**硬化成 agent 之後幾個月拿來拒絕自己的藉口**」,即使原問題早修好。要記就記**修法**,不記「這工具不能用」。
  3. **已解的暫時錯**(retry 成功 → 教訓是 retry pattern,不是那個錯)。
  4. **一次性敘事**(「總結今天行情」不是一類工作)。
- **偏向記**:「Nothing to save 不該是預設;什麼都沒記 = 錯過學習,不是中性結果。」
- **擺放紀律(= 捕捉時就防膨脹,與 §6.3 同系統)**:先 patch 既有 skill/規則 > 才開新的;新名**必須 class-level**,**禁** PR 號 / error 字串 / 「fix-X / 今天這題」當名。
- **Memory vs Lesson 分流**:Memory 記「使用者是誰 + 當前狀態」;Lesson/Skill 記「這類任務怎麼做」。PM 的風格/流程偏好 → 進治理規則本文,不只進 memory。

**種子實作**:`loops/learning-capture/` —
- **品質閘 linter(可測核心,runtime 無關)**:給一則草擬教訓,確定性檢查 HARDLINE 必填欄位 + 擋上面 4 種反模式 + 擋 session-artifact 命名 → PASS/REJECT。**這是讓捕捉能長久的關鍵**(沒品質閘 → cora 那種手寫停更 + 爛條堆積)。
- **觸發 hook**:最小 PreCompact nudge hook —— context 壓縮前,用 `hookSpecificOutput.additionalContext` JSON 把品質閘 checklist + 草擬模板**注入給模型**(官方唯一會讓模型收到 hook 輸出的管道)。**踩雷修正(2026-06-29,查官方文件)**:原型曾用 `SessionEnd` + 純 stdout —— 但 SessionEnd 在 session 已終止時觸發、模型無下一回合,純 stdout 又只進 debug log 模型看不到 → nudge 等於印給空氣;已改 PreCompact + additionalContext。**這條本身就是「寫了機制 ≠ 它會動」的活案例。**
- **草擬 prompt**:載入式 capture 指令,內嵌上面整段品質閘(Hermes review prompt 繁中化)。

**不做**:RAG、SQLite/向量庫(過度工程;規模不到。要 filter 用 frontmatter,要 session 搜尋未來用 FTS5 關鍵字)。

> ⚠️ **自我修正(Rule #12,對真 code 重查)**:本節舊筆記曾寫「Hermes 的 periodic nudge 是行銷話術、捕捉 100% 靠顯式 /learn」—— **這是錯的**。`agent/background_review.py` + config(`nudge_interval:10` / `flush_min_turns:6` / `creation_nudge_interval:15`)證明 Hermes **有完整、可設定、自動週期的捕捉引擎**。

### 6.3 防膨脹迴圈(畢業的鏡像)— ✅ 設計鎖定(2026-06-28)

> grounding:Hermes **`Curator`**(已上線 OSS,有測試 + 文件 + issue #7816)+ cora 自身鐘擺 telemetry(**雙背書:外部 OSS 設計 + 內部實證**)。Curator 把「沒人用的 skill」沿 `active → stale → archived` 推、**從不刪只封存可還原**;builder-pm 把同一形狀搬來治「沒人遵守的規則」。

**為何非建不可**:學習迴圈(§6.1 畢業)只會「往上加」,不補降級 → 新專案規則只增不減,終究長回那個重到記不住的 cora。防膨脹是它缺的對稱另一半 —— **與畢業共用同一套 strike + frontmatter,只是反方向跑**。

**訊號(旁掛 sidecar,不污染規則正文 = Curator `.usage.json` 模式):**
- **主訊號 = override 率**(規則觸發了卻被繞)。cora 鐵證:Rule #6「連續 ≥ 2 次 override 同 PR → 視為規則本身有問題」、Rule #8 因 telemetry `8/8 done_def:false` 砍半。**這是 builder-pm 與 Curator 唯一分家處** —— 規則的成本在「高摩擦」不在「閒置」(Curator 治 skill 用閒置正確;治規則要用 override)。
- **副訊號 = 休眠**(長期零觸發),照 Curator inactivity 模型,低優先。
- sidecar(`.governance/rule-usage.json`)屬本機 telemetry → **gitignore 不進 repo**。換機/交接重置 strike → 由 first-run 寬限窗承接,可接受。**只有「降級決定」進 repo**(規則移檔 = commit)。

**兩段式 run(= Curator 便宜偵測 + opt-in 判斷):**
1. **確定性偵測(無 LLM、便宜、常開)**:算 strike、跨門檻列「規則健身報告」;**只報告不攔截**(防膨脹是迴圈、不是關卡)。
2. **判斷(opt-in)**:AI 草擬鬆綁/退役建議,**PM 拍板**。貴的判斷才花成本(= Curator LLM consolidation 預設 OFF)。

**觸發**:閒置檢查非 cron(session 收尾 / 隔 N 個 PR 一次),不打斷工作(= Curator idle-check 而非 daemon)。

**安全欄(非協商,全抄 Curator 踩過的坑):**
1. **核心憲章 10 條 = protected**,永不自動退役(= Curator 硬編 protected built-ins)。
2. **never delete** —— 只降級/鬆綁/標 stale,移進 `.governance/retired/` 可還原;動前先快照(= Curator 跑前自動 tar 快照 + 一鍵 rollback)。
3. **first-run 寬限窗** —— 新專案無 override 史 → 不立即退役任何規則(= Curator seed-on-first-sight,直接解「種子 day1 無資料」)。
4. **PM pin** —— 可釘任何規則豁免(= Curator pin)。
5. **jurisdiction** —— 只管「畢業上來 / 模組帶的」規則,**絕不碰 PM 手寫拍板的核心意圖**(= Curator only-agent-created)。

**降級階梯(對應升級階梯)**:規則被繞 → friction strike +1 → 跨門檻列候選 → PM 審 → 鬆綁(條件放寬 / 降風險級)或 退役(移 `.governance/retired/`,可還原)。

**種子實作**:`loops/anti-bloat/` 提供最小、自帶測試的 **Phase 1**(確定性偵測 + protected 清單 + 寬限窗 + dry-run 報告)當範本;Phase 2 判斷留給 AI/PM,不寫死。與 §8 drift 範本並列,但 `gates/`(會擋)vs `loops/`(只報告)刻意分家。

### 6.4 冷啟動 onboarding + 知識層成長偵測 — ✅ 設計鎖定(2026-06-28)

> 種子缺陷 #2。grounding:v1 `amber-stack/setup.sh`(安裝半套已驗證)+ cora `.context/` **真實成長史**(逐檔實證,見下)+ §6.2/§6.3/§8 三迴圈(知識層的成長引擎)。

**v1 的 bug(冷啟動為何被標成缺陷)**:`setup.sh` 結尾叫 PM「Next steps:填 SYSTEM.md / 填 GLOSSARY.md」—— 這是**早問 bug**:要 PM 在 day-0 填兩個那時根本沒資訊可填的檔(SYSTEM 要先有架構決策、GLOSSARY 要先 spec 過功能)。真實 day-0 PM 手上頂多**技術選型 + 第一版 PRD**。

**正式文件目錄(2026-07-13)**:PRD 使用 `docs/01-prd/PRD-<三位數>-<slug>.md`，SPEC 使用 `docs/02-spec/SPEC-<三位數>-<slug>.md`。每份 SPEC 必須有一份主要 PRD，關聯由 SPEC frontmatter 的 `related_prd` 建立；一份 PRD 對多份 SPEC 的對照由檢查器導出，不維護人工第三張表。新安裝採新結構，既有專案不會自動遷移。`docs/inbox/`、`docs/research/`、`docs/decisions/` 都只在首次真的需要時建立，不預先建立。敏感逐字稿留在受控外部位置，Git 只放安全摘要。

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
| **module specs**(`SPEC-NNN`)| 要做新功能才寫該支 SPEC | SPEC-001→011 一路按功能加上來 | 模組⑤ / Planner |
| **GLOSSARY** | SPEC 引入新術語 → 進表,每條指回正本 doc | created 3/25→updated 4/21 長出 | §8 drift 守門 |
| **conventions / 架構禁區** | 同類雷 ≥2 次 → 畢業成 convention | `engineer-style-patterns.md` 自述「從 PR #341/#344/#345/#346 抽取」 | §6.1 畢業↑ + §6.3 防膨脹↓ |
| **SYSTEM.md** | 重大結構決策才補一節(低頻、人主導)| Apr 21 寫完後幾乎沒動 = 結構級 | architect 起草,PM 確認 |

> **收口**:冷啟動能「薄」,正因**三迴圈會在 day-N 把知識層長出來**。三迴圈不是跟冷啟動分開的兩件事 —— 它們**就是知識層的成長引擎**。v1=薄種子但不會長;v2=一樣薄的種子 **+ 會自己長知識層的三迴圈**。

**偵測「何時該填」(PM 要求:harness 主動抓時機)— 誠實分級(沿 §8 A/B/C):**

| 檔 | 訊號 | 可偵測性 | 怎麼偵測 |
|----|------|:---:|---------|
| conventions | lesson `strikes≥2` | ✅ **A·已建一半** | 掃 `.governance/lessons/*` frontmatter → nudge 畢業(免費)|
| GLOSSARY | docs 用到的術語不在表內 | ✅ A(噪音需 triage)| diff「changed docs 的 backtick 術語」−「GLOSSARY 已有」→ 列候選 |
| module specs | 改 production code 無 owning SPEC | 🟡 B 中等 | 改 code 的模組無對應 SPEC → nudge |
| SYSTEM.md | 「重大結構決策」 | 🔴 **C·無法全自動** | 判斷題;只能抓 proxy:新增 `modules/X.md` 但 SYSTEM 沒動 → 提醒 |

> ⚠️ **不過度承諾**(Rule #12):SYSTEM 是 C 類**判斷題、無法可靠自動偵測**,只給 proxy 提醒。GLOSSARY/conventions 才是 A 類可確定性偵測。
> ⚠️ **死殼陷阱**(§8 鐵則):cora `check-terminology.sh` 正是「偵測術語」做成**死殼**的反例。會動版本 = **只列候選、不強制**(report-only)+ **必附測試**。

**形狀**:**不是新第四迴圈** —— 主要是把既有三迴圈的訊號接到知識層 + 加兩支小偵測器(glossary-candidate / spec-coverage)。與 §6.3 同形:確定性偵測(report-only)→ AI/PM 草擬 → PM 拍板填。**loops/(只報告)非 gates/(會擋)**:不能逼人寫 glossary。

**`/onboard` 引導流程**:① 確認技術棧 → ② 帶 PM 起第一版 PRD(接 brainstorming)→ ③〔選用·可跳,**建議留**〕day-1 跑一次極小真派工,讓 PM 親眼看「派工→驗證→commit」整條 harness 會動 → ④ 講清楚「`.context` 是空的、會這樣長」+ 附成長表。

**種子實作**(✅ 已建):`loops/context-growth/` Phase-1 偵測器(glossary-candidate + lesson-graduation + spec-coverage + system proxy,自帶測試、report-only,commit f8376f0)+ `onboarding/context-templates/` 四份 `.context/` 空骨架 + `onboarding/ONBOARDING.md` 開工流程文件。註:目前 `/onboard` 是流程文件,變成真 slash 指令留待後續。

**業界佐證(≥3,portfolio;對應 Rule #7):**

| 對標 | 在做什麼(白話) | 對應本節 |
|------|----------------|---------|
| **Walking skeleton**(Cockburn / GOOS)| 先讓一條極薄端到端跑起來,其餘長出來 | 薄冷啟動 |
| **arc42 / evolutionary architecture docs** | 架構文件隨專案演進,非前期一次寫完 | SYSTEM/.context 成長 |
| **Living Documentation**(Cyrille Martraire)| 文件由工作觸發 / 衍生,不是憑空寫 | 偵測「何時該填」 |
| **ESLint warn-level / coverage report** | 報告不阻斷;覆蓋率報「哪裡沒測」 | report-only loop / spec-coverage 偵測 |

> 佐證結論:業界主流是「薄起步 + 文件隨工作長 + 偵測缺口用 report-only」—— 與本節完全一致。連結待 finalize 時補查(arc42.org / diataxis.fr / Living Documentation 書)。

### 6.5 brownfield 導入:`/backfill-context`(既有專案冷讀草擬知識層)— ✅ 鎖定(2026-06-29)

> §6.4 的鏡像場景(§6.4 是 greenfield day-0,本節是 brownfield 半成品專案 day-N 導入)。產出自 brainstorming Q1–Q6 逐題拍板。**實作規格(schema / 框上限 / 資料流 / 14 條測試 / 信心標記規則)正本在 code 旁,清單見附錄 B 指標。**

**問題(為何 §6.4 不夠)**:§6.4 為全新專案 day-0 設計,接到**已開發到一半的既有專案**時兩個假設都破:
- `.context/` 仍空,**舊專案藏在 code 裡的知識完全沒被捕捉**(沒人會回頭手填一整個既有系統的 SYSTEM/GLOSSARY)。
- `loops/context-growth` 偵測器**方向相反**:你一動既有 code,spec-coverage / glossary-candidate 會狂噴「沒有對應 SPEC / 一堆術語沒進表」→ **噪音轟炸**而非補齊。

→ 需要一個**一次性**的「冷讀現有專案 → 草擬 `.context/`」能力,把 day-N 偵測器降噪到可用。

**已拍板 6 決定(Q1–Q6):**

| # | 決定 | 為什麼 |
|---|------|--------|
| Q1 | **通用能力**,不對著特定專案設計 | 治理包要可攜(§0 北極星)|
| Q2 | **隨需指令** `/backfill-context`(在 Claude 跑)+ `setup.sh` 偵測到既有專案時**提醒**去跑 | shell 跑不了 AI 草擬,只能提醒;一次性動作不該常駐 |
| Q3 | 第一版草擬**三份**:SYSTEM + modules 清單 + GLOSSARY 候選 | CONVENTIONS 交回原機制(見非目標)|
| Q4 | 讀取來源:**code + 專案現有文件 + git 歷史**(git 歷史需框上限)| 三來源互補;git 是「為什麼這樣做」的線索 |
| Q5 | 草稿落地:寫**暫存區** `.context/.backfill/`,PM 逐份核可才搬正式 | 草稿 ≠ 真相(§6.4/§8 同魂);正式檔在 PM 拍板前永不含 AI 猜的 |
| Q6 | 內部架構:**方案 B = 確定性蒐證(證據包)+ AI 草擬** | 蒐證層可測(§8 鐵則)、草擬層判斷;兩層分離 |

**非目標(YAGNI,刻意不做):**
- ❌ 不草擬 **CONVENTIONS** —— 維持「同類雷 ≥2 次畢業」機制(§6.1)。憑 code 反推「架構禁區」最易亂講、變死殼(§8)。
- ❌ 不加新角色(不在四角色 harness 加 archivist,對 v1 過度設計)。
- ❌ 不自動搬正式 —— 草稿永不自動進正式 `.context/`,一律 PM 拍板(Q5)。

**元件與檔案落點**(沿用本包「腳本 + 自帶測試 + README + fixtures」形狀,同 `loops/context-growth/`;皆進 `template/` 種子):
```
template/
  onboarding/backfill/                 ← 新增:確定性蒐證層(onboarding=開工一次性,非 loops 的 recurring)
    scan-evidence.cjs                  # 掃描器:讀 code/docs/git → evidence.json
    scan-evidence.test.cjs             # 自帶測試(§8 鐵則:checker 必附測試)
    fixtures/                          # 測試用假專案(sample / no-git / empty)
    README.md                          # 用途 / evidence.json 格式 / 框上限 / 怎麼跑
  .claude/commands/
    backfill-context.md                ← 新增:隨需 slash 指令本體(本包第一個真指令)
```
- 蒐證層放 `onboarding/`(開工一次性)**而非 `loops/`**(recurring)—— 語意才對;也是 `template/onboarding/` 的第一個子目錄。
- 這是本包第一個真 slash 指令(`/onboard` 仍只是流程文件)→ 順手立「指令怎麼寫」範本,未來 `/onboard` 跟進。
- 核心:**蒐證層(可測、確定性)** 與 **草擬層(AI 判斷)** 分離 —— 對齊 §6.3/§6.4「確定性偵測 → AI 草擬 → PM 拍板」三段。

**Done Definition:**
- **Goal**:既有專案裝好 builder-pm 後跑 `/backfill-context`,能產出三份草稿(SYSTEM/modules/GLOSSARY 候選)+ REPORT 進 `.context/.backfill/`;`scan-evidence.cjs` 有通過的測試(附錄 B 案例);`setup.sh` 與 `ONBOARDING.md` 有 brownfield 提醒/路徑;本決定記進 design.md。
- **Out of scope**:CONVENTIONS 草擬;`--promote` 自動搬;`/onboard` 指令化;builder-pm 自我 dogfood。

**未來(本案範圍外):**
- `--promote` 小幫手(v1 由 PM 手動搬,REPORT 寫清楚怎麼搬)。
- CONVENTIONS 的 brownfield 草擬(待 v1 驗證價值後再評估)。
- 把 `/onboard` 也做成真 slash 指令(跟隨本案立下的指令範本)。

---

## 7. 硬關卡(共 2 個)— ✅ 鎖定

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
- 安裝:核心 hooks 由 `setup.sh` 在專案內接線；外部 plugin 不納入「自動開啟」承諾,仍須依平台指引啟用 / reload 與驗證對應 skill。

**補(2026-06-28 deep-inventory):**
- **第三類「人工 fail-closed 啟用閘」(grow,非自動關卡)**:cora 對資安敏感功能(SES 憑證 / SSRF / Git push)採「code 已 merge 但需真人資安工程師簽核才准**啟用**」紀律(合入 ≠ 上線)。這是不靠 code、純靠 PM/工程紀律的安全邊界;種子保留此 **pattern**,gate 內容隨專案長。
- **機密進出衛生**:攔截① 只防 AI 產物**出站**;要再防(a)**入站** —— secret 貼進對話 / `.env` 進 repo;(b)**設定檔現狀** —— cora `settings.local.json` / `.mcp.json` 明文存 ClickUp key 是反例。種子 settings 模板**絕不含明文 key**,README 明標 cora 現狀為反面教材。

---

## 8. Drift 守門:三類 × 解法階層 — ✅ 鎖定(2026-06-28)

> 來源:PM 提問「文件雙重維護 / drift 能不能用腳本可靠避免」+ 讀 cora 三支 drift 腳本實況。結論:**能,但預防 > 偵測,最關鍵那層不需腳本。** 這是三迴圈的「drift 守門」(見 §0)。

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

**種子實作**:`gates/drift-fact-check/` 提供一個最小、自帶測試的「字面事實一致性」檢查當**範本**,非通用神器。

**業界佐證(≥3 對標 + 證據;對應 Rule #7):**

| 對標 | 在做什麼(白話) | 對應本節 | 來源 |
|------|----------------|---------|------|
| **cog (cogapp)** `--check` | 真相只寫一處,程式自動長進文件,CI 確認沒漂掉 | 預防派 | [nedbatchelder.com/code/cog](https://nedbatchelder.com/code/cog/index.html) |
| **`go generate` + `git diff --exit-code`** | CI 重跑自動產生再比對,有差就擋 | 預防派 | [Go 社群通用](https://github.com/golangci/golangci-lint/issues/20) |
| **syncpack** | monorepo 多份設定檔版本號不一致就 CI 報錯 | 偵測派(= prototype 同型)| [syncpack.dev](https://syncpack.dev/) |
| **Stryker(mutation testing)** | 「測試的測試」:故意塞 bug 看測試會不會變紅 | 測試原理(prototype「漂移那題」)| [stryker-mutator.io](https://stryker-mutator.io/docs/) |

> 佐證結論:業界偏「預防」(cog / go generate),「偵測」(syncpack)是去重不掉時的補保險 —— 與本節階層完全一致。**「測試要能 fail」由 mutation testing 整套技術背書**。

---

## 9. 套回 cora(選用後路,非主線)— ⬜ 待執行

> 2026-06-27 重心校正後「套回 cora」**降為選用後路**:主線是 forward 種新專案(§0 / §1)。若哪天要把輕量包裝回 cora 取代舊治理,以下仍適用,但不是這個包的存在理由。

3 件事:
1. **對照搬家** —— cora 每條舊治理逐一決定:進新核心 / 變模組 / 退休。
2. **救回記憶** —— `~/.claude` 那 23 條教訓(換機就不見)搬進 repo 的 `.governance/LESSONS`,交接看得到。
3. **開 2 個攔截** —— 在 cora 打開「包包檢查」+「兩個簽名」。

---

## 10. 待辦 open items

- [x] 在 GitHub 開新 repo(builder-pm),做成真的可重用專案(PM 2026-06-26)
- [x] Harness 角色分層定案 → §4(PM 手繪圖 2026-06-27)
- [x] 重心校正 forward-first + 新增種子骨架 §1(PM 2026-06-27)
- [x] 全治理盤點 → 28 盲區報告 `docs/archive/gap-audit.md`
- [x] 全治理 **116 檔逐檔深讀** → `docs/archive/inventory-deep.md`;套入 6 條修正(2026-06-28)
- [x] **種子缺陷 4 修全結案**(2026-06-28):#1 防膨脹 ✅ §6.3 / #2 冷啟動 ✅ §6.4 / #3 捕捉引擎 ✅ §6.2 / #4 跨專案版本治理 ✅ §2.3 **決定刻意不做**
- [x] 冷啟動 `.md` 收尾(2026-06-28):`onboarding/context-templates/` 四份空骨架 + `onboarding/ONBOARDING.md` → §6.4 種子實作全到位
- [x] 把種子骨架寫成實體檔 + 4 角色空白員工合約 + `setup.sh` 安裝器(§2 架構鎖定)— **完成** 2026-06-29:薄核心 9 檔 + 51 rename 進 `template/`;`setup.sh` 三道把關過;builder-pm 已 push 上 GitHub
- [x] 洞 2:「SDD+TDD 紀律」與「openspec 工具」分兩層 → §4.6(2026-06-28)
- [x] **review-agent 抽成獨立 repo + plugin**(2026-06-29 當時紀錄；啟用方式已由 2026-07-13 決策取代):`Amber-Chang/codex-pr-review`(private)已有 `.claude-plugin/` 與 `.codex-plugin/` manifest；現況是 `setup.sh` 提供平台別引導,使用者仍須啟用 / reload 並驗證 `pr-review-agent`,不是自動「一鍵裝好」。
- [x] (收尾)cora-governance-notes 舊設計副本 2026-06-29 換成指回 builder-pm 正本的指標(避免讀到舊版;同一事實兩處會 drift,見 §8)
- [x] Drift 守門原則定案 → §8(三類 × 解法階層 + checker 必附測試鐵則)(2026-06-28)
- [x] **brownfield 導入 `/backfill-context`** → §6.5(2026-06-29,PR #3):確定性蒐證層 `scan-evidence.cjs`(自帶測試)+ 草擬指令 `backfill-context.md` + `setup.sh`/`ONBOARDING.md` brownfield 提醒。拿 `personal-site` 端到端實測:草擬層堪用、揪出 2 個掃描器缺陷(白名單漏現代棧 / 暫存夾裸跑無 gitignore)→ 同流水線修補,Evaluator PASS(測試 11→14)
- [ ] 「該長出來」清單(§1 🌳)做成進階模組 / known-divergence,**非主線**
- [ ] drift-fact-check 最小 prototype(`gates/drift-fact-check/`,自帶測試)→「對的自動化長怎樣」範本
- [ ] (cora 側·非主線)修 README「12 條」A 類 drift:正解是**去重/引用**(README 不報數字、指向 CLAUDE.md),非加偵測腳本
- [ ] (選用後路)套回 cora 的對照搬家(§9;可用 gap-audit + 全 `.claude/` 掃描當底稿)

---

## 附錄 A:變更史

- **2026-07-13** — 核准並完成雙 runtime adapter：安裝可選 Claude Code / Codex / 兩者；保留 `CLAUDE.md` / `.claude/` 共用正本,以 `AGENTS.md` / `.agents/skills/` 薄轉接；明確區分 LOCAL 與 PR 狀態、Codex / 雙平台的 `codex-pr-review` 正式 PR gate、CLI 啟用相容性限制,並記錄 Claude-only brownfield staging-copy 不刪既有 Codex 檔案的安全邊界。

> 原本擠在文件頂部的逐日紀錄移來這;括號內為現行 §編號。

- **2026-06-27** — 新增 Harness 角色分層(現 §4),基於 PM 手繪心智圖 + 全 `.claude/` 掃描。
- **2026-06-27** — 重心校正:forward 種新專案為主線(非回套 cora);新增種子骨架(現 §1);盲區報告 `docs/archive/gap-audit.md`。
- **2026-06-28** — 全治理 **116 檔逐檔深讀**(取代片段盤點)→ `docs/archive/inventory-deep.md`;套入 6 條修正(模組⑥跨樹依賴 / OpenSpec 雙軌 / 雙語+去硬編+未啟用≠死碼 / error-patterns 修正 / fail-closed 閘+機密衛生 / 派工貼引文+model 分層)。
- **2026-06-28** — 新增 Drift 守門(現 §8)+ `gates/drift-fact-check` 範本;翻 cora 出生史確認 **amber-stack = builder-pm v1**,v2 = v1 種子 + 三個自我維持迴圈。
- **2026-06-28** — 新增防膨脹(規則降級)迴圈(現 §6.3)+ `loops/anti-bloat/` 範本(grounding:Hermes `Curator` OSS + cora 鐘擺 telemetry,雙背書)。
- **2026-06-28** — 新增學習捕捉引擎(現 §6.2)+ `loops/learning-capture/` 範本;**自我修正**舊筆記「Hermes 沒自動 nudge=行銷話術」之誤。北極星 PM 角色校準=治理包非 runtime。三迴圈設計全鎖定。
- **2026-06-28** — 新增冷啟動 onboarding + 知識層成長偵測(現 §6.4);grounding v1 `setup.sh` + cora `.context/` 真實成長史 + 三迴圈當成長引擎。修 v1「day-0 叫 PM 填 SYSTEM」早問 bug。prototype `loops/context-growth/`(commit f8376f0,codex 審無 BLOCK)。
- **2026-06-28** — 新增更新模型(現 §2.3,PM 拍板「刻意不做跨專案推送」);**四個種子缺陷至此全結案**。
- **2026-06-28（歷史狀態,已由 2026-07-13 雙 runtime 決策取代）** — 新增安裝架構(薄核心 + 當時規劃的 opt-in 模組走 plugin 介面)+ skill 路由層(現 §4.6);當時將 openspec+Codex 審查都視為 opt-in,並把 review-agent 抽獨立 plugin 列為下一里程碑。現況改為 Claude-only 的 Codex review 選用、Codex / 雙平台正式 PR gate 必要。
- **2026-06-29** — brownfield 導入 `/backfill-context`(現 §6.5)設計鎖定 + 實作 + 端到端實測(PR #3);review-agent 抽成獨立 repo + plugin。
- **正本遷移** — 原 `cora-governance-notes` 副本 2026-06-28 起停止同步(同一事實兩處會 drift,見 §8),2026-06-29 換成指回 builder-pm 正本的指標。

---

## 附錄 B:brownfield 實作細節 → 正本在 code 旁

> 這裡原本有 `evidence.json` schema、掃描器框上限、資料流、14 條測試清單。
> 那些是**實作規格**,正本住在 code 自己的檔案裡(§8 DRY:同一事實只寫一處;設計文件不再抄一遍)。
> 設計**決策**層(為什麼分兩層 / Q1–Q6 / 非目標)留在 §6.5。

| 想看 | 正本位置 |
|------|---------|
| evidence.json 格式 / 框上限 / 確定性保證 / 不自動改正式檔 | `template/onboarding/backfill/README.md` |
| schema 欄位真值(怎麼產生)| `template/onboarding/backfill/scan-evidence.cjs` |
| 14 條測試案例(結構 5 / 降級 3 / 框上限 1 / 確定性 1 / 錯誤 1 / 缺陷回歸 3)| `template/onboarding/backfill/scan-evidence.test.cjs` |
| 信心標記 🟢🟡🔴 規則 / 草擬流程 / REPORT 格式 | `template/.claude/commands/backfill-context.md` |
