FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VIENEU_OUTPUT_DIR=/tmp/vieneu-output

WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py ./app.py
RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /tmp/vieneu-output \
    && chown -R appuser:appuser /app /tmp/vieneu-output
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
