"""
Inference Predictor Engine
Loads serialized Joblib models (TF-IDF vectorizer + Multinomial Naive Bayes) to classify emails.
"""

from typing import Dict, Any, Optional
import joblib
import config

class EmailSpamPredictor:
    """Predicts spam probabilities for incoming emails."""

    def __init__(self):
        self.vectorizer = None
        self.nb_model = None
        self.lr_model = None
        self.is_loaded = False
        self.load_models()

    def load_models(self) -> bool:
        """Loads serialized models from disk."""
        try:
            if config.VECTORIZER_PATH.exists() and config.MODEL_NB_PATH.exists():
                self.vectorizer = joblib.load(config.VECTORIZER_PATH)
                self.nb_model = joblib.load(config.MODEL_NB_PATH)
                if config.MODEL_LR_PATH.exists():
                    self.lr_model = joblib.load(config.MODEL_LR_PATH)
                self.is_loaded = True
                return True
        except Exception as e:
            print(f"Notice: Model weights not found or loading failed: {e}")

        self.is_loaded = False
        return False

    def predict(
        self,
        text: str,
        model_type: str = "nb",
        threshold: float = 0.5
    ) -> Dict[str, Any]:
        """
        Classifies email text.
        Returns predicted_class, spam_probability, is_spam, and model_name.
        """
        if not text or not text.strip():
            return {
                "predicted_class": "legitimate",
                "spam_probability": 0.0,
                "is_spam": False,
                "model_name": "Multinomial Naive Bayes",
                "model_version": "1.0.0"
            }

        if self.is_loaded and self.vectorizer is not None:
            model = self.lr_model if model_type == "lr" and self.lr_model else self.nb_model
            model_name = "Logistic Regression" if model_type == "lr" else "Multinomial Naive Bayes"

            X_vec = self.vectorizer.transform([text])
            probs = model.predict_proba(X_vec)[0]
            spam_prob = float(probs[1])
            is_spam = spam_prob >= threshold

            return {
                "predicted_class": "spam" if is_spam else "legitimate",
                "spam_probability": round(spam_prob, 4),
                "is_spam": is_spam,
                "model_name": model_name,
                "model_version": "1.0.0"
            }

        # Fallback rule-based heuristic for un-trained state
        lower = text.lower()
        spam_signals = ["urgent", "wire transfer", "gift card", "lottery", "unpaid invoice", "bitcoin", "verify account", "login suspended", "claim prize"]
        count = sum(1 for kw in spam_signals if kw in lower)
        prob = min(0.98, max(0.02, count * 0.3))
        is_spam = prob >= threshold

        return {
            "predicted_class": "spam" if is_spam else "legitimate",
            "spam_probability": round(prob, 4),
            "is_spam": is_spam,
            "model_name": "Multinomial Naive Bayes (Baseline Heuristic)",
            "model_version": "1.0.0"
        }

predictor = EmailSpamPredictor()
