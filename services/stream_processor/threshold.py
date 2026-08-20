import os, json
THRESHOLD_FILE = os.getenv("THRESHOLD_FILE","/app/data/threshold.json")
DEFAULT=0.5

def load_threshold()->float:
    try:
        with open(THRESHOLD_FILE) as f:
            return float(json.load(f).get("threshold", DEFAULT))
    except Exception:
        return DEFAULT
