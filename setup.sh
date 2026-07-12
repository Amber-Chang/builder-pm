#!/usr/bin/env bash
# [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-29
# Purpose: 把 builder-pm template/ 安裝成一個新專案（填佔位符 + 可選模組 + git init）
set -euo pipefail

# ---------------------------------------------------------------------------
# 0. 定位 builder-pm 根目錄並防呆
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

if [ ! -d "$SCRIPT_DIR/template" ]; then
  echo "錯誤：找不到 $SCRIPT_DIR/template" >&2
  echo "請從 builder-pm 根目錄執行 setup.sh。" >&2
  exit 1
fi
# 解析成實體路徑（pwd -P）——讓三道種子防護比對的是真路徑，symlink 無法繞過。
TEMPLATE_DIR="$(cd "$SCRIPT_DIR/template" && pwd -P)"

# 偵測 sed 種類一次：GNU 用 `sed -i`，BSD(macOS) 用 `sed -i ''`。
if sed --version >/dev/null 2>&1; then
  SED_INPLACE=(sed -i)
else
  SED_INPLACE=(sed -i '')
fi

# 把可能含特殊字元的取代值跳脫後，就地替換檔案中的某個佔位符。
# 用 | 當 sed 分隔符；跳脫取代值中的 \ & |（sed 取代側特殊字元）。
replace_in_file() {
  local file="$1" placeholder="$2" value="$3" esc
  esc=$(printf '%s' "$value" | sed -e 's/[\\&|]/\\&/g')
  "${SED_INPLACE[@]}" "s|${placeholder}|${esc}|g" "$file"
}

# 對單一檔案套用全部 9 個佔位符。
fill_placeholders() {
  local file="$1"
  replace_in_file "$file" "{{PROJECT_NAME}}"            "$PROJECT_NAME"
  replace_in_file "$file" "{{PROJECT_GOAL}}"            "$PROJECT_GOAL"
  replace_in_file "$file" "{{TECH_STACK}}"              "$TECH_STACK"
  replace_in_file "$file" "{{PM_NAME}}"                 "$PM_NAME"
  replace_in_file "$file" "{{TEST_FRAMEWORK}}"          "$TEST_FRAMEWORK"
  replace_in_file "$file" "{{TEST_COMMAND}}"            "$TEST_COMMAND"
  replace_in_file "$file" "{{PLANNER_EXTRA_SKILLS}}"    "$PLANNER_EXTRA_SKILLS"
  replace_in_file "$file" "{{GENERATOR_EXTRA_SKILLS}}"  "$GENERATOR_EXTRA_SKILLS"
  replace_in_file "$file" "{{EVALUATOR_EXTRA_SKILLS}}"  "$EVALUATOR_EXTRA_SKILLS"
}

# 把可能是相對路徑的輸入轉成絕對路徑（唯讀，不建立任何目錄）。
to_abs() {
  local p="$1" parent base
  parent="$(dirname "$p")"
  base="$(basename "$p")"
  if [ -d "$parent" ]; then
    printf '%s/%s\n' "$(cd "$parent" && pwd)" "$base"
  elif [ "${p:0:1}" = "/" ]; then
    printf '%s\n' "$p"
  else
    printf '%s/%s\n' "$(pwd)" "$p"
  fi
}

echo "============================================"
echo "  builder-pm 專案安裝程式"
echo "============================================"
echo ""

# ---------------------------------------------------------------------------
# 1. 互動問答（每題給合理預設）
# ---------------------------------------------------------------------------
while true; do
  read -p "開發工具：1) Claude Code（預設） 2) Codex 3) 兩者 [1]: " ans_platform || true
  case "${ans_platform:-1}" in
    1|claude) DEV_PLATFORM=claude; break ;;
    2|codex) DEV_PLATFORM=codex; break ;;
    3|both) DEV_PLATFORM=both; break ;;
    *) echo "錯誤：請輸入 1、2 或 3。" >&2 ;;
  esac
done

read -p "專案名稱（英文，例 my-product）: " PROJECT_NAME || true
PROJECT_NAME="${PROJECT_NAME:-my-product}"

# 預設目標資料夾：../<專案名小寫、空白換 ->
DEFAULT_TARGET="../$(printf '%s' "$PROJECT_NAME" | tr '[:upper:] ' '[:lower:]-')"
read -p "目標資料夾路徑 [${DEFAULT_TARGET}]: " TARGET || true
TARGET="${TARGET:-$DEFAULT_TARGET}"

read -p "一句話目標（這專案要做什麼）: " PROJECT_GOAL || true
PROJECT_GOAL="${PROJECT_GOAL:-（待填）}"

read -p "PM 名字 [Amber]: " PM_NAME || true
PM_NAME="${PM_NAME:-Amber}"

read -p "技術棧（例 Go + chi + PostgreSQL）: " TECH_STACK || true
TECH_STACK="${TECH_STACK:-（待填）}"

read -p "測試框架（例 go test + testify）: " TEST_FRAMEWORK || true
TEST_FRAMEWORK="${TEST_FRAMEWORK:-（待填）}"

read -p "跑測試指令（例 go test ./...）: " TEST_COMMAND || true
TEST_COMMAND="${TEST_COMMAND:-（待填）}"

read -p "Planner 專用 skill [（無）]: " PLANNER_EXTRA_SKILLS || true
PLANNER_EXTRA_SKILLS="${PLANNER_EXTRA_SKILLS:-（無）}"

read -p "Generator 專用 skill [（無）]: " GENERATOR_EXTRA_SKILLS || true
GENERATOR_EXTRA_SKILLS="${GENERATOR_EXTRA_SKILLS:-（無）}"

read -p "Evaluator 專用 skill [（無）]: " EVALUATOR_EXTRA_SKILLS || true
EVALUATOR_EXTRA_SKILLS="${EVALUATOR_EXTRA_SKILLS:-（無）}"

# ---------------------------------------------------------------------------
# 2. 算出目標絕對路徑 + 防呆（不准污染種子、不准覆蓋既有檔）
# ---------------------------------------------------------------------------
TARGET_ABS="$(to_abs "$TARGET")"
# 若目標已存在（含 symlink），解析成實體路徑，避免 symlink→template 繞過下面三道 guard。
TARGET_ABS="$(cd "$TARGET_ABS" 2>/dev/null && pwd -P || printf '%s' "$TARGET_ABS")"

if [ "$TARGET_ABS" = "$SCRIPT_DIR" ]; then
  echo "錯誤：目標不可是 builder-pm 根目錄本身（$SCRIPT_DIR）。" >&2
  exit 1
fi
if [ "$TARGET_ABS" = "$TEMPLATE_DIR" ]; then
  echo "錯誤：目標不可是種子目錄 template/ 本身。" >&2
  exit 1
fi
case "$TARGET_ABS" in
  "$TEMPLATE_DIR"/*)
    echo "錯誤：目標不可在種子目錄 template/ 內（避免污染種子）。" >&2
    exit 1
    ;;
esac

BROWNFIELD_DETECTED=n
if [ -e "$TARGET_ABS" ] && [ -n "$(ls -A "$TARGET_ABS" 2>/dev/null)" ]; then
  echo ""
  echo "警告：目標資料夾已存在且非空：$TARGET_ABS"
  read -p "仍要在裡面安裝（既有檔案可能被覆蓋）？[y/N]: " confirm_overwrite || true
  case "${confirm_overwrite:-n}" in
    [Yy]*) : ;;
    *) echo "已中止，未動任何檔案。" >&2; exit 1 ;;
  esac
  # 精準判斷：有 .git → 既有 git 專案，裝完提醒跑 /backfill-context
  if [ -d "$TARGET_ABS/.git" ]; then
    BROWNFIELD_DETECTED=y
  fi
fi

# 模組選擇
echo ""
read -p "啟用 openspec（給 Generator 做 SDD）？[y/N]: " ans_openspec || true
case "${ans_openspec:-n}" in [Yy]*) ENABLE_OPENSPEC=y ;; *) ENABLE_OPENSPEC=n ;; esac

if [ "$DEV_PLATFORM" = "claude" ]; then
  read -p "啟用 Codex PR 審查（給 Evaluator 當第二模型）？[y/N]: " ans_codex || true
  case "${ans_codex:-n}" in [Yy]*) ENABLE_CODEX=y ;; *) ENABLE_CODEX=n ;; esac
else
  ENABLE_CODEX=y
fi

# ---------------------------------------------------------------------------
# 3. 複製種子（含隱藏檔）+ 填佔位符
# ---------------------------------------------------------------------------
echo ""
echo "複製種子到 $TARGET_ABS ..."
STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/builder-pm-stage.XXXXXX")"
cleanup_staging() {
  rm -rf "$STAGING_DIR"
}
trap cleanup_staging EXIT

cp -R "$TEMPLATE_DIR/." "$STAGING_DIR/"
if [ "$DEV_PLATFORM" = "claude" ]; then
  rm -f "$STAGING_DIR/AGENTS.md"
  rm -rf "$STAGING_DIR/.agents"
fi

mkdir -p "$TARGET_ABS"
cp -R "$STAGING_DIR/." "$TARGET_ABS/"

echo "填入佔位符 ..."
find "$TARGET_ABS" -type f \( -name '*.md' -o -name '*.json' -o -name '*.cjs' \) -print0 \
  | while IFS= read -r -d '' f; do
      fill_placeholders "$f"
    done

# ---------------------------------------------------------------------------
# 4. opt-in 模組落地
# ---------------------------------------------------------------------------
if [ "$ENABLE_CODEX" = "y" ]; then
  echo "啟用 Codex 模組：建立 .codex/review-config.json 安全預設骨架 ..."
  mkdir -p "$TARGET_ABS/.codex"
  cat > "$TARGET_ABS/.codex/review-config.json" <<'JSON'
{
  "knowledgeSources": [
    { "id": "core-governance", "title": "核心治理", "path": "CLAUDE.md", "kind": "governance" },
    { "id": "skill-routing", "title": "Skill 路由", "path": "SKILLS.md", "kind": "skill-routing" },
    { "id": "system-context", "title": "系統脈絡", "path": ".context/SYSTEM.md", "kind": "architecture" },
    { "id": "project-conventions", "title": "專案約定", "path": ".context/CONVENTIONS.md", "kind": "conventions" }
  ],
  "moduleDocHints": [],
  "errorPatternsPath": null
}
JSON
fi

# ---------------------------------------------------------------------------
# 5. 寫 MODULES.md（繁中）—— 記錄啟用狀態 + 每個啟用模組的精準下一步
# ---------------------------------------------------------------------------
MODULES_FILE="$TARGET_ABS/MODULES.md"
{
  echo "# 可選模組（opt-in）狀態"
  echo ""
  echo "本檔由 setup.sh 自動產生，記錄安裝時選擇了哪些可選模組，以及每個模組的下一步操作。"
  echo "腳本**只印指令、不自動執行外部 CLI**；下列指令請你自行確認後執行。"
  echo ""
  echo "## openspec（給 Generator 做 SDD）"
  echo ""
  if [ "$ENABLE_OPENSPEC" = "y" ]; then
    echo "狀態：**已啟用**"
    echo ""
    echo "下一步：在專案根目錄執行下列指令初始化 openspec（建議指令，依 openspec 版本可能微調，請見 openspec 官方文件）："
    echo ""
    echo '```bash'
    echo "npx openspec init"
    echo '```'
    echo ""
    echo "Generator 合約已預設：裝了 openspec → 走它的 propose/apply 流程；沒裝 → 用「讀 spec → 對齊 → 實作」紀律版。"
  else
    echo "狀態：未啟用，日後可手動加（重跑 setup.sh 選 y，或自行執行 \`npx openspec init\`）。"
  fi
  echo ""
  echo "## Codex PR 審查（給 Evaluator 當第二模型）"
  echo ""
  if [ "$ENABLE_CODEX" = "y" ]; then
    if [ "$DEV_PLATFORM" = "claude" ]; then
      echo "狀態：**已啟用**（已建立 \`.codex/review-config.json\` 安全預設骨架）"
      echo ""
      echo "### 一鍵安裝（Claude Code）"
      echo ""
      echo "在 Claude Code 內依序執行："
      echo ""
      echo '```'
      echo "/plugin marketplace add Amber-Chang/codex-pr-review"
      echo "/plugin install codex-pr-review@codex-pr-review"
      echo '```'
      echo ""
      echo "（private repo，需先 \`gh auth login\`；背景自動更新才需設 \`GITHUB_TOKEN\`）"
      echo ""
      echo "接著：已在本專案建好 \`.codex/review-config.json\`，內含專案治理與脈絡的預設知識路徑。"
      echo ""
      echo "### 手動 / 非 Claude Code 環境（fallback）"
      echo ""
      echo "\`<plugin 目錄>\` 換成你要放的路徑，\`<plugin-dir>\` 指含 \`plugin.json\` 的安裝目錄，\`<PR編號>\` 換成實際 PR："
      echo ""
      echo '```bash'
      echo "git clone https://github.com/Amber-Chang/codex-pr-review <plugin 目錄>"
      echo "node <plugin-dir>/prepare-pr-review.cjs <PR編號> --write /tmp/pr-packet.json"
      echo '```'
      echo ""
      echo "詳見 plugin README（含回貼 review 意見、找不到 config 的安全預設等）。"
    else
      echo "狀態：**PR REVIEW 待啟用**（設定檔已建立，外掛尚需在 Codex 載入）"
      echo ""
      echo '```bash'
      echo "codex plugin marketplace add Amber-Chang/codex-pr-review"
      echo '```'
      echo ""
      echo "加入 marketplace 後，依目前 Codex 版本完成啟用或 reload，並確認 \`pr-review-agent\` 已出現在 Codex 可用 skills。只加入 marketplace 不代表正式 gate 已就緒。"
    fi
  else
    echo "狀態：未啟用，日後可手動加（重跑 setup.sh 選 y，或自行 clone plugin 並建 \`.codex/review-config.json\`）。"
  fi
} > "$MODULES_FILE"

# ---------------------------------------------------------------------------
# 6. git init + 第一個 commit
# ---------------------------------------------------------------------------
echo ""
echo "初始化 git ..."

# 啟用模組摘要（給 commit message 用）
ENABLED_SUMMARY=""
[ "$ENABLE_OPENSPEC" = "y" ] && ENABLED_SUMMARY="${ENABLED_SUMMARY}openspec "
[ "$ENABLE_CODEX" = "y" ]    && ENABLED_SUMMARY="${ENABLED_SUMMARY}codex "
[ -z "$ENABLED_SUMMARY" ]    && ENABLED_SUMMARY="（無）"

# 包成 if 條件式：set -e 對 if 條件不致命，失敗只提示、不中止（專案檔已就緒）。
if git -C "$TARGET_ABS" init -q \
   && git -C "$TARGET_ABS" add -A \
   && git -C "$TARGET_ABS" commit -q -m "chore: 從 builder-pm 種子初始化 ${PROJECT_NAME}

- 啟用模組：${ENABLED_SUMMARY}"; then
  :
else
  echo "⚠️ git 初始化/首次 commit 失敗（常見原因：未設 git user.name / user.email）。" >&2
  echo "   專案檔已就緒，請在專案目錄手動執行：git init && git add -A && git commit -m \"初始化\"" >&2
fi

# ---------------------------------------------------------------------------
# 7. 收尾
# ---------------------------------------------------------------------------
echo ""
echo "============================================"
echo "  安裝完成！專案位於：$TARGET_ABS"
echo "============================================"
echo ""
echo "下一步："
echo "  1. 讀 ONBOARDING.md（開工指南）—— 從空白到開始做怎麼走"
echo "  2. 寫第一版 PRD（接 brainstorming）；先別填 SYSTEM/GLOSSARY，.context/ 會邊做邊長"
if [ "$BROWNFIELD_DETECTED" = "y" ]; then
  case "$DEV_PLATFORM" in
    claude) echo "  ⚡ 偵測到既有 git 專案 → 裝好後在 Claude 執行 /backfill-context，讓 AI 草擬 .context/ 三份文件" ;;
    codex) echo "  ⚡ 偵測到既有 git 專案 → 請 Codex 依照 .claude/commands/backfill-context.md 草擬 .context/ 三份文件" ;;
    both) echo "  ⚡ 偵測到既有 git 專案 → 可在 Claude 執行 /backfill-context，或請 Codex 依照 .claude/commands/backfill-context.md 執行" ;;
  esac
fi
case "$DEV_PLATFORM" in
  claude) echo "  3. 在專案目錄執行：claude" ;;
  codex) echo "  3. 用 Codex App 開啟專案，或在專案目錄執行：codex" ;;
  both) echo "  3. 用 Claude Code 或 Codex 開啟專案（claude / codex）" ;;
esac
echo ""
echo "已啟用模組的指令（細節見 $TARGET_ABS/MODULES.md）："
if [ "$ENABLE_OPENSPEC" = "y" ]; then
  echo "  [openspec] 在專案根目錄執行： npx openspec init"
fi
if [ "$ENABLE_CODEX" = "y" ]; then
  if [ "$DEV_PLATFORM" = "claude" ]; then
    echo "  [codex]    一鍵安裝（Claude Code 內）："
    echo "             /plugin marketplace add Amber-Chang/codex-pr-review"
    echo "             /plugin install codex-pr-review@codex-pr-review"
    echo "             .codex/review-config.json 已含預設專案知識路徑"
    echo "             （手動 fallback 與 packet 指令見 MODULES.md）"
  else
    echo "  [codex]    PR REVIEW 待啟用："
    echo "             codex plugin marketplace add Amber-Chang/codex-pr-review"
    echo "             再依目前 Codex 版本啟用或 reload，並確認 pr-review-agent 可用"
    echo "             只加入 marketplace 不代表正式 gate 已就緒"
  fi
fi
if [ "$ENABLE_OPENSPEC" != "y" ] && [ "$ENABLE_CODEX" != "y" ]; then
  echo "  （未啟用任何可選模組）"
fi
echo ""
