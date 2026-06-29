// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-29
// 功能：以真實子行程黑箱執行 scan-evidence.cjs，證明 11 個測試案例（§4.4 spec）全部通過。
//        TDD 紀律：先寫測試（RED），再寫 scanner 讓它綠。

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SCANNER = path.join(__dirname, 'scan-evidence.cjs');
const FIXTURE_SAMPLE = path.join(__dirname, 'fixtures', 'sample-project');
const FIXTURE_NO_GIT = path.join(__dirname, 'fixtures', 'no-git-project');
const FIXTURE_EMPTY = path.join(__dirname, 'fixtures', 'empty-project');

// 遞迴複製目錄（fixture → 臨時目錄，讓 scanner 可寫入 .context/.backfill/）
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(src, e.name);
    const destPath = path.join(dest, e.name);
    if (e.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 跑 scanner + 讀 evidence.json，回傳 { code, output, evidence }
function runAndReadEvidence(projectPath) {
  let code = 0;
  let output = '';
  try {
    output = execFileSync('node', [SCANNER, projectPath], { encoding: 'utf8' });
  } catch (err) {
    code = err.status || 1;
    output = (err.stdout || '') + (err.stderr || '');
    return { code, output, evidence: null };
  }
  const evidencePath = path.join(projectPath, '.context', '.backfill', 'evidence.json');
  let evidence = null;
  try {
    evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  } catch (err) {
    // 讀不到 evidence.json → evidence=null，讓斷言報錯
  }
  return { code, output, evidence };
}

// 執行 scanner（只取 exit code，不讀 evidence）
function run(args) {
  try {
    const stdout = execFileSync('node', [SCANNER, ...args], { encoding: 'utf8' });
    return { code: 0, output: stdout };
  } catch (err) {
    return { code: err.status || 1, output: (err.stdout || '') + (err.stderr || '') };
  }
}

// ── 結構驗證（sample-project fixture）──────────────────────────────────────────

test('1. module_tree 含 segmentation module，有 file_count > 0 + languages 陣列', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-evidence-test-'));
  try {
    copyDirSync(FIXTURE_SAMPLE, tmpDir);
    const { code, evidence } = runAndReadEvidence(tmpDir);
    assert.strictEqual(code, 0, `scanner 應 exit 0，實際 ${code}`);
    assert.ok(evidence, 'evidence.json 應存在');
    const seg = evidence.module_tree.find((m) => m.name === 'segmentation');
    assert.ok(seg, `module_tree 應含 segmentation，實際=${JSON.stringify(evidence.module_tree.map((m) => m.name))}`);
    assert.ok(seg.file_count > 0, `segmentation.file_count 應 > 0，實際=${seg.file_count}`);
    assert.ok(Array.isArray(seg.languages) && seg.languages.length > 0, `segmentation.languages 應為非空陣列，實際=${JSON.stringify(seg.languages)}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('2. terms 含高頻識別字 journey_id，每筆有 frequency + samples[].file + samples[].line', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-evidence-test-'));
  try {
    copyDirSync(FIXTURE_SAMPLE, tmpDir);
    const { code, evidence } = runAndReadEvidence(tmpDir);
    assert.strictEqual(code, 0, `scanner 應 exit 0，實際 ${code}`);
    assert.ok(evidence, 'evidence.json 應存在');
    const term = evidence.terms.find((t) => t.term === 'journey_id');
    assert.ok(term, `terms 應含 journey_id，實際=${JSON.stringify(evidence.terms.map((t) => t.term).slice(0, 10))}`);
    assert.ok(typeof term.frequency === 'number' && term.frequency > 0, `journey_id.frequency 應 > 0，實際=${term.frequency}`);
    assert.ok(Array.isArray(term.samples) && term.samples.length > 0, `journey_id.samples 應非空`);
    assert.ok(typeof term.samples[0].file === 'string', `samples[0].file 應為字串`);
    assert.ok(typeof term.samples[0].line === 'number', `samples[0].line 應為數字`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('3. docs 含 README，有 title="Journey Engine" + first_sentence（非空字串）', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-evidence-test-'));
  try {
    copyDirSync(FIXTURE_SAMPLE, tmpDir);
    const { code, evidence } = runAndReadEvidence(tmpDir);
    assert.strictEqual(code, 0, `scanner 應 exit 0，實際 ${code}`);
    assert.ok(evidence, 'evidence.json 應存在');
    const readme = evidence.docs.find((d) => d.path === 'README.md');
    assert.ok(readme, `docs 應含 README.md，實際=${JSON.stringify(evidence.docs.map((d) => d.path))}`);
    assert.strictEqual(readme.title, 'Journey Engine', `README title 應為 "Journey Engine"，實際="${readme.title}"`);
    assert.ok(typeof readme.first_sentence === 'string' && readme.first_sentence.trim().length > 0, `README first_sentence 應為非空字串，實際="${readme.first_sentence}"`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('4. external_integrations 從 package.json 推出 @aws-sdk/client-ses，inferred_kind="email/SES"', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-evidence-test-'));
  try {
    copyDirSync(FIXTURE_SAMPLE, tmpDir);
    const { code, evidence } = runAndReadEvidence(tmpDir);
    assert.strictEqual(code, 0, `scanner 應 exit 0，實際 ${code}`);
    assert.ok(evidence, 'evidence.json 應存在');
    const ses = evidence.external_integrations.find((i) => i.name === '@aws-sdk/client-ses');
    assert.ok(ses, `external_integrations 應含 @aws-sdk/client-ses，實際=${JSON.stringify(evidence.external_integrations.map((i) => i.name))}`);
    assert.strictEqual(ses.inferred_kind, 'email/SES', `inferred_kind 應為 "email/SES"，實際="${ses.inferred_kind}"`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('5. schema_version/limits/sources_present/truncation 欄位齊全', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-evidence-test-'));
  try {
    copyDirSync(FIXTURE_SAMPLE, tmpDir);
    const { code, evidence } = runAndReadEvidence(tmpDir);
    assert.strictEqual(code, 0, `scanner 應 exit 0，實際 ${code}`);
    assert.ok(evidence, 'evidence.json 應存在');
    assert.strictEqual(evidence.schema_version, 1, `schema_version 應為 1`);
    assert.ok(evidence.limits, 'limits 欄位應存在');
    assert.ok(typeof evidence.limits.module_top_n === 'number', 'limits.module_top_n 應為數字');
    assert.ok(evidence.sources_present, 'sources_present 欄位應存在');
    assert.ok(typeof evidence.sources_present.git === 'boolean', 'sources_present.git 應為 boolean');
    assert.ok(typeof evidence.sources_present.docs === 'boolean', 'sources_present.docs 應為 boolean');
    assert.ok(evidence.truncation, 'truncation 欄位應存在');
    assert.ok(typeof evidence.truncation.modules_truncated === 'boolean', 'truncation.modules_truncated 應為 boolean');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── 降級驗證 ───────────────────────────────────────────────────────────────────

test('6. no-git-project → sources_present.git=false, git_log=[], exit 0', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-evidence-test-'));
  try {
    copyDirSync(FIXTURE_NO_GIT, tmpDir);
    const { code, evidence } = runAndReadEvidence(tmpDir);
    assert.strictEqual(code, 0, `scanner 應 exit 0，實際 ${code}`);
    assert.ok(evidence, 'evidence.json 應存在');
    assert.strictEqual(evidence.sources_present.git, false, `sources_present.git 應為 false（no-git-project）`);
    assert.deepStrictEqual(evidence.git_log, [], `git_log 應為空陣列，實際=${JSON.stringify(evidence.git_log)}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('7. empty-project → docs=[], sources_present.docs=false, exit 0', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-evidence-test-'));
  try {
    copyDirSync(FIXTURE_EMPTY, tmpDir);
    const { code, evidence } = runAndReadEvidence(tmpDir);
    assert.strictEqual(code, 0, `scanner 應 exit 0，實際 ${code}`);
    assert.ok(evidence, 'evidence.json 應存在');
    assert.deepStrictEqual(evidence.docs, [], `empty-project docs 應為空陣列，實際=${JSON.stringify(evidence.docs)}`);
    assert.strictEqual(evidence.sources_present.docs, false, `sources_present.docs 應為 false`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('8. empty-project → evidence 結構完整（schema_version/limits/sources_present/truncation），各陣列空，exit 0', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-evidence-test-'));
  try {
    copyDirSync(FIXTURE_EMPTY, tmpDir);
    const { code, evidence } = runAndReadEvidence(tmpDir);
    assert.strictEqual(code, 0, `scanner 應 exit 0，實際 ${code}`);
    assert.ok(evidence, 'evidence.json 應存在');
    assert.strictEqual(evidence.schema_version, 1, 'schema_version 應存在');
    assert.ok(evidence.limits, 'limits 應存在');
    assert.ok(evidence.sources_present, 'sources_present 應存在');
    assert.ok(evidence.truncation, 'truncation 應存在');
    assert.deepStrictEqual(evidence.module_tree, [], `module_tree 應為空陣列`);
    assert.deepStrictEqual(evidence.terms, [], `terms 應為空陣列`);
    assert.deepStrictEqual(evidence.docs, [], `docs 應為空陣列`);
    assert.deepStrictEqual(evidence.git_log, [], `git_log 應為空陣列`);
    assert.deepStrictEqual(evidence.external_integrations, [], `external_integrations 應為空陣列`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── 框上限驗證 ─────────────────────────────────────────────────────────────────

test('9. 21 個 module → module_tree.length=20, truncation.modules_truncated=true', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-evidence-test-'));
  try {
    // 建 21 個模組目錄，每個放一個 .ts 檔
    for (let i = 1; i <= 21; i++) {
      const modDir = path.join(tmpDir, 'src', `module${String(i).padStart(2, '0')}`);
      fs.mkdirSync(modDir, { recursive: true });
      fs.writeFileSync(path.join(modDir, 'index.ts'), `export const mod${i} = ${i};\n`);
    }
    const { code, evidence } = runAndReadEvidence(tmpDir);
    assert.strictEqual(code, 0, `scanner 應 exit 0，實際 ${code}`);
    assert.ok(evidence, 'evidence.json 應存在');
    assert.strictEqual(evidence.module_tree.length, 20, `module_tree 應被截為 20，實際=${evidence.module_tree.length}`);
    assert.strictEqual(evidence.truncation.modules_truncated, true, `truncation.modules_truncated 應為 true`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── 確定性驗證 ─────────────────────────────────────────────────────────────────

test('10. 同一 fixture 同一 tmpdir 連跑兩次 → evidence.json 位元一致', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-evidence-test-'));
  try {
    copyDirSync(FIXTURE_SAMPLE, tmpDir);
    // 第一次
    runAndReadEvidence(tmpDir);
    const evidencePath = path.join(tmpDir, '.context', '.backfill', 'evidence.json');
    const first = fs.readFileSync(evidencePath, 'utf8');
    // 第二次（同一 tmpDir，scanner 覆寫 evidence.json）
    runAndReadEvidence(tmpDir);
    const second = fs.readFileSync(evidencePath, 'utf8');
    assert.strictEqual(first, second, '確定性：同輸入連跑兩次 evidence.json 應位元一致');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── 錯誤路徑 ───────────────────────────────────────────────────────────────────

test('11. 不存在路徑 → exit 非 0', () => {
  const { code } = run([path.join(__dirname, 'fixtures', 'this-path-does-not-exist-12345')]);
  assert.notStrictEqual(code, 0, `不存在的路徑應 exit 非 0，實際=${code}`);
});

// ── 缺陷修正驗收（新增案）─────────────────────────────────────────────────────

test('12（缺陷 1）新整合白名單：含 @supabase/、posthog-js，不含框架 react，仍含 @aws-sdk/client-ses', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-evidence-test-'));
  try {
    copyDirSync(FIXTURE_SAMPLE, tmpDir);
    const { code, evidence } = runAndReadEvidence(tmpDir);
    assert.strictEqual(code, 0, `scanner 應 exit 0，實際 ${code}`);
    assert.ok(evidence, 'evidence.json 應存在');
    const supabase = evidence.external_integrations.find((i) => i.name === '@supabase/supabase-js');
    assert.ok(supabase, `external_integrations 應含 @supabase/supabase-js，實際=${JSON.stringify(evidence.external_integrations.map((i) => i.name))}`);
    assert.strictEqual(supabase.inferred_kind, 'backend/Supabase', `inferred_kind 應為 "backend/Supabase"，實際="${supabase.inferred_kind}"`);
    const posthog = evidence.external_integrations.find((i) => i.name === 'posthog-js');
    assert.ok(posthog, `external_integrations 應含 posthog-js，實際=${JSON.stringify(evidence.external_integrations.map((i) => i.name))}`);
    assert.strictEqual(posthog.inferred_kind, 'analytics/PostHog', `inferred_kind 應為 "analytics/PostHog"，實際="${posthog.inferred_kind}"`);
    const reactEntry = evidence.external_integrations.find((i) => i.name === 'react');
    assert.strictEqual(reactEntry, undefined, `external_integrations 不應含 react（框架非外部服務）`);
    const ses = evidence.external_integrations.find((i) => i.name === '@aws-sdk/client-ses');
    assert.ok(ses, `external_integrations 仍應含 @aws-sdk/client-ses`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('13（缺陷 2）掃描器在 .context/.backfill/ 內寫出 .gitignore，內容嚴格為 "*\\n"', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-evidence-test-'));
  try {
    copyDirSync(FIXTURE_SAMPLE, tmpDir);
    const { code } = runAndReadEvidence(tmpDir);
    assert.strictEqual(code, 0, `scanner 應 exit 0，實際 ${code}`);
    const gitignorePath = path.join(tmpDir, '.context', '.backfill', '.gitignore');
    assert.ok(fs.existsSync(gitignorePath), `.gitignore 應存在於 .context/.backfill/，實際不存在`);
    const content = fs.readFileSync(gitignorePath, 'utf8');
    assert.strictEqual(content, '*\n', `.gitignore 內容應嚴格為 "*\\n"，實際="${content}"`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('14（缺陷 2 行為驗證）git add -A 後 git status --porcelain 不含 .context/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-evidence-test-'));
  try {
    execFileSync('git', ['-C', tmpDir, 'init', '-q']);
    copyDirSync(FIXTURE_SAMPLE, tmpDir);
    const { code } = runAndReadEvidence(tmpDir);
    assert.strictEqual(code, 0, `scanner 應 exit 0，實際 ${code}`);
    execFileSync('git', ['-C', tmpDir, 'add', '-A']);
    const status = execFileSync('git', ['-C', tmpDir, 'status', '--porcelain'], { encoding: 'utf8' });
    assert.ok(!status.includes('.context/'), `git status --porcelain 不應含 .context/，實際=\n${status}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
