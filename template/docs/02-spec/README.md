# 正式 SPEC

這裡放功能實作規格（SPEC，Specification）。正式檔案格式為：

```text
docs/02-spec/SPEC-<三位數>-<slug>.md
```

例如：`docs/02-spec/SPEC-001-account-sign-in.md`。

從 [`SPEC-TEMPLATE.md`](SPEC-TEMPLATE.md) 複製一份開始。每份 SPEC 都必須有一份主要 PRD，並在 frontmatter 以 `related_prd` 指向它，例如 `related_prd: PRD-001`。

每份 SPEC 的 frontmatter 至少要有 `id`、`status`、`title`、`related_prd`。

## PRD 與 SPEC 的關聯

關聯由 SPEC 的 `related_prd` 建立。單一 PRD 可以對應多份 SPEC；不維護人工的第三張對照表，PRD 對多 SPEC 的清單由檢查器掃描 `related_prd` 後導出。

## 其他文件

不要預先建立 `docs/inbox/`、`docs/research/` 或 `docs/decisions/`。只有首次真的需要該類文件時，才建立對應目錄。

敏感逐字稿留在受控外部位置，Git 只放安全摘要，不要把原文提交到儲存庫。
