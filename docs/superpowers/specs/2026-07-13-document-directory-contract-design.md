<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->
<!-- 功能：定義 PRD / SPEC 的正式目錄、命名與關聯規則。 -->

# 文件目錄契約設計

> 狀態：PM 已核准方向，待實作
> 日期：2026-07-13

## 1. 目標

讓 builder-pm 安裝後的專案，對 PRD 與 SPEC 有唯一、可預期、可被工具檢查的存放位置，讓 PM、AI 與接手工程師能從需求追到規格，再追到程式碼與測試。

## 2. 正式目錄與命名

```text
docs/
  01-prd/
    PRD-001-<slug>.md
  02-spec/
    SPEC-001-<slug>.md
```

- `docs/01-prd/` 是產品需求文件（PRD）的唯一正式位置。
- `docs/02-spec/` 是功能規格（SPEC）的唯一正式位置。
- PRD 與 SPEC 依各自流水號命名，使用小寫、連字號分隔的 `<slug>`。
- `docs/04-specs/` 不再是有效位置，也不保留新舊雙軌掃描。

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

- Planner 先把 PM 想法收斂成 PRD，存入 `docs/01-prd/`。
- PRD 經 PM 核准後，Planner 依可實作範圍拆出 SPEC，存入 `docs/02-spec/`。
- Generator 只在相關 SPEC 已核准後開始 production code 實作。
- Evaluator 依 SPEC 的驗收標準驗證交付。

## 5. 工具與文件調整

- `context-growth` 的 SPEC 覆蓋檢查改掃 `docs/02-spec/`。
- 測試 fixture 改用新目錄，並新增測試證明舊 `docs/04-specs/` 不會被誤當成有效覆蓋。
- README、ONBOARDING、Planner 合約與設計文件改用新路徑與關聯規則。
- 新增 PRD / SPEC 最小模板，至少包含編號、狀態、關聯文件、Goal、Out of scope 與驗收標準。

## 6. 遷移與相容性

- 這是新安裝專案的標準，不會自動改寫已安裝專案。
- 既有專案需自行把 `docs/04-specs/` 搬至 `docs/02-spec/`，再更新連結與任何自訂腳本。
- 不支援舊路徑，是為了讓偵測器只有一個可信資料來源，避免文件放錯位置卻被工具靜默接受。

## 7. 驗收標準

1. 新安裝範本含 `docs/01-prd/` 與 `docs/02-spec/`。
2. context-growth 只掃 `docs/02-spec/`，不掃 `docs/04-specs/`。
3. PRD / SPEC 模板清楚要求 PRD-to-SPEC 關聯。
4. README、ONBOARDING 與角色文件不再提舊 SPEC 路徑。
5. 相關既有與新增測試都通過。
