# API Key 管理 / API Key Management

## 流程
1. 打开 **设置 → AI Provider**（`/settings/providers`）。
2. 在 Provider 卡片输入 key 并点 **保存**。浏览器只在保存时把 key 发送一次到后端。
3. 后端用 `APP_SECRET_KEY` 派生的密钥加密保存（`apps/api/tradepilot/crypto.py`，Fernet）。
4. UI 之后只显示 **掩码**（如 `sk-1………9abc`），明文不会再返回浏览器。
5. **Test Connection** 验证可用性；**Refresh Models** 刷新该 Provider 的模型列表。

> 写 **"Cloud API key"** 时按 **Anthropic Claude** key 理解。Google Cloud 是部署平台，不是交易 Agent。

## 安全要点
- key **不存 localStorage**、**不明文暴露给浏览器**。
- 本地模式：用 `.env` 的 `APP_SECRET_KEY` 加密。
- Google Cloud 模式：改用 **Secret Manager**（见 `infra/terraform`），代码读取 secret 引用而非明文。
- 审计日志记录 key 的保存/更新/删除事件，但**绝不记录明文 key**。

## Provider 状态
`connected` · `missing_key` · `invalid_key` · `rate_limited` · `degraded` · `disabled`。

## Model Registry
- 启动时尝试刷新每个已配置 Provider 的模型列表，保存列表与刷新时间。
- 每个 Agent 在 Settings 选择主模型 + fallback；模型名**不写死在业务逻辑**。
- 每个决策记录所用 `provider` / `model` / `model id`，模型变更写入 `model_change_logs`。
- 默认优先各 Provider 当前最新稳定/frontier/reasoning 模型，不可用时回退 fallback。
