from fastapi import FastAPI
from pydantic import BaseModel, Field
from kafka import KafkaProducer
import os, json

class Txn(BaseModel):
    Time: float = Field(..., description="seconds elapsed")
    Amount: float
    V: list[float]  # V1..Vn

BROKER = os.getenv("KAFKA_BROKER", "kafka:9092")
TOPIC = os.getenv("TOPIC_TRANSACTIONS","transactions")

producer = KafkaProducer(
    bootstrap_servers=BROKER,
    value_serializer=lambda v: json.dumps(v).encode()
)

app = FastAPI(title="Webhook→Kafka")

@app.post("/txn")
def ingest(txn: Txn):
    payload = {"Time": txn.Time, "Amount": txn.Amount}
    for i,v in enumerate(txn.V, start=1): payload[f"V{i}"]=v
    producer.send(TOPIC, payload)
    return {"status":"queued"}

@app.get("/health")
def health(): return {"ok":True}
