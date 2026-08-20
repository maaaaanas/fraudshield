FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir fastapi uvicorn sse-starlette pandas sqlalchemy psycopg2-binary
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000"]
