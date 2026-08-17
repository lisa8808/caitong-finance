#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_HOST="${APP_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-8686}"
API_PORT="${API_PORT:-8787}"

cd "$PROJECT_DIR"

for command_name in node npm; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "错误：未找到 $command_name，请先安装 Node.js。" >&2
    exit 1
  fi
done

if [[ ! -x node_modules/.bin/vite || ! -x node_modules/.bin/concurrently ]]; then
  echo "未检测到完整依赖，正在执行 npm install..."
  npm install
fi

check_port() {
  local port="$1"
  local service_name="$2"
  if command -v lsof >/dev/null 2>&1; then
    local listeners
    listeners="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
    if [[ -n "$listeners" ]]; then
      echo "错误：${service_name}端口 ${port} 已被占用（PID: ${listeners//$'\n'/,}）。" >&2
      exit 1
    fi
  fi
}

check_port "$FRONTEND_PORT" "前端"
check_port "$API_PORT" "行情API"

export PORT="$API_PORT"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://$APP_HOST:$API_PORT}"

echo "正在启动财瞳金融..."
echo "前端地址：http://$APP_HOST:$FRONTEND_PORT/caitong-finance/"
echo "行情API：http://$APP_HOST:$API_PORT"
echo "按 Ctrl+C 停止全部服务。"

exec "$PROJECT_DIR/node_modules/.bin/concurrently" \
  --kill-others \
  -n vite,api \
  -c blue,green \
  "\"$PROJECT_DIR/node_modules/.bin/vite\" --host $APP_HOST --port $FRONTEND_PORT" \
  "node \"$PROJECT_DIR/server/tushare-proxy.mjs\""
