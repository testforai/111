FROM docker.m.daocloud.io/library/python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN useradd -r -u 10001 appuser
COPY . .
RUN pip install --no-cache-dir .
USER appuser
