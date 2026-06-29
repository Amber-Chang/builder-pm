// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-29
// 功能：brownfield 蒐證掃描器——讀 code/docs/git → 輸出 evidence.json 供 /backfill-context AI 草擬用。
//        確定性（無 Date.now/Math.random）、框上限、優雅降級。§4.4 spec。

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ── 框上限常數（§4.4 規格表）────────────────────────────────────────────────────
const MODULE_TOP_N = 20;
const MAX_FILES_SCANNED = 500;
const GIT_LOG_LAST_N = 100;
const TOP_TERMS_N = 50;
const DOC_EXTRACT_MAX = 50;

// ── 程式碼副檔名（terms + module_tree 判斷用）───────────────────────────────────
const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rb', '.java']);

// ── 來源根目錄（掃 module_tree 用）──────────────────────────────────────────────
const SOURCE_ROOTS = ['src', 'lib', 'app', 'packages', 'services'];

// ── 外部整合對應表（最具體優先，first-match wins）────────────────────────────────
const INTEGRATION_PATTERNS = [
  { pattern: '@aws-sdk/client-ses', kind: 'email/SES' },
  { pattern: '@aws-sdk/client-s3', kind: 'storage/S3' },
  { pattern: '@aws-sdk/', kind: 'AWS service' },
  { pattern: 'stripe', kind: 'payment/Stripe' },
  { pattern: '@stripe/', kind: 'payment/Stripe' },
  { pattern: 'sendgrid', kind: 'email/SendGrid' },
  { pattern: '@sendgrid/', kind: 'email/SendGrid' },
  { pattern: 'twilio', kind: 'SMS/Twilio' },
  { pattern: 'firebase', kind: 'Firebase' },
  { pattern: '@google-cloud/', kind: 'Google Cloud' },
  { pattern: 'mongoose', kind: 'database/MongoDB' },
  { pattern: 'prisma', kind: 'database/Prisma ORM' },
  { pattern: '@prisma/', kind: 'database/Prisma ORM' },
  { pattern: 'redis', kind: 'cache/Redis' },
  { pattern: 'elasticsearch', kind: 'search/Elasticsearch' },
];

// ── 小工具 ──────────────────────────────────────────────────────────────────────

// 安全讀檔（讀不到回傳 null）
function readFileSafe(absPath) {
  try {
    return fs.readFileSync(absPath, 'utf8');
  } catch (_) {
    return null;
  }
}

// 專案相對路徑，一律 posix 斜線
function relPath(projectRoot, absPath) {
  return path.relative(projectRoot, absPath).split(path.sep).join('/');
}

// 遞迴列出目錄下所有符合副檔名的檔，跳過隱藏目錄和 node_modules，回傳排序後絕對路徑
function walkFiles(dir, exts) {
  const out = [];
  const visit = (d) => {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) visit(full);
      else if (e.isFile() && exts.has(path.extname(e.name).toLowerCase())) out.push(full);
    }
  };
  visit(dir);
  return out; // 已在遞迴中按名排序
}

// ── module_tree ─────────────────────────────────────────────────────────────────
function buildModuleTree(projectRoot) {
  const modules = [];

  for (const root of SOURCE_ROOTS) {
    const rootDir = path.join(projectRoot, root);
    let entries;
    try {
      entries = fs.readdirSync(rootDir, { withFileTypes: true });
    } catch (_) {
      continue;
    }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const modDir = path.join(rootDir, e.name);
      const codeFiles = walkFiles(modDir, CODE_EXTS);
      if (codeFiles.length === 0) continue; // 無 code 檔 → 不算模組
      const langSet = new Set(codeFiles.map((f) => path.extname(f).slice(1)));
      const languages = [...langSet].sort();
      const sampleFiles = codeFiles
        .slice(0, 3)
        .map((f) => relPath(projectRoot, f));
      modules.push({
        name: e.name,
        path: relPath(projectRoot, modDir),
        file_count: codeFiles.length,
        languages,
        sample_files: sampleFiles,
      });
    }
  }

  // 按 file_count 降冪排序，同數按名稱排（確定性）
  modules.sort((a, b) => b.file_count - a.file_count || a.name.localeCompare(b.name));

  const truncated = modules.length > MODULE_TOP_N;
  return { modules: modules.slice(0, MODULE_TOP_N), truncated };
}

// ── terms ───────────────────────────────────────────────────────────────────────
function extractTerms(projectRoot) {
  // 收集所有 code 檔（多個 source root 遞迴），最多 MAX_FILES_SCANNED
  let allFiles = [];
  for (const root of SOURCE_ROOTS) {
    allFiles.push(...walkFiles(path.join(projectRoot, root), CODE_EXTS));
  }
  // 去重（不同 source root 可能不重疊，但保險）然後排序確定性
  allFiles = [...new Set(allFiles)].sort();

  const truncatedFiles = allFiles.length > MAX_FILES_SCANNED;
  const filesToScan = allFiles.slice(0, MAX_FILES_SCANNED);

  // term → { frequency, samples: [{file, line}] }
  const termMap = new Map();
  const SNAKE_RE = /\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/g;

  for (const absFile of filesToScan) {
    const content = readFileSafe(absFile);
    if (content === null) continue;
    const lines = content.split('\n');
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      SNAKE_RE.lastIndex = 0;
      let m;
      while ((m = SNAKE_RE.exec(line)) !== null) {
        const term = m[1];
        if (!termMap.has(term)) {
          termMap.set(term, { frequency: 0, samples: [] });
        }
        const entry = termMap.get(term);
        entry.frequency += 1;
        if (entry.samples.length < 3) {
          entry.samples.push({ file: relPath(projectRoot, absFile), line: lineIdx + 1 });
        }
      }
    }
  }

  // 排序：frequency 降冪，同頻率按 term 字母排（確定性），取 TOP_TERMS_N
  const sorted = [...termMap.entries()]
    .sort((a, b) => b[1].frequency - a[1].frequency || a[0].localeCompare(b[0]))
    .slice(0, TOP_TERMS_N)
    .map(([term, { frequency, samples }]) => ({ term, frequency, samples }));

  return { terms: sorted, truncatedFiles };
}

// ── docs ────────────────────────────────────────────────────────────────────────
function extractDocs(projectRoot) {
  const docFiles = [];

  // README.md at root
  const rootReadme = path.join(projectRoot, 'README.md');
  if (fs.existsSync(rootReadme)) docFiles.push(rootReadme);

  // docs/**/*.md
  const docsDir = path.join(projectRoot, 'docs');
  if (fs.existsSync(docsDir)) {
    const walked = walkFiles(docsDir, new Set(['.md']));
    docFiles.push(...walked);
  }

  const docs = [];
  const truncated = docFiles.length > DOC_EXTRACT_MAX;
  for (const absFile of docFiles.slice(0, DOC_EXTRACT_MAX)) {
    const content = readFileSafe(absFile);
    if (content === null) continue;
    const lines = content.split('\n');
    let title = path.basename(absFile, '.md');
    let first_sentence = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) {
        if (title === path.basename(absFile, '.md')) {
          // 第一個 heading → title
          title = trimmed.replace(/^#+\s*/, '').trim();
        }
        continue;
      }
      if (!first_sentence) {
        first_sentence = trimmed;
        break;
      }
    }
    docs.push({ path: relPath(projectRoot, absFile), title, first_sentence });
  }

  const hasReadme = fs.existsSync(rootReadme);
  const hasDocsMd = (() => {
    if (!fs.existsSync(docsDir)) return false;
    try {
      return walkFiles(docsDir, new Set(['.md'])).length > 0;
    } catch (_) {
      return false;
    }
  })();

  return { docs, truncated, docsPresent: hasReadme || hasDocsMd };
}

// ── git_log ─────────────────────────────────────────────────────────────────────
function extractGitLog(projectRoot) {
  const gitDir = path.join(projectRoot, '.git');
  if (!fs.existsSync(gitDir)) {
    return { gitLog: [], gitPresent: false };
  }
  let gitLog = [];
  try {
    const raw = execFileSync(
      'git',
      ['-C', projectRoot, 'log', '--pretty=format:%s', `-${GIT_LOG_LAST_N}`],
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    gitLog = raw
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((subject) => ({ subject }));
  } catch (_) {
    // 空 repo 或 git 不可用 → 優雅降級，git_log=[]
    gitLog = [];
  }
  const truncated = gitLog.length >= GIT_LOG_LAST_N;
  return { gitLog, gitPresent: true, truncated };
}

// ── external_integrations ────────────────────────────────────────────────────────
function extractIntegrations(projectRoot) {
  const pkgPath = path.join(projectRoot, 'package.json');
  const manifests = [];
  const integrations = [];

  if (fs.existsSync(pkgPath)) {
    manifests.push('package.json');
    let pkg;
    try {
      pkg = JSON.parse(readFileSafe(pkgPath) || '{}');
    } catch (_) {
      pkg = {};
    }
    const allDeps = {
      ...((pkg.dependencies) || {}),
      ...((pkg.devDependencies) || {}),
    };
    for (const name of Object.keys(allDeps).sort()) {
      for (const { pattern, kind } of INTEGRATION_PATTERNS) {
        if (name === pattern || name.startsWith(pattern)) {
          integrations.push({ name, source: 'package.json', inferred_kind: kind });
          break; // first-match wins
        }
      }
    }
  }

  // 確定性：按 name 排序
  integrations.sort((a, b) => a.name.localeCompare(b.name));

  return { integrations, manifests };
}

// ── 主掃描函式 ───────────────────────────────────────────────────────────────────
function scan(projectRoot) {
  const { modules, truncated: modulesTruncated } = buildModuleTree(projectRoot);
  const { terms, truncatedFiles } = extractTerms(projectRoot);
  const { docs, truncated: docsTruncated, docsPresent } = extractDocs(projectRoot);
  const { gitLog, gitPresent, truncated: gitTruncated } = extractGitLog(projectRoot);
  const { integrations, manifests } = extractIntegrations(projectRoot);

  const evidence = {
    schema_version: 1,
    project_root: projectRoot,
    limits: {
      module_top_n: MODULE_TOP_N,
      max_files_scanned: MAX_FILES_SCANNED,
      git_log_last_n: GIT_LOG_LAST_N,
      top_terms_n: TOP_TERMS_N,
      doc_extract_max: DOC_EXTRACT_MAX,
    },
    sources_present: {
      git: gitPresent,
      docs: docsPresent,
      dependency_manifests: manifests,
    },
    truncation: {
      modules_truncated: modulesTruncated,
      files_truncated: truncatedFiles,
      git_truncated: !!gitTruncated,
      docs_truncated: docsTruncated,
    },
    module_tree: modules,
    terms,
    docs,
    git_log: gitLog,
    external_integrations: integrations,
  };

  return evidence;
}

// ── main（CLI 進入點）────────────────────────────────────────────────────────────
function main(argv) {
  const args = argv.slice(2);
  if (args.length === 0) {
    process.stderr.write('用法：node scan-evidence.cjs <project-root>\n');
    return 1;
  }

  const projectRoot = path.resolve(process.cwd(), args[0]);
  let stat;
  try {
    stat = fs.statSync(projectRoot);
  } catch (err) {
    process.stderr.write(`讀取 project-root 失敗（${args[0]}）：${err.code || err.message}\n`);
    return 1;
  }
  if (!stat.isDirectory()) {
    process.stderr.write(`project-root 不是目錄（${args[0]}）\n`);
    return 1;
  }

  const evidence = scan(projectRoot);

  // 寫出 evidence.json
  const outDir = path.join(projectRoot, '.context', '.backfill');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'evidence.json');
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2), 'utf8');

  process.stdout.write(`evidence.json 已寫入：${outPath}\n`);
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv));
}

module.exports = { scan, main, MODULE_TOP_N, MAX_FILES_SCANNED, GIT_LOG_LAST_N, TOP_TERMS_N, DOC_EXTRACT_MAX };
