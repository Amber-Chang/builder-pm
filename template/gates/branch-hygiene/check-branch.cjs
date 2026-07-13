// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-07-13
// 功能：唯讀檢查專案是否位於可作業的 Git 分支。

'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

function runGit(projectRoot, args) {
  return spawnSync('git', ['-C', projectRoot, ...args], { encoding: 'utf8' });
}

function inspectBranch(projectRoot) {
  const root = path.resolve(projectRoot);
  const worktree = runGit(root, ['rev-parse', '--is-inside-work-tree']);

  if (worktree.status !== 0 || worktree.stdout.trim() !== 'true') {
    return { branch: null, reason: 'not-git-worktree' };
  }

  const symbolicRef = runGit(root, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
  if (symbolicRef.status !== 0) {
    return { branch: null, reason: 'detached-head' };
  }

  const branch = symbolicRef.stdout.trim();
  if (branch === 'main' || branch === 'master') {
    return { branch, reason: 'protected-branch' };
  }
  return { branch, reason: 'work-branch' };
}

function renderReport(projectRoot, result) {
  if (result.reason === 'not-git-worktree') {
    return [
      `目錄：${projectRoot}`,
      '結果：不是 Git 工作目錄。',
      '指示：請在 Git repository 中執行，並指定專案根目錄。',
    ].join('\n');
  }
  if (result.reason === 'detached-head') {
    return [
      `目錄：${projectRoot}`,
      '結果：目前處於 detached HEAD。',
      '指示：請切換到工作分支後再繼續。',
    ].join('\n');
  }
  if (result.reason === 'protected-branch') {
    return [
      `目錄：${projectRoot}`,
      `結果：目前位於受保護分支 ${result.branch}。`,
      '指示：請建立或切換到工作分支後再繼續。',
    ].join('\n');
  }
  return [
    `目錄：${projectRoot}`,
    `結果：目前位於工作分支 ${result.branch}。`,
    '指示：可繼續作業。',
  ].join('\n');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const jsonFlags = args.filter((arg) => arg === '--json');
  const positional = args.filter((arg) => arg !== '--json');
  const hasUnknownFlag = positional.some((arg) => arg.startsWith('-'));

  if (jsonFlags.length > 1 || positional.length !== 1 || hasUnknownFlag) return null;
  return { jsonMode: jsonFlags.length === 1, projectRoot: positional[0] };
}

function main(argv) {
  const options = parseArgs(argv);
  if (!options) {
    console.error('用法：node check-branch.cjs <project-root> [--json]');
    return 1;
  }

  const projectRoot = path.resolve(process.cwd(), options.projectRoot);
  const result = inspectBranch(projectRoot);
  if (options.jsonMode) console.log(JSON.stringify(result));
  else console.log(renderReport(projectRoot, result));
  return result.reason === 'work-branch' ? 0 : 1;
}

if (require.main === module) {
  process.exitCode = main(process.argv);
}

module.exports = { inspectBranch, main };
