#!/usr/bin/env bash
# 停止本地启动的后端/前端
for name in api web; do
  pidfile="/tmp/tradepilot_${name}.pid"
  if [ -f "$pidfile" ]; then kill "$(cat "$pidfile")" 2>/dev/null && echo "stopped $name"; rm -f "$pidfile"; fi
done
pkill -f "uvicorn tradepilot" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
echo "done"
