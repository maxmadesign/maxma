#!/usr/bin/env bash
# 一键本地启动（非 Docker）：后端 API + 前端 Dashboard
# 用法: bash scripts/dev_start.sh   (停止: bash scripts/dev_stop.sh)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_PORT="${API_PORT:-3031}"
WEB_PORT="${WEB_PORT:-3030}"
API_URL="http://localhost:${API_PORT}"

echo "==> 启动后端 API :${API_PORT}"
cd "$ROOT/apps/api"
PYTHONPATH="$ROOT/apps/api:$ROOT" DEMO_MODE=true \
  nohup python -m uvicorn tradepilot.main:app --host 0.0.0.0 --port "$API_PORT" \
  > /tmp/api.log 2>&1 &
echo $! > /tmp/tradepilot_api.pid

echo "==> 准备前端（如端口/构建变化则重建）:${WEB_PORT}"
cd "$ROOT/apps/web"
# 若构建中未包含当前 API 地址则重建
if ! grep -rqs "localhost:${API_PORT}" .next/static 2>/dev/null; then
  echo "    重新构建前端 (NEXT_PUBLIC_API_BASE_URL=${API_URL})"
  NEXT_PUBLIC_API_BASE_URL="$API_URL" NEXT_PUBLIC_WS_URL="ws://localhost:${API_PORT}/ws/events" npm run build
fi
nohup npm run start -- -p "$WEB_PORT" > /tmp/web.log 2>&1 &
echo $! > /tmp/tradepilot_web.pid

sleep 8
echo "---"
curl -s -o /dev/null -w "API  ${API_URL}/health  -> HTTP %{http_code}\n" "${API_URL}/health" || echo "API down (see /tmp/api.log)"
curl -s -o /dev/null -w "WEB  http://localhost:${WEB_PORT}/  -> HTTP %{http_code}\n" "http://localhost:${WEB_PORT}/" || echo "WEB down (see /tmp/web.log)"
echo "打开 http://localhost:${WEB_PORT}"
