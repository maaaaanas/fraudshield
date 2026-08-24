FROM python:3.11-slim

WORKDIR /app

# System libraries required by LightGBM / XGBoost
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY . /app

RUN pip install --no-cache-dir -r /app/../requirements.txt || true

RUN pip install --no-cache-dir \
    kafka-python \
    pandas \
    numpy \
    scikit-learn \
    xgboost \
    lightgbm \
    imbalanced-learn \
    fastapi \
    uvicorn \
    requests \
    joblib \
    shap \
    SQLAlchemy \
    psycopg2-binary \
    pyyaml

CMD ["python", "app.py"]