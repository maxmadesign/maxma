# 本地安装 / Local Setup

## 一键启动
```bash
cp .env.example .env
docker compose up -d
```
打开：
- Dashboard: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

`restart: unless-stopped` 让系统可长期运行。`docker compose logs -f agent-runner` 看决策轮。

## 默认登录
- 用户名 `admin`，密码 = `.env` 的 `LOCAL_ADMIN_PASSWORD`（默认 `tradepilot`）。
  （单用户本地应用；登录用于危险操作确认，不是多租户。）

## 不用 Docker 跑后端（开发）
```bash
cd apps/api
pip install -e ".[dev]"
uvicorn tradepilot.main:app --reload --port 8000
# 另开终端跑 agent-runner
PYTHONPATH=apps/api:. python -m services.agent_runner.main
```

## 前端开发
```bash
cd apps/web
npm install
npm run dev    # http://localhost:3000
```

## 跑测试
```bash
# 后端（仓库根目录）
python -m pytest tests/ -q
# 前端
cd apps/web && npm test
```

## 重置 / 导出
```bash
python scripts/export_logs.py        # 导出到 ./data/export
python scripts/reset_simulation.py   # 重置（API 须在运行）
```
