<!-- [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-28 -->
<!-- Purpose: governance-deep-inventory workflow 對 cora 全治理表面的逐檔深讀 + 跨比對結論（取代 gap-audit 的片段式盤點） -->

# cora 全治理表面 · 逐檔深讀盤點

> 來源：`governance-deep-inventory` workflow（2026-06-28）。**12 agent · 707634 token · 116 檔逐檔全文深讀**（非片段摘要）。
> 與 `gap-audit.md` 的差別：上一輪是 Explore agent 抓片段 + critic 推論，漏了 `.codex/review-agent` 整套子系統、把 error-patterns.json 誤判死碼。這輪強制全文讀可執行腳本 + 跨樹依賴 + 停用機制辨識。

---

## A. 上次 gap-audit 完全沒抓到（深讀新冒出）

**A1. module⑥(PR 合併防呆 harness)有一條跨樹硬依賴:check-pr-merge.cjs 頂層 require('.codex/review-agent/lib/github.cjs')。它不是自足模組,抽出時若不連帶 .codex 樹會在 require 階段直接 crash。**
- 為何重要：gap-audit 把 ⑥ 列為乾淨獨立模組(§3),又在 B1 把整棵 .codex 樹判為『該長出來/§6 可砍』。兩者矛盾:照 design 現狀『核心+①②』或只開 ⑥ 的新專案,裝上去就掛。這是 backport 與 forward 都會踩的具體斷鏈,gap-audit 完全沒抓到這條 live 依賴。
- 對應 design：§3 模組⑥ + B1

**A2. OpenSpec 與 cora 自家 SPEC 是『雙軌並存』:openspec CLI(已安裝)+ openspec/{changes,specs} 目錄 + 四件套 skill,平行於 docs/04-specs;且 /explore 與 /opsx:explore、cora-start 與 opsx:propose 命令撞名、語意重疊。**
- 為何重要：design module⑤(契約文件)與核心 explore 模式若把 openspec skills 當種子直接搬,新專案會同時拿到兩套 spec/propose/explore 流程互相打架。§2.5.6 洞 2 只談 SDD+TDD vs openspec 工具分層,沒談整套 OpenSpec 生命週期與既有命令撞名的取捨。gap-audit 0 提及。
- 對應 design：§2.5.6 + §3 模組⑤ + 核心 explore

**A3. 語言/雙語慣例完全缺席:cora 有 language-conventions.md(code 註解/godoc/變數英文、markdown 正文/commit/PR/issue 繁中、yaml structural keys/enum/ID 保留英文),並把『PM 講中文所以註解也寫中文』列為 AI 易犯錯誤類比。**
- 為何重要：deep-read 明判這是『繁中產品 day1 必備』,MEMORY 也有『派 sub-agent 寫 docs 不指定就收到全英文』教訓。design 與 gap-audit 兩份都零提語言邊界。對一個要服務中文 PM 的種子包,這是會天天踩、卻被整盤漏掉的承重牆。
- 對應 design：§1.5 種子骨架 + §2.5 派工

**A4. 硬寫死的 owner/機器路徑與 repo slug 散落多檔:pr-merge-harness/SKILL.md 與 governance-map-visual.md 仍寫 /Users/tvbs/dev/cora、tvbs-digital/cora(現為 amberchang)。**
- 為何重要：design 北極星是『可重用包,ship 進每個新專案』。帶著前一台機器/owner 的寫死路徑與 repo slug 進種子=裝到別人專案立刻失效。這是『可重用』這個定位的基本衛生,gap-audit 的版本治理 missing category 沒涵蓋到 provenance 去硬編這層。
- 對應 design：§1.5 + §7 待辦(做實體檔時)

**A5. 祕密管理壞習慣會被種子包『複製結構』一起帶走:governance-map-visual §已知風險明載 ClickUp API key 在全域 .mcp.json 與專案 settings.local.json 兩處明文存放,且 ~/.claude 是未確認 .gitignore 的 git repo。**
- 為何重要：gap-audit 的『機密入站衛生』只講『防 secret 貼進對話/.env 進 repo』(入站),沒抓到 cora 自身設定檔已明文存 key 這個出站事實。種子包若附 settings 模板照抄結構,等於把祕密外洩習慣播種到 N 個新專案。比 gap-audit 那條更尖、更急。
- 對應 design：§5 安裝/一鍵設定 + 新增機密衛生段

**A6. 『合入≠上線』人工資安簽核 fail-closed activation gate:多個資安敏感功能(SES #702 / SSRF #728 / Git push #912)code 已 merge 但被『需真人資安工程師簽核才能啟用』紀律擋住。**
- 為何重要：這是一種不靠 code、純靠 PM/工程紀律的安全邊界 pattern,與 gap-audit B2 講的契約 gate(codegen/check-contracts/guard-generated)是不同類別。design 的硬關卡只有 2 個自動攔截,完全沒有『人工 fail-closed 啟用閘』這個 pattern 的位置。
- 對應 design：§5 硬關卡 + §1.5 grow

**A7. 派工時必須把 SPEC/契約引文『貼進 prompt 內文』而非『丟連結』(pre-fix-context-check 實證 #214 丟連結→漏讀 §2.5 違約)。**
- 為何重要：design §1.5 把『context 載入路由』列為種子、§2.5 講 block 分流,但沒講『路由要真有效』的關鍵 dispatch 紀律。Coordinator/Planner 派 Generator 時若只給連結,LLM 會跳讀導致違約。這是讓 context 路由不淪為空殼的機制細節,gap-audit 的『context 載入路由』missing category 沒下到這層。
- 對應 design：§2.5.2 + §4 context 路由

**A8. 『機制完整但未啟用』是一個獨立於『死碼』的盤點類別,在 cora 反覆出現:error-patterns.json、parallel-dev 多人階段、tdd-policy『升級為 Codex 必查』條件、spec-template-agent-routing-hint(提案未落地)、block-memory-write hook 的前身。**
- 為何重要：這是一條盤點方法論:逐檔淺看會把『地基鋪好尚未接線』誤判成死碼(gap-audit 駁回 error-patterns 時自己就踩了)。builder-pm 做 §6 對照搬家逐檔裁決時,沒有這把尺就會砍錯承重牆。gap-audit 沒把它提煉成顯式原則。
- 對應 design：§4 + §6 對照搬家

**A9. 治理觀測層的資料是『生產端在 hooks/、消費端在 skills/』的分離鏈:governance-review check.sh 消費的 harness-telemetry.jsonl 由 pre-commit-codex-check.sh + pre-dispatch-enrichment.sh 生產,且該 jsonl 被 .gitignore + Rule #13 禁入 PR。**
- 為何重要：gap-audit 點到『缺治理觀測層』,但沒抓到這條鏈抽一半即斷:乾淨 clone 的種子跑 governance-review 必得空報表。builder-pm 若只搬 skills 不搬對應 hooks(或反之),觀測層是死的。
- 對應 design：§4 學習機制 + §5

**A10. model 分層 by role:architect/product-copilot(planner/契約決策)用 opus,dev/reviewer/qa/main(generator/evaluator/協調)用 sonnet。**
- 為何重要：gap-audit 的『harness 成本/延遲經濟學』missing category 只講 token/時間成本籠統,沒抓到 cora 已用『角色決定模型檔次』來控成本。這正是『何時 harness 貴到不值得跑、依改動大小調深度』的現成槓桿。
- 對應 design：§2.5 + 成本經濟學

## B. 上次判斷錯，需修正

**B1. 原宣稱**：Critic 駁回:『error-patterns.json 是 cora 的空殼 dead code({patterns:[]}、從沒接進 live loop)』,因此 design 不鏡像是合理簡化。
- **修正**：『dead code / 從沒接進 live loop』在事實層是誤判。兩個獨立 reader 確認:knowledge.cjs 有完整 loadErrorPatterns/searchKnowledge/addErrorPattern 讀寫+加權評分,review-packet.cjs 會把它組進 packet.errorPatterns —— 讀取路徑已接線進 live packet 流程,只有寫入口 addErrorPattern 尚無人呼叫(預留擴充點)。正確描述是『機制完整、讀路徑已接、零資料、寫路徑未啟用』,不是死碼。結論(design 只建一套人讀 LESSONS、不鏡像、不上 RAG)仍可保留,但理由要改成『刻意不重建 cora 的自我累積 bug 知識庫(那是 grow,有第二模型 reviewer 才需要)』,而非『那是死碼所以不用管』。

**B2. 原宣稱**：B1:.codex/ 第二治理樹是與 .claude/ 平行鏡像的維度,§6 套回 cora 可能默默砍掉整棵;triage 傾向標 known-divergence / 該長出來。
- **修正**：需補一個約束:.codex 樹不是純可選鏡像——module⑥ 的 pr-merge-harness 對 .codex/review-agent/lib/github.cjs 有 live require 依賴(見 missed #1)。所以『砍掉 .codex 樹』與『保留 ⑥』不能並存。B1 的裁決必須加註:若種子要帶 ⑥,要嘛內聯該 github helper、要嘛承認 ⑥ 連帶拉進部分 .codex 樹。純『該長出來』分類在此會自相矛盾。

**B3. 原宣稱**：gap-audit 把多項『純建議現實=零執法』『紀律型 gate 沒 hook 化靠人手動跑』都歸到 Top Risk 3 / D 群,作為 design 該補的觀測/分層。
- **修正**：方向對,但 deep-read 提供了更強的實證鏈可直接引用、不需推論:ai-status-index 違規表 #7 顯示 main agent 連續 5 次違反 PM『不要寫 memory』指示,明文結論『靠自律已證明反覆失守』→ 建 block-memory-write PreToolUse hook 物理攔截。這是『DISCIPLINE 在 LLM 上系統性失守 → 升級硬 hook』的完整一手證據,應從『風險推測』升級為『已驗證的設計依據』寫進 design §4/§5,強化『純建議=零執法』不是臆測而是 cora 親身教訓。

## C. builder-pm 萃取時最不能漏（Top Risks）

**C1. module⑥(pr-merge-harness)抽出時不帶 .codex/review-agent/lib/github.cjs → require 階段 crash;而 design 同時把 .codex 樹判為『該長出來/可砍』,兩者直接矛盾。**
- 動作：做實體檔時:要嘛把 github helper 內聯進 ⑥ 自成一檔、要嘛在 ⑥ 標明『連帶拉進 .codex github helper』。先跑一次 grep require/import 把所有跨樹依賴攤出來,別把任何模組當乾淨獨立。

**C2. 把 OpenSpec skills 當種子搬 → 與 module⑤ 自家 SPEC 系統 + 核心 explore 模式形成雙軌、命令撞名(explore vs opsx:explore、cora-start vs opsx:propose),新專案 PM 困惑。**
- 動作：種子預設只帶一套 spec/propose/explore;OpenSpec 整套標為『cora 選用工具(grow)』。落實 §2.5.6 洞 2:把『SDD+TDD 是紀律』與『openspec 是工具』分兩層寫。

**C3. 硬編路徑(/Users/tvbs、/Users/amberchang)、repo slug(tvbs-digital/cora)、明文 API key 散落多檔被原樣帶進可重用包 → 裝到新專案即失效 + 祕密外洩播種。**
- 動作：做實體檔前全 repo 掃 /Users/、repo slug、token/key;一律改 templated/env 佔位;種子的 settings 模板絕不含任何明文 secret,並在 README 警示 cora 現狀為反例。

**C4. error-patterns.json 誤判死碼的歷史重演:逐檔淺看會把『機制完整但零資料/未接寫入口』判成可砍。**
- 動作：盤點 §6 對照搬家時,對每個看似空/未用的檔先驗讀路徑+寫路徑是否接線,用『未啟用機制 vs 死碼』兩類分,別反射性砍。

**C5. 語言/雙語慣例整盤漏掉 → 繁中 PM 的種子包派 sub-agent 收到全英文交付、godoc 中英混亂。**
- 動作：種子核心必含雙語邊界表;agent 骨架『空白員工合約』與派工 prompt 模板預填『docs/SPEC 用繁中、code identifier 用英文』指令。

**C6. 治理觀測層只抽一半(skills 或 hooks 其一)→ 報表空轉、降級迴圈失去數據來源,精準重蹈『又重又記不住』病。**
- 動作：抽觀測/學習層時 hooks(資料生產)+ skills(週審消費)+ jsonl 排除規則三者一起帶;確認乾淨 clone 後管線能產出非空訊號,且學習迴圈要對稱(零遵循/高 override 自動列鬆綁候選)。

## D. 種子 vs 該長出來 vs cora 自留

### 🌱 SEED（day1 種子該有）
- 語言/雙語慣例表(code 註解·godoc·變數=英文;markdown 正文·commit·PR·issue=繁中;yaml structural keys·enum·ID 保留英文)+『PM 講中文≠註解寫中文』反例 —— 繁中產品 day1 必備
- PRD/SPEC 空模板(已純結構零 cora 內容):PRD 內建 Explicitly Out of Scope、SPEC 內建 Open Questions(編號+Status+Decision)/Acceptance Criteria checklist —— 治理紀律種在模板欄位層
- review-checklist 10 段審查框架 + 第 9 段 False Positive Guard(報 finding 前先試圖用 repo 推翻它)+ 固定輸出 PASS/NEEDS_CHANGES/NEEDS_REDESIGN —— 任何新專案 reviewer agent 可直接用
- [NEED-REVIEW] 語意 reframe:讀者是 AI agent(必須停下判斷)非人類;寫入端三要素=為什麼標/判斷依據/底線禁區,缺判斷依據→agent 只能猜,缺底線→agent 可能選危險方案
- 派工 dispatch 紀律:Coordinator/Planner 派 Generator 時把 SPEC/契約引文摘要『貼進 prompt 內文』而非丟連結(實證丟連結會漏讀違約)
- 盤點分類紀律:『機制完整但未啟用』是獨立於『死碼』的類別;逐檔裁決前先看讀/寫路徑是否接線,別把『地基鋪好未啟用』當死碼砍
- provenance 去硬編:種子包做實體檔前全 repo 掃 /Users/、repo slug、token,一律 templated/env,絕不含明文 secret
- 兩段式 human-in-the-loop:把『AI 產 finding』與『真的寫回 PR』切成兩支腳本,人留迴圈中,腳本刻意不 auto-approve/auto-merge
- 通用 markdown retrieval 骨架(summarizeMarkdown 拆 section→bullet + title×4/path×3/summary×2/內文×1 加權搜尋)—— 與業務無關、可當輕量 RAG 種子
- model 分層 by role(planner/契約決策用高檔模型、generator/evaluator/協調用標準檔)作為 harness 成本槓桿
- agent 骨架『空白員工合約』(回報紀律/禁止/Composition 三段預填、技術棧留白)—— 已在 design §2.5.5,確認為種子
- execFileSync+參數陣列(非 shell 字串拼接)+ gh auth 失敗 fail-closed —— GitHub 互動腳本的安全寫法範本

### 🌳 GROW（該隨專案長出來）
- OpenSpec 整套四件套(propose/apply/archive/explore + CLI + openspec/ 目錄)—— 除非新專案明確選用 openspec,否則不 ship(避免與自家 SPEC 系統+核心 explore 雙軌撞名)
- .codex 第二治理樹(CODEX.md 三模式 + .codex/rules/ + review-agent harness)—— 加第二個模型家族當 reviewer 才需要
- check-contracts.sh 五向 YAML↔Go 雙向 diff 引擎 + check-drift.sh 廢棄 role 掃描 —— 有規格契約才需要;抽的是『Primary YAML/Derived code 雙向 diff』骨架不是檔本體
- error-patterns.json 自我累積 bug 知識庫(讀路徑已接、寫路徑待啟用)—— 隨 review 次數長資料,有第二模型 reviewer 才接線寫入口
- spec-template-agent-routing-hint §0(誰會載入/grep 觸發字/不要載入情境/與其他 SPEC 關係)—— SPEC 多到要判斷該不該載才需要
- ADR-lite 決策紀錄(如 Go N-1 策略連同理由+觸發條件落檔)+ Known Limitations Register —— 不是『雷』塞不進 LESSONS,專案累積技術決策才長
- module docs 當『決策日誌/PM override 紀錄』用(delivery-core 記 SMS 三竹、Email SES+SendGrid 並行決策)
- real-path UAT 腳本(直接 docker exec 查 audit row 真寫入、先抓 NOW() 再 POST 避 stale)—— 有後端副作用要驗才長
- drift 容忍中間層(allowlist+期限+owner,逾期自動升硬擋)—— 有契約 drift 治理需求才長

### 🔧 PROJECT_CONFIG（cora 自留，通用包不背 / 要主動清）
- config.cjs 知識源路徑 + 8 條模組前綴對照表(backend/cora-platform/internal/...)—— 整張換,只留『前綴→模組 doc 對照』結構
- clickup-sync(List ID 901816298117、done/complete 規則、.env.clickup、[Amber 小助理] 前綴)
- engineer-style-patterns(綁 Go/pgx/三平台 SDK 的 PR #341-346 style 規準)—— 只有 D 段通用紀律可抽
- dev-sdk 三平台(Web/iOS/Android)SDK 治理包 —— 多數新專案不需背
- repo-structure(npm workspaces 路徑 + Go module 名 backend/cora-platform)
- settings.local.json / .mcp.json 內的 API key —— 絕不背、且要主動掃除(不是 config 是必清的祕密)
- phase0-snapshot.sh 的 hard-coded baseline 閾值(fix:feat 0.94 / Round2 平均 7 / drift 11 / pattern 5.1%)與 commit message 慣例 grep
- PRD-003~009 依賴鏈、9 個 module 清單、SPEC-001~015 編號體系 —— cora 專屬產品脈絡
- docs/ 白名單資料夾編號(01-guides~07-meetings)與 PREFIX-NUM 命名 —— 結構可借鏡但編號語意是 cora 的

## E. design.md 具體該改哪節

1. **[§3 模組清單(模組⑥)]** 在模組⑥加註隱藏依賴:pr-merge-harness 對 .codex/review-agent/lib/github.cjs 有 live require;標明種子化時需內聯 github helper 或連帶拉進該 lib,不可當乾淨獨立模組。同步修正 B1 裁決(.codex 樹不是純可選鏡像)。
2. **[§2.5.6 洞 2 + §3 模組⑤ + 核心 explore]** 明寫『自家 SPEC 系統與 OpenSpec 二選一』:種子預設只帶一套 spec/propose/explore 流程,OpenSpec 四件套標為 cora 選用工具(grow);註記 explore vs opsx:explore、cora-start vs opsx:propose 命令撞名取捨。
3. **[§1.5 種子骨架]** 新增三項種子:(1) 語言/雙語慣例表(繁中產品 day1 必備);(2) provenance 去硬編紀律(路徑/repo slug/secret 全掃改 env 佔位);(3) 盤點分類紀律『未啟用機制 ≠ 死碼』。
4. **[§4 記憶/學習模組]** 修正 error-patterns.json 註記:從『cora 沒有/dead code』改為『機制完整、讀路徑已接、寫路徑未啟用 → 屬 grow,刻意不鏡像』;並補入 block-memory-write hook 實證(連續 5 次自律失守→升級硬 hook)作為『純建議=零執法』的一手依據。
5. **[§5 硬關卡 + §1.5 grow]** 新增第三類 pattern『人工 fail-closed 啟用閘』(合入≠上線、資安敏感功能需真人簽核才啟用),與 B2 的契約 gate 並列;同時新增『機密入站+出站衛生』段:種子 settings 模板絕不含明文 key,警示 cora 現狀。
6. **[§2.5.2 block 分流 + §4 context 路由]** 補入 dispatch 紀律:Coordinator/Planner 派工時把 SPEC/契約引文摘要貼進 prompt 內文而非丟連結(否則 context 路由淪為空殼);並把 model 分層 by role 納入 §2.5 作為 harness 成本/延遲經濟學的現成槓桿。

---

## 附錄：各束『束級發現』（逐檔視角看不到的）

### 根目錄治理 md（cora 根目錄 6 檔:CLAUDE.md / AGENTS.md / PROJECT-STATUS.md / ai-status-index.md / CLAUDE-CHANGELOG.md / README.md）
- 束級最大發現:這 6 檔是『單一權威來源 + 多 pointer』的治理架構，但執法力幾乎都不在這束裡。6 檔本身 5 個是 DOC_REFERENCE/DATA、只有 ai-status-index 帶 telemetry 性質。真正的 HARD_GATE（hook/CI）住在 .claude/hooks/ 與 .github/workflows/，這束只是它們的索引與帳本。逐檔看會嚴重低估治理深度。
- 『policy 標籤 ≠ 真實機制強度』是貫穿全束的核心張力:CLAUDE.md 把 13 條標 [M]/[O]，但自承只有 2 條有完整自動機制、7 條其實是 ADVISORY 靠自律。落差被刻意外推到 .claude/GOVERNANCE-MAP.md（不在本束）。builder-pm 若只抄 CLAUDE.md 規則文字、不抄 GOVERNANCE-MAP，會得到一個『看起來很硬、實際多半軟』的假治理。
- 治理鐘擺是束級主旋律:CLAUDE-CHANGELOG + ai-status-index 兩檔合看，揭露 cora 治理經歷『過載(18 條/5408 行)→瘦身(token 砍 32%)→用 telemetry 反向修剪規則(Rule #6/#8 鬆綁)』的完整循環。對種子包的啟示是『規則要可被實測數據修剪、不能只加不減』，而非把 cora 現有 13 條照搬。
- 『軟紀律失效→升級硬 hook』有完整實證鏈:ai-status-index 違規表 #7 顯示 main agent 連續 5 次違反 PM『不要寫 memory』的指示，結論明文『靠自律已證明反覆失守』→ 建 block-memory-write hook。這證明 DISCIPLINE_MANUAL 機制在 LLM 上會系統性失守、必要時得用 PreToolUse hook 物理攔截。這是逐檔讀規則文字絕對看不到的治理 know-how。
- 『合入≠上線』的人工 fail-closed gate 模式遍布 PROJECT-STATUS:多個資安敏感功能(SES 憑證 #702 / SSRF #728 / Git push #912)程式碼已 merge 但被『需真人資安工程師簽核才能啟用』的紀律擋住。這是一種不靠 code、純靠 PM/工程紀律的安全邊界，種子包應保留此『模式』但 gate 內容是 cora 專屬。
- drift(漂移)是 cora 治理的頭號假想敵，貫穿三層:AGENTS.md 為防規則雙寫漂移而刻意 rule-free、README 警告工程師勿讓 code 與 openapi/SPEC 漂移、CLAUDE-CHANGELOG 記錄 commit message 決議會在 3-5 版內漂移失效。這個『drift-first』世界觀是 cora 因 SPEC 強綁多 agent 而生的特殊產物，新專案 day1 未必需要同等重量。
- 存在實際 drift 樣本可佐證上點:README 自稱『12 條 Mandatory Rules』、CLAUDE.md 現為『13 條 Operating Rules』，README 未跟上 v1.13+ 改版——治理檔自己就在小幅漂移，印證了維護多份同義文本的成本。

### .claude 頂層治理 + governance-decisions
- 治理『policy 標籤 vs 真實執法』有系統性落差，且 cora 自己誠實記錄了：6 條 [M] Mandatory 只有 #6（pre-commit-codex-check.sh）與 #13（CI no-claude-telemetry-leak.yml）是真 HARD_GATE，其餘 4 條 [M]（#1/#3/#11/#12）實際只是 ADVISORY/SOFT_GATE。builder-pm 若照 [M] 標籤理解執法強度會被誤導——真相在 GOVERNANCE-MAP §Enforcement Levels。
- 整個束的設計哲學是『自律會失敗，所以把能機器化的搬進 hook』：HARNESS-TELEMETRY v0.2.0 把 A2/A3 從 main agent 自律 echo 改成 hook 自動寫；COLLABORATION 的踩雷 ≥2 次→升級 rule/hook 管線；A16 累犯計數表。這條『經驗→機制固化』管線是最值得當種子的方法論，但具體條目內容是 cora grow。
- 治理層存在『已盤點但未動工』的明確 backlog：GOVERNANCE-MAP §Open Gaps 的 G1-G4（main agent 手寫 code 無 hook 攔、PR-merge harness 無 pre-push 偵測、startup 必讀無驗證、禁猜測無偵測）+ harness-adoption §6 的 v1.17.0+ 未採用清單。這些是 cora 治理『蓋一半』的誠實清單，builder-pm 可判斷哪些根本不必移植。
- 兩個 governance-decisions 檔揭露 cora 治理曾因 PM『成效不彰想回第一代』而動搖，並透過外部對標（revfactory/harness 3.3k star）重新校準。harness-adoption §2.2 類別 B 已經幫 builder-pm 做好『cora 獨有、新專案別背』的分界（SPEC drift 層 / OpenSpec / issue Owner 派工 / Engineer-led），是現成的種子 vs grow 判斷依據。
- 資安隱憂：governance-map-visual §已知風險明文記載 ClickUp API key 在全域 .mcp.json 與專案 settings.local.json 兩處明文存放，且 ~/.claude 本身是未確認 .gitignore 的 git repo。移植治理包時若連帶複製設定檔結構，有把祕密管理壞習慣一起帶過去的風險。
- 路徑漂移訊號：governance-map-visual（2026-05-20）通篇寫 /Users/tvbs/dev/cora，但實際 cwd 已是 /Users/amberchang/dev/cora——治理文件本身會 stale，視覺圖類文件未隨機器/使用者遷移更新，逐檔看不出但跨檔比對才發現。

### .claude/agents/ — sub-agent 角色定義（9 個 persona：1 main coordinator + 4 dev generator + architect/product 設計 + code-reviewer/qa evaluator）
- 束級治理鏈：9 個 agent 不是平行清單，而是強制的 Generator→Evaluator 分離治理。architect/product-copilot 出契約 → dev-* 當 generator 寫 code → code-reviewer/qa 當 evaluator 簽核，且 main.md 明令 evaluator 必須與 generator 不同 instance。這條「不可自我簽核」的紀律散在 5 個檔（main/code-reviewer/qa/dev-backend/dev-sdk）反覆 echo，是 cluster 的核心不變量，逐檔看會以為只是各自的提醒。
- enforcement 強度落差是束級重點：policy 文字常寫 MANDATORY，但實際機制只有 dev-frontend 一個有真 hook（guard-generated-files.sh 物理擋寫 generated）。其餘 gate（三道把關、check-drift.sh、pr-merge-harness、telemetry leak guard）全靠 main agent 自律呼叫工具，沒有自動攔截——'MANDATORY' 標籤 ≠ 程式強制，與 cora GOVERNANCE-MAP 自承的 HARD_GATE/SOFT_GATE/ADVISORY 落差一致。
- 多份 agent 把 MEMORY.md 的踩雷教訓固化進 checklist：code-reviewer 的「空 AllowedBrands deny-by-default / bootstrap 接線」、dev-backend 的「go test 須 cd module / UUID vs int64」、dev-sdk 的「event payload 不可平台差異」。這代表 agent 定義是 cora 事故的沉澱層，種子化時要區分『通用紀律骨架』與『cora 特定事故補丁』。
- 三個 always-read 共同依賴形成隱性治理底座：每個 agent 都先 Read .context/DEVELOPER_GUIDE.md（+ 多數讀 SYSTEM.md / GUIDE-005 external-references / SPEC）。GUIDE-005「先查業界對標再發明架構」被 architect/dev-backend/dev-frontend/dev-sdk/dev-sre 五個檔重複引用，是束級的『反直覺發明』防護，逐檔看不出它是跨 agent 的共同 gate。
- model 分層暗示成本/職責設計：architect 與 product-copilot 用 opus（設計/契約決策重），其餘 dev/reviewer/qa/main 用 sonnet（執行/審查）。逐檔不會注意，束級看出這是刻意的 planner=opus、generator/evaluator=sonnet 角色分層。
- 種子化判讀：main / architect / product-copilot / code-reviewer / qa 五個是跨專案可複用的治理骨架（協調+契約+文件+雙 evaluator），dev-backend/frontend/sre 是隨技術棧長出來的 GROW，dev-sdk 三平台包多數新專案不需背（PROJECT_CONFIG）。

### .claude/skills/ (治理技能包,含可執行 .sh/.cjs)
- 跨子系統硬依賴:pr-merge-harness 的 check-pr-merge.cjs 在頂層 require('.codex/review-agent/lib/github.cjs')——這個治理 harness 不是自足的,它掛在 .claude 之外的 .codex review-agent 子系統上。逐檔看 .claude/skills/ 會以為 harness 自包,實際抽進種子若不一起帶 .codex 那個 lib,會在載入階段直接 crash。這正是上一輪『漏掉整個 .codex/review-agent 子系統』的同一陷阱。
- 兩套 spec-driven 系統並存:cora 有自家 docs/04-specs(spec-drift-check 對照的對象)+ openspec 子系統(openspec/ 目錄 + 已安裝的 openspec CLI + 四件套 skill)。種子若全帶會有兩套提案/SPEC 流程(openspec-propose vs cora-start、openspec-explore vs /explore 唯讀模式)語意打架,builder-pm 必須二選一或明確分工,不能全加。
- enforcement 強度普遍是『自律』而非『自動擋』:13 個 skill 裡真正會擋操作的只有 pr-merge-harness(exit code,且還是 PM 拍板而非硬 block)。agent-lifecycle/karpathy/pre-fix-context/openspec 全是 DOC/DISCIPLINE,零 hook。governance check.sh 與 spec-drift-check 是事後報表不是 gate。policy 上掛 [M] Mandatory 的 Rule #11,實際機制也只是『手動跑腳本 + PM 看 exit code』,不是 CI 自動關卡——policy 標籤強度 > 真實 mechanism 強度。
- 治理規則自身在漂移、且程式碼被改去追規則:governance check.sh 與 SKILL 留有明確的鬆綁痕跡——Rule #8 done_def 從 5 段必填砍到只剩 goal+out_of_scope(P3 fix 註解直接寫在 .sh 裡)、Rule #6 evaluator 從 per-commit 改 per-PR、v0.3.0 新增 evaluator_pass_but_high_findings 抓假綠。這束不是靜態規則,是『telemetry 顯示零遵循→回頭鬆綁規則→改 code 對齊』的活演化紀錄。
- 種子化的隱形斷點:check.sh 硬依賴 .claude/harness-telemetry.jsonl,但該檔被 .gitignore 且 Rule #13 禁止入 PR——乾淨 clone 的種子跑 governance-review 必得空報表;且整個 telemetry 由 .claude/hooks/pre-commit-codex-check.sh + pre-dispatch-enrichment.sh 寫入,這兩個 hook 不在本束內。治理報表這條鏈的『資料生產端』在 hooks/,消費端在 skills/,抽其一即斷。
- 殘留舊 provenance:pr-merge-harness/SKILL.md 寫死 /Users/tvbs/dev/cora 與 tvbs-digital/cora repo URL(現已是 amberchang/claude@corex.tw)。雖只是文件範例,但顯示這套是從前一個 owner/機器搬來、未全面在地化——種子化時這類寫死路徑/repo slug 要掃一遍。

### situational 規則束(派工/評審/安全/TDD/SDD)
- 這束是 CLAUDE.md 主規則的『how 層』:幾乎每檔開頭都標明自己是某條 Rule 的執行細節(main-agent-delivery-sop=#3/#4/#6、codex-review=#6c、tdd-policy=#9b、spec-driven=#9a、external-ref=#7),逐檔看像獨立規則,束級看是一個雙層治理結構(CLAUDE.md 管 what+when,situational 管 how)。builder-pm 抽種子要連母規則一起抽,否則 how 失去掛點。
- Policy 標籤強度 ≠ 實際 mechanism:標 [M] Mandatory 的 TDD(#9b)其實『先觀察階段 reviewer 不檢查證據』純靠自律;worktree 隔離(safety-boundaries)policy 寫『必加』但只靠人工 git worktree list 自檢無 hook 自動擋。真正有自動 HARD_GATE 的只有 code-change-codex-review 依賴的 pre-commit-codex-check.sh + CI codegen-drift-check,且該 hook 對純 docs/yaml 的 Engineer-led skip 不寫 telemetry(覆蓋有洞)。
- 這束內建『規則自我演化/鬆綁』的證據鏈:issue-format Done Definition 5 段→2 段(telemetry 8/8 零遵循)、ext-ref 強制勾→選填(引用率 5.1%)、Rule #6 evaluator per-commit→per-PR(backend 頻繁 override)。共同模式是『telemetry 顯示零遵循 = 規則脫離節奏就鬆綁,而非加壓』,這是 builder-pm 種子包最該複製的 meta-機制(規則要能被數據反證後收斂)。
- 停用/未啟用機制要小心別當死碼:parallel-dev.md 整個『Multi-person development phase』(4 worktree 分支佈局)明寫 single-person 階段尚未啟用;tdd-policy『升級為 Codex 必查』條件設了但評估死線 2026-07-01 將至可能未觸發。兩者都是『機制完整但未啟用』,非死碼。
- 已知 tooling 故障被寫進規則繞行:code-change-codex-review 整段 Tooling Status 說 codex:codex-rescue agent wrapper 對 gpt-5.5 故障(#202)、policy 名義派的 evaluator 實際要改用 codex exec 直呼 recipe。淺掃會以為『派 codex-rescue』可直接用,實則是壞的 — 種子包若照抄會踩同雷。
- engineer-style-patterns 與其他檔性質不同:它不是治理規則而是從具體 PR 抽的技術 style 規準(綁 Go/pgx/三平台 SDK),PROJECT_CONFIG 性質最重;但它證明 cora 有『從工程師真實 PR 反向抽 agent 規準』的回流機制,這個機制本身(而非內容)對種子包有價值。

### situational 規則束(docs/品質/語言/同步)
- 這 11 檔幾乎全是 DISCIPLINE_MANUAL(靠人自律),束內沒有任何一檔自己掛 hook/CI;真正的自動執法 gate 都在束外被引用(scripts/check-contracts.sh、GUIDE-004 §4 drift 紅燈、pr-merge-harness、CI no-claude-telemetry-leak.yml)。這束是『規則沉澱層』,執法層在別處——builder-pm 萃取時要注意這些 .md 本身不會擋任何東西。
- 多份檔案的規則是『血淚回溯』而非先驗設計:每條重要紀律都綁一個帶日期+issue/PR 的真實踩雷(peopleview decrypt 4-22、pilot #6 anchor 404、pilot #7 中文 godoc、4-23 Recently Done 膨脹、4-29 #214 migration 全缺)。這是 cora 治理的核心 DNA——規則因失敗而生,不是憑空寫。種子化時可保留『方法+反例對照』結構,但具體案例是 cora 史。
- 出現多處 policy≠reality 的自承落差:clickup-sync 明文標註前版描述的 MCP/.mcp.json 機制『實機皆不存在』(6-25 校正);spec-template-agent-routing-hint 整份是『提案中未落地』。顯示 cora 文件層會領先實作,讀者不能假設文件描述=現況。
- 束內藏有 Codex 子系統的線索:agent-status-sync 同時管 .claude/ 與 .codex/ 兩份 agent-status,changelog-sync/code-quality 多處提 Codex review(R1/R2/R3);這束雖是 docs/品質規則,卻反映 cora 是 Claude+Codex 雙 agent 協作架構。
- 檔案間有合併/搬遷的治理史痕跡:code-quality 吸收了已刪的 cto-principles+scope-discipline 兩檔(Wave 2 cleanup)、repo-structure 從 CLAUDE.md 搬出(Wave A)、project-status-sync 與 changelog-sync 規則互相引用。這束是經過多輪 context-slim 整併後的產物,不是原始扁平規則。

### workflows + commands + rules（治理流程描述層）
- 這束全是『描述層 / prompt 層』，幾乎沒有真正自動執法的東西：13 檔裡沒有任何 .sh/.cjs/CI，唯一帶執行性的是 opsx 四檔（驅動外部 openspec CLI）。所有 gate（review gate、agent 不衝突、唯讀探索、commit 格式）在本束內都只是『文字約定』，真正的自動把關 hook（pre-commit-codex-check、pr-merge-harness、no-claude-telemetry-leak CI）都在束外的 .claude/hooks、.claude/skills、.github。builder-pm 若只抄這束會拿到一套『看起來很完整但全靠自律』的治理皮，缺執法骨。
- 存在兩套並行且概念重疊的子系統：cora 自家的 .context/SPEC + golden-path + explore.md/dev.md，對上整套 OpenSpec（opsx/* + openspec CLI + openspec/changes/）。兩套都管『spec→實作→封存』與『探索模式』，命令名也撞（explore vs opsx:explore）。這是 cora 演化中疊加的產物，種子化時必須二選一或明確分層，否則新專案會困惑。
- 同一條治理規則在多檔重複描述、有漂移風險：Review Gate 觸發條件同時出現在 golden-path.md Step 6、codex-review.md、與 CLAUDE.md Rule #6 跳關矩陣；『Main agent 不寫 code』同時在 agent-coordination.md、golden-path.md、CLAUDE.md Rule #3。語言還不一致（workflows 多英文、rules/CLAUDE.md 多繁中），canonical 來源不明確，是治理債。
- codex-review.md 與 golden-path.md 互相引用形成一套敘事，但都依賴本束外的檔（main.md、code-reviewer.md、.codex/ 子系統、code-change-codex-review.md）。本束是『入口/索引』性質，單獨萃取會斷鏈——builder-pm 萃取時要把被引用的 situational/skill/hook 一起帶，否則流程指到空。
- commit-format.md 被 CLAUDE.md 標為唯一『永遠自動載入』規則，但載入≠強制；本束沒有 commit-msg hook。policy 標籤（永遠載入/Mandatory）與真實 enforcement（純自律）落差，正是 GOVERNANCE-MAP 反覆強調的 policy 標籤≠mechanism 強度現象，在這束的純文件檔上尤其明顯。

### .codex/review-agent/ — Codex 原生 PR 審查引擎(跨模型 reviewer harness)
- 這是一個『完整但獨立、未自動化』的子系統:8 檔組成一條 prepare(唯讀產 packet)→ 人類/Codex 審 → post(寫回 PR)的 pipeline,但沒有任何 hook/CI 觸發它,全靠手動 node 跑。它補的是 CORA Rule #6 第三道『獨立 evaluator 簽核且與 generator 不同 agent』——Codex 在此當 reviewer,與 Claude 側 code-reviewer 形成跨模型雙審。屬 EXECUTABLE_TOOL 群,非 HARD_GATE。
- 全套刻意 human-in-the-loop:README 明寫不 auto-approve/merge;產 finding 與貼 PR 是兩支不同腳本、要人準備 JSON 才會寫入;這是治理上『AI 輔助但不奪權』的具體實作,builder-pm 種子應保留這個兩段式切分而非合併成一鍵。
- error-patterns.json(空)+ knowledge.cjs 的讀/寫/搜尋三件套構成一個『會自我累積的 bug 知識庫』雛形,但寫入口 addErrorPattern 在本束內無人呼叫——是『地基鋪好、尚未接線啟用』,逐檔淺看極易把空 json 誤判死碼(上一輪就踩了)。
- 整套對 CORA 的耦合集中在單一檔 config.cjs(知識源路徑+模組前綴對照);其餘 lib/* 與兩支 CLI 幾乎都是與業務無關的通用骨架(gh 包裝、markdown 摘要、加權搜尋、packet 組裝)。對 builder-pm 而言:換掉 config.cjs 即可移植,是乾淨的『種子 vs 該長出來』分界線。
- 安全面正向發現:github.cjs 全程用 execFileSync+參數陣列而非 shell 字串拼接,且 gh auth 失敗 fail-closed——這套腳本本身在資安寫法上是好範本,可直接當種子。

### .codex/ 第二治理樹（Codex reviewer 操作守則 + OpenSpec skills + PR review agent 子系統）
- 兩棵治理樹並存且哲學不同：.codex/ 是 reviewer 樹（預設不寫 code、findings-first、evidence-based），與 .claude/ 的 delivery-manager 樹互補。Codex 的角色定位（審查 Claude 產出的第二雙資深工程師眼睛）正是 CLAUDE.md Rule #6 第三道 evaluator 簽核的承接者。
- 整個 .codex/review-agent/ 是一套完整但未啟用的自製 PR review harness（9 檔含 lib/ 的輕量 RAG 知識引擎 + GitHub API 包裝 + 2 支測試），但 agent-status 自承『gh auth token 無效，GitHub live verification blocked』——即蓋好從未對真實 PR 跑通。error-patterns.json 空陣列不是死碼而是這套機制的零資料起點。淺掃 pr-review-agent/SKILL.md 只會看到入口、完全錯過底層子系統。
- policy 與 runtime 有兩處落差：(1) CODEX.md 說 review 走 codex:codex-rescue wrapper，實際因 issue #202 故障改走 codex exec 直呼，wrapper 停用待修；(2) 五個 openspec-* skills 是上游官方 MIT skill（非 cora 自寫），但 cora 後端明確走『Non-OpenSpec modular monolith』決策、repo 未見 openspec/ 在用——這整套 OpenSpec 生命週期工具像是隨 skill 生態帶進來的 PROJECT_CONFIG，未必是 cora 實際工作流。
- 萃取價值分層清楚給 builder-pm：review-checklist.md（10 段審查框架含 False Positive Guard）+ CODEX.md 三模式定位 + agent-coordination.md 寫入界線 = 高價值 SEED，任何新專案的 reviewer agent 都能直接用；config.cjs 硬寫死 cora 後端路徑、prd-writing-guide.md 內嵌 PRD-004~009 依賴表 = 會隨專案長的 GROW，不可照搬；openspec skills = 通用包不必背。
- review-agent 子系統把『review 知識存 repo 不存機器本機記憶』當設計原則（README 明述），用 6 個既有治理 md（review-checklist/DEVELOPER_GUIDE/COLLABORATION/code-quality/engineer-style-patterns/GUIDE-006）當知識源做檢索——這代表 .codex 樹與 .claude 樹是有資料相依的（Codex harness 反向讀 .claude/ 的規則檔當 review 依據），兩樹非完全獨立。

### scripts/ 契約・drift・baseline 腳本
- 這束裡有「兩套同名但不同粒度」的 drift 工具容易混淆:check-contracts.sh 是重量級雙向 YAML↔Go diff 引擎(5 維 SPEC-006 合約),check-drift.sh 只做廢棄 role 字面掃描 + NEED-REVIEW 計數。逐檔看會以為重複,實際是 GUIDE-004 治理的粗細兩層,builder-pm 要種子應只抽 check-contracts.sh 的「Primary YAML / Derived code 雙向 diff」骨架,不是兩個都搬。
- 整束的 exit code 哲學分裂:三個契約/UAT 腳本是 fail-closed(drift→exit 1 擋 commit),但 phase0-snapshot.sh 是純 telemetry fail-open(無 gh auth 就 N/A 不報錯)。這對應 CLAUDE.md 治理分層 HARD_GATE vs SOFT_GATE 的設計意圖——硬合約用擋的、harness 觀察用看的。
- 這些 scripts 全是『手動跑的工具』,沒有一個被 hook/CI 自動掛載觸發(檔內無任何 git hook 註冊、CI yaml 引用)。policy 文件(GUIDE-004/Rule #5 關卡 D)講得像自動關卡,但實際執法靠人自律去跑 bash——這是 policy 標籤強度 ≠ 真實 mechanism 的典型落差,builder-pm 若要真關卡需自己補 pre-commit/CI wiring。
- 多個腳本內嵌大量 issue 編號 + Codex review 修補史(#59/#454/#529/#152/#320 + HIGH/MEDIUM fix 註解),等於把契約演化的踩雷史寫進可執行碼。種子化時這些 CORA 專屬編號與 seed UUID/container 名是雜訊,要抽的是底層 pattern(雙向 diff、real-path audit 驗證、容忍白名單機制)而非檔案本體。
- uat-152.sh 示範了本 repo 反覆強調的核心教訓:驗收不能只信 API 回 200,要直接查 DB 確認副作用(audit row)真的發生,專抓 NoopRecorder 這類靜默 fallback 假綠。這是逐檔 what 看不出、但跨記憶庫(wiring-needs-real-path-test)才浮現的束級價值。

### .context/ — 評審知識源（產品願景 / 術語權威 / 開發規範 / PRD·SPEC 模板）+ modules/ 九個模組產品脈絡
- 這個束是「知識源」不是「執法機制」:全 13 檔 mechanism 不是 DOC_REFERENCE 就是 DISCIPLINE_MANUAL,零個 HARD_GATE/SOFT_GATE。.context/ 提供的是 agent 該遵守的事實與規範,真正的自動執法(hook/CI)全在 .claude/ 與 .github/ —— builder-pm 要清楚:搬 .context 只搬到「知識與紀律」,不搬到「強制力」。
- policy 宣告 vs 實際 enforcement 落差:GLOSSARY 開宗明義「術語違規 treated as bugs」、DEVELOPER_GUIDE 有 Prohibited 清單,但沒有任何術語 linter 或 stack 檢查 hook —— 全靠 agent 自律 + 人工 review。這與 CLAUDE.md 自承的「Policy [M] 標籤 ≠ 實際 mechanism 強度」同源,是 CORA 治理的一致型態:規範寫得硬、機器執法軟。
- 種子/長出來界線很乾淨:只有兩個 template(PRD/SPEC)是純結構、零 CORA 內容、可 day1 直搬的 SEED;其餘 11 檔(SYSTEM+GLOSSARY+DEVELOPER_GUIDE+9 modules)全是 GROW——結構可借鏡但內容綁死 TVBS/cora_id/Go-Vite-Azure 事實,新專案必須整段重寫。builder-pm 若想做種子包,該抽的是「這四類檔的章節骨架」而非內容。
- .context 自身存在 drift 風險源:多個 module 標『PRD ✅ Draft 但對應 SPEC 待制定』(audience-segmentation/delivery-core),delivery/identity 的 module doc 被當決策日誌與 PM override 紀錄用,admin-ui 走 OpenSpec change 而其他模組走傳統 SPEC 編號——治理流程在模組間並不統一,GLOSSARY Section 2 的文件連動規則正是為了壓制這類 drift 而存在,但同樣無機器強制。
- 模板層已悄悄與治理規則對齊:PRD-TEMPLATE 內建『Explicitly Out of Scope』、SPEC-TEMPLATE 內建『Open Questions / Acceptance Criteria』,恰好對應 CLAUDE.md Rule #8(Done Definition 必填 Goal+Out of scope)與 Done=Verified 紀律——治理意圖在模板欄位層就種下,這是值得 builder-pm 複製的『讓紀律長在模板裡而非只寫在規則文件』手法。

