<!-- [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-27 -->
<!-- Purpose: governance-gap-audit workflow 對 design.md 的盲區報告(11 agent / 39→28 gap) -->

# design.md 盲區盤點報告

> 來源:`governance-gap-audit` workflow(2026-06-27)。5 盤點(`.context`/`.codex`/`scripts`/`CLAUDE.md`/`.claude`)→ 5 對照 design.md → 1 critic 去重驗證。
> 39 raw gap → critic 確認 **28** + 駁回 1 + 4 missing categories + 4 top risks。
> **triage 欄待 PM 拍板**:`加回核心/模組` / `標 known-divergence(刻意簡化、接受損失)` / `當專案 config`。

## 🔴 2 個 Blocker

| # | 盲區 | 影響 design | 修法 | triage |
|---|------|------------|------|:---:|
| B1 | **多模型維度整層缺席** —— design 只掃 `.claude/`,完全沒處理與它平行鏡像的 `.codex/` 樹(CODEX.md 三模式骨架 + `.codex/rules/` + 反 drift 導航檔 AGENTS.md)。§2.5.5「一份骨架通吃」被 CODEX.md(mode-based 非 agent-based)打破;§6 套回 cora 可能默默砍掉整棵第二治理樹 | §2.5 全節 + §6 | 加「跨模型維度」:每模型家族一棵樹 + cross-agent 導航檔;骨架 per-model;§6 對 `.codex/` 逐檔裁決。或先標單模型 scope 限制 + 列 cora 雙模型為 known-divergence | ⬜ |
| B2 | **硬關卡不只 2 個** —— design 封頂「只有 2 個攔截」,但 cora 實機有第三類會擋 commit 的契約 gate(CI codegen drift、check-contracts.sh 五向 YAML↔Go、guard-generated-files)。這類「契約一致性 gate」在核心/6模組/2攔截裡無落腳格 | §5 + 模組⑤ + §6 | §5 改口「核心永遠 2 個 + 模組③⑤⑥各自可帶專屬硬關卡」;§6 明文保留 check-contracts/check-drift/guard-generated 為專案級硬關卡 | ⬜ |

## ⚠️ 4 個 Top Risk(critic 評:不處理最可能讓包失敗)

1. **多模型盲視**(=B1)→ 對「套回 cora」這個終極目標是 blocker,照搬可能讓回套後的 cora 比現在更糟。
2. **「只有 2 個硬關卡」低估 cora**(=B2)→ SPEC-driven 的 cora 最常用的契約防線會被默默丟掉。
3. **包只會變重不會變輕** → 學習迴圈只有 strike2 升級、沒有降級;telemetry 只當「要擋的洩漏物」沒當觀測訊號。沒有「零遵循就鬆綁」迴圈 → 精準重蹈 design 自己要治的「又重又記不住」病。**最諷刺也最可能的失敗模式。**
4. **「全開」撐爆 context** → design 把「核心+模組全開」講太輕鬆,沒帶走讓全開可行的動態載入/context 預算;§4 記憶結構還比 cora 現行(INDEX+本體拆分)更原始 → 回套後 context 立刻回爆炸原點。

## 🆕 4 個 Missing Categories(連 gap agent 都沒提、design 確實缺)

1. **包的跨專案分發與版本治理** —— design 定位「可重用包」卻無機制讓核心/模組更新傳播到 N 個已裝專案(semver / breaking change / 下游怎麼 pull)。可重用包最致命的長期維運洞。
2. **harness 的成本/延遲經濟學** —— 每改動跑 Planner+Generator+Evaluator(+外部模型)有 token/時間成本;沒談「何時 harness 貴到不值得跑、依改動大小調 harness 深度」。
3. **全新專案的冷啟動 onboarding** —— 給了空白模板,但沒講「誰寫第一份 SPEC/CONVENTIONS、裝包到能上工之間的引導步驟」。模板 ≠ 流程。
4. **包自身的 ROI 量測** —— 立論要解三痛,卻沒定義「怎麼知道裝了真的讓三痛變小」。

## 其餘 22 個確認盲區(歸 5 群)

### A. 治理「只增不減」風險(=Top Risk 3,系統性)
- **缺降級/退役迴圈**:cora 會主動鬆綁零遵循的規則(Rule #8 五段→兩段、Rule #6 per-commit→per-PR);design 學習只往上不往下。
- **缺治理觀測層**:cora 有 SOFT_GATE(不擋但留 telemetry)+ governance-review 週審 + phase0 baseline;design 把執法切成「硬擋/純建議」兩極,「純建議」現實=零執法。
- **半自動 hook 捕捉在 cora 根本不存在**:§4 寫得像萃取自 cora,但 cora 無 Stop/SessionEnd hook、捕捉 100% 手寫且已停更 45 天 → 這是 Hermes 借來的願景被當成已鎖定萃取。
- **context 預算/記憶結構倒退**:§4 扁平 LESSONS 比 cora 現行(INDEX<5KB+本體+cluster-by-trigger+Graduated→機制對照)更原始。

### B. 記憶只有一半(只記雷)
- **缺專案知識庫層 + context 載入路由**:design 常駐文件只有 LESSONS;Planner/Generator 靠什麼 domain context(SYSTEM/GLOSSARY/DEVELOPER_GUIDE)上工沒講。正面打到 §1 交接痛。
- **缺前瞻式決策紀錄(ADR-lite)+ 已知限制登記**:cora 有 Go N-1 策略、對標 11 廠商的決議、Known Limitations Register —— 不是「雷」塞不進 LESSONS。
- **缺術語強制(GLOSSARY canonical/別名禁用)+ 文件連動 cascade + Status 層**。

### C. 跨模型 reviewer 現實比 design 複雜(design 把 codex 講太簡單)
- **獨立性應是「不同模型家族」非「不同 agent」**:同屬 Claude 的 agent 共謀盲點是常態;§2.5.5 單人 fallback「另一個 Claude session 來驗」滿足字面卻共享盲點。
- **缺 false-positive 校準層**:Codex 系統性過度升級(把 pre-existing 誤標 BLOCK);分流表假設每個 block 都是真信號。
- **evaluator 基礎設施脆弱**:codex CLI 是版本+帳號耦合的脆弱外部依賴(wrapper 曾壞);§5「一鍵設定即插即用」低估運維。
- **鐵律3 太絕對**:會禁掉 cora 刻意設計、PM 授權的 Rescue 例外(reviewer 限縮定點 bug 可下場修)。
- **Evaluator==契約作者 沒防**:同一 Codex 寫 SPEC 又審對齊該 SPEC 的 code = 審自己契約。

### D. 關卡/驗證模型太二元
- **契約 docs 審查自相矛盾**:模組②寫「覆蓋契約 docs」、§5②寫「只擋程式碼不擋文件」→ 契約 docs 雙人驗證只剩宣稱無 mechanism(對應 ADR vs SPEC 衝突漏審教訓)。
- **缺「紀律型 gate vs 自動型 gate」分層**:cora 兩個關鍵契約 gate 沒 hook 化、靠 Coordinator 記得手動跑 —— 正是「把有規則誤當已治理」的頭號 trap。
- **缺 drift 容忍中間層**:cora 有 allowlist+期限+owner 的可暫存 drift(逾期自動升硬擋);design 是二元 block/pass。
- **缺第三種驗證 real-path UAT**:跑真後端驗副作用真的發生(對應 #686 假綠 fan-out no-op 教訓)。
- **缺業界 pattern 比對模組**:cora Rule #7(決策前 ≥3 對標 + 證據)6 模組無一承接。

### E. 缺的結構層
- **權威排序/裁決層缺位**:開越多模組規則交集越多,design 沒定義「兩條規則打架聽誰的」。
- **缺 Engineer-led 輕量路徑**:design 假設唯一操作者=PM;cora 用 git email 偵測工程師自動切輕量模式。
- **高風險面應「測試全綠也強制升 PM」**:design 框在反應式 block 分流裡,缺「看 diff 性質就中斷」的主動清單。
- **缺 agent-status 併發鎖定 + worktree 隔離**:多 agent 並行缺這層會靜默撞車。
- **模組⑥只含 merge 時刻**:漏 commit/push 時刻 branch hygiene(stale branch / PR race)。
- **缺專案編碼約定/架構禁區容器**:模組①只有通用 karpathy,裝不下 Repository Pattern/interface/冪等等專案約定。
- **核心 10 條缺「編號永久不動」引用穩定機制**(跨專案安裝後引用 churn 更嚴重)。
- **缺機密入站衛生**:攔截①只防 AI 產物出站,沒防 secret 貼進對話/.env 進 repo。
- *(minor)* 「交叉引用驗證」實況是逐契約手寫的脆弱 awk、單向、自身會 drift —— 被當成乾淨可泛化能力。

## ❌ Critic 駁回 1 個
- 「repo-backed review 知識庫(error-patterns.json)是第二套記憶」→ 駁回:那是 cora 的空殼 dead code({"patterns":[]}、從沒接進 live loop),design 刻意只建一套人讀 LESSONS + 明確不上 RAG/SQL 本就是合理簡化,沒義務鏡像 cora 自己沒在用的東西。

---

## PM triage 用的判讀框架

28 個盲區**不是全部加回去** —— 那會把「又重又記不住的 cora」原樣重建(=Top Risk 3 的諷刺)。每個 gap 要分三類:
- **加回**:砍錯了承重牆(B1/B2、降級迴圈、契約 docs 矛盾、知識庫層 屬此類)
- **標 known-divergence**:design 對的簡化,接受損失、開頭寫明(不上 RAG/SQL 已是範例)
- **當專案 config**:cora 自己留,通用包不背(Engineer-led、worktree、術語 cascade 可能屬此)
