// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-07-13
// 功能：驗證正式 PRD / SPEC 的目錄、檔名、frontmatter ID 與 PRD-to-SPEC 關聯契約。

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const CHECKER = path.join(__dirname, 'check-document-contract.cjs');
const FIXTURES = path.join(__dirname, 'fixtures');
const fixture = (name) => path.join(FIXTURES, name);

function loadChecker() {
  return require(CHECKER);
}

function run(projectRoot, extraArgs = []) {
  const result = spawnSync('node', [CHECKER, projectRoot, ...extraArgs], { encoding: 'utf8' });
  return {
    code: result.status,
    output: `${result.stdout || ''}${result.stderr || ''}`,
    stdout: result.stdout || '',
  };
}

function runJson(projectRoot) {
  const result = run(projectRoot, ['--json']);
  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`--json 輸出無法解析（exit ${result.code}）：\n${result.output}`);
  }
  return { ...result, json };
}

function snapshotTree(root) {
  const files = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else files.push([path.relative(root, absolute), fs.readFileSync(absolute, 'utf8')]);
    }
  };
  visit(root);
  return files;
}

test('parseFrontmatter：解析單行 id 與 related_prd，並保留 body', () => {
  const { parseFrontmatter } = loadChecker();
  const parsed = parseFrontmatter('---\nid: "SPEC-001"\nrelated_prd: PRD-001\n---\n# 登入\n');

  assert.deepStrictEqual(parsed.frontmatter, { id: 'SPEC-001', related_prd: 'PRD-001' });
  assert.strictEqual(parsed.body, '# 登入\n');
});

test('scanFormalDocuments：遞迴掃描正式目錄，忽略 README 與 *-TEMPLATE.md，結果依路徑排序', () => {
  const { scanFormalDocuments } = loadChecker();
  const documents = scanFormalDocuments(fixture('valid-project'));

  assert.deepStrictEqual(
    documents.map((document) => document.file),
    [
      'docs/01-prd/PRD-001-authentication.md',
      'docs/01-prd/PRD-002-payments.md',
      'docs/02-spec/SPEC-001-login.md',
      'docs/02-spec/SPEC-002-logout.md',
      'docs/02-spec/SPEC-003-card-payment.md',
    ]
  );
});

test('有效文件：errors 為空，PRD-to-SPEC 關聯依 PRD 與 SPEC ID 排序', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('valid-project'));

  assert.deepStrictEqual(result.errors, []);
  assert.deepStrictEqual(result.prd_to_specs, [
    { prd_id: 'PRD-001', spec_ids: ['SPEC-001', 'SPEC-002'] },
    { prd_id: 'PRD-002', spec_ids: ['SPEC-003'] },
  ]);
});

test('同一正式 ID 出現在兩個檔案：回報 duplicate-id 並列出排序後檔案', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('duplicate-id-project'));
  const duplicate = result.errors.find((error) => error.code === 'duplicate-id');

  assert.ok(duplicate, `應回報 duplicate-id，實際=${JSON.stringify(result.errors)}`);
  assert.strictEqual(duplicate.id, 'PRD-001');
  assert.deepStrictEqual(duplicate.files, [
    'docs/01-prd/PRD-001-alpha.md',
    'docs/01-prd/PRD-001-beta.md',
  ]);
});

test('frontmatter id 與檔名 ID 不一致：回報 id-mismatch', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('id-mismatch-project'));
  const mismatch = result.errors.find((error) => error.code === 'id-mismatch');

  assert.ok(mismatch, `應回報 id-mismatch，實際=${JSON.stringify(result.errors)}`);
  assert.strictEqual(mismatch.filename_id, 'PRD-001');
  assert.strictEqual(mismatch.frontmatter_id, 'PRD-002');
});

test('SPEC 缺 related_prd 或指向不存在 PRD：兩種錯誤都會回報', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('missing-prd-project'));

  assert.ok(result.errors.some((error) => error.code === 'missing-related-prd'));
  assert.ok(result.errors.some((error) => error.code === 'unknown-related-prd' && error.related_prd === 'PRD-999'));
});

test('非法正式文件檔名：回報 invalid-filename，README 與模板不誤報', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('invalid-filename-project'));

  assert.deepStrictEqual(result.errors.map((error) => error.code), ['invalid-filename']);
  assert.strictEqual(result.errors[0].file, 'docs/01-prd/product-notes.md');
});

test('docs/04-specs 下任何 Markdown 都是 legacy-document，且檢查不修改檔案', () => {
  const projectRoot = fixture('legacy-project');
  const before = snapshotTree(projectRoot);
  const { analyze } = loadChecker();
  const result = analyze(projectRoot);
  const after = snapshotTree(projectRoot);

  assert.deepStrictEqual(result.errors.map((error) => error.code), ['legacy-document']);
  assert.strictEqual(result.errors[0].file, 'docs/04-specs/nested/README.md');
  assert.deepStrictEqual(after, before, '檢查器只能讀取，不可搬移、改名、刪除或改寫文件');
});

test('errors 依 file、code 與訊息穩定排序，同輸入連跑 JSON 完全一致', () => {
  const { analyze } = loadChecker();
  const projectRoot = fixture('ordering-project');
  const result = analyze(projectRoot);
  const sorted = [...result.errors].sort((a, b) =>
    `${a.file || ''}\u0000${a.code}\u0000${a.message}`.localeCompare(
      `${b.file || ''}\u0000${b.code}\u0000${b.message}`
    )
  );

  assert.deepStrictEqual(result.errors, sorted);
  assert.strictEqual(run(projectRoot, ['--json']).stdout, run(projectRoot, ['--json']).stdout);
});

test('CLI --json：有效文件 exit 0，有契約錯誤 exit 1', () => {
  const valid = runJson(fixture('valid-project'));
  const invalid = runJson(fixture('invalid-project'));

  assert.strictEqual(valid.code, 0, `有效專案應 exit 0，實際=${valid.code}\n${valid.output}`);
  assert.deepStrictEqual(valid.json.errors, []);
  assert.strictEqual(invalid.code, 1, `契約錯誤應 exit 1，實際=${invalid.code}\n${invalid.output}`);
  assert.ok(invalid.json.errors.length > 0);
});

test('CLI：缺少或不存在 project-root 時 exit 1', () => {
  const missingArg = spawnSync('node', [CHECKER], { encoding: 'utf8' });
  const missingRoot = run(fixture('does-not-exist'), ['--json']);

  assert.strictEqual(missingArg.status, 1);
  assert.strictEqual(missingRoot.code, 1);
});
