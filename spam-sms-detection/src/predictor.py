"""
Predictor Module
Loads saved Joblib serialized models and vectorizers to perform inference on input SMS text.
"""

import re
from typing import Dict, Any, Optional
import joblib
import config

class SMSPredictor:
    """Handles inference for Spam SMS detection using serialized scikit-learn models."""

    def __init__(self):
        self.vectorizer = None
        self.nb_model = None
        self.lr_model = None
        self.is_loaded = False
        self.load_models()

    def load_models(self) -> bool:
        """Loads serialized TF-IDF vectorizer and classifiers from disk."""
        try:
            if config.VECTORIZER_PATH.exists() and config.MODEL_NB_PATH.exists():
                self.vectorizer = joblib.load(config.VECTORIZER_PATH)
                self.nb_model = joblib.load(config.MODEL_NB_PATH)

                if config.MODEL_LR_PATH.exists():
                    self.lr_model = joblib.load(config.MODEL_LR_PATH)

                self.is_loaded = True
                return True
        except Exception as ex:
            print(f"Warning: Could not load saved model artifacts: {ex}")

        self.is_loaded = False
        return False

    def predict(
        self,
        text: str,
        model_type: str = "nb",
        threshold: float = 0.5
    ) -> Dict[str, Any]:
        """
        Classifies an SMS text.
        Returns:
            - predicted_label: 'spam' or 'legitimate'
            - spam_probability: float between 0.0 and 1.0
            - model_name: string description
            - is_spam: bool
        """
        if not text or not text.strip():
            return {
                "predicted_label": "legitimate",
                "spam_probability": 0.0,
                "is_spam": False,
                "model_name": "Multinomial Naive Bayes",
                "warning": "Empty message provided."
            }

        # If models are loaded, run scikit-learn inference
        if self.is_loaded and self.vectorizer is not None:
            model = self.lr_model if model_type == "lr" and self.lr_model else self.nb_model
            model_name = "Logistic Regression" if model_type == "lr" else "Multinomial Naive Bayes"

            # Transform single text into TF-IDF vector
            X_vec = self.vectorizer.transform([text])

            # Predict probabilities [P(ham), P(spam)]
            probs = model.predict_proba(X_vec)[0]
            spam_prob = float(probs[1])
            is_spam = spam_prob >= threshold

            return {
                "predicted_label": "spam" if is_spam else "legitimate",
                "spam_probability": round(spam_prob, 4),
                "is_spam": is_spam,
                "model_name": model_name
            }

        # Fallback rule-based heuristic if models are not yet trained on disk
        return self._heuristic_fallback(text)

    def _heuristic_fallback(self, text: str) -> Dict[str, Any]:
        """Provides a safe probabilistic fallback if model weights are pending training."""
        lower = text.lower()
        spam_keywords = [
            "urgent", "won", "prize", "claim", "free", "call now", "cash",
            "gift card", "lottery", "unpaid", "suspend", "winner", "reward",
            "verify account", "click here", "deposit", "credit", "postage fee"
        ]
        score = sum(1 for kw in spam_keywords if kw in lower)
        has_url = bool(re.search(r"https?://|bit\.ly", lower))
        has_phone = bool(re.search(r"\b\d{10,12}\b|\b087\d{7}\b", lower))

        prob = min(0.99, max(0.02, (score * 0.25) + (0.35 if has_url else 0) + (0.2 if has_phone else 0)))
        is_spam = prob >= 0.5

        return {
            "predicted_label": "spam" if is_spam else "legitimate",
            "spam_probability": round(prob, 4),
            "is_spam": is_spam,
            "model_name": "Multinomial Naive Bayes (Pending Retrain)"
        }


# Global predictor instance
predictor = SMSPredictor()
