// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-28
// 功能：防膨脹迴圈 Phase 1 偵測器——讀規則登記表 + 本機 telemetry sidecar，
//       用 override 率（主訊號）與休眠天數（副訊號）算出「規則降級候選」，只報告不攔截。

'use strict';

const fs = require('fs');
const path = require('path');

// ── 讀檔（唯一會 exit 1 的情況：輸入檔損毀/缺檔）──────────────────────────
function loadJson(filePath, label) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`讀取 ${label} 失敗（${filePath}）：${err.code || err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`解析 ${label} 失敗（${filePath}）：JSON 格式錯誤——${err.message}`);
  }
}

// ── 日期：用 asof 當「今天」，全程不碰 new Date()，確保測試可重現 ──────────
function parseDate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
function daysBetween(earlierMs, laterMs) {
  return Math.round((laterMs - earlierMs) / 86400000);
}

// ── 核心判定（嚴格照 design.md §4.1：protected → 寬限窗 → 摩擦 → 休眠 → 健康）──
function classify(rulesConfig, usage) {
  const graceMin = rulesConfig.grace_min_observations;
  const asofMs = parseDate(usage.asof);
  const usageRules = (usage && usage.rules) || {};

  const buckets = {
    friction: [],
    dormant: [],
    healthy: [],
    skipped_protected: [],
    skipped_grace: [],
  };
  const details = []; // 給人類報告用，保留每條的計算過程

  for (const rule of rulesConfig.rules) {
    const u = usageRules[rule.id] || {};
    const trigger = u.trigger_count || 0;
    const override = u.override_count || 0;
    const rate = trigger > 0 ? override / trigger : 0; // trigger 0 → rate 視為 0
    const lastTriggeredAt = u.last_triggered_at || null;
    const dormancyDays = lastTriggeredAt ? daysBetween(parseDate(lastTriggeredAt), asofMs) : null;

    const base = { id: rule.id, tier: rule.tier, trigger, override, rate, dormancyDays, rule };

    // 安全欄最優先：protected 一律跳過，永不列候選（即使 override 爆表）
    if (rule.protected) {
      buckets.skipped_protected.push(rule.id);
      details.push({ ...base, category: 'protected' });
      continue;
    }

    // first-run 保護：觀察數不足 → 寬限窗跳過（即使 override 100%）
    if (trigger < graceMin) {
      buckets.skipped_grace.push(rule.id);
      details.push({ ...base, category: 'grace' });
      continue;
    }

    // 主訊號：override 率超標 → 摩擦候選
    if (rate >= rule.override_rate_threshold) {
      buckets.friction.push(rule.id);
      details.push({ ...base, category: 'friction' });
      continue;
    }

    // 副訊號：休眠太久（或觀察數足卻無觸發時間戳）→ 休眠候選，低優先
    if (dormancyDays === null || dormancyDays > rule.dormancy_days) {
      buckets.dormant.push(rule.id);
      details.push({ ...base, category: 'dormant' });
      continue;
    }

    // 其餘 → 健康
    buckets.healthy.push(rule.id);
    details.push({ ...base, category: 'healthy' });
  }

  return { buckets, details };
}

// ── 人類可讀報告 ───────────────────────────────────────────────────────────
function pct(rate, trigger) {
  return trigger > 0 ? Math.round(rate * 100) : 0;
}
function overrideStr(d) {
  return `override ${d.override}/${d.trigger} = ${pct(d.rate, d.trigger)}%`;
}

function renderReport(rulesConfig, usage, classified) {
  const { buckets, details } = classified;
  const byId = Object.fromEntries(details.map((d) => [d.id, d]));
  const lines = [];

  lines.push('規則健身報告（Rule Fitness Report）');
  lines.push('Phase 1 · 確定性偵測 · 只報告不攔截');
  lines.push(
    `資料截止（asof）：${usage.asof} ｜ 寬限門檻：≥ ${rulesConfig.grace_min_observations} 次觀察`
  );
  lines.push('');

  const section = (title, ids, lineFn) => {
    lines.push(title);
    if (ids.length === 0) {
      lines.push('  （無）');
    } else {
      for (const id of ids) lines.push(`  - ${lineFn(byId[id])}`);
    }
    lines.push('');
  };

  section('🔴 摩擦候選（override 率超標，交 PM 審查鬆綁/退役）', buckets.friction, (d) =>
    `${d.id}　${overrideStr(d)}（門檻 ≥ ${Math.round(d.rule.override_rate_threshold * 100)}%）`
  );

  section('🟡 休眠候選（長期零觸發，副訊號·低優先）', buckets.dormant, (d) => {
    const dorm = d.dormancyDays === null ? '無觸發時間戳' : `已休眠 ${d.dormancyDays} 天`;
    return `${d.id}　${dorm}（門檻 > ${d.rule.dormancy_days} 天）｜${overrideStr(d)}`;
  });

  section('✅ 健康', buckets.healthy, (d) => {
    const recent = d.dormancyDays === null ? '' : `｜最近 ${d.dormancyDays} 天前觸發`;
    return `${d.id}　${overrideStr(d)}（門檻 ≥ ${Math.round(d.rule.override_rate_threshold * 100)}%）${recent}`;
  });

  section('🔒 protected 跳過（核心憲章 / PM pin，永不列候選）', buckets.skipped_protected, (d) =>
    `${d.id}　${overrideStr(d)}（受保護，不適用門檻）`
  );

  section('⏳ 寬限窗內跳過（觀察數不足，first-run 保護）', buckets.skipped_grace, (d) => {
    const note = d.trigger === 0 ? '（從未觸發）' : `（${overrideStr(d)}，但樣本不足不判定）`;
    return `${d.id}　觀察 ${d.trigger} 次${note}`;
  });

  lines.push(
    `摘要：${buckets.friction.length} 摩擦 / ${buckets.dormant.length} 休眠 / ` +
      `${buckets.healthy.length} 健康 / ${buckets.skipped_protected.length} protected / ` +
      `${buckets.skipped_grace.length} 寬限`
  );

  return lines.join('\n');
}

// ── 參數解析 ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const rest = argv.slice(2);
  const jsonMode = rest.includes('--json');
  const positional = rest.filter((a) => a !== '--json');

  const rulesPath = positional[0]
    ? path.resolve(process.cwd(), positional[0])
    : path.join(__dirname, 'rules.json');

  // 第二參數省略 → 取 rules.json 同目錄的 rule-usage.json
  const usagePath = positional[1]
    ? path.resolve(process.cwd(), positional[1])
    : path.join(path.dirname(rulesPath), 'rule-usage.json');

  return { jsonMode, rulesPath, usagePath };
}

function main(argv) {
  const { jsonMode, rulesPath, usagePath } = parseArgs(argv);

  let rulesConfig;
  let usage;
  try {
    rulesConfig = loadJson(rulesPath, 'rules.json');
    usage = loadJson(usagePath, 'rule-usage.json');
  } catch (err) {
    console.error(err.message);
    return 1; // 輸入檔損毀/缺檔——唯一非 0 出口
  }

  const classified = classify(rulesConfig, usage);

  if (jsonMode) {
    console.log(JSON.stringify(classified.buckets, null, 2));
  } else {
    console.log(renderReport(rulesConfig, usage, classified));
  }

  // 迴圈/報告，不是關卡 → 永遠 exit 0
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv));
}

module.exports = { loadJson, classify, renderReport, parseArgs, main };
