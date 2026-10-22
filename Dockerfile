FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt \
    && groupadd --gid 1000 appsecrets \
    && useradd --uid 10001 --gid appsecrets --create-home appuser

COPY --chown=appuser:appsecrets backend/ /app/backend/
COPY --chown=appuser:appsecrets frontend/ /app/frontend/

USER appuser
EXPOSE 10000
CMD ["sh", "-c", "exec uvicorn backend.server:app --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers --forwarded-allow-ips=${FORWARDED_ALLOW_IPS:-*}"]
