# 正式 PRD

這裡放產品需求文件（PRD，Product Requirements Document）。正式檔案格式為：

```text
docs/01-prd/PRD-<三位數>-<slug>.md
```

例如：`docs/01-prd/PRD-001-account-sign-in.md`。

從 [`PRD-TEMPLATE.md`](PRD-TEMPLATE.md) 複製一份開始。PRD 描述要解決的問題、目標與驗收條件；實作細節另寫在 `docs/02-spec/` 的 SPEC。

每份 PRD 的 frontmatter 至少要有 `id`、`status`、`title`。

## PRD 與 SPEC 的關聯

關聯由 SPEC frontmatter 的 `related_prd` 建立。需要一份 PRD 對應多份 SPEC 時，不要另外維護人工對照表；檢查器應從各份 SPEC 的 `related_prd` 導出對照結果。

## 其他文件

不要預先建立 `docs/inbox/`、`docs/research/` 或 `docs/decisions/`。只有首次真的需要該類文件時，才建立對應目錄，避免空目錄變成額外的維護負擔。

敏感逐字稿不要放進 Git；請留在受控的外部位置，Git 只放不含敏感內容的安全摘要。
