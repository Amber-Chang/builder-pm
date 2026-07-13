// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-28
// 功能：知識層成長偵測器 Phase 1——掃專案 .context / .governance / docs，產出「哪些知識該補了」
//        四 bucket 報告（畢業雷 / 新術語 / SPEC 缺口 / SYSTEM 章節），完全確定性、只報告不攔截。

'use strict';

const fs = require('fs');
const path = require('path');

// 畢業門檻：lesson 的 strikes 累積到此值 → 該長成 convention（與 anti-bloat 同走常數可調）
const GRADUATION_STRIKES_THRESHOLD = 2;

// ── 讀檔小工具（全程靜態讀檔，不碰 Date.now() / new Date() / Math.random()，確保確定性）──
function readFileSafe(absPath) {
  try {
    return fs.readFileSync(absPath, 'utf8');
  } catch (err) {
    return null; // 缺檔/讀不到 → 視為「沒有」，不讓單檔缺漏炸掉整份報告
  }
}

// 列某目錄底下、副檔名命中的檔（不遞迴）；目錄不存在 → []。回傳排序後絕對路徑，確保確定性
function listFiles(dir, exts) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && exts.includes(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(dir, e.name))
    .sort();
}

// 遞迴列出某目錄下所有命中副檔名的檔（docs/**/*.md 用），回傳排序後絕對路徑
function walkFiles(dir, exts) {
  const out = [];
  const visit = (d) => {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch (err) {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) visit(full);
      else if (e.isFile() && exts.includes(path.extname(e.name).toLowerCase())) out.push(full);
    }
  };
  visit(dir);
  return out.sort();
}

// 專案內相對路徑（一律 posix 斜線），讓報告/JSON 在不同機器上輸出一致
function relPath(projectRoot, absPath) {
  return path.relative(projectRoot, absPath).split(path.sep).join('/');
}

const isNonEmptyString = (s) => typeof s === 'string' && s.trim().length > 0;

// ── frontmatter / section 解析（與 learning-capture 同一份 lesson 格式，兩 loop 才能組合）──
function parseScalar(val) {
  const v = val.trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (inner === '') return [];
    return inner
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter((s) => s.length > 0);
  }
  const unq = v.replace(/^["']|["']$/g, '');
  if (/^-?\d+$/.test(unq)) return Number(unq);
  return unq;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { frontmatter: null, body: content };
  const body = content.slice(m[0].length);
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!mm) continue;
    fm[mm[1]] = parseScalar(mm[2]);
  }
  return { frontmatter: fm, body };
}

function parseSections(body) {
  const sections = {};
  let current = null;
  let buf = [];
  const flush = () => {
    if (current !== null) sections[current] = buf.join('\n').trim();
  };
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      flush();
      current = m[1].trim();
      buf = [];
    } else if (current !== null) {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

// 把多行壓成單行（報告/JSON 的 summary 用），避免換行污染輸出
function oneLine(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}

// 抽出一段文字裡所有 backtick 包住的內容（去重前的原始 token）
function extractBacktickTerms(text) {
  const out = [];
  const re = /`([^`\n]+)`/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1].trim());
  return out;
}

// 像識別字的術語：英數+底線、字母開頭、且至少含一個底線（snake_case，如 cora_id / event_type）
function isIdentifierTerm(term) {
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(term) && term.includes('_');
}

// ── 檢查 1：graduation_candidates（信心 A）──────────────────────────────────────
// 讀 .governance/lessons/*.md，strikes >= 門檻 → 該畢業成 convention 的雷
function checkGraduation(projectRoot) {
  const lessonsDir = path.join(projectRoot, '.governance', 'lessons');
  const candidates = [];
  for (const file of listFiles(lessonsDir, ['.md'])) {
    const content = readFileSafe(file);
    if (content === null) continue;
    const { frontmatter, body } = parseFrontmatter(content);
    const fm = frontmatter || {};
    const strikes = typeof fm.strikes === 'number' ? fm.strikes : 0;
    if (strikes < GRADUATION_STRIKES_THRESHOLD) continue;

    const sections = parseSections(body);
    let summary = '';
    if (isNonEmptyString(sections['摘要'])) summary = oneLine(sections['摘要']);
    else if (isNonEmptyString(fm.summary)) summary = oneLine(fm.summary);

    const slug = isNonEmptyString(fm.slug) ? fm.slug : path.basename(file, '.md');
    candidates.push({ slug, strikes, summary });
  }
  return candidates;
}

// ── 檢查 2：glossary_candidates（信心 A·有噪音，只列候選給人 triage）──────────────
// .context/modules/*.md + docs/**/*.md 抽 backtick 識別字術語，減掉 GLOSSARY 已收錄者
function checkGlossary(projectRoot) {
  // GLOSSARY 已收錄術語（用 backtick 包，不限識別字 pattern，純做集合扣除）
  const known = new Set();
  const glossaryContent = readFileSafe(path.join(projectRoot, '.context', 'GLOSSARY.md'));
  if (glossaryContent !== null) {
    for (const t of extractBacktickTerms(glossaryContent)) known.add(t);
  }

  // 來源檔：modules + docs 遞迴
  const sources = [
    ...listFiles(path.join(projectRoot, '.context', 'modules'), ['.md']),
    ...walkFiles(path.join(projectRoot, 'docs'), ['.md']),
  ];

  // term -> 出現過的相對路徑集合
  const seen = new Map();
  for (const file of sources) {
    const content = readFileSafe(file);
    if (content === null) continue;
    const rel = relPath(projectRoot, file);
    for (const term of extractBacktickTerms(content)) {
      if (!isIdentifierTerm(term)) continue;
      if (known.has(term)) continue; // 已在 GLOSSARY → 不是候選
      if (!seen.has(term)) seen.set(term, new Set());
      seen.get(term).add(rel);
    }
  }

  return [...seen.keys()]
    .sort()
    .map((term) => ({ term, seen_in: [...seen.get(term)].sort() }));
}

// ── 檢查 3：spec_coverage_gaps（信心 B·proxy）─────────────────────────────────────
// 每個 .context/modules/<name>.md，若沒有任何 SPEC 的「檔名或內容」提到 module name → gap
function checkSpecCoverage(projectRoot) {
  const moduleFiles = listFiles(path.join(projectRoot, '.context', 'modules'), ['.md']);
  if (moduleFiles.length === 0) return [];

  // 預載所有 spec 的檔名 + 內容（小寫），避免每個 module 重讀
  const specFiles = listFiles(path.join(projectRoot, 'docs', '02-spec'), ['.md', '.yaml'])
    .filter((file) => /^SPEC-\d{3}-[a-z0-9-]+\.(?:md|yaml)$/.test(path.basename(file)));
  const specs = specFiles.map((file) => ({
    nameLc: path.basename(file).toLowerCase(),
    contentLc: (readFileSafe(file) || '').toLowerCase(),
  }));

  const gaps = [];
  for (const file of moduleFiles) {
    const module = path.basename(file, '.md');
    const needle = module.toLowerCase();
    const covered = specs.some((s) => s.nameLc.includes(needle) || s.contentLc.includes(needle));
    if (!covered) {
      gaps.push({
        module,
        reason: '(proxy) 沒有任何 docs/02-spec/SPEC-* 的檔名或內容提到此 module',
      });
    }
  }
  return gaps;
}

// ── 檢查 4：system_section_candidates（信心 C·proxy·低信心）───────────────────────
// 每個 module，若 .context/SYSTEM.md 內文沒提到 module name → 可能該補一節
// ⚠️ SYSTEM「重大結構決策」本質是判斷題、無法可靠自動偵測，這裡只給 proxy 提醒、不假裝能做到
function checkSystemSection(projectRoot) {
  const moduleFiles = listFiles(path.join(projectRoot, '.context', 'modules'), ['.md']);
  if (moduleFiles.length === 0) return [];

  const systemContent = readFileSafe(path.join(projectRoot, '.context', 'SYSTEM.md'));
  const systemLc = (systemContent || '').toLowerCase();

  const candidates = [];
  for (const file of moduleFiles) {
    const module = path.basename(file, '.md');
    if (!systemLc.includes(module.toLowerCase())) candidates.push({ module });
  }
  return candidates;
}

// ── 彙整四 bucket ───────────────────────────────────────────────────────────────
function analyze(projectRoot) {
  return {
    graduation_candidates: checkGraduation(projectRoot),
    glossary_candidates: checkGlossary(projectRoot),
    spec_coverage_gaps: checkSpecCoverage(projectRoot),
    system_section_candidates: checkSystemSection(projectRoot),
  };
}

// ── 人類可讀報告（繁中）──────────────────────────────────────────────────────────
function renderReport(projectRoot, result) {
  const lines = [];
  lines.push('知識層成長報告（Context Growth Report）');
  lines.push('Phase 1 · 確定性偵測 · 只報告不攔截');
  lines.push(`掃描根目錄：${projectRoot}`);
  lines.push('');

  const section = (title, items, lineFn) => {
    lines.push(title);
    if (items.length === 0) lines.push('  （無）');
    else for (const it of items) lines.push(`  - ${lineFn(it)}`);
    lines.push('');
  };

  section(
    '一、畢業候選（graduation · 信心 A · 該長成 convention 的雷）',
    result.graduation_candidates,
    (c) => `${c.slug}　strikes=${c.strikes}${c.summary ? `　｜ ${c.summary}` : ''}`
  );

  section(
    '二、術語候選（glossary · 信心 A · 有噪音，交 PM triage）',
    result.glossary_candidates,
    (c) => `${c.term}　（見：${c.seen_in.join('、')}）`
  );

  section(
    '三、SPEC 覆蓋缺口（spec coverage · 信心 B · proxy）',
    result.spec_coverage_gaps,
    (g) => `${g.module}　${g.reason}`
  );

  section(
    '四、SYSTEM 章節候選（信心 C · proxy · 低信心，無法可靠自動偵測）',
    result.system_section_candidates,
    (s) => `${s.module}　SYSTEM.md 未提及此 module，可能該補一節`
  );

  lines.push(
    `摘要：${result.graduation_candidates.length} 畢業 / ${result.glossary_candidates.length} 術語 / ` +
      `${result.spec_coverage_gaps.length} SPEC 缺口 / ${result.system_section_candidates.length} SYSTEM 章節`
  );
  return lines.join('\n');
}

// ── 參數解析 + 進入點 ────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const rest = argv.slice(2);
  const jsonMode = rest.includes('--json');
  const positional = rest.filter((a) => a !== '--json');
  return { jsonMode, projectRoot: positional[0] };
}

function main(argv) {
  const { jsonMode, projectRoot } = parseArgs(argv);
  if (!projectRoot) {
    console.error('用法：node check-context-growth.cjs <project-root> [--json]');
    return 1; // 缺 project-root 參數
  }

  const resolved = path.resolve(process.cwd(), projectRoot);
  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch (err) {
    console.error(`讀取 project-root 失敗（${projectRoot}）：${err.code || err.message}`);
    return 1; // project-root 不存在/讀不到——唯一非 0 出口
  }
  if (!stat.isDirectory()) {
    console.error(`project-root 不是目錄（${projectRoot}）`);
    return 1;
  }

  const result = analyze(resolved);

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderReport(resolved, result));
  }

  // 迴圈/報告，不是關卡 → 永遠 exit 0
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv));
}

module.exports = {
  parseFrontmatter,
  parseSections,
  extractBacktickTerms,
  isIdentifierTerm,
  checkGraduation,
  checkGlossary,
  checkSpecCoverage,
  checkSystemSection,
  analyze,
  renderReport,
  parseArgs,
  main,
  GRADUATION_STRIKES_THRESHOLD,
};
