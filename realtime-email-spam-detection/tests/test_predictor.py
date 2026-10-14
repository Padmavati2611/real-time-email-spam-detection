"""
Unit Tests for Machine Learning Predictor
"""

import pytest
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.predictor import EmailSpamPredictor

def test_empty_message():
    predictor = EmailSpamPredictor()
    result = predictor.predict("")
    assert result["predicted_class"] == "legitimate"
    assert result["spam_probability"] == 0.0
    assert result["is_spam"] is False

def test_spam_keyword_detection():
    predictor = EmailSpamPredictor()
    sample_spam = "URGENT! You have won a $1,000 lottery gift card prize. Claim your free cash now."
    result = predictor.predict(sample_spam)
    assert result["predicted_class"] == "spam"
    assert result["spam_probability"] >= 0.5
    assert result["is_spam"] is True

def test_legitimate_message_detection():
    predictor = EmailSpamPredictor()
    sample_ham = "Hey, are we still meeting for lunch at 12:30 at the Italian restaurant?"
    result = predictor.predict(sample_ham)
    assert result["predicted_class"] == "legitimate"
    assert result["spam_probability"] < 0.5
    assert result["is_spam"] is False
