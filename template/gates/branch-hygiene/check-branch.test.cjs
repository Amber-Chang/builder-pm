// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-07-13
// 功能：驗證 branch hygiene gate 只讀取 Git 分支狀態，並提供穩定的 CLI 結果。

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CHECKER = path.join(__dirname, 'check-branch.cjs');

function git(projectRoot, args) {
  const result = spawnSync('git', args, { cwd: projectRoot, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, `git ${args.join(' ')} 失敗：${result.stderr}`);
}

function createRepo(branch = 'work') {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'branch-hygiene-'));
  git(projectRoot, ['init', '--initial-branch=main']);
  git(projectRoot, ['config', 'user.email', 'branch-hygiene@example.test']);
  git(projectRoot, ['config', 'user.name', 'Branch Hygiene Test']);
  fs.writeFileSync(path.join(projectRoot, 'README.md'), '# temporary repo\n');
  git(projectRoot, ['add', 'README.md']);
  git(projectRoot, ['commit', '-m', 'initial commit']);
  if (branch !== 'main') git(projectRoot, ['checkout', '-b', branch]);
  return projectRoot;
}

function run(args) {
  const result = spawnSync('node', [CHECKER, ...args], { encoding: 'utf8' });
  return {
    code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function runJson(projectRoot) {
  const result = run([projectRoot, '--json']);
  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`JSON 輸出無法解析（exit ${result.code}）：${result.stdout}${result.stderr}`);
  }
  return { ...result, json };
}

function withTempDir(callback) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'branch-hygiene-non-repo-'));
  try {
    callback(projectRoot);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
}

test('公開 API：匯出 inspectBranch 與 main', () => {
  const checker = require(CHECKER);

  assert.strictEqual(typeof checker.inspectBranch, 'function');
  assert.strictEqual(typeof checker.main, 'function');
});

test('工作分支：inspectBranch 回報 work-branch，CLI exit 0', () => {
  const projectRoot = createRepo('feature/branch-hygiene');
  try {
    const { inspectBranch } = require(CHECKER);
    assert.deepStrictEqual(inspectBranch(projectRoot), {
      branch: 'feature/branch-hygiene',
      reason: 'work-branch',
    });

    const result = runJson(projectRoot);
    assert.strictEqual(result.code, 0, result.stderr);
    assert.deepStrictEqual(result.json, {
      branch: 'feature/branch-hygiene',
      reason: 'work-branch',
    });
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('main：回報 protected-branch，CLI exit 1 並提供繁中指示', () => {
  const projectRoot = createRepo('main');
  try {
    const result = run([projectRoot]);

    assert.strictEqual(result.code, 1);
    assert.match(result.stdout, /目前位於受保護分支 main/);
    assert.match(result.stdout, /請建立或切換到工作分支/);
    assert.deepStrictEqual(runJson(projectRoot).json, {
      branch: 'main',
      reason: 'protected-branch',
    });
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('master：回報 protected-branch，CLI exit 1', () => {
  const projectRoot = createRepo('main');
  try {
    git(projectRoot, ['branch', '-m', 'master']);
    const result = runJson(projectRoot);

    assert.strictEqual(result.code, 1);
    assert.deepStrictEqual(result.json, {
      branch: 'master',
      reason: 'protected-branch',
    });
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('detached HEAD：回報 detached-head，CLI exit 1 並提供繁中指示', () => {
  const projectRoot = createRepo('work');
  try {
    git(projectRoot, ['checkout', '--detach']);
    const result = run([projectRoot]);

    assert.strictEqual(result.code, 1);
    assert.match(result.stdout, /目前處於 detached HEAD/);
    assert.match(result.stdout, /請切換到工作分支/);
    assert.deepStrictEqual(runJson(projectRoot).json, {
      branch: null,
      reason: 'detached-head',
    });
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('非 Git 目錄：回報 not-git-worktree，CLI exit 1 並提供繁中指示', () => {
  withTempDir((projectRoot) => {
    const result = run([projectRoot]);

    assert.strictEqual(result.code, 1);
    assert.match(result.stdout, /不是 Git 工作目錄/);
    assert.match(result.stdout, /請在 Git repository 中執行/);
    assert.deepStrictEqual(runJson(projectRoot).json, {
      branch: null,
      reason: 'not-git-worktree',
    });
  });
});

test('CLI：缺少 project-root、重複 JSON 旗標或額外參數時 exit 1', () => {
  for (const args of [[], ['.', '--json', '--json'], ['.', 'extra']]) {
    const result = run(args);
    assert.strictEqual(result.code, 1, `參數 ${args.join(' ')} 應 exit 1`);
    assert.match(result.stderr, /用法：node check-branch\.cjs <project-root> \[--json\]/);
  }
});

test('JSON 輸出：同一輸入連續執行結果完全一致', () => {
  const projectRoot = createRepo('feature/stable-json');
  try {
    const first = run([projectRoot, '--json']);
    const second = run([projectRoot, '--json']);

    assert.strictEqual(first.code, 0);
    assert.strictEqual(second.code, 0);
    assert.strictEqual(first.stdout, second.stdout);
    assert.strictEqual(first.stderr, '');
    assert.strictEqual(second.stderr, '');
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
