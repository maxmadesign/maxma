# Shared image for api + all Python workers (agent-runner, market-data, simulation-engine).
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

# Install the backend core package
COPY apps/api/pyproject.toml /app/apps/api/pyproject.toml
COPY apps/api/tradepilot /app/apps/api/tradepilot
RUN pip install --no-cache-dir -e /app/apps/api

# Service entrypoints
COPY services /app/services
COPY scripts /app/scripts

ENV PYTHONPATH=/app/apps/api:/app
RUN mkdir -p /var/log/tradepilot /var/cache/tradepilot

EXPOSE 8000
CMD ["uvicorn", "tradepilot.main:app", "--host", "0.0.0.0", "--port", "8000"]
