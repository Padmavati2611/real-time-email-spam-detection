"""
Application Configuration Module
Loads environment variables and sets up project paths and constants.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Base Directory paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
OUTPUTS_DIR = BASE_DIR / "outputs"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# Load environment variables from .env if present
load_dotenv(BASE_DIR / ".env")

# MongoDB Atlas Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "")
DB_NAME = os.getenv("DB_NAME", "spam_sms_detection")

# MongoDB Collection Names
COLLECTION_PREDICTIONS = "predictions"
COLLECTION_MODEL_METRICS = "model_metrics"
COLLECTION_FEEDBACK = "feedback"

# Machine Learning Artifact Paths
VECTORIZER_PATH = MODELS_DIR / "tfidf_vectorizer.joblib"
MODEL_NB_PATH = MODELS_DIR / "naive_bayes_model.joblib"
MODEL_LR_PATH = MODELS_DIR / "logistic_regression_model.joblib"
METRICS_JSON_PATH = OUTPUTS_DIR / "latest_metrics.json"

# Dataset URL or path
DATASET_FILE = DATA_DIR / "spam.csv"
UCI_SMS_URL = "https://raw.githubusercontent.com/justmarkham/pycon-2016-tutorial/master/data/sms.tsv"
