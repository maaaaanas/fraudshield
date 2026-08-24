import os
import csv
import time
import json
import logging
import random
import uuid

from datetime import datetime, timezone

from kafka import KafkaProducer
from kafka.errors import KafkaError


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

DATA_FILE = os.getenv(
    "DATA_FILE",
    "/app/data/creditcard.csv"
)

SAMPLE_SIZE = int(
    os.getenv(
        "SAMPLE_SIZE",
        "20"
    )
)

RATE_MS = int(
    os.getenv(
        "PRODUCER_RATE_MS",
        "1000"
    )
)

REPEAT = os.getenv(
    "REPEAT",
    "true"
).lower() == "true"


# ============================================================
# FRAUD SAMPLING
# ============================================================

# Percentage of each batch that should be fraud.
#
# 20 transactions:
#   80% normal = 16
#   20% fraud  = 4
#
# These are REAL records from creditcard.csv.
# ============================================================

FRAUD_RATIO = float(
    os.getenv(
        "FRAUD_RATIO",
        "0.20"
    )
)


# ============================================================
# SYNTHETIC METADATA
# ============================================================

CUSTOMERS = [
    "CUS-1001",
    "CUS-1002",
    "CUS-1003",
    "CUS-1004",
    "CUS-1005",
    "CUS-1006",
    "CUS-1007",
    "CUS-1008",
    "CUS-1009",
    "CUS-1010"
]

MERCHANTS = [
    "Amazon",
    "Flipkart",
    "ElectroMart",
    "Walmart",
    "Uber",
    "Swiggy",
    "Zomato",
    "BookMyShow",
    "Apple Store",
    "Microsoft Store"
]

LOCATIONS = [
    "Delhi",
    "Mumbai",
    "Bangalore",
    "Hyderabad",
    "Chennai",
    "Pune",
    "Kolkata",
    "Jaipur",
    "Gurgaon"
]

DEVICES = [
    "DEV-2001",
    "DEV-2002",
    "DEV-2003",
    "DEV-2004",
    "DEV-2005",
    "DEV-2006",
    "DEV-2007"
]


# ============================================================
# KAFKA PRODUCER
# ============================================================

def create_producer():

    retry_interval = 5
    max_retries = 30

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

            producer = KafkaProducer(
                bootstrap_servers=[BROKER],

                value_serializer=lambda value:
                    json.dumps(value).encode(
                        "utf-8"
                    ),

                acks="all",

                retries=5
            )

            logger.info(
                "Successfully connected to Kafka"
            )

            return producer

        except KafkaError as exc:

            logger.warning(
                "Kafka connection failed: %s. "
                "Retrying in %d seconds...",
                exc,
                retry_interval
            )

            time.sleep(
                retry_interval
            )

    raise RuntimeError(
        "Failed to connect to Kafka "
        "after maximum retries"
    )


# ============================================================
# DATASET LOADING
# ============================================================

def load_dataset():

    logger.info(
        "Loading real fraud dataset from %s",
        DATA_FILE
    )

    if not os.path.exists(DATA_FILE):

        raise FileNotFoundError(
            f"Dataset not found: {DATA_FILE}"
        )

    transactions = []

    with open(
        DATA_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            transactions.append(
                row
            )

    logger.info(
        "Loaded %d real transactions from dataset",
        len(transactions)
    )

    if not transactions:

        raise RuntimeError(
            "Dataset contains no transactions"
        )

    return transactions


# ============================================================
# SPLIT NORMAL / FRAUD DATA
# ============================================================

def split_dataset(dataset):

    normal = []
    fraud = []

    for row in dataset:

        try:

            classification = float(
                row.get(
                    "Class",
                    0
                )
            )

        except (
            ValueError,
            TypeError
        ):

            classification = 0.0

        if classification == 1.0:

            fraud.append(
                row
            )

        else:

            normal.append(
                row
            )

    logger.info(
        "Dataset distribution: "
        "normal=%d | fraud=%d",
        len(normal),
        len(fraud)
    )

    if not fraud:

        raise RuntimeError(
            "No fraud transactions found "
            "in dataset"
        )

    if not normal:

        raise RuntimeError(
            "No normal transactions found "
            "in dataset"
        )

    return normal, fraud


# ============================================================
# SELECT CONTROLLED BATCH
# ============================================================

def select_batch(
    normal,
    fraud
):

    batch_size = min(
        SAMPLE_SIZE,
        len(normal) + len(fraud)
    )

    # --------------------------------------------------------
    # Number of fraud transactions
    # --------------------------------------------------------

    fraud_count = round(
        batch_size * FRAUD_RATIO
    )

    # Always include at least one fraud
    # when fraud sampling is enabled.
    if (
        FRAUD_RATIO > 0
        and fraud_count == 0
    ):

        fraud_count = 1

    # Never request more fraud records
    # than the dataset contains.
    fraud_count = min(
        fraud_count,
        len(fraud)
    )

    normal_count = (
        batch_size
        - fraud_count
    )

    # --------------------------------------------------------
    # Safety check
    # --------------------------------------------------------

    if normal_count > len(normal):

        normal_count = len(normal)

        batch_size = (
            normal_count
            + fraud_count
        )

    # --------------------------------------------------------
    # Sample REAL records
    # --------------------------------------------------------

    selected_normal = random.sample(
        normal,
        normal_count
    )

    selected_fraud = random.sample(
        fraud,
        fraud_count
    )

    selected = (
        selected_normal
        + selected_fraud
    )

    # --------------------------------------------------------
    # Shuffle the batch
    #
    # This prevents all fraud transactions
    # appearing together.
    # --------------------------------------------------------

    random.shuffle(
        selected
    )

    return selected


# ============================================================
# ENRICH REAL TRANSACTION
# ============================================================

def enrich_transaction(row):

    transaction = {}

    # --------------------------------------------------------
    # Preserve REAL ML features exactly
    # --------------------------------------------------------

    for feature in [
        *[
            f"V{i}"
            for i in range(1, 29)
        ],
        "Amount",
        "Class"
    ]:

        value = row.get(
            feature,
            "0"
        )

        try:

            transaction[feature] = float(
                value
            )

        except (
            ValueError,
            TypeError
        ):

            transaction[feature] = 0.0

    # --------------------------------------------------------
    # Synthetic metadata
    # --------------------------------------------------------

    transaction["transaction_id"] = (
        "TXN-"
        + uuid.uuid4().hex[:10].upper()
    )

    transaction["customer_id"] = (
        random.choice(
            CUSTOMERS
        )
    )

    transaction["merchant"] = (
        random.choice(
            MERCHANTS
        )
    )

    transaction["location"] = (
        random.choice(
            LOCATIONS
        )
    )

    transaction["device_id"] = (
        random.choice(
            DEVICES
        )
    )

    transaction["timestamp"] = (
        datetime.now(
            timezone.utc
        ).isoformat()
    )

    # --------------------------------------------------------
    # Scenario
    # --------------------------------------------------------

    if transaction["Class"] == 1.0:

        transaction["scenario"] = (
            "fraud"
        )

    else:

        transaction["scenario"] = (
            "normal"
        )

    # --------------------------------------------------------
    # Source
    # --------------------------------------------------------

    transaction["source"] = (
        "creditcard_dataset"
    )

    return transaction


# ============================================================
# STREAM TRANSACTIONS
# ============================================================

def stream_transactions(
    producer,
    normal,
    fraud
):

    selected = select_batch(
        normal,
        fraud
    )

    logger.info(
        "Streaming %d transactions "
        "to Kafka topic '%s'",
        len(selected),
        TOPIC
    )

    fraud_in_batch = sum(
        1
        for row in selected
        if float(
            row.get(
                "Class",
                0
            )
        ) == 1.0
    )

    normal_in_batch = (
        len(selected)
        - fraud_in_batch
    )

    logger.info(
        "Batch composition: "
        "normal=%d | fraud=%d",
        normal_in_batch,
        fraud_in_batch
    )

    for index, row in enumerate(
        selected,
        start=1
    ):

        transaction = (
            enrich_transaction(
                row
            )
        )

        producer.send(
            TOPIC,
            transaction
        )

        logger.info(
            "Sent %d/%d | "
            "ID=%s | "
            "Customer=%s | "
            "Amount=%.2f | "
            "Class=%d | "
            "Scenario=%s",
            index,
            len(selected),
            transaction[
                "transaction_id"
            ],
            transaction[
                "customer_id"
            ],
            transaction[
                "Amount"
            ],
            int(
                transaction[
                    "Class"
                ]
            ),
            transaction[
                "scenario"
            ]
        )

        time.sleep(
            RATE_MS / 1000.0
        )

    producer.flush()

    logger.info(
        "Finished streaming %d transactions",
        len(selected)
    )


# ============================================================
# MAIN
# ============================================================

def main():

    logger.info(
        "=" * 60
    )

    logger.info(
        "FRAUDSHIELD TRANSACTION PRODUCER"
    )

    logger.info(
        "=" * 60
    )

    logger.info(
        "Kafka broker: %s",
        BROKER
    )

    logger.info(
        "Kafka topic: %s",
        TOPIC
    )

    logger.info(
        "Dataset: %s",
        DATA_FILE
    )

    logger.info(
        "Sample size: %d",
        SAMPLE_SIZE
    )

    logger.info(
        "Transaction interval: %d ms",
        RATE_MS
    )

    logger.info(
        "Fraud ratio: %.0f%%",
        FRAUD_RATIO * 100
    )

    logger.info(
        "Repeat mode: %s",
        REPEAT
    )

    # --------------------------------------------------------
    # Load dataset
    # --------------------------------------------------------

    dataset = load_dataset()

    # --------------------------------------------------------
    # Separate real normal/fraud transactions
    # --------------------------------------------------------

    normal, fraud = split_dataset(
        dataset
    )

    # --------------------------------------------------------
    # Kafka
    # --------------------------------------------------------

    producer = create_producer()

    logger.info(
        "Starting transaction producer"
    )

    logger.info(
        "Real normal records: %d",
        len(normal)
    )

    logger.info(
        "Real fraud records: %d",
        len(fraud)
    )

    # --------------------------------------------------------
    # Streaming loop
    # --------------------------------------------------------

    try:

        while True:

            stream_transactions(
                producer,
                normal,
                fraud
            )

            if not REPEAT:

                break

            # Small pause between batches.
            time.sleep(1)

    except KeyboardInterrupt:

        logger.info(
            "Producer stopped by user"
        )

    finally:

        producer.flush()

        producer.close()

        logger.info(
            "Kafka producer closed"
        )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()