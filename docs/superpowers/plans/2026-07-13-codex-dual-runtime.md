<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->
<!-- 功能：把已批准的 Codex 雙執行環境設計拆成可測試、可逐步提交的實作任務。 -->

# Codex Dual Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 builder-pm 安裝結果可選 Claude Code、Codex 或兩者，且 Claude Code 既有邏輯不變、Codex 正式 PR 必經 `codex-pr-review`。

**Architecture:** 保留 `CLAUDE.md` 與整棵 `.claude/` 作為不變的共用治理正本；新增 `AGENTS.md` 與 `.agents/skills/` 作為 Codex 薄轉接層。`setup.sh` 只負責選擇入口、建立 review config 與產生精準下一步，不自動安裝 private plugin 或改全域設定。

**Tech Stack:** Bash、Node.js 內建 `node:test` / `assert` / `child_process`、Markdown、JSON、Codex project skills。

---

## File Map

**Create**

- `setup.test.cjs`：安裝腳本黑箱測試、Claude 檔案雜湊鎖與三種安裝矩陣。
- `template/AGENTS.md`：Codex 自動入口、共用正本路由、四角色與兩階段驗收規則。
- `template/.agents/skills/coordinator/SKILL.md`：Codex Coordinator 分流與 sub-agent 交接。
- `template/.agents/skills/planner/SKILL.md`：Codex Planner 規格責任。
- `template/.agents/skills/generator/SKILL.md`：Codex Generator SDD / TDD 與禁止自評。
- `template/.agents/skills/evaluator/SKILL.md`：Codex Evaluator 唯讀初審與 PR 外掛 gate。

**Modify**

- `setup.sh`：新增平台選擇、安裝裁切、review config 預設、平台化 MODULES / 收尾訊息。
- `README.md`：說明三種安裝模式與 Codex 架構。
- `template/ONBOARDING.md`：補 Codex 開工、brownfield 指令替代與兩階段驗收。
- `template/SKILLS.md`：補 Codex skill 路徑與正式 PR gate，維持角色清單單一正本。
- `docs/design.md`：更新雙執行環境決策與實作狀態。

**Must Not Modify**

- `template/CLAUDE.md`
- `template/.claude/agents/**`
- `template/.claude/skills/**`

### Task 1: Add Claude Compatibility Guard

**Files:**

- Create: `setup.test.cjs`
- Test: `setup.test.cjs`

- [ ] **Step 1: Write the compatibility test with frozen hashes**

Create `setup.test.cjs` with the exact baseline hashes captured before implementation:

```js
// [AI-ASSISTED] by PM Amber, 2026-07-13
// 功能：黑箱驗證 setup.sh 安裝矩陣，並鎖住既有 Claude Code 核心檔案。
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;

const CLAUDE_BASELINE = {
  'template/CLAUDE.md': 'afd0c7d715036356795456de112fa3c11eb589b196fe39024d0228fdc228b2cc',
  'template/.claude/agents/coordinator.md': '1c0e08b5b6d771e46ac51410a2c2e3573f81c6fd7d095d6af4791f5937d6ee43',
  'template/.claude/agents/evaluator.md': '383c41ceee779f3dedc6b45926a458b29abbf67c0f2389497486bc5935a42824',
  'template/.claude/agents/generator.md': '1de961689db180f4464656dfe98341eb07f5fdcdce82adf0e00e2e7c93fc59f7',
  'template/.claude/agents/planner.md': '09fa3f05571578f5886e921e7acdb626e395385e1a06a17ef9092889ff68f845',
  'template/.claude/skills/brainstorming/SKILL.md': 'eecf19a0cd1b2f15e2d2695ca6890e0e33dc8f13e9fa6ea1a0a02162747cab41',
  'template/.claude/skills/code-review/SKILL.md': '681db8f08effad6a7d0d7c20548502fb1940c1df4b61648b790a79a485d6de3a',
  'template/.claude/skills/tdd/SKILL.md': '9108edbd1b6c2e9d99ff31b3b05f2acb6543bc32977f56279ba22418e6bb1f90',
};

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex');
}

test('既有 Claude Code 核心檔案位元不變', () => {
  for (const [file, expected] of Object.entries(CLAUDE_BASELINE)) {
    assert.equal(sha256(file), expected, `${file} 不得在 Codex 支援工作中被改寫`);
  }
});
```

- [ ] **Step 2: Run the guard and verify it passes before implementation**

Run: `node --test setup.test.cjs`

Expected: `1` test passes, `0` fails. This is a characterization test, so it starts GREEN.

- [ ] **Step 3: Commit the compatibility guard**

```bash
git add setup.test.cjs
git commit -m "test: lock Claude Code compatibility baseline"
```

### Task 2: Add Codex Project Entry And Role Skills

**Files:**

- Create: `template/AGENTS.md`
- Create: `template/.agents/skills/coordinator/SKILL.md`
- Create: `template/.agents/skills/planner/SKILL.md`
- Create: `template/.agents/skills/generator/SKILL.md`
- Create: `template/.agents/skills/evaluator/SKILL.md`
- Modify: `setup.test.cjs`

- [ ] **Step 1: Add failing static-structure tests**

Append these tests to `setup.test.cjs`:

```js
const CODEX_SKILLS = ['coordinator', 'planner', 'generator', 'evaluator'];

test('Codex 入口存在且引用共用正本，不複製核心條文', () => {
  const agents = fs.readFileSync(path.join(ROOT, 'template/AGENTS.md'), 'utf8');
  assert.match(agents, /CLAUDE\.md/);
  assert.match(agents, /\.agents\/skills\/coordinator/);
  assert.doesNotMatch(agents, /核心憲章（10 條/);
});

test('Codex 四角色 skills 有合法 frontmatter 與角色觸發', () => {
  for (const role of CODEX_SKILLS) {
    const file = path.join(ROOT, 'template/.agents/skills', role, 'SKILL.md');
    const body = fs.readFileSync(file, 'utf8');
    assert.match(body, /^---\nname: /);
    assert.match(body, /description: /);
    assert.match(body, new RegExp(role, 'i'));
  }
});
```

- [ ] **Step 2: Run the static tests and verify RED**

Run: `node --test setup.test.cjs`

Expected: baseline hash test passes; Codex tests fail with `ENOENT` for `template/AGENTS.md` and role skills.

- [ ] **Step 3: Create `template/AGENTS.md`**

Use this complete content, keeping shared rules in `CLAUDE.md`:

```markdown
<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->
<!-- 功能：Codex 專案入口；路由共用治理正本、四角色與獨立驗收。 -->

# {{PROJECT_NAME}} · Codex 協作入口

## 共用治理正本

開始任何工作前必須完整讀取 `CLAUDE.md`。它是 Claude Code 與 Codex 共用的治理正本；檔名不代表本專案必須使用 Claude Code。不要在本檔重抄核心 10 條規則。

永遠使用繁體中文與 PM 溝通。專業術語附白話解釋；不確定就問，不替 PM 做商業、高風險、migration 或資安決定。

## 角色路由

- 模糊需求、PRD、SPEC：使用 `.agents/skills/planner/SKILL.md`。
- 實作 production code：使用 `.agents/skills/generator/SKILL.md`。
- 任務分流、阻塞、交接：使用 `.agents/skills/coordinator/SKILL.md`。
- 本機或 PR 驗收：使用 `.agents/skills/evaluator/SKILL.md`。

既有 `.claude/` 必須保留，因為 `CLAUDE.md` 與 `SKILLS.md` 會引用其中的共用角色合約；Codex 的執行入口仍是本檔與 `.agents/skills/`。

## 獨立驗收

Generator 不得驗收自己的產出。Coordinator 在 Generator 回報後，應派出新的唯讀 Evaluator sub-agent，且不要傳入 Generator 的品質結論。若 runtime 無法派 sub-agent，使用 `codex review --uncommitted` 做本機初審。

本機只能回報 `LOCAL PASS` 或 `LOCAL FAIL`。正式 GitHub PR 必須使用 `codex-pr-review` 的 `pr-review-agent`；外掛未載入、沒有 PR 或 `gh auth` 無效時，狀態是 `PR REVIEW BLOCKED`，不得降級後宣稱正式通過。

## Brownfield

Codex 不把 `.claude/commands/backfill-context.md` 註冊成 slash command。使用者要求既有專案回填時，Coordinator 必須讀該檔並依同一流程執行，草稿仍需 PM 審核後才能搬入正式 `.context/`。
```

- [ ] **Step 4: Create the four Codex role skills**

Create each file below exactly. Frontmatter must remain the first block so Codex can discover the skill.

`template/.agents/skills/coordinator/SKILL.md`:

```markdown
---
name: builder-pm-coordinator
description: Use for PM intake, role routing, blocker triage, and Generator-to-Evaluator handoff in builder-pm projects.
---

<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->

# Coordinator

先讀 `CLAUDE.md` 與 `.claude/agents/coordinator.md`，沿用其中完整合約。

## Codex 轉接

1. 模糊需求交 Planner；production code 交 Generator；驗收交 Evaluator。
2. Generator 完成後，派新的唯讀 Evaluator sub-agent；不要傳入 Generator 的品質結論。
3. sub-agent 不可用時，要求 Evaluator 走 `codex review --uncommitted`。
4. 同一 block 兩次未解，停止自動分流並升 PM。
```

`template/.agents/skills/planner/SKILL.md`:

```markdown
---
name: builder-pm-planner
description: Use when a PM idea must be clarified into an approved PRD, SPEC, scope, and acceptance criteria before implementation.
---

<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->

# Planner

先讀 `CLAUDE.md`、`.claude/agents/planner.md` 與 `SKILLS.md`，沿用其中完整合約。

一次只問一個關鍵問題。產出必須包含 Goal、Out of scope、驗收條件與待 PM 決定事項。不得寫 production code；規格批准前不得進入實作。
```

`template/.agents/skills/generator/SKILL.md`:

```markdown
---
name: builder-pm-generator
description: Use after an approved SPEC to implement the smallest scoped change with SDD, TDD, and factual verification evidence.
---

<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->

# Generator

先讀 `CLAUDE.md`、`.claude/agents/generator.md`、`SKILLS.md` 與 owning SPEC，沿用其中完整合約。

修改前先向 PM 說明檔案、原因、選項與風險。邏輯改動先取得 RED test，再做最小實作使其 GREEN。回報只列變更範圍、指令與輸出；不得自評 PASS，完成後交回 Coordinator。
```

`template/.agents/skills/evaluator/SKILL.md`:

```markdown
---
name: builder-pm-evaluator
description: Use for independent read-only review after Generator work and for the required codex-pr-review gate on GitHub PRs.
---

<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->

# Evaluator

先讀 `CLAUDE.md`、`.claude/agents/evaluator.md`、`SKILLS.md` 與驗收條件，沿用其中完整合約。唯讀驗收，不修改 production code。

## 本機初審

以新 sub-agent 執行，不接收 Generator 的品質結論。sub-agent 不可用時執行 `codex review --uncommitted`。只回報 `LOCAL PASS` 或 `LOCAL FAIL`，findings 先於 summary 並附檔案行號與指令證據。

## 正式 PR gate

GitHub PR 必須使用 `codex-pr-review` 的 `pr-review-agent` 並載入 `.codex/review-config.json`。外掛未載入、PR 不存在、`gh auth` 無效或專案知識未成功載入時，回報 `PR REVIEW BLOCKED`；不得用一般 diff review 冒充正式通過。
```

- [ ] **Step 5: Run static tests and verify GREEN**

Run: `node --test setup.test.cjs`

Expected: `3` tests pass, `0` fail.

- [ ] **Step 6: Commit Codex entry and skills**

```bash
git add setup.test.cjs template/AGENTS.md template/.agents/skills
git commit -m "feat: add Codex project roles"
```

### Task 3: Add Setup Installation Matrix With TDD

**Files:**

- Modify: `setup.test.cjs`
- Modify: `setup.sh`

- [ ] **Step 1: Add the black-box setup helper and matrix tests**

Append a helper that copies the repo seed into a temporary sandbox before running `setup.sh`, so RED tests cannot pollute the real worktree:

```js
const os = require('node:os');
const { spawnSync } = require('node:child_process');

function runSetup(platform, { codexReview = 'n' } = {}) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-pm-setup-'));
  const source = path.join(sandbox, 'source');
  const target = path.join(sandbox, 'target');
  fs.cpSync(ROOT, source, {
    recursive: true,
    filter: (entry) => path.basename(entry) !== '.git',
  });

  const answers = [
    platform,
    'matrix-project',
    target,
    '驗證雙執行環境',
    'Amber',
    'Node.js',
    'node:test',
    'node --test',
    '',
    '',
    '',
    'n',
  ];
  if (platform === '' || platform === '1' || platform === 'claude') answers.push(codexReview);

  const result = spawnSync('bash', ['setup.sh'], {
    cwd: source,
    input: `${answers.join('\n')}\n`,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
  });
  return { ...result, target, cleanup: () => fs.rmSync(sandbox, { recursive: true, force: true }) };
}

function assertReviewConfig(target) {
  const config = JSON.parse(fs.readFileSync(path.join(target, '.codex/review-config.json'), 'utf8'));
  assert.deepEqual(
    config.knowledgeSources.map((source) => source.path),
    ['CLAUDE.md', 'SKILLS.md', '.context/SYSTEM.md', '.context/CONVENTIONS.md'],
  );
  for (const source of config.knowledgeSources) {
    assert.equal(fs.existsSync(path.join(target, source.path)), true, source.path);
  }
}

test('Claude 預設安裝保留原入口且不安裝 Codex 入口', () => {
  const run = runSetup('', { codexReview: 'n' });
  try {
    assert.equal(run.status, 0, run.stderr);
    assert.equal(fs.existsSync(path.join(run.target, 'CLAUDE.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, '.claude/agents/coordinator.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, 'AGENTS.md')), false);
    assert.equal(fs.existsSync(path.join(run.target, '.agents')), false);
    assert.equal(fs.existsSync(path.join(run.target, '.codex/review-config.json')), false);
  } finally { run.cleanup(); }
});

test('Codex 安裝保留共用 Claude 合約並建立 Codex 入口與 review config', () => {
  const run = runSetup('2');
  try {
    assert.equal(run.status, 0, run.stderr);
    assert.equal(fs.existsSync(path.join(run.target, 'CLAUDE.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, '.claude/agents/coordinator.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, 'AGENTS.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, '.agents/skills/evaluator/SKILL.md')), true);
    assertReviewConfig(run.target);
    assert.match(fs.readFileSync(path.join(run.target, 'MODULES.md'), 'utf8'), /PR REVIEW.*待啟用/i);
  } finally { run.cleanup(); }
});

test('雙平台安裝同時保留兩邊入口', () => {
  const run = runSetup('3');
  try {
    assert.equal(run.status, 0, run.stderr);
    assert.equal(fs.existsSync(path.join(run.target, 'CLAUDE.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, '.claude')), true);
    assert.equal(fs.existsSync(path.join(run.target, 'AGENTS.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, '.agents')), true);
    assertReviewConfig(run.target);
  } finally { run.cleanup(); }
});
```

- [ ] **Step 2: Run matrix tests and verify RED**

Run: `node --test setup.test.cjs`

Expected: static tests pass; matrix tests fail because `setup.sh` does not parse a platform or prune Codex files for Claude-only output.

- [ ] **Step 3: Add strict platform selection to `setup.sh`**

Insert before the existing project-name prompt:

```bash
while true; do
  read -p "開發工具：1) Claude Code（預設） 2) Codex 3) 兩者 [1]: " ans_platform || true
  case "${ans_platform:-1}" in
    1|claude) DEV_PLATFORM=claude; break ;;
    2|codex) DEV_PLATFORM=codex; break ;;
    3|both) DEV_PLATFORM=both; break ;;
    *) echo "錯誤：請輸入 1、2 或 3。" >&2 ;;
  esac
done
```

Keep all existing project metadata questions after this block unchanged.

- [ ] **Step 4: Make Codex PR review required for Codex runtimes**

Replace the existing Codex module prompt with:

```bash
if [ "$DEV_PLATFORM" = "claude" ]; then
  read -p "啟用 Codex PR 審查（給 Evaluator 當第二模型）？[y/N]: " ans_codex || true
  case "${ans_codex:-n}" in [Yy]*) ENABLE_CODEX=y ;; *) ENABLE_CODEX=n ;; esac
else
  ENABLE_CODEX=y
fi
```

This preserves the Claude-only opt-in and makes the plugin gate required for Codex / both.

- [ ] **Step 5: Prune only Codex runtime entries from Claude-only output**

Immediately after `cp -R`, add:

```bash
if [ "$DEV_PLATFORM" = "claude" ]; then
  rm -f "$TARGET_ABS/AGENTS.md"
  rm -rf "$TARGET_ABS/.agents"
fi
```

Never remove `.claude/`; Codex-only uses it as the shared contract source.

- [ ] **Step 6: Replace the empty review config with real knowledge sources**

Use this exact JSON in the existing `ENABLE_CODEX` block:

```json
{
  "knowledgeSources": [
    { "id": "core-governance", "title": "核心治理", "path": "CLAUDE.md", "kind": "governance" },
    { "id": "skill-routing", "title": "Skill 路由", "path": "SKILLS.md", "kind": "skill-routing" },
    { "id": "system-context", "title": "系統脈絡", "path": ".context/SYSTEM.md", "kind": "architecture" },
    { "id": "project-conventions", "title": "專案約定", "path": ".context/CONVENTIONS.md", "kind": "conventions" }
  ],
  "moduleDocHints": [],
  "errorPatternsPath": null
}
```

- [ ] **Step 7: Generate platform-specific MODULES and completion instructions**

Keep the existing Claude-only plugin commands unchanged. For Codex or both, output these exact states and commands instead:

```text
狀態：**PR REVIEW 待啟用**（設定檔已建立，外掛尚需在 Codex 載入）

codex plugin marketplace add Amber-Chang/codex-pr-review

加入 marketplace 後，依目前 Codex 版本完成啟用或 reload，並確認 `pr-review-agent` 已出現在 Codex 可用 skills。只加入 marketplace 不代表正式 gate 已就緒。
```

Set the final launch hint by platform:

```bash
case "$DEV_PLATFORM" in
  claude) echo "  3. 在專案目錄執行：claude" ;;
  codex) echo "  3. 用 Codex App 開啟專案，或在專案目錄執行：codex" ;;
  both) echo "  3. 用 Claude Code 或 Codex 開啟專案（claude / codex）" ;;
esac
```

- [ ] **Step 8: Run setup tests and verify GREEN**

Run: `node --test setup.test.cjs`

Expected: all compatibility, static and matrix tests pass; `0` failures.

- [ ] **Step 9: Commit setup matrix support**

```bash
git add setup.sh setup.test.cjs
git commit -m "feat: add dual-runtime installer"
```

### Task 4: Update User-Facing Documentation

**Files:**

- Modify: `README.md`
- Modify: `template/ONBOARDING.md`
- Modify: `template/SKILLS.md`
- Modify: `docs/design.md`
- Modify: `setup.test.cjs`

- [ ] **Step 1: Add failing documentation assertions**

Append to `setup.test.cjs`:

```js
test('文件清楚區分 Codex 本機初審與正式 PR gate', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const onboarding = fs.readFileSync(path.join(ROOT, 'template/ONBOARDING.md'), 'utf8');
  const skills = fs.readFileSync(path.join(ROOT, 'template/SKILLS.md'), 'utf8');
  assert.match(readme, /Claude Code.*Codex|Codex.*Claude Code/s);
  assert.match(onboarding, /LOCAL PASS/);
  assert.match(onboarding, /PR REVIEW BLOCKED/);
  assert.match(skills, /\.agents\/skills/);
  assert.match(skills, /pr-review-agent/);
});
```

- [ ] **Step 2: Run the docs assertion and verify RED**

Run: `node --test setup.test.cjs`

Expected: the new documentation test fails because the current docs do not contain the status model or Codex skill paths.

- [ ] **Step 3: Update `README.md`**

Document:

- installer choices: Claude Code, Codex, both;
- `CLAUDE.md` as unchanged shared source and `AGENTS.md` as Codex adapter;
- `.claude/` retained in Codex-only as shared contracts, not as runtime;
- local Evaluator sub-agent / `codex review --uncommitted` initial review;
- required `codex-pr-review` formal PR gate and BLOCKED behavior.

- [ ] **Step 4: Update `template/ONBOARDING.md`**

Add a Codex section with exact user operations:

```markdown
## Codex 開工

Codex 先讀 `AGENTS.md`，再依指示讀共同正本 `CLAUDE.md`。需求、實作與驗收分別路由到 `.agents/skills/` 的四角色。

開發完成先由獨立 Evaluator sub-agent 初審；無 sub-agent 時執行 `codex review --uncommitted`。這一步只能得到 `LOCAL PASS` / `LOCAL FAIL`。

建立 GitHub PR 後，必須使用 `pr-review-agent` 正式審查。外掛、PR 或 GitHub 權限缺失時回報 `PR REVIEW BLOCKED`，`LOCAL PASS` 不等於正式交付通過。

既有專案要回填 context 時，請 Codex「依 `.claude/commands/backfill-context.md` 執行 brownfield backfill」；草稿仍由 PM 審核後手動搬入正式 `.context/`。
```

- [ ] **Step 5: Update `template/SKILLS.md` without duplicating role rules**

Add a routing note that Claude uses `.claude/skills/`, Codex uses `.agents/skills/`, and formal PR review uses the plugin-provided `pr-review-agent`. Change the existing “Codex second-model review (opt-in)” wording to distinguish Claude-only opt-in from Codex / both required PR gate.

- [ ] **Step 6: Update `docs/design.md` implementation status**

Record the approved adapter model, unchanged Claude source, retained `.claude/` contracts, two-stage review states, and the CLI-version finding that `codex plugin install` is not universally available.

- [ ] **Step 7: Run docs and setup tests**

Run: `node --test setup.test.cjs`

Expected: all tests pass, `0` failures.

- [ ] **Step 8: Commit documentation**

```bash
git add README.md template/ONBOARDING.md template/SKILLS.md docs/design.md setup.test.cjs
git commit -m "docs: explain Claude and Codex workflows"
```

### Task 5: Full Regression And Acceptance Verification

**Files:**

- Verify only; modify implementation files only if a test exposes a defect.

- [ ] **Step 1: Run the new installer suite**

Run: `node --test setup.test.cjs`

Expected: all setup compatibility, structure, matrix and documentation tests pass.

- [ ] **Step 2: Run every existing governance test**

Run:

```bash
node --test \
  template/onboarding/backfill/scan-evidence.test.cjs \
  template/loops/context-growth/check-context-growth.test.cjs \
  template/loops/learning-capture/check-lesson-quality.test.cjs \
  template/loops/anti-bloat/check-rule-fitness.test.cjs \
  template/gates/drift-fact-check/check-drift-fact.test.cjs
```

Expected: `50` tests pass, `0` fail.

- [ ] **Step 3: Verify the complete suite together**

Run:

```bash
node --test \
  setup.test.cjs \
  template/onboarding/backfill/scan-evidence.test.cjs \
  template/loops/context-growth/check-context-growth.test.cjs \
  template/loops/learning-capture/check-lesson-quality.test.cjs \
  template/loops/anti-bloat/check-rule-fitness.test.cjs \
  template/gates/drift-fact-check/check-drift-fact.test.cjs
```

Expected: setup tests plus the existing `50` tests all pass with `0` failures.

- [ ] **Step 4: Verify no Claude core file changed**

Run: `node --test --test-name-pattern="既有 Claude Code 核心檔案位元不變" setup.test.cjs`

Expected: `1` pass, `0` fail.

- [ ] **Step 5: Verify repository hygiene**

Run: `git diff --check`

Expected: no output, exit `0`.

Run: `git status --short`

Expected: only intentional implementation files are modified; no generated target project, `.context/.backfill`, `.codex` global state, or temporary review packet appears.

- [ ] **Step 6: Review the final diff against acceptance criteria**

Confirm all six design acceptance criteria map to evidence:

1. Claude hashes pass.
2. Codex-only matrix test passes.
3. `AGENTS.md` references, rather than duplicates, the core charter.
4. `LOCAL` and `PR` states are distinct in skill and docs tests.
5. Codex / both setup marks plugin activation pending, and the Evaluator contract blocks formal PR approval when capability is missing.
6. New and existing test suites pass together.

- [ ] **Step 7: Commit any verification-only corrections**

If verification required a correction, commit only the corrected files:

```bash
git add setup.sh setup.test.cjs README.md docs/design.md template/AGENTS.md template/.agents/skills template/ONBOARDING.md template/SKILLS.md
git commit -m "fix: close dual-runtime verification gaps"
```

If no correction was required, do not create an empty commit.
