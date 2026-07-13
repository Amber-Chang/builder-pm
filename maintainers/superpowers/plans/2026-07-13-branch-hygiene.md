# Branch Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every installed builder-pm project give all AI runtimes one shared, testable rule to use a work branch before editing tracked files.

**Architecture:** `template/WORKFLOW.md` is the sole workflow policy. `template/gates/branch-hygiene/check-branch.cjs` is a dependency-free, read-only CLI that reports whether the current checkout is a safe work branch. Runtime entrypoints and onboarding only link to the policy; setup copies the template unchanged, while GitHub Actions executes the existing complete Node test suite.

**Tech Stack:** Markdown, Bash, Node.js built-ins (`node:test`, `node:child_process`, `node:fs`), GitHub Actions.

---

## File Map

- Create: `template/WORKFLOW.md` — canonical cross-runtime work-branch policy.
- Create: `template/gates/branch-hygiene/check-branch.cjs` — read-only CLI and exported inspection helpers.
- Create: `template/gates/branch-hygiene/check-branch.test.cjs` — temporary-repository integration tests.
- Create: `.github/workflows/verify.yml` — PR and `main` verification workflow.
- Modify: `template/CLAUDE.md` — one navigation reference to `WORKFLOW.md`.
- Modify: `template/AGENTS.md` — one navigation reference to `WORKFLOW.md`.
- Modify: `template/ONBOARDING.md` — when to create and verify a work branch.
- Modify: `README.md` — installed-template structure and workflow summary.
- Modify: `setup.test.cjs` — protect the intentional Claude reference and assert installation outputs.

### Task 1: Add the branch-hygiene gate with tests

**Files:**
- Create: `template/gates/branch-hygiene/check-branch.test.cjs`
- Create: `template/gates/branch-hygiene/check-branch.cjs`

- [ ] **Step 1: Write failing CLI integration tests**

Create a test helper that initializes a temporary Git repository with `main`, changes it to `codex/test-task`, or detaches HEAD. Assert the CLI result shape and exit status:

```js
test('work branch returns exit 0 with stable JSON', () => {
  const repo = makeRepository('codex/test-task');
  const result = runChecker(repo, '--json');
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    ok: true,
    branch: 'codex/test-task',
    reason: 'work-branch',
  });
});

test('main, master, detached HEAD, and non-repository return exit 1', () => {
  for (const scenario of ['main', 'master', 'detached', 'not-git']) {
    const result = runScenario(scenario, '--json');
    assert.equal(result.status, 1, `${scenario} 必須拒絕`);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ok, false);
    assert.match(report.reason, /^(protected-branch|detached-head|not-git-worktree)$/);
    assert.match(result.stderr, /建立工作分支|不是 Git worktree|detached HEAD/);
  }
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `node --test template/gates/branch-hygiene/check-branch.test.cjs`

Expected: FAIL because `check-branch.cjs` does not exist.

- [ ] **Step 3: Implement the minimal read-only checker**

Export `inspectBranch(projectRoot)` and `main(argv)`. Use `spawnSync('git', ['-C', projectRoot, 'rev-parse', '--is-inside-work-tree'])`, then `symbolic-ref --quiet --short HEAD`. Return these exact reason values: `not-git-worktree`, `detached-head`, `protected-branch`, and `work-branch`.

```js
function inspectBranch(projectRoot) {
  if (!isGitWorktree(projectRoot)) return { ok: false, reason: 'not-git-worktree' };
  const branch = currentBranch(projectRoot);
  if (!branch) return { ok: false, reason: 'detached-head' };
  if (branch === 'main' || branch === 'master') {
    return { ok: false, branch, reason: 'protected-branch' };
  }
  return { ok: true, branch, reason: 'work-branch' };
}
```

`main` requires exactly one `<project-root>` argument and accepts an optional `--json`. It must never create, switch, merge, reset, stash, or fetch branches.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test template/gates/branch-hygiene/check-branch.test.cjs`

Expected: all cases pass.

- [ ] **Step 5: Commit the gate**

```bash
git add template/gates/branch-hygiene/check-branch.cjs template/gates/branch-hygiene/check-branch.test.cjs
git commit -m "feat: add branch hygiene gate"
```

### Task 2: Add the canonical workflow and runtime references

**Files:**
- Create: `template/WORKFLOW.md`
- Modify: `template/CLAUDE.md`
- Modify: `template/AGENTS.md`
- Modify: `setup.test.cjs`

- [ ] **Step 1: Extend the installation contract test first**

Add a test that reads both runtime entrypoints and asserts each references `WORKFLOW.md`, while neither duplicates the workflow's branch-rule heading. Extend the Claude baseline map only after the intended source edit, preserving its role as an explicit compatibility review gate.

```js
test('Claude 與 Codex 入口都引用唯一的工作分支規則', () => {
  const workflow = fs.readFileSync(path.join(ROOT, 'template/WORKFLOW.md'), 'utf8');
  const claude = fs.readFileSync(path.join(ROOT, 'template/CLAUDE.md'), 'utf8');
  const agents = fs.readFileSync(path.join(ROOT, 'template/AGENTS.md'), 'utf8');
  assert.match(workflow, /^# 工作流程/m);
  assert.match(claude, /WORKFLOW\.md/);
  assert.match(agents, /WORKFLOW\.md/);
  assert.equal((claude.match(/第一次修改追蹤檔案前/g) || []).length, 0);
  assert.equal((agents.match(/第一次修改追蹤檔案前/g) || []).length, 0);
});
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run: `node --test setup.test.cjs`

Expected: FAIL because the workflow file and references do not exist.

- [ ] **Step 3: Add the policy and narrow references**

Write `template/WORKFLOW.md` with the six approved rules, a preflight command:

```bash
node gates/branch-hygiene/check-branch.cjs . --json
```

and an explicit statement that GitHub branch protection is the remote enforcement layer. Add only a navigation-row reference in `CLAUDE.md` and a short preflight requirement in `AGENTS.md`; do not change any role contracts or Skills.

- [ ] **Step 4: Update the intentional Claude compatibility hash and verify the contract**

Calculate the new SHA-256 for `template/CLAUDE.md`, replace only its matching `CLAUDE_BASELINE` value in `setup.test.cjs`, then run:

```bash
node --test setup.test.cjs
```

Expected: all existing installation tests plus the new workflow-reference assertion pass.

- [ ] **Step 5: Commit the shared policy**

```bash
git add template/WORKFLOW.md template/CLAUDE.md template/AGENTS.md setup.test.cjs
git commit -m "feat: add shared work branch policy"
```

### Task 3: Expose the workflow in installed-project guidance

**Files:**
- Modify: `template/ONBOARDING.md`
- Modify: `README.md`
- Modify: `setup.test.cjs`

- [ ] **Step 1: Add a failing installation-output assertion**

In the existing setup integration test, assert all platform installs include `WORKFLOW.md` and `gates/branch-hygiene/check-branch.cjs`, and that `ONBOARDING.md` contains the preflight command. For Claude-only installs, assert the shared policy remains installed even when `AGENTS.md` is intentionally removed.

- [ ] **Step 2: Run the focused setup test to verify the new assertion fails**

Run: `node --test setup.test.cjs`

Expected: FAIL because `ONBOARDING.md` does not yet contain the preflight command.

- [ ] **Step 3: Update the user-facing documents**

Add an ONBOARDING section before Day-0 implementation that states: finish planning, run the preflight command, create a work branch only if it reports `main`, and stop rather than altering a dirty user worktree. Update README's structure block to list `WORKFLOW.md` and `gates/branch-hygiene/`, and add a concise statement that implementation work uses a branch and PR.

- [ ] **Step 4: Run the full installation test suite**

Run: `node --test setup.test.cjs`

Expected: all setup tests pass for Claude, Codex, and dual-runtime installations.

- [ ] **Step 5: Commit installation guidance**

```bash
git add README.md template/ONBOARDING.md setup.test.cjs
git commit -m "docs: guide work branch setup"
```

### Task 4: Add repository CI

**Files:**
- Create: `.github/workflows/verify.yml`

- [ ] **Step 1: Add the verification workflow**

Create a GitHub Actions workflow for `pull_request` and pushes to `main`, using `actions/checkout@v4` and `actions/setup-node@v4` with `node-version: 22`. Run each test command explicitly:

```yaml
- run: node --test setup.test.cjs
- run: node --test template/gates/branch-hygiene/check-branch.test.cjs
- run: node --test template/gates/drift-fact-check/check-drift-fact.test.cjs
- run: node --test template/loops/anti-bloat/check-rule-fitness.test.cjs
- run: node --test template/loops/context-growth/check-context-growth.test.cjs
- run: node --test template/loops/document-contract/check-document-contract.test.cjs
- run: node --test template/loops/learning-capture/check-lesson-quality.test.cjs
- run: node --test template/loops/skill-registry/check-skill-registry.test.cjs
- run: node --test template/onboarding/backfill/scan-evidence.test.cjs
```

- [ ] **Step 2: Validate the workflow's command paths locally**

Run every listed `node --test` command locally, then run `git diff --check`.

Expected: every command exits 0 and the diff has no whitespace errors.

- [ ] **Step 3: Commit CI**

```bash
git add .github/workflows/verify.yml
git commit -m "ci: verify template gates and loops"
```

### Task 5: Final verification and PR preparation

**Files:**
- Verify all files listed above.

- [ ] **Step 1: Run the complete verification set**

Run the same nine `node --test` commands from Task 4 and `git diff --check origin/main...HEAD`.

- [ ] **Step 2: Review branch scope**

Run: `git status --short` and `git log --oneline origin/main..HEAD`.

Expected: only the design commit and branch-hygiene implementation commits are present; no copied user working-tree changes.

- [ ] **Step 3: Request independent review and publish**

Use the established Codex local review flow, push `codex/branch-hygiene`, and open a non-draft PR. The PR description must state that GitHub branch protection remains a manual repository setting.
