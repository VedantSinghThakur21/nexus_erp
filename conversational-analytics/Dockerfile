FROM python:3.11-slim

# curl is needed for the Docker healthcheck
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY erpnext_client.py .
COPY tools.py .
COPY llm.py .
COPY analyser.py .
COPY main.py .

# Pre-create logs directory for LLM call tracing
RUN mkdir -p /app/logs

ENV ANALYTICS_PORT=8003

EXPOSE 8003

CMD ["python3", "main.py"]
