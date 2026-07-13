# Project Skill Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立專案內 Skill 的路由表、採用紀錄與 fail-closed 相容性檢查，讓核准版本可安全納入 Git。

**Architecture:** `SKILLS.md` 內新增有界定標記的 Markdown 路由表，供人閱讀與機器解析。每個採用 Skill 都有一份 frontmatter 採用紀錄；Node.js 檢查器驗證路由、紀錄、canonical 路徑、Codex adapter 與候選安裝清單，發現衝突即以非零狀態結束。

**Tech Stack:** Node.js CommonJS、`node:test`、Node 內建 `fs` / `path` / `child_process`、Markdown。

---

## 檔案結構

```text
template/
  .governance/skill-adoptions/
    README.md
    SKILL-ADOPTION-TEMPLATE.md
  loops/skill-registry/
    check-skill-registry.cjs
    check-skill-registry.test.cjs
    fixtures/
      valid-project/
      duplicate-skill-project/
      route-conflict-project/
      missing-adoption-project/
      bad-adapter-project/
      protected-path-candidate.json
  SKILLS.md
setup.test.cjs
README.md
docs/design.md
```

## 1. 定義可解析的路由表與採用紀錄範本

**檔案：**
- 修改：`template/SKILLS.md`
- 新增：`template/.governance/skill-adoptions/README.md`
- 新增：`template/.governance/skill-adoptions/SKILL-ADOPTION-TEMPLATE.md`

- [ ] **Step 1: 在 `SKILLS.md` 加入空的 registry 區段**

在「專案專用 skill」段落之後加入唯一可被機器解析的區段：

```markdown
<!-- project-skill-registry:start -->
| skill | role | trigger | priority | canonical | codex_adapter | adoption_record |
|---|---|---|---:|---|---|---|
<!-- project-skill-registry:end -->
```

在表格前寫明：只有經核准且已納入專案 Git 的 project Skill 可列入；`priority` 必須是正整數；同一 `role + trigger + priority` 只能有一列。

- [ ] **Step 2: 建立採用紀錄範本**

建立 `SKILL-ADOPTION-TEMPLATE.md`：

```markdown
---
skill: example-skill
source: https://github.com/example/example-skill
source_version: 0123456789abcdef0123456789abcdef01234567
approved_by: PM Amber
status: approved
---

# example-skill 採用紀錄

## 採用理由

## 觸發時機與角色

## 已知限制

## 相容性檢查結果
```

README 必須說明採用紀錄檔名為 `SKILL-ADOPTION-<skill-name>.md`，`source_version` 必須是不可變 tag 或完整 commit SHA，並重申個人全域 Skill 不在管理範圍。

- [ ] **Step 3: 驗證文件結構**

Run: `rg -n "project-skill-registry|source_version|SKILL-ADOPTION-" template/SKILLS.md template/.governance/skill-adoptions`

Expected: 路由表標記與採用紀錄規則各出現一次以上。

- [ ] **Step 4: Commit**

```bash
git add template/SKILLS.md template/.governance/skill-adoptions
git commit -m "docs: define project skill registry format"
```

## 2. 以 TDD 實作 registry 相容性檢查器

**檔案：**
- 新增：`template/loops/skill-registry/check-skill-registry.cjs`
- 新增：`template/loops/skill-registry/check-skill-registry.test.cjs`
- 新增：`template/loops/skill-registry/fixtures/valid-project/**`
- 新增：`template/loops/skill-registry/fixtures/duplicate-skill-project/**`
- 新增：`template/loops/skill-registry/fixtures/route-conflict-project/**`
- 新增：`template/loops/skill-registry/fixtures/missing-adoption-project/**`
- 新增：`template/loops/skill-registry/fixtures/bad-adapter-project/**`
- 新增：`template/loops/skill-registry/fixtures/protected-path-candidate.json`

- [ ] **Step 1: 寫出失敗測試與 fixture**

測試以 `analyze(projectRoot, candidateManifest)` 為公開入口，斷言：

```js
test('合法 registry 回傳空 errors', () => {
  assert.deepEqual(analyze(fixture('valid-project')).errors, []);
});

test('重複 skill 名稱回報 duplicate-skill', () => {
  assert.equal(analyze(fixture('duplicate-skill-project')).errors[0].code, 'duplicate-skill');
});

test('相同 role、trigger、priority 回報 route-conflict', () => {
  assert.equal(analyze(fixture('route-conflict-project')).errors[0].code, 'route-conflict');
});

test('缺少採用紀錄回報 missing-adoption-record', () => {
  assert.equal(analyze(fixture('missing-adoption-project')).errors[0].code, 'missing-adoption-record');
});

test('adapter 未引用 canonical Skill 回報 bad-codex-adapter', () => {
  assert.equal(analyze(fixture('bad-adapter-project')).errors[0].code, 'bad-codex-adapter');
});

test('候選清單包含受保護路徑回報 protected-path', () => {
  const candidate = loadCandidate(path.join(FIXTURES, 'protected-path-candidate.json'));
  assert.equal(analyze(fixture('valid-project'), candidate).errors[0].code, 'protected-path');
});
```

每個 valid fixture 含一列 `research-synthesis`：canonical 為 `.claude/skills/research-synthesis/SKILL.md`，Codex adapter 為 `.agents/skills/research-synthesis/SKILL.md`，採用紀錄為 `.governance/skill-adoptions/SKILL-ADOPTION-research-synthesis.md`。

- [ ] **Step 2: 執行 RED 測試**

Run: `node --test template/loops/skill-registry/check-skill-registry.test.cjs`

Expected: FAIL，原因為 `check-skill-registry.cjs` 尚不存在。

- [ ] **Step 3: 實作最小解析與檢查 API**

實作並匯出：

```js
function parseRegistry(markdown) { /* 回傳 rows */ }
function parseFrontmatter(markdown) { /* 回傳單行 key/value */ }
function loadCandidate(filePath) { /* 回傳 { files: string[] } */ }
function analyze(projectRoot, candidate = null) { /* 回傳 { errors } */ }
function main(argv = process.argv.slice(2)) { /* CLI */ }
module.exports = { parseRegistry, parseFrontmatter, loadCandidate, analyze, main };
```

檢查規則：
- registry 必須有成對開始／結束標記及七欄表頭。
- `skill` 唯一，`priority` 為正整數。
- 每列 canonical 必須存在，且位於 `.claude/skills/<skill>/SKILL.md`。
- 有 adapter 時，檔案必須存在、位於 `.agents/skills/<skill>/SKILL.md`，並含 canonical 相對路徑字串。
- 每列採用紀錄必須存在，frontmatter 的 `skill`、非空 `source`、不可變 `source_version`、非空 `approved_by` 與 `status: approved` 必須正確。
- 相同 `role + trigger + priority` 回報 `route-conflict`。
- candidate manifest 的任一路徑若等於或位於 `template/.claude/agents/`、`template/.claude/skills/brainstorming/`、`code-review/`、`tdd/`，回報 `protected-path`。
- errors 以 `file`、`code`、`message` 排序；CLI 接受 `<project-root> [--candidate path] [--json]`，有 errors 時 exit 1。

- [ ] **Step 4: 執行 GREEN 測試**

Run: `node --test template/loops/skill-registry/check-skill-registry.test.cjs`

Expected: 全部通過，CLI 與函式 API 都不寫入 project root。

- [ ] **Step 5: Commit**

```bash
git add template/loops/skill-registry
git commit -m "feat: add project skill registry checker"
```

## 3. 將採用流程納入安裝與專案文件

**檔案：**
- 修改：`setup.test.cjs`
- 修改：`README.md`
- 修改：`docs/design.md`

- [ ] **Step 1: 先寫安裝失敗測試**

在 `setup.test.cjs` 新增：

```js
test('新安裝包含 project Skill registry 範本與檢查器', () => {
  const run = runSetup('2');
  try {
    assert.equal(run.status, 0, run.stderr);
    for (const file of [
      'SKILLS.md',
      '.governance/skill-adoptions/README.md',
      '.governance/skill-adoptions/SKILL-ADOPTION-TEMPLATE.md',
      'loops/skill-registry/check-skill-registry.cjs',
    ]) assert.equal(fs.existsSync(path.join(run.target, file)), true, file);
  } finally {
    run.cleanup();
  }
});
```

- [ ] **Step 2: 執行 RED 測試**

Run: `node --test setup.test.cjs`

Expected: FAIL，直到 template 納入 registry 範本與檢查器。

- [ ] **Step 3: 更新使用者文件**

README 與 `docs/design.md` 說明：外部 Skill 先個人試用，PM 核准後才固定版本並納入 Git；禁止自動下載或升版；`check-skill-registry` 在納入前手動執行並且衝突會阻擋。不要宣稱管理或掃描個人全域 Skill。

- [ ] **Step 4: 執行 GREEN 與全量驗證**

Run: `node --test setup.test.cjs`

Expected: PASS。

Run: `node --test template/loops/skill-registry/check-skill-registry.test.cjs`

Expected: PASS。

Run: `node --test setup.test.cjs template/gates/drift-fact-check/check-drift-fact.test.cjs template/onboarding/backfill/scan-evidence.test.cjs template/loops/learning-capture/check-lesson-quality.test.cjs template/loops/context-growth/check-context-growth.test.cjs template/loops/anti-bloat/check-rule-fitness.test.cjs template/loops/skill-registry/check-skill-registry.test.cjs`

Expected: 所有明確列出的 `.test.cjs` 檔案通過。

Run: `git diff --check`

Expected: 無輸出。

- [ ] **Step 5: Commit**

```bash
git add setup.test.cjs README.md docs/design.md
git commit -m "docs: document project skill adoption workflow"
```

## 4. 交付前相容性審查

**檔案：**
- 修改：上述所有檔案

- [ ] **Step 1: 執行有效 registry CLI**

Run: `node template/loops/skill-registry/check-skill-registry.cjs template/loops/skill-registry/fixtures/valid-project --json`

Expected: exit 0，JSON 的 `errors` 為空陣列。

- [ ] **Step 2: 執行受保護路徑 candidate CLI**

Run: `node template/loops/skill-registry/check-skill-registry.cjs template/loops/skill-registry/fixtures/valid-project --candidate template/loops/skill-registry/fixtures/protected-path-candidate.json --json`

Expected: exit 1，JSON 包含 `protected-path`。

- [ ] **Step 3: 檢查既有 Claude Code 基線未變**

Run: `node --test setup.test.cjs`

Expected: 受 SHA-256 保護的 `template/.claude/agents/*`、既有 `brainstorming`、`code-review`、`tdd` 均通過。

- [ ] **Step 4: 進行獨立程式碼審查**

檢查：registry 表格 parser 是否拒絕缺標記或欄位、採用紀錄是否拒絕浮動版本、adapter 是否真的指向 canonical、candidate 保護路徑是否防止目錄前綴繞過，以及所有檢查器是否只讀取檔案。

