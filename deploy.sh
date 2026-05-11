#!/usr/bin/env bash
# MathBox 自動部署 script
# 用法：./deploy.sh [--no-build] [--no-upload]
#   --no-build    跳過 vite build（用上次的 dist）
#   --no-upload   只打包不上傳（dry run）

set -euo pipefail

# ============================================
# 0. 載入設定
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -f deploy.config ]]; then
  echo "❌ 找不到 deploy.config"
  echo "   請執行：cp deploy.config.example deploy.config && nano deploy.config"
  exit 1
fi
# shellcheck disable=SC1091
source deploy.config

# 解析參數
NO_BUILD=0
NO_UPLOAD=0
for arg in "$@"; do
  case "$arg" in
    --no-build)  NO_BUILD=1 ;;
    --no-upload) NO_UPLOAD=1 ;;
    -h|--help)
      sed -n '2,7p' "$0"
      exit 0
      ;;
    *) echo "❌ 未知參數：$arg"; exit 1 ;;
  esac
done

# SSH/SCP 通用參數
SSH_OPTS=(-p "$SSH_PORT" -o StrictHostKeyChecking=accept-new)
SCP_OPTS=(-P "$SSH_PORT" -o StrictHostKeyChecking=accept-new)
if [[ -n "${SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY")
  SCP_OPTS+=(-i "$SSH_KEY")
fi
SSH_TARGET="${SSH_USER}@${SSH_HOST}"

DATE=$(date +%Y%m%d-%H%M%S)
TARBALL="mathbox-${DATE}.tar.gz"
STAGING="dist-aapanel/staging"

# ============================================
# 1. Build 前端
# ============================================
if [[ $NO_BUILD -eq 0 ]]; then
  echo "🔨 [1/5] Vite 建置前端..."
  (cd 02-web && npm run build > /dev/null)
  echo "   ✓ build 完成"
else
  echo "⏭  [1/5] 跳過 build（--no-build）"
  if [[ ! -d 02-web/dist ]]; then
    echo "❌ 沒有 02-web/dist，請先 build 一次"
    exit 1
  fi
fi

# ============================================
# 2. Stage 檔案
# ============================================
echo "📦 [2/5] 整理打包內容..."
rm -rf "$STAGING"
mkdir -p "$STAGING/02-web/src/database"
cp -R 02-web/dist "$STAGING/02-web/dist"
cp 02-web/server.mjs 02-web/aiproxy.proto 02-web/package.json 02-web/package-lock.json "$STAGING/02-web/"
cp 02-web/src/database/formula_db.sqlite "$STAGING/02-web/src/database/"
cp dist-aapanel/staging/.env.example "$STAGING/.env.example" 2>/dev/null || cat > "$STAGING/.env.example" << 'EOF'
PORT=3001
AI_PROXY_HOST=cli.twloop.com
AI_PROXY_PORT=443
AI_PROXY_TOKEN=your_token_here
AI_PROXY_TLS=true
EOF
echo "   ✓ staging 完成 ($(du -sh "$STAGING/02-web" | cut -f1))"

# ============================================
# 3. 建立 tarball
# ============================================
echo "🗜  [3/5] 壓縮 tarball..."
(cd "$STAGING" && tar -czf "../$TARBALL" --exclude='.DS_Store' .env.example 02-web)
TARBALL_PATH="dist-aapanel/$TARBALL"
SIZE=$(du -h "$TARBALL_PATH" | cut -f1)
echo "   ✓ $TARBALL_PATH ($SIZE)"

if [[ $NO_UPLOAD -eq 1 ]]; then
  echo "⏭  [4/5] 跳過上傳（--no-upload）"
  echo "✅ Dry run 完成。檔案：$TARBALL_PATH"
  exit 0
fi

# ============================================
# 4. 上傳到伺服器
# ============================================
echo "🚀 [4/5] 上傳到 ${SSH_TARGET}:${REMOTE_PATH}/ ..."
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "mkdir -p '$REMOTE_PATH/releases'"
scp "${SCP_OPTS[@]}" "$TARBALL_PATH" "${SSH_TARGET}:${REMOTE_PATH}/releases/"
echo "   ✓ 上傳完成"

# ============================================
# 5. 遠端部署
# ============================================
echo "🛠  [5/5] 遠端解壓 + 安裝 + 重啟..."

# 注意：用 'EOF' 包起來避免本機展開變數
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" bash -s << REMOTE_SCRIPT
set -euo pipefail

REMOTE_PATH="$REMOTE_PATH"
TARBALL="$TARBALL"
PM2_NAME="$PM2_NAME"
KEEP_BACKUPS=$KEEP_BACKUPS

cd "\$REMOTE_PATH"

# 解壓到暫存區
rm -rf .deploy-tmp && mkdir .deploy-tmp
tar -xzf "releases/\$TARBALL" -C .deploy-tmp

# 保留現有 .env，覆蓋 02-web，更新 .env.example
if [[ -d 02-web ]]; then
  # 備份目前 DB（避免被覆蓋）
  if [[ -f 02-web/src/database/formula_db.sqlite ]]; then
    mkdir -p .deploy-tmp/02-web/src/database
    # 若伺服器上的 DB 比 tarball 新，保留伺服器版本
    cp -n 02-web/src/database/formula_db.sqlite .deploy-tmp/02-web/src/database/formula_db.sqlite 2>/dev/null || true
  fi
  rm -rf 02-web
fi
mv .deploy-tmp/02-web ./02-web
mv .deploy-tmp/.env.example ./.env.example

# 首次部署提醒建立 .env
if [[ ! -f .env ]]; then
  cp .env.example .env
  chmod 600 .env
  echo "⚠️  首次部署：請編輯 \$REMOTE_PATH/.env 填入 AI_PROXY_TOKEN"
fi
chmod 600 .env

# 安裝依賴
cd 02-web
npm install --omit=dev --silent

# PM2 啟動或重啟
if pm2 describe "\$PM2_NAME" > /dev/null 2>&1; then
  pm2 restart "\$PM2_NAME" --update-env
else
  pm2 start server.mjs --name "\$PM2_NAME"
  pm2 save
fi

# 清理舊 backup
cd "\$REMOTE_PATH/releases"
ls -t mathbox-*.tar.gz 2>/dev/null | tail -n +\$((KEEP_BACKUPS + 1)) | xargs -r rm -f

cd "\$REMOTE_PATH"
rm -rf .deploy-tmp

echo "✓ 遠端部署完成"
pm2 list | grep "\$PM2_NAME" || true
REMOTE_SCRIPT

echo ""
echo "✅ 部署完成！"
echo "   tarball: $TARBALL_PATH"
echo "   伺服器: $SSH_TARGET:$REMOTE_PATH"
echo ""
echo "查 log: ssh $SSH_TARGET 'pm2 logs $PM2_NAME'"
