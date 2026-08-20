import os, csv, time, json, logging, random
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

RATE_MS = int(os.getenv("PRODUCER_RATE_MS", "1000"))
TOPIC = os.getenv("TOPIC_TRANSACTIONS", "transactions")
DATA_FILE = os.getenv("DATA_FILE", "/app/data/creditcard.csv")
BROKER = os.getenv("KAFKA_BROKER", "kafka:9092")
REPEAT = os.getenv("REPEAT","true").lower()=="true"

def create_producer_with_retry():
    max_retries = 30
    retry_interval = 5
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Attempting to connect to Kafka at {BROKER} (attempt {attempt + 1})")
            producer = KafkaProducer(
                bootstrap_servers=BROKER,
                value_serializer=lambda v: json.dumps(v).encode(),
                request_timeout_ms=30000,
                retry_backoff_ms=1000
            )
            logger.info("Successfully connected to Kafka")
            return producer
        except NoBrokersAvailable:
            logger.warning(f"Kafka not available yet. Retrying in {retry_interval} seconds...")
            time.sleep(retry_interval)
        except Exception as e:
            logger.error(f"Error connecting to Kafka: {e}. Retrying in {retry_interval} seconds...")
            time.sleep(retry_interval)
    
    raise Exception(f"Failed to connect to Kafka after {max_retries} attempts")

producer = create_producer_with_retry()

def run_once():
    # Sample from the large dataset instead of loading everything
    total_lines = 284807  # approximate line count for creditcard.csv
    sample_size = 1000    # Sample 1000 transactions at a time
    
    with open(DATA_FILE, encoding='utf-8') as f:
        # Read header
        headers = next(csv.reader(f)).copy()
        
        # Create random line numbers to sample
        sample_lines = sorted(random.sample(range(1, total_lines), min(sample_size, total_lines-1)))
        
        # Reset file pointer
        f.seek(0)
        reader = csv.reader(f)
        next(reader)  # Skip header
        
        sampled_rows = []
        current_line = 1
        
        for line in reader:
            if current_line in sample_lines:
                row_dict = dict(zip(headers, line))
                sampled_rows.append(row_dict)
                sample_lines.remove(current_line)
                if not sample_lines:
                    break
            current_line += 1
    
    # Shuffle the sampled rows for variety
    random.shuffle(sampled_rows)
    
    for i, row in enumerate(sampled_rows):
        # Add current timestamp
        row['ts'] = time.time()
        
        # Convert numeric fields
        for key in row:
            if key not in ['ts']:
                try:
                    row[key] = float(row[key])
                except ValueError:
                    pass
        
        producer.send(TOPIC, row)
        if i % 50 == 0:
            logger.info("sent %d msgs (Amount: %.2f, Class: %s)", i, float(row.get('Amount', 0)), row.get('Class', 'unknown'))
        time.sleep(RATE_MS/1000.0)

if __name__ == "__main__":
    logger.info("Starting transaction producer")
    while True:
        run_once()
        if not REPEAT: break
