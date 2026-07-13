<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->
<!-- 功能：定義 PRD / SPEC 的正式目錄、命名與關聯規則。 -->

# 文件目錄契約設計

> 狀態：PM 已核准方向，待實作
> 日期：2026-07-13

## 1. 目標

讓 builder-pm 安裝後的專案，對原始素材、候選草稿與正式文件有清楚邊界；PRD 與 SPEC 有唯一、可預期、可被工具檢查的存放位置，讓 PM、AI 與接手工程師能從需求追到規格，再追到程式碼與測試。

## 2. 正式目錄與命名

```text
docs/
  01-prd/
    PRD-001-<slug>.md
  02-spec/
    SPEC-001-<slug>.md
  inbox/             # 第一次需要納入版本控制的原始素材時建立
  research/          # 第一次需要保留已整理研究時建立
  decisions/         # 第一次需要正式決策紀錄時建立
```

- `docs/01-prd/` 是產品需求文件（PRD）的唯一正式位置。
- `docs/02-spec/` 是功能規格（SPEC）的唯一正式位置。
- PRD 與 SPEC 依各自流水號命名，使用小寫、連字號分隔的 `<slug>`。
- `docs/inbox/` 在第一次需要時建立，放可安全納入版本控制、尚未整理的訪談摘要、會議筆記與參考素材。
- `docs/research/` 在第一次需要時建立，放已整理但尚未形成產品決策的研究結果。
- `docs/decisions/` 在第一次需要時建立，保留給日後自然長出的重大決策紀錄；未建立 ADR 規則前，不要求預先建立文件或編號。
- `docs/04-specs/` 不再是有效位置，也不保留新舊雙軌掃描。

不適合進 Git 的逐字稿、個人資料、商業機密或受授權限制的來源，不得放進 `docs/inbox/`；應存放在專案外的受控系統，只在正式文件保留可公開的摘要與來源描述。

## 3. 文件關聯

```text
PRD-001
  -> SPEC-001
  -> SPEC-002
  -> production code + tests
```

- 每份 SPEC 必須標示其來源 PRD 編號。
- 一份 PRD 可以拆成多份 SPEC。
- 一份 SPEC 只對應一份主要 PRD；跨 PRD 的需求應先由 Planner 標示為待 PM 決策，不自行猜測歸屬。

## 4. 流程與責任

- 原始素材先進 `docs/inbox/` 或專案外的受控系統；它們不是正式需求，也不得直接作為工程實作依據。
- `knowledge-curation`（選用 Skill）讀取可用素材，產生保留來源的摘要與 PRD / SPEC / `.context` / 決策紀錄候選草稿。
- PM 審核候選草稿，確認事實、商業取捨與敏感資訊後，才決定是否升級為正式文件。
- Planner 先把 PM 核准的需求收斂成 PRD，存入 `docs/01-prd/`。
- PRD 經 PM 核准後，Planner 依可實作範圍拆出 SPEC，存入 `docs/02-spec/`。
- Generator 只在相關 SPEC 已核准後開始 production code 實作。
- Evaluator 依 SPEC 的驗收標準驗證交付。

### 4.1 knowledge-curation Skill 邊界

- 適用於整理訪談、會議筆記、研究資料、參考連結與 brownfield 回填蒐證。
- 可以找出相似或重複素材、提出關聯、建議資料夾與文件編號、產生候選草稿。
- 每個候選都必須標記來源、信心與未確認事項。
- 不得自行宣稱原始素材是事實、不得自動核准、不得直接將候選升級為 PRD、SPEC、`.context` 或 ADR。
- 不管理 Obsidian、雙向連結、排程或個人第二大腦；這些不屬於 builder-pm 的核心範圍。

## 5. 工具與文件調整

- `context-growth` 的 SPEC 覆蓋檢查改掃 `docs/02-spec/`。
- 測試 fixture 改用新目錄，並新增測試證明舊 `docs/04-specs/` 不會被誤當成有效覆蓋。
- README、ONBOARDING、Planner 合約與設計文件改用新路徑與關聯規則。
- 新增 PRD / SPEC 最小模板，至少包含編號、狀態、關聯文件、Goal、Out of scope 與驗收標準。
- 新增 `knowledge-curation` 選用 Skill，明確定義素材整理、來源追溯、候選草稿與 PM 核准關卡。
- 新增文件目錄規則與檢查工具，防止正式編號重複、正式文件放錯位置與不明確的新資料夾用途。

## 6. 遷移與相容性

- 這是新安裝專案的標準，不會自動改寫已安裝專案。
- 既有專案需自行把 `docs/04-specs/` 搬至 `docs/02-spec/`，再更新連結與任何自訂腳本。
- 不支援舊路徑，是為了讓偵測器只有一個可信資料來源，避免文件放錯位置卻被工具靜默接受。

## 7. 驗收標準

1. 新安裝範本只預設建立 `docs/01-prd/` 與 `docs/02-spec/`；`docs/inbox/`、`docs/research/` 與 `docs/decisions/` 都在首次需要時建立。
2. context-growth 只掃 `docs/02-spec/`，不掃 `docs/04-specs/`。
3. PRD / SPEC 模板清楚要求 PRD-to-SPEC 關聯。
4. README、ONBOARDING 與角色文件不再提舊 SPEC 路徑。
5. knowledge-curation Skill 對來源、候選與 PM 核准有明確的禁止與交接規則。
6. 相關既有與新增測試都通過。
