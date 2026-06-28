// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-28
// 功能：以真實子行程黑箱執行 check-context-growth.cjs，證明四個偵測「該響時會響、不該響時會閉嘴」
//        （mutation testing 精神，design.md §5.5）：畢業/術語/SPEC缺口/SYSTEM 各自正反兩面 + clean 全空。

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const CHECKER = path.join(__dirname, 'check-context-growth.cjs');
const SAMPLE = path.join(__dirname, 'fixtures', 'sample-project');
const CLEAN = path.join(__dirname, 'fixtures', 'clean-project');

// 實際 spawn 跑 checker；execFileSync 在非零 exit 會 throw，從 err 取 status 與輸出
function run(args) {
  try {
    const stdout = execFileSync('node', [CHECKER, ...args], { encoding: 'utf8' });
    return { code: 0, output: stdout };
  } catch (err) {
    return { code: err.status, output: (err.stdout || '') + (err.stderr || '') };
  }
}

// 跑 --json 模式並解析四 bucket
function runJson(projectRoot) {
  const { code, output } = run([projectRoot, '--json']);
  assert.strictEqual(code, 0, `--json 模式應 exit 0，實際 ${code}\n輸出:\n${output}`);
  return JSON.parse(output);
}

const slugsOf = (arr) => arr.map((c) => c.slug);
const termsOf = (arr) => arr.map((c) => c.term);
const modulesOf = (arr) => arr.map((c) => c.module);

// ── 檢查 1：graduation ──────────────────────────────────────────────────────────
test('graduation：strikes=2 的 lesson → 出現在 graduation_candidates', () => {
  const r = runJson(SAMPLE);
  assert.ok(
    slugsOf(r.graduation_candidates).includes('subagent-git-needs-worktree-isolation'),
    `strikes=2 應列為畢業候選，實際=${JSON.stringify(slugsOf(r.graduation_candidates))}`
  );
});

test('graduation：strikes=1 的 lesson → 不出現（門檻 2）', () => {
  const r = runJson(SAMPLE);
  assert.ok(
    !slugsOf(r.graduation_candidates).includes('prefer-absolute-paths-in-subagent-bash'),
    'strikes=1 未達門檻，不該列為畢業候選'
  );
});

test('graduation：候選帶 strikes 與 summary 欄位', () => {
  const r = runJson(SAMPLE);
  const c = r.graduation_candidates.find(
    (x) => x.slug === 'subagent-git-needs-worktree-isolation'
  );
  assert.strictEqual(c.strikes, 2, 'strikes 應解析為 2');
  assert.match(c.summary, /worktree 隔離/, `summary 應取自 ## 摘要 段，實際=${c.summary}`);
});

// ── 檢查 2：glossary ────────────────────────────────────────────────────────────
test('glossary：不在 GLOSSARY 的術語 segment_rule → 出現在 glossary_candidates', () => {
  const r = runJson(SAMPLE);
  assert.ok(
    termsOf(r.glossary_candidates).includes('segment_rule'),
    `未收錄術語應列候選，實際=${JSON.stringify(termsOf(r.glossary_candidates))}`
  );
});

test('glossary：已在 GLOSSARY 的術語 cora_id → 不出現（即使 module 用到）', () => {
  const r = runJson(SAMPLE);
  assert.ok(
    !termsOf(r.glossary_candidates).includes('cora_id'),
    '已收錄術語不該列候選'
  );
});

test('glossary：非識別字 backtick term（BLOCK，無底線）→ 不出現（守住 isIdentifierTerm guard）', () => {
  const r = runJson(SAMPLE);
  // 反向變異測試：若 checker 刪掉 isIdentifierTerm 過濾，BLOCK 會混進候選 → 本案 fail
  assert.ok(
    !termsOf(r.glossary_candidates).includes('BLOCK'),
    `非 snake_case 的 backtick term 不該列術語候選，實際=${JSON.stringify(termsOf(r.glossary_candidates))}`
  );
});

test('glossary：候選帶 seen_in（來源檔相對路徑）', () => {
  const r = runJson(SAMPLE);
  const c = r.glossary_candidates.find((x) => x.term === 'segment_rule');
  assert.ok(Array.isArray(c.seen_in) && c.seen_in.length > 0, 'seen_in 應為非空陣列');
  assert.ok(
    c.seen_in.some((p) => p.includes('segmentation.md')),
    `seen_in 應含來源檔，實際=${JSON.stringify(c.seen_in)}`
  );
});

// ── 檢查 3：spec_coverage_gaps ──────────────────────────────────────────────────
test('spec-coverage：沒有 SPEC 涵蓋的 module segmentation → 出現在 spec_coverage_gaps', () => {
  const r = runJson(SAMPLE);
  assert.ok(
    modulesOf(r.spec_coverage_gaps).includes('segmentation'),
    `無 spec 的 module 應列缺口，實際=${JSON.stringify(modulesOf(r.spec_coverage_gaps))}`
  );
});

test('spec-coverage：有 SPEC 涵蓋的 module journey → 不出現', () => {
  const r = runJson(SAMPLE);
  assert.ok(
    !modulesOf(r.spec_coverage_gaps).includes('journey'),
    '有 spec 涵蓋的 module 不該列缺口'
  );
});

// ── 檢查 4：system_section_candidates ───────────────────────────────────────────
test('system-section：不在 SYSTEM 的 module segmentation → 出現在 system_section_candidates', () => {
  const r = runJson(SAMPLE);
  assert.ok(
    modulesOf(r.system_section_candidates).includes('segmentation'),
    `未在 SYSTEM 提及的 module 應列候選，實際=${JSON.stringify(modulesOf(r.system_section_candidates))}`
  );
});

test('system-section：在 SYSTEM 提到的 module journey → 不出現', () => {
  const r = runJson(SAMPLE);
  assert.ok(
    !modulesOf(r.system_section_candidates).includes('journey'),
    'SYSTEM 已提及的 module 不該列候選'
  );
});

// ── clean-project：不該響時閉嘴 ─────────────────────────────────────────────────
test('clean-project：四個 bucket 全空 + exit 0（不該響時閉嘴）', () => {
  const r = runJson(CLEAN);
  assert.deepStrictEqual(r.graduation_candidates, [], 'clean：graduation 應為空');
  assert.deepStrictEqual(r.glossary_candidates, [], 'clean：glossary 應為空');
  assert.deepStrictEqual(r.spec_coverage_gaps, [], 'clean：spec_coverage_gaps 應為空');
  assert.deepStrictEqual(r.system_section_candidates, [], 'clean：system_section_candidates 應為空');
});

// ── 預設報告（非 --json）────────────────────────────────────────────────────────
test('預設報告（無 --json）→ 含四區標題 + 「只報告不攔截」字樣 + exit 0', () => {
  const { code, output } = run([SAMPLE]);
  assert.strictEqual(code, 0, `報告應 exit 0，實際 ${code}\n輸出:\n${output}`);
  assert.match(output, /只報告不攔截/, '開頭應標明 Phase 1 只報告不攔截');
  assert.match(output, /一、畢業候選/, '應含畢業候選分區');
  assert.match(output, /二、術語候選/, '應含術語候選分區');
  assert.match(output, /三、SPEC 覆蓋缺口/, '應含 SPEC 覆蓋缺口分區');
  assert.match(output, /四、SYSTEM 章節候選/, '應含 SYSTEM 章節候選分區');
});

// ── 確定性：同輸入連跑兩次輸出一致 ──────────────────────────────────────────────
test('確定性：同一專案連跑兩次，JSON 輸出完全一致', () => {
  const a = run([SAMPLE, '--json']).output;
  const b = run([SAMPLE, '--json']).output;
  assert.strictEqual(a, b, '確定性偵測器同輸入應產生相同輸出');
});

// ── 唯一非 0 出口：project-root 不存在 ──────────────────────────────────────────
test('project-root 不存在 → exit 1（報告以外唯一的非 0 出口）', () => {
  const { code } = run([path.join(__dirname, 'fixtures', '不存在的專案')]);
  assert.strictEqual(code, 1, `不存在的 project-root 應 exit 1，實際 ${code}`);
});

test('完全不給 project-root 參數 → exit 1（缺必填參數）', () => {
  const { code } = run([]);
  assert.strictEqual(code, 1, `缺 project-root 參數應 exit 1，實際 ${code}`);
});
