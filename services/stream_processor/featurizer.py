import numpy as np
# Match training order exactly:
FEATURE_NAMES = [f"V{i}" for i in range(1,29)] + ["Amount"]

def to_features(rec: dict) -> np.ndarray:
    return np.array([float(rec.get(k,0.0)) for k in FEATURE_NAMES], dtype=float)
