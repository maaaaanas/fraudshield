FROM python:3.11-slim

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir \
    kafka-python \
    fastapi \
    uvicorn

CMD ["python", "producer.py"]
