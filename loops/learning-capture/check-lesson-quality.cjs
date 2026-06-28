// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-28
// 功能：學習捕捉引擎的品質閘 linter——給一則「草擬教訓」markdown，確定性檢查必填欄位 +
//        摘要長度 + class-level 命名 + Hermes「絕不記」反模式 → PASS/REJECT（GATE：REJECT=exit 1）。

'use strict';

const fs = require('fs');
const path = require('path');

// ── frontmatter 解析（最小 YAML，只認 key: value 與 [a, b] 陣列）──────────────
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

// ── body 區段解析（以 ## 標題切段，取段落內容並去頭尾空白）────────────────────
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

const isNonEmptyString = (s) => typeof s === 'string' && s.trim().length > 0;

// ── 反模式樣本（Hermes Do-NOT-capture 清單）────────────────────────────────────
// 負面工具斷言 → REJECT（指向某工具/功能說「壞了/不能用」）
const NEGATIVE_TOOL = [
  /壞了/,
  /不能用/,
  /無法使用/,
  /沒辦法用/,
  /用不了/,
  /doesn'?t work/i,
  /does not work/i,
  /is broken/i,
  /not working/i,
];
// 環境失敗當規則 → REJECT（除非「正解」段以裝/設…修法句呈現）
const ENV_FAILURE = [
  /command not found/i,
  /\bENOENT\b/,
  /沒裝/,
  /未安裝/,
  /缺[^。\n]{0,8}套件/,
  /沒設[^。\n]{0,8}憑證/,
  /not installed/i,
];
// 「正解」段若含這些修法動詞 → 視為 FIX，不擋環境失敗
const FIX_FRAMING = /(安裝|裝好|裝上|裝個|裝了|設定|設置|配置|install|設好)/i;
// 已解的暫時錯 → WARN（不擋）
const TRANSIENT = [
  /retry\s*後就好/i,
  /重試就(成功|好)/,
  /重整就好/,
  /重新整理就好/,
  /retry[^。\n]{0,6}(就好|成功)/i,
];

// ── 各檢查項 ───────────────────────────────────────────────────────────────────
function checkRequired(fm, sections, errors) {
  if (!isNonEmptyString(fm.slug)) errors.push('缺少必填 frontmatter 欄位：slug');

  if (!Array.isArray(fm.tags)) {
    errors.push('缺少必填 frontmatter 欄位：tags（需為非空字串陣列，如 [git, subagent]）');
  } else if (fm.tags.length === 0) {
    errors.push('tags 不可為空陣列，至少要有一個');
  }

  if (fm.severity === undefined) {
    errors.push('缺少必填 frontmatter 欄位：severity');
  } else if (!['low', 'medium', 'high'].includes(fm.severity)) {
    errors.push(`severity 必須是 low / medium / high 其一（目前：${fm.severity}）`);
  }

  if (fm.strikes === undefined) {
    errors.push('缺少必填 frontmatter 欄位：strikes');
  } else if (typeof fm.strikes !== 'number' || !Number.isInteger(fm.strikes)) {
    errors.push(`strikes 必須是整數（目前：${fm.strikes}）`);
  }

  for (const sec of ['摘要', '觸發情境', '正解']) {
    if (!isNonEmptyString(sections[sec])) {
      errors.push(`缺少 body 區段或內容為空：## ${sec}`);
    }
  }
}

function checkSummaryLength(sections, errors) {
  const summary = sections['摘要'];
  if (isNonEmptyString(summary)) {
    const len = [...summary.trim()].length; // 以字元（code point）計，非 byte，中文不誤算
    if (len > 120) errors.push(`摘要過長：${len} 字，必須 ≤ 120 字（一行精簡）`);
  }
}

function checkSlug(slug, errors) {
  if (!isNonEmptyString(slug)) return; // 缺 slug 由必填檢查負責
  const s = slug.trim();
  const signals = [];
  if (/#?\d{3,}/.test(s)) signals.push('含 issue/PR 號（3 位以上數字）');
  if (/pr-\d+/i.test(s)) signals.push('含 pr-<號>');
  if (/^(fix|debug|audit)-/i.test(s)) signals.push('以 fix-/debug-/audit- 開頭');
  if (/(today|今天|\d{4}-\d{2})/i.test(s)) signals.push('含 today/今天/日期');
  if (/(error|exception|enoent|undefined|traceback|stacktrace|segfault|panic|not-found)/i.test(s)) {
    signals.push('整串像錯誤字串');
  }
  if (signals.length > 0) {
    errors.push(
      `slug「${s}」命中 session-artifact 命名禁則（${signals.join('、')}）→ 教訓命名必須 class-level，` +
        `不可綁單次 session / issue（只對今天有意義的名字就是錯的）`
    );
  }
}

function checkBodyAntiPatterns(body, sections, errors, warnings) {
  for (const re of NEGATIVE_TOOL) {
    if (re.test(body)) {
      errors.push(
        `body 命中「對工具的負面斷言」反模式（${re.source}）→ 要記「修法」（裝什麼 / 設什麼），` +
          `不記「工具不能用」，否則會硬化成 agent 日後拒絕自己的藉口`
      );
      break;
    }
  }

  const fixFramed = FIX_FRAMING.test(sections['正解'] || '');
  for (const re of ENV_FAILURE) {
    if (re.test(body) && !fixFramed) {
      errors.push(
        `body 命中「環境失敗當規則」反模式（${re.source}）→ 環境問題 PM 自己能修、非耐久規則；` +
          `要記就把「正解」寫成 FIX（裝 / 設什麼）`
      );
      break;
    }
  }

  for (const re of TRANSIENT) {
    if (re.test(body)) {
      warnings.push(
        `body 命中「已解的暫時錯」訊號（${re.source}）→ 教訓應記 retry pattern（何時重試 / 重試幾次），` +
          `不是原本那個一次性錯誤（WARN，不擋）`
      );
      break;
    }
  }
}

// ── 主判定 ─────────────────────────────────────────────────────────────────────
function checkLesson(frontmatter, body, sections) {
  const errors = [];
  const warnings = [];
  const fm = frontmatter || {}; // 無 frontmatter → 必填全缺

  checkRequired(fm, sections, errors);
  checkSummaryLength(sections, errors);
  checkSlug(fm.slug, errors);
  checkBodyAntiPatterns(body, sections, errors, warnings);

  const verdict = errors.length > 0 ? 'reject' : 'pass';
  return { verdict, errors, warnings };
}

// ── 人類可讀報告（繁中）────────────────────────────────────────────────────────
function renderReport(lessonPath, result) {
  const lines = [];
  lines.push('教訓品質閘報告（Lesson Quality Gate）');
  lines.push(`檔案：${lessonPath}`);
  lines.push(
    `裁決：${result.verdict === 'reject' ? 'REJECT（不收，請修正下列錯誤）' : 'PASS（通過品質閘）'}`
  );
  lines.push('');

  lines.push(`❌ 錯誤（${result.errors.length} 筆，必須修正才收）`);
  if (result.errors.length === 0) lines.push('  （無）');
  else for (const e of result.errors) lines.push(`  - ${e}`);
  lines.push('');

  lines.push(`⚠️ 警告（${result.warnings.length} 筆，不擋，但建議調整）`);
  if (result.warnings.length === 0) lines.push('  （無）');
  else for (const w of result.warnings) lines.push(`  - ${w}`);
  lines.push('');

  if (result.verdict === 'pass' && result.warnings.length === 0) {
    lines.push('提示：欄位齊全、命名 class-level、無反模式 → 可收進 .governance/lessons/。');
  } else if (result.verdict === 'pass') {
    lines.push('提示：通過品質閘（WARN 不擋），但建議照警告調整後再收。');
  } else {
    lines.push('提示：修正上列錯誤後重跑；REJECT 不可收進 .governance/lessons/。');
  }
  return lines.join('\n');
}

// ── 參數解析 + 進入點 ──────────────────────────────────────────────────────────
function parseArgs(argv) {
  const rest = argv.slice(2);
  const jsonMode = rest.includes('--json');
  const positional = rest.filter((a) => a !== '--json');
  return { jsonMode, lessonPath: positional[0] };
}

function main(argv) {
  const { jsonMode, lessonPath } = parseArgs(argv);
  if (!lessonPath) {
    console.error('用法：node check-lesson-quality.cjs <lesson.md> [--json]');
    return 1; // 缺參數
  }

  const resolved = path.resolve(process.cwd(), lessonPath);
  let content;
  try {
    content = fs.readFileSync(resolved, 'utf8');
  } catch (err) {
    console.error(`讀取教訓檔失敗（${lessonPath}）：${err.code || err.message}`);
    return 1; // 缺檔/檔損毀——REJECT 以外唯一的非 0 出口
  }

  const { frontmatter, body } = parseFrontmatter(content);
  const sections = parseSections(body);
  const result = checkLesson(frontmatter, body, sections);

  if (jsonMode) {
    console.log(
      JSON.stringify(
        { verdict: result.verdict, errors: result.errors, warnings: result.warnings },
        null,
        2
      )
    );
  } else {
    console.log(renderReport(lessonPath, result));
  }

  // GATE：REJECT → exit 1；PASS（含 WARN）→ exit 0
  return result.verdict === 'reject' ? 1 : 0;
}

if (require.main === module) {
  process.exit(main(process.argv));
}

module.exports = {
  parseScalar,
  parseFrontmatter,
  parseSections,
  checkLesson,
  renderReport,
  parseArgs,
  main,
};
