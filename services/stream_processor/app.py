import os
import json
import csv
import time
import logging
import collections

from datetime import datetime

import numpy as np
import joblib
import requests
import shap
import sqlalchemy as sa

from kafka import KafkaConsumer

from featurizer import to_features, FEATURE_NAMES
from threshold import load_threshold


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(message)s"
)

logger = logging.getLogger(__name__)


# ============================================================
# CONFIGURATION
# ============================================================

BROKER = os.getenv(
    "KAFKA_BROKER",
    "kafka:9092"
)

TOPIC = os.getenv(
    "TOPIC_TRANSACTIONS",
    "transactions"
)

ALERTS_SINK = os.getenv(
    "ALERTS_SINK",
    "/app/data/alerts.csv"
)

LATEST_SINK = os.getenv(
    "LATEST_SINK",
    "/app/data/latest.csv"
)

DRIFT_SINK = os.getenv(
    "DRIFT_SINK",
    "/app/data/drift.json"
)

SLACK = os.getenv(
    "SLACK_WEBHOOK_URL",
    ""
).strip()

MODEL_PATH = os.getenv(
    "MODEL_PATH",
    "/app/model.pkl"
)

META_PATH = MODEL_PATH.replace(
    ".pkl",
    "_meta.json"
)

DB_URL = os.getenv(
    "DB_URL",
    ""
)


# ============================================================
# MODEL METADATA
# ============================================================

MODEL_META = {}

if os.path.exists(META_PATH):
    try:
        with open(META_PATH, encoding="utf-8") as f:
            MODEL_META = json.load(f)

        logger.info(
            "Model meta: %s",
            MODEL_META
        )

    except Exception as e:
        logger.warning(
            "Could not load model metadata: %s",
            e
        )


# ============================================================
# DRIFT TRACKING
# ============================================================

_WINDOW = 500

_score_window = collections.deque(
    maxlen=_WINDOW
)

_drift_counter = 0

_DRIFT_WRITE_EVERY = 50


# ============================================================
# CSV HELPERS
# ============================================================

def ensure_csv(path, headers):
    directory = os.path.dirname(path)

    if directory:
        os.makedirs(
            directory,
            exist_ok=True
        )

    if not os.path.exists(path):

        with open(
            path,
            "w",
            newline="",
            encoding="utf-8"
        ) as f:

            csv.writer(f).writerow(headers)


# ============================================================
# CSV HEADERS
# ============================================================
#
# FEATURE_NAMES already contains:
# V1 ... V28, Amount
#
# Therefore we DO NOT add another standalone "Amount".
# This fixes the duplicate Amount column that existed before.
# ============================================================

ensure_csv(
    ALERTS_SINK,
    [
        "ts",
        "prob",
        "transaction_id",
        "customer_id",
        "merchant",
        "location",
        "device_id",
        "scenario",
        *FEATURE_NAMES,
        "top_features_json"
    ]
)

ensure_csv(
    LATEST_SINK,
    [
        "ts",
        "prob",
        "transaction_id",
        "customer_id",
        "merchant",
        "location",
        "device_id",
        "scenario",
        *FEATURE_NAMES,
        "is_alert"
    ]
)


# ============================================================
# LOAD MODEL
# ============================================================

logger.info(
    "Loading fraud detection model from %s",
    MODEL_PATH
)

model = joblib.load(
    MODEL_PATH
)

logger.info(
    "Fraud detection model loaded successfully"
)


# ============================================================
# SHAP EXPLAINABILITY
# ============================================================

try:

    # For VotingClassifier, use the first estimator.
    _shap_model = (
        model.estimators_[0]
        if hasattr(model, "estimators_")
        else model
    )

    explainer = shap.TreeExplainer(
        _shap_model
    )

    SHAP_OK = True

    logger.info(
        "SHAP explainability enabled"
    )

except Exception as e:

    logger.warning(
        "SHAP unavailable: %s",
        e
    )

    SHAP_OK = False


# ============================================================
# DATABASE
# ============================================================

engine = None

if DB_URL:

    try:

        engine = sa.create_engine(
            DB_URL,
            pool_pre_ping=True
        )

        with engine.connect() as connection:

            connection.execute(
                sa.text("SELECT 1")
            )

        logger.info(
            "Database connected"
        )

    except Exception as e:

        logger.warning(
            "Database connection failed: %s",
            e
        )

        engine = None


# ============================================================
# KAFKA CONSUMER
# ============================================================

def create_consumer_with_retry():

    max_retries = 30
    retry_interval = 5

    for attempt in range(
        1,
        max_retries + 1
    ):

        try:

            logger.info(
                "Attempting to connect to Kafka at %s "
                "(attempt %d/%d)",
                BROKER,
                attempt,
                max_retries
            )

            consumer = KafkaConsumer(
                TOPIC,
                bootstrap_servers=[BROKER],

                value_deserializer=lambda message:
                    json.loads(
                        message.decode("utf-8")
                    ),

                auto_offset_reset="latest",

                enable_auto_commit=True,

                group_id="fraud_processor",

                request_timeout_ms=30000,

                retry_backoff_ms=1000
            )

            logger.info(
                "Successfully connected to Kafka"
            )

            return consumer

        except Exception as e:

            logger.warning(
                "Kafka connection failed: %s. "
                "Retrying in %d seconds...",
                e,
                retry_interval
            )

            time.sleep(
                retry_interval
            )

    raise RuntimeError(
        "Failed to connect to Kafka after "
        f"{max_retries} attempts"
    )


consumer = create_consumer_with_retry()


# ============================================================
# SHAP TOP FEATURES
# ============================================================

def top_shap(x):

    if not SHAP_OK:
        return []

    try:

        values = explainer.shap_values(
            x.reshape(1, -1)
        )

        if isinstance(
            values,
            np.ndarray
        ):

            shap_values = values

        else:

            shap_values = values[1]

        shap_values = shap_values[0]

        indices = np.argsort(
            np.abs(shap_values)
        )[::-1][:5]

        return [
            {
                "feature": FEATURE_NAMES[i],
                "contribution": float(
                    shap_values[i]
                )
            }
            for i in indices
        ]

    except Exception as e:

        logger.warning(
            "SHAP calculation failed: %s",
            e
        )

        return []


# ============================================================
# MODEL DRIFT
# ============================================================

def write_drift(prob: float):

    global _drift_counter

    _score_window.append(
        prob
    )

    _drift_counter += 1

    if (
        _drift_counter %
        _DRIFT_WRITE_EVERY
        != 0
    ):
        return

    if len(_score_window) < 10:
        return

    scores = list(
        _score_window
    )

    threshold = load_threshold()

    rolling_alert_rate = float(
        np.mean(
            [
                score >= threshold
                for score in scores
            ]
        )
    )

    baseline_fraud_rate = (
        MODEL_META.get(
            "fraud_rate_pct",
            0.172
        )
        / 100.0
    )

    drift_ratio = (
        rolling_alert_rate
        / (baseline_fraud_rate + 1e-9)
    )

    drift_status = "stable"

    if drift_ratio > 3.0:

        drift_status = "high"

    elif drift_ratio > 1.5:

        drift_status = "elevated"

    drift_payload = {

        "ts":
            datetime.utcnow()
            .isoformat(
                timespec="seconds"
            )
            + "Z",

        "window_size":
            len(scores),

        "rolling_alert_rate":
            round(
                rolling_alert_rate,
                4
            ),

        "baseline_fraud_rate":
            round(
                baseline_fraud_rate,
                4
            ),

        "drift_ratio":
            round(
                drift_ratio,
                3
            ),

        "drift_status":
            drift_status,

        "mean_score":
            round(
                float(
                    np.mean(scores)
                ),
                4
            ),

        "p95_score":
            round(
                float(
                    np.percentile(
                        scores,
                        95
                    )
                ),
                4
            ),

        "model_f1":
            MODEL_META.get(
                "f1",
                "N/A"
            ),

        "model_name":
            MODEL_META.get(
                "model",
                "unknown"
            )
    }

    directory = os.path.dirname(
        DRIFT_SINK
    )

    if directory:

        os.makedirs(
            directory,
            exist_ok=True
        )

    with open(
        DRIFT_SINK,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            drift_payload,
            file,
            indent=2
        )

    if drift_status != "stable":

        logger.warning(
            "DRIFT %s: ratio=%.2f "
            "rolling_rate=%.4f",
            drift_status,
            drift_ratio,
            rolling_alert_rate
        )


# ============================================================
# SLACK ALERT
# ============================================================

def slack(
    prob,
    amount,
    ts,
    top
):

    if not SLACK:
        return

    try:

        drivers = ", ".join(
            f"{item['feature']}="
            f"{item['contribution']:.3f}"
            for item in top
        )

        payload = {
            "text":
                f":rotating_light: "
                f"FRAUD {prob:.2f} | "
                f"amt={amount:.2f} | "
                f"ts={ts} | "
                f"{drivers}"
        }

        requests.post(
            SLACK,
            data=json.dumps(payload),
            timeout=10
        )

    except Exception as e:

        logger.warning(
            "Slack notification failed: %s",
            e
        )


# ============================================================
# PROCESS TRANSACTIONS
# ============================================================

logger.info(
    "Fraud stream processor is running..."
)


for message in consumer:

    try:

        rec = message.value

        ts = (
            datetime.utcnow()
            .isoformat(
                timespec="seconds"
            )
            + "Z"
        )

        # ----------------------------------------------------
        # Producer metadata
        # ----------------------------------------------------

        transaction_id = rec.get(
            "transaction_id",
            ""
        )

        customer_id = rec.get(
            "customer_id",
            ""
        )

        merchant = rec.get(
            "merchant",
            ""
        )

        location = rec.get(
            "location",
            ""
        )

        device_id = rec.get(
            "device_id",
            ""
        )

        scenario = rec.get(
            "scenario",
            ""
        )

        # ----------------------------------------------------
        # Feature extraction
        # ----------------------------------------------------

        x = to_features(
            rec
        )

        # ----------------------------------------------------
        # ML prediction
        # ----------------------------------------------------

        if hasattr(
            model,
            "predict_proba"
        ):

            prob = float(
                model.predict_proba(
                    x.reshape(1, -1)
                )[0, 1]
            )

        else:

            prob = float(
                model.predict(
                    x.reshape(1, -1)
                )[0]
            )

        # Keep probability in valid range
        prob = max(
            0.0,
            min(
                1.0,
                prob
            )
        )

        # Amount is already included in FEATURE_NAMES,
        # but we keep this variable for alerts/logging.
        amount = float(
            rec.get(
                "Amount",
                0.0
            )
        )

        # ----------------------------------------------------
        # Alert severity
        # ----------------------------------------------------

        if prob >= 0.95:
            severity = "CRITICAL"
        elif prob >= 0.80:
            severity = "HIGH"
        elif prob >= 0.50:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        # ----------------------------------------------------
        # Threshold decision
        # ----------------------------------------------------

        threshold = load_threshold()

        is_alert = (
            prob >= threshold
        )

        # ----------------------------------------------------
        # Drift tracking
        # ----------------------------------------------------

        write_drift(
            prob
        )

        # ----------------------------------------------------
        # Latest transactions CSV
        # ----------------------------------------------------

        with open(
            LATEST_SINK,
            "a",
            newline="",
            encoding="utf-8"
        ) as file:

            csv.writer(
                file
            ).writerow(
                [
                    ts,
                    prob,

                    transaction_id,
                    customer_id,
                    merchant,
                    location,
                    device_id,
                    scenario,

                    *[
                        rec.get(
                            name,
                            ""
                        )
                        for name in FEATURE_NAMES
                    ],

                    int(is_alert)
                ]
            )

        # ----------------------------------------------------
        # Fraud alert
        # ----------------------------------------------------

        if is_alert:

            top = top_shap(
                x
            )

            with open(
                ALERTS_SINK,
                "a",
                newline="",
                encoding="utf-8"
            ) as file:

                csv.writer(
                    file
                ).writerow(
                    [
                        ts,
                        prob,

                        transaction_id,
                        customer_id,
                        merchant,
                        location,
                        device_id,
                        scenario,

                        *[
                            rec.get(
                                name,
                                ""
                            )
                            for name in FEATURE_NAMES
                        ],

                        json.dumps(top)
                    ]
                )

            logger.warning(
                "FRAUD ALERT | "
                "ID=%s | "
                "Customer=%s | "
                "Merchant=%s | "
                "Location=%s | "
                "prob=%.4f | "
                "amount=%.2f",
                transaction_id,
                customer_id,
                merchant,
                location,
                prob,
                amount
            )

            # ------------------------------------------------
            # Slack
            # ------------------------------------------------

            slack(
                prob,
                amount,
                ts,
                top
            )

            # ------------------------------------------------
            # PostgreSQL
            # ------------------------------------------------

            if engine:

                try:

                    with engine.begin() as conn:

                        conn.execute(
                            sa.text(
                                """
                                INSERT INTO alerts
                                (
                                    ts,
                                    prob,
                                    amount,
                                    transaction_id,
                                    customer_id,
                                    merchant,
                                    location,
                                    device_id,
                                    severity,
                                    features,
                                    shap
                                )
                                VALUES
                                (
                                    :ts,
                                    :prob,
                                    :amount,
                                    :transaction_id,
                                    :customer_id,
                                    :merchant,
                                    :location,
                                    :device_id,
                                    :severity,
                                    :features,
                                    :shap
                                )
                                """
                            ),
                            {
                                "ts": ts,

                                "prob": prob,

                                "amount": amount,

                                "transaction_id": transaction_id,

                                "customer_id": customer_id,

                                "merchant": merchant,

                                "location": location,

                                "device_id": device_id,

                                "severity": severity,

                                "features":
                                    json.dumps(
                                        {
                                            key:
                                                rec.get(
                                                    key
                                                )
                                            for key
                                            in FEATURE_NAMES
                                        }
                                    ),

                                "shap":
                                    json.dumps(
                                        top
                                    )
                            }
                        )

                except Exception as e:

                    logger.warning(
                        "Database insert failed: %s",
                        e
                    )

    except Exception as e:

        logger.exception(
            "Error processing transaction: %s",
            e
        )