# Project Skill 採用紀錄

本目錄保存已核准並納入 Git 的 project Skill 採用紀錄，供 `template/SKILLS.md` 的 project skill registry 引用。

## 規則

- 採用紀錄檔名必須是 `SKILL-ADOPTION-<skill-name>.md`。
- 每份紀錄的 frontmatter 必須包含 `skill`、`source`、`source_version`、`approved_by`，且 `status` 必須為 `approved`。
- `source_version` 必須使用不可變 tag 或完整 commit SHA，不得使用會浮動的 branch、latest 或未鎖定版本。
- 只有已核准且已納入 Git 的 project Skill 才能列入 registry；個人全域 Skill 不在本目錄與 registry 的管理範圍內。
- registry 的同一個 `role`、`trigger` 與 `priority` 組合只能有一列，且 `priority` 必須是正整數。

## 建立流程

1. 確認 Skill 是專案需要，並取得負責人核准。
2. 將 Skill 與本採用紀錄一起納入 Git，鎖定 `source_version`。
3. 依 `SKILL-ADOPTION-TEMPLATE.md` 建立紀錄，完成相容性檢查。
4. 在 `template/SKILLS.md` 的 registry 新增一列，填入採用紀錄路徑。
