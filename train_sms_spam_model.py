# ==============================================================================
# SPAM SMS DETECTION - SCIKIT-LEARN PIPELINE
# Train and evaluate Multinomial Naive Bayes & Logistic Regression with TF-IDF
# ==============================================================================

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, roc_auc_score
import joblib

def main():
    print(">>> 1. Loading SMS Dataset...")
    # Load dataset (expected columns: 'label', 'message')
    df = pd.read_csv('sms_spam_dataset.csv')
    print(f"Total SMS samples: {len(df)}")
    print(df['label'].value_counts())

    # Map labels: ham -> 0, spam -> 1
    df['target'] = df['label'].map({'ham': 0, 'spam': 1})

    # Train / Test Stratified Split
    X_train, X_test, y_train, y_test = train_test_split(
        df['message'],
        df['target'],
        test_size=0.25,
        random_state=42,
        stratify=df['target']
    )
    print(f"Train samples: {len(X_train)}, Test samples: {len(X_test)}")

    # >>> 2. TF-IDF Numerical Vectorization
    print("\n>>> 2. Building TF-IDF Feature Matrix...")
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words='english',
        ngram_range=(1, 2),
        max_features=800,
        sublinear_tf=True,
        min_df=1
    )

    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_test_tfidf = vectorizer.transform(X_test)
    print(f"Vocabulary size: {len(vectorizer.get_feature_names_out())} features")

    # >>> 3. Model 1: Multinomial Naive Bayes
    print("\n=======================================================")
    print(">>> 3. Training Multinomial Naive Bayes (alpha=1.0)...")
    nb_model = MultinomialNB(alpha=1.0)
    nb_model.fit(X_train_tfidf, y_train)

    y_pred_nb = nb_model.predict(X_test_tfidf)
    y_prob_nb = nb_model.predict_proba(X_test_tfidf)[:, 1]

    print(f"Naive Bayes Accuracy: {accuracy_score(y_test, y_pred_nb):.4f}")
    print(f"Naive Bayes ROC-AUC:  {roc_auc_score(y_test, y_prob_nb):.4f}")
    print("\nNaive Bayes Classification Report:")
    print(classification_report(y_test, y_pred_nb, target_names=['Ham', 'Spam']))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred_nb))

    # >>> 4. Model 2: Logistic Regression
    print("\n=======================================================")
    print(">>> 4. Training Logistic Regression (C=1.0)...")
    lr_model = LogisticRegression(C=1.0, max_iter=200, random_state=42)
    lr_model.fit(X_train_tfidf, y_train)

    y_pred_lr = lr_model.predict(X_test_tfidf)
    y_prob_lr = lr_model.predict_proba(X_test_tfidf)[:, 1]

    print(f"Logistic Regression Accuracy: {accuracy_score(y_test, y_pred_lr):.4f}")
    print(f"Logistic Regression ROC-AUC:  {roc_auc_score(y_test, y_prob_lr):.4f}")
    print("\nLogistic Regression Classification Report:")
    print(classification_report(y_test, y_pred_lr, target_names=['Ham', 'Spam']))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred_lr))

    # >>> 5. Export Models with Joblib
    print("\n>>> 5. Saving trained models and vectorizer...")
    joblib.dump(vectorizer, 'sms_tfidf_vectorizer.joblib')
    joblib.dump(nb_model, 'sms_naive_bayes.joblib')
    joblib.dump(lr_model, 'sms_logistic_regression.joblib')
    print("Models saved successfully!")

    # >>> 6. Live Inference Demonstration
    sample_messages = [
        "URGENT! You have won a £1,000 Walmart gift card! Call 0871234567 to claim your prize now.",
        "Hey, are we still meeting for lunch at 12:30 at the Italian place downtown?",
        "Santander Alert: A new payee was added. If this was NOT you, visit https://santander-sec-auth.com",
        "Your Google verification code is 849201. Do not share this code."
    ]

    print("\n>>> 6. Live Inference Test:")
    sample_vecs = vectorizer.transform(sample_messages)
    preds = nb_model.predict(sample_vecs)
    probs = nb_model.predict_proba(sample_vecs)[:, 1]

    for msg, pred, prob in zip(sample_messages, preds, probs):
        label = "SPAM" if pred == 1 else "LEGITIMATE (HAM)"
        print(f"[{label} ({prob*100:.1f}%)] -> {msg[:60]}...")

if __name__ == '__main__':
    main()
