"""
Project Configuration Module
Loads environment variables, sets directory paths, and enforces security constants.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
OUTPUTS_DIR = BASE_DIR / "outputs"

DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# Load variables from .env
load_dotenv(BASE_DIR / ".env")

# MongoDB Atlas Database Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "")
DB_NAME = os.getenv("DB_NAME", "realtime_spam_detection")

# Collection names
COLLECTION_EMAILS = "emails"
COLLECTION_MODEL_METRICS = "model_metrics"
COLLECTION_SYNC_STATE = "sync_state"

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8501")

# Minimum read-only Gmail scope
GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

# File paths for credentials & serialization
CLIENT_SECRETS_FILE = BASE_DIR / "credentials.json"
TOKEN_FILE = BASE_DIR / "token.json"
VECTORIZER_PATH = MODELS_DIR / "email_tfidf_vectorizer.joblib"
MODEL_NB_PATH = MODELS_DIR / "email_naive_bayes.joblib"
MODEL_LR_PATH = MODELS_DIR / "email_logistic_regression.joblib"
METRICS_JSON_PATH = OUTPUTS_DIR / "latest_metrics.json"

# Polling and Monitoring Parameters
DEFAULT_POLL_INTERVAL = int(os.getenv("POLLING_INTERVAL_SECONDS", "30"))
SAVE_EMAIL_BODY = os.getenv("SAVE_EMAIL_BODY_CONTENT", "false").lower() == "true"
