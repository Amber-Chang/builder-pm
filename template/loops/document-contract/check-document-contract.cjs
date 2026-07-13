// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-07-13
// 功能：唯讀檢查正式 PRD / SPEC 的目錄、檔名、ID 與 PRD-to-SPEC 關聯契約。

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const FORMAL_DIRECTORIES = [
  {
    kind: 'PRD',
    relativeDir: path.join('docs', '01-prd'),
    filenamePattern: /^(PRD-\d{3})-[a-z0-9-]+\.md$/,
  },
  {
    kind: 'SPEC',
    relativeDir: path.join('docs', '02-spec'),
    filenamePattern: /^(SPEC-\d{3})-[a-z0-9-]+\.md$/,
  },
];

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, ''));
  }
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontmatter: null, body: content };

  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (field) frontmatter[field[1]] = parseScalar(field[2]);
  }
  return { frontmatter, body: content.slice(match[0].length) };
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function relativePath(projectRoot, absolutePath) {
  return path.relative(projectRoot, absolutePath).split(path.sep).join('/');
}

function walkMarkdown(directory) {
  const files = [];
  const visit = (current) => {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }

    entries.sort((a, b) => compareText(a.name, b.name));
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') files.push(absolute);
    }
  };

  visit(directory);
  return files.sort(compareText);
}

function isIgnoredFormalDocument(filename) {
  return filename === 'README.md' || filename.endsWith('-TEMPLATE.md');
}

function scanFormalDocuments(projectRoot) {
  const root = path.resolve(projectRoot);
  const documents = [];

  for (const definition of FORMAL_DIRECTORIES) {
    const directory = path.join(root, definition.relativeDir);
    for (const absolute of walkMarkdown(directory)) {
      const filename = path.basename(absolute);
      if (isIgnoredFormalDocument(filename)) continue;

      const filenameMatch = filename.match(definition.filenamePattern);
      let content = null;
      let readError = null;
      try {
        content = fs.readFileSync(absolute, 'utf8');
      } catch (error) {
        readError = error.code || error.message;
      }

      const parsed = content === null ? { frontmatter: null } : parseFrontmatter(content);
      documents.push({
        kind: definition.kind,
        file: relativePath(root, absolute),
        filename,
        filename_id: filenameMatch ? filenameMatch[1] : null,
        frontmatter: parsed.frontmatter,
        read_error: readError,
      });
    }
  }

  return documents.sort((a, b) => compareText(a.file, b.file));
}

function addIdOccurrence(occurrences, id, file) {
  if (!id) return;
  if (!occurrences.has(id)) occurrences.set(id, new Set());
  occurrences.get(id).add(file);
}

function errorSortKey(error) {
  return `${error.file || ''}\u0000${error.code}\u0000${error.message}`;
}

function analyze(projectRoot) {
  const root = path.resolve(projectRoot);
  const documents = scanFormalDocuments(root);
  const errors = [];
  const occurrences = new Map();

  for (const document of documents) {
    if (document.read_error) {
      errors.push({
        code: 'read-error',
        file: document.file,
        message: `無法讀取正式文件：${document.read_error}`,
      });
      continue;
    }

    if (!document.filename_id) {
      errors.push({
        code: 'invalid-filename',
        file: document.file,
        message: `${document.kind} 檔名不符合 ${document.kind}-ddd-lowercase-slug.md 契約`,
      });
    }

    const frontmatterId = document.frontmatter && document.frontmatter.id;
    if (typeof frontmatterId !== 'string' || frontmatterId.trim() === '') {
      errors.push({
        code: 'missing-frontmatter-id',
        file: document.file,
        message: 'frontmatter 缺少非空字串 id',
      });
    } else if (document.filename_id && frontmatterId !== document.filename_id) {
      errors.push({
        code: 'id-mismatch',
        file: document.file,
        filename_id: document.filename_id,
        frontmatter_id: frontmatterId,
        message: `frontmatter id ${frontmatterId} 與檔名 ID ${document.filename_id} 不一致`,
      });
    }

    addIdOccurrence(occurrences, document.filename_id, document.file);
    if (typeof frontmatterId === 'string') addIdOccurrence(occurrences, frontmatterId, document.file);
  }

  const duplicateIds = new Set();
  for (const id of [...occurrences.keys()].sort(compareText)) {
    const files = [...occurrences.get(id)].sort(compareText);
    if (files.length < 2) continue;
    duplicateIds.add(id);
    errors.push({
      code: 'duplicate-id',
      file: files[0],
      id,
      files,
      message: `正式文件 ID ${id} 重複出現在 ${files.length} 個檔案`,
    });
  }

  const validPrds = documents.filter((document) => {
    const id = document.frontmatter && document.frontmatter.id;
    return (
      document.kind === 'PRD' &&
      document.filename_id !== null &&
      id === document.filename_id &&
      !duplicateIds.has(id)
    );
  });
  const prdIds = new Set(validPrds.map((document) => document.filename_id));

  const relationships = new Map(
    [...prdIds].sort(compareText).map((prdId) => [prdId, []])
  );

  for (const document of documents.filter((item) => item.kind === 'SPEC')) {
    const specId = document.frontmatter && document.frontmatter.id;
    const relatedPrd = document.frontmatter && document.frontmatter.related_prd;

    if (typeof relatedPrd !== 'string' || relatedPrd.trim() === '') {
      errors.push({
        code: 'missing-related-prd',
        file: document.file,
        message: 'SPEC frontmatter 缺少非空字串 related_prd',
      });
      continue;
    }
    if (!/^PRD-\d{3}$/.test(relatedPrd)) {
      errors.push({
        code: 'invalid-related-prd',
        file: document.file,
        related_prd: relatedPrd,
        message: `related_prd ${relatedPrd} 必須是 PRD-ddd`,
      });
      continue;
    }
    if (!prdIds.has(relatedPrd)) {
      errors.push({
        code: 'unknown-related-prd',
        file: document.file,
        related_prd: relatedPrd,
        message: `related_prd ${relatedPrd} 找不到對應的有效 PRD`,
      });
      continue;
    }

    const validSpecId = document.filename_id && specId === document.filename_id && !duplicateIds.has(specId);
    if (validSpecId) relationships.get(relatedPrd).push(specId);
  }

  const legacyDir = path.join(root, 'docs', '04-specs');
  for (const absolute of walkMarkdown(legacyDir)) {
    const file = relativePath(root, absolute);
    errors.push({
      code: 'legacy-document',
      file,
      message: 'docs/04-specs 已停用；此 Markdown 不屬於有效 SPEC 位置',
    });
  }

  errors.sort((a, b) => compareText(errorSortKey(a), errorSortKey(b)));
  const prdToSpecs = [...relationships.entries()].map(([prdId, specIds]) => ({
    prd_id: prdId,
    spec_ids: specIds.sort(compareText),
  }));

  return { errors, prd_to_specs: prdToSpecs };
}

function renderReport(projectRoot, result) {
  const lines = [
    '文件契約檢查報告（Document Contract Check）',
    `掃描根目錄：${projectRoot}`,
    `結果：${result.errors.length === 0 ? 'PASS' : `FAIL（${result.errors.length} 筆錯誤）`}`,
    '',
  ];

  if (result.errors.length === 0) lines.push('錯誤：（無）');
  else {
    lines.push('錯誤：');
    for (const error of result.errors) lines.push(`  - [${error.code}] ${error.file || '(無路徑)'}：${error.message}`);
  }

  lines.push('', 'PRD-to-SPEC 關聯：');
  if (result.prd_to_specs.length === 0) lines.push('  （無）');
  else {
    for (const relationship of result.prd_to_specs) {
      lines.push(`  - ${relationship.prd_id} -> ${relationship.spec_ids.join(', ') || '（無 SPEC）'}`);
    }
  }
  return lines.join('\n');
}

function main(argv) {
  const args = argv.slice(2);
  const jsonMode = args.includes('--json');
  const projectRoot = args.find((arg) => arg !== '--json');

  if (!projectRoot) {
    console.error('用法：node check-document-contract.cjs <project-root> [--json]');
    return 1;
  }

  const resolved = path.resolve(process.cwd(), projectRoot);
  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch (error) {
    console.error(`讀取 project-root 失敗（${projectRoot}）：${error.code || error.message}`);
    return 1;
  }
  if (!stat.isDirectory()) {
    console.error(`project-root 不是目錄（${projectRoot}）`);
    return 1;
  }

  const result = analyze(resolved);
  if (jsonMode) console.log(JSON.stringify(result, null, 2));
  else console.log(renderReport(resolved, result));
  return result.errors.length === 0 ? 0 : 1;
}

if (require.main === module) {
  process.exit(main(process.argv));
}

module.exports = { parseFrontmatter, scanFormalDocuments, analyze, main };
