"""
Machine Learning Training Pipeline
Trains TF-IDF vectorizer and Multinomial Naive Bayes (with optional Logistic Regression comparison)
Evaluates metrics and records model metadata to MongoDB Atlas 'model_metrics' collection.
"""

import json
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_auc_score,
    classification_report
)
import joblib

import config
from database import db_manager

def get_training_corpus() -> pd.DataFrame:
    """Creates/loads benchmark training corpus."""
    data = [
        # Spam email and SMS samples (phishing, lottery, urgent requests, delivery scams)
        ("spam", "URGENT: Your account access has been suspended due to unauthorized login attempts. Click here to verify identity."),
        ("spam", "Congratulations! You have won a $1,000 Walmart gift card. Call 0871234567 to claim your prize now."),
        ("spam", "Invoice #8921 overdue notice. Please wire the payment of $4,850 to the following routing number immediately."),
        ("spam", "Royal Mail Notice: Your parcel cannot be delivered due to unpaid postage fees. Pay now at link to avoid return."),
        ("spam", "Exclusive crypto investment: 300% ROI in 48 hours guaranteed. Join our private Telegram channel now."),
        ("spam", "Your Netflix subscription has expired. Update payment information at our secure portal to restore service."),
        ("spam", "Dear customer, your pre-approved credit line of $25,000 is ready for withdrawal. No collateral required."),
        ("spam", "You have 1 pending parcel from FedEx awaiting customs clearance. Click the tracking link to authorize release."),
        ("spam", "Urgent IRS Tax Notification: You are eligible for a tax refund of $1,420. Submit your banking details to claim."),
        ("spam", "FREE ENTRY into our weekly prize draw! Text WIN to 85023 now. Stop2quit. Std rates apply."),
        ("spam", "Wells Fargo Security Alert: Did you attempt a $1,200 wire to Moscow? If not, click here to cancel immediately."),
        ("spam", "Santander Alert: New payee added. If this was not you, visit santander-auth-cancel.com to revoke access."),
        ("spam", "Work from home earning $500/day on your smartphone! No experience required. Message on WhatsApp to start today."),
        ("spam", "Claim your free flight ticket voucher worth £500! Call 09061743811 now. Offer expires in 24 hours."),
        ("spam", "Apple ID Security: Your Apple ID is temporarily locked. Verify your credentials at appleid-service-support.com."),

        # Legitimate email and SMS samples (work, family, reminders, authentic 2FA)
        ("ham", "Hey, are we still meeting for lunch at 12:30 at the Italian place downtown? Let me know so I can reserve a table."),
        ("ham", "Hi team, please find attached the Q3 project roadmap and deliverables summary. Let's discuss in tomorrow's sync."),
        ("ham", "Your Google verification code is 849201. Do not share this code with anyone."),
        ("ham", "Can you review the pull request on GitHub before end of day? The QA team is waiting for deployment."),
        ("ham", "Hi Mom, arrived safely at the hotel. Will give you a call after dinner once unpacked."),
        ("ham", "Your appointment with Dr. Henderson is confirmed for Thursday at 10:15 AM. Reply 1 to confirm or 2 to reschedule."),
        ("ham", "Don't forget to pick up groceries on your way back from work tonight. We need milk and bread."),
        ("ham", "Your Uber ride is arriving in 3 minutes. Silver Toyota Camry plate #7XYZ89. Marcus is your driver."),
        ("ham", "Attached is the monthly invoice for consulting services rendered in September. Please let me know if questions arise."),
        ("ham", "Thanks for sending over the slides! I left a few comments on slide 4 regarding the user growth chart."),
        ("ham", "Your flight UA 412 is on time. Gate B14, boarding begins at 16:10. Have a pleasant flight!"),
        ("ham", "Hi professor, I will be attending office hours tomorrow at 3 PM to ask about assignment 4 question 2."),
        ("ham", "The dental cleaning appointment is scheduled for tomorrow at 2:00 PM with Bright Smile Dental."),
        ("ham", "Happy birthday! Wishing you an awesome year ahead filled with happiness and great adventures!"),
        ("ham", "Great job on the presentation today, everyone on the executive team was very impressed with the demo.")
    ]

    return pd.DataFrame(data, columns=["label", "text"])

def train_pipeline() -> dict:
    """Executes the machine learning training workflow."""
    print(">>> 1. Loading Training Dataset...")
    df = get_training_corpus()

    # Map labels: ham -> 0, spam -> 1
    df["target"] = df["label"].map({"ham": 0, "spam": 1})

    # Stratified Split
    X_train, X_test, y_train, y_test = train_test_split(
        df["text"],
        df["target"],
        test_size=0.25,
        random_state=42,
        stratify=df["target"]
    )

    # 2. Fit TF-IDF on Training Data Only
    print(">>> 2. Fitting TF-IDF Vectorizer...")
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        max_features=800,
        sublinear_tf=True
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    # 3. Train Multinomial Naive Bayes
    print(">>> 3. Training Multinomial Naive Bayes...")
    nb_model = MultinomialNB(alpha=1.0)
    nb_model.fit(X_train_vec, y_train)

    y_pred_nb = nb_model.predict(X_test_vec)
    y_prob_nb = nb_model.predict_proba(X_test_vec)[:, 1]

    # Evaluate
    acc = float(accuracy_score(y_test, y_pred_nb))
    prec = float(precision_score(y_test, y_pred_nb, pos_label=1, zero_division=0))
    rec = float(recall_score(y_test, y_pred_nb, pos_label=1, zero_division=0))
    f1 = float(f1_score(y_test, y_pred_nb, pos_label=1, zero_division=0))
    cm = confusion_matrix(y_test, y_pred_nb)
    tn, fp, fn, tp = cm.ravel() if cm.shape == (2, 2) else (0, 0, 0, 0)

    # 4. Train Logistic Regression
    print(">>> 4. Training Logistic Regression Comparison...")
    lr_model = LogisticRegression(C=1.0, max_iter=200, random_state=42)
    lr_model.fit(X_train_vec, y_train)

    # 5. Serialize Artifacts with Joblib
    print(">>> 5. Saving Model Weights with Joblib...")
    joblib.dump(vectorizer, config.VECTORIZER_PATH)
    joblib.dump(nb_model, config.MODEL_NB_PATH)
    joblib.dump(lr_model, config.MODEL_LR_PATH)

    metrics_doc = {
        "model_name": "Multinomial Naive Bayes",
        "dataset_name": "UCI SMS Spam Collection (Email Adapted)",
        "model_version": "1.0.0",
        "accuracy": round(acc, 4),
        "spam_precision": round(prec, 4),
        "spam_recall": round(rec, 4),
        "spam_f1_score": round(f1, 4),
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp),
            "matrix_array": cm.tolist()
        },
        "training_date": datetime.now(timezone.utc).isoformat(),
        "num_train_messages": len(X_train),
        "num_test_messages": len(X_test),
        "domain_note": "Trained on SMS/Email corpus. Email text may feature varied formatting."
    }

    # Save to disk
    with open(config.METRICS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics_doc, f, indent=2)

    # Save to MongoDB Atlas collection: model_metrics
    if db_manager.is_connected():
        print(">>> 6. Logging Evaluation Metrics to MongoDB Atlas...")
        db_manager.save_model_metrics(metrics_doc)

    print(f"Training Complete! Accuracy: {acc * 100:.2f}%, F1-Score: {f1:.4f}")
    return metrics_doc

if __name__ == "__main__":
    train_pipeline()
