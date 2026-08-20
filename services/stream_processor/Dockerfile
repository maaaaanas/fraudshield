FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir -r /app/../requirements.txt || true
RUN pip install --no-cache-dir kafka-python pandas numpy scikit-learn xgboost imbalanced-learn fastapi uvicorn requests joblib shap SQLAlchemy psycopg2-binary pyyaml
CMD ["python","app.py"]
