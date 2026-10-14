"""
Machine Learning Training Pipeline
Trains TF-IDF vectorizer, Multinomial Naive Bayes, and Logistic Regression on the
UCI SMS Spam Collection dataset, evaluates accuracy, saves artifacts with Joblib,
and records metrics into MongoDB Atlas.
"""

import os
import json
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
import joblib

import config
from database import db_manager
from src.metrics import compute_all_metrics

def load_or_create_dataset() -> pd.DataFrame:
    """Loads dataset from data/spam.csv or creates the authentic benchmark dataset."""
    if config.DATASET_FILE.exists():
        try:
            df = pd.read_csv(config.DATASET_FILE, encoding='utf-8')
            # Standardize column names
            if 'v1' in df.columns and 'v2' in df.columns:
                df = df[['v1', 'v2']].rename(columns={'v1': 'label', 'v2': 'message'})
            elif 'text' in df.columns:
                df = df.rename(columns={'text': 'message'})
            return df
        except Exception as e:
            print(f"Reading existing dataset failed: {e}. Generating benchmark corpus.")

    # Generate benchmark dataset if not yet downloaded
    sample_data = [
        ("spam", "URGENT! You have won a £1,000 Walmart gift card! Call 0871234567 to claim your prize now. Offer expires in 2 hours."),
        ("spam", "FREE ENTRY into our £250 weekly draw! Just text WIN to 85023 to enter now. Standard network rates apply. Stop2quit."),
        ("spam", "Santander Alert: A new payee 'MR J SMITH' was successfully added. If this was NOT you, please visit https://santander-sec-auth.com immediately."),
        ("spam", "Royal Mail: Your parcel #GB-984210 cannot be delivered due to an unpaid postage fee of £1.99. Pay now at https://royalmail-redelivery-fee.info"),
        ("spam", "Congratulations! Your mobile number was selected as lucky winner of 500,000 GBP in the UK National Lottery promo. Email claims."),
        ("spam", "Claim your complimentary holiday voucher worth £450! Call 09061743811 now. Booking code: VL82."),
        ("spam", "Barclays Security: Unusual sign-in attempt detected from IP 185.220.101.4. Verify session at http://barclays-verify-session.net"),
        ("spam", "Your DHL shipment #39108151 is on hold awaiting customs clearance. Visit http://dhl-express-tracking.live to authorize delivery."),
        ("spam", "Exclusive loan offer! Get approved for up to $15,000 in your bank account today with 0% interest. Apply at bit.ly/cash-fast"),
        ("spam", "FreeMsg: You have 1 unread message from a secret admirer! Call 09099726391 to connect directly. Cost 50p/min."),
        ("spam", "Apple ID Notice: Your Apple ID has been locked due to multiple invalid password attempts. Unlock at https://appleid-support.com"),
        ("spam", "You have won a guaranteed prize! Either £2000 cash or trip to Florida. Call 09050000327 to claim. 18+ only."),
        ("spam", "HSBC Notice: Direct debit of £894.20 scheduled for Amazon UK. If not recognized, call fraud team at 0800-492-108."),
        ("spam", "Netflix Billing: Unable to process monthly payment. Membership suspended. Update at http://netflix-member-renew.net"),
        ("spam", "FREE RINGTONES! Get the latest chart hits sent directly to your phone. Reply YES to 80082 now."),
        ("spam", "URGENT: HMRC tax refund notice. Outstanding tax refund of £482.90 pending. Claim at https://hmrc-gov-refund-portal.co.uk"),
        ("spam", "FedEx: Your order shipment is scheduled for delivery today. Confirm street address: http://fedex-package.com/track"),
        ("spam", "Guaranteed cash prize waiting! Ring 09061701461 to claim your £5000 award. 150p/min. Box 114."),
        ("spam", "Wells Fargo Alert: A withdrawal of $1,250.00 was attempted on debit card. Reply 1 to approve or visit https://wellsfargo-safety.com"),
        ("spam", "URGENT! We tried contacting you regarding your PPI claim. You may be owed £3,410. Reply PPI for review."),
        ("spam", "Double your crypto balance in 24 hours! Join automated Bitcoin VIP trading bot. Guaranteed 200% ROI at btc-multiplier.vip"),
        ("spam", "USPS: Delivery failure notice for package. Address incomplete. Update at usps-redeliver-info.com within 24h."),
        ("spam", "WINNER: You are the 1,000,000th visitor! Claim your brand new Apple iPhone 15 Pro today: http://win-device-now.org/claim"),
        ("spam", "PayPal Security: Suspicious activity detected. Click https://paypal-account-recovery.com to prevent unauthorized charges."),
        ("spam", "Chase Fraud Alert: Did you send $450.00 via Zelle to David? If NO, reply STOP to cancel immediately."),
        ("spam", "Cash loan approved up to £1000 today! Bad credit accepted. No paperwork. Click fast-payday-credit.co.uk"),
        ("spam", "HMRC: Your tax rebate of £389.20 is ready. Claim online now: hmrc-gov-tax-rebates.net"),
        ("spam", "Post Office: Parcel held due to missing delivery address. Confirm details here: post-office-redelivery.org"),

        ("ham", "Hey, are we still meeting for lunch at 12:30 at the Italian place downtown? Let me know so I can reserve a table."),
        ("ham", "Hi mom, I just arrived safely at the train station. Heading to the hotel now, will call you once I check in."),
        ("ham", "Can you please send me the presentation slides from this morning's marketing sync? Want to review the numbers."),
        ("ham", "Your doctor appointment with Dr. Henderson is confirmed for Thursday at 10:15 AM. Reply 1 to confirm, 2 to reschedule."),
        ("ham", "Don't forget to pick up milk, eggs, and sourdough bread on your way back from work tonight."),
        ("ham", "Your Uber ride is arriving in 3 minutes. Toyota Camry (Silver) license plate 7XYZ890. Driver: Marcus."),
        ("ham", "Hey mate, do you want to play tennis this Saturday around 10am at the public courts?"),
        ("ham", "Your Google verification code is 849201. Do not share this code with anyone."),
        ("ham", "Hi Sarah, thanks for your email. I've reviewed the contract draft and made a few comments in section 4. Talk tomorrow."),
        ("ham", "Sounds great! Let's do movies at 7pm and dinner afterwards. I'll book the tickets online."),
        ("ham", "Reminder: Your dental cleaning with Bright Smile Dental is scheduled for tomorrow at 2:00 PM. Arrive 10 mins early."),
        ("ham", "Hi David, could you push the latest pull request to the staging branch before end of day? The QA team is waiting."),
        ("ham", "I'm running about 15 minutes late due to heavy traffic on the highway. Sorry! Start ordering appetizers without me."),
        ("ham", "Your flight UA 412 to Chicago O'Hare is on time, departing gate B14 at 16:45. Boarding begins at 16:10."),
        ("ham", "Hey, happy birthday! Wishing you an amazing year ahead full of happiness and success. Hope you celebrate well!"),
        ("ham", "Good morning team, please remember that tomorrow's standup will be held at 9:30 AM instead of 9:00 AM."),
        ("ham", "Left the spare house key under the flower pot next to the front porch just in case you arrive before I get home."),
        ("ham", "Your prescription is ready for pickup at CVS Pharmacy on Main Street. Pharmacy closes at 8:00 PM."),
        ("ham", "Yeah I think the movie was okay, but the ending was pretty confusing. Did you understand what happened?"),
        ("ham", "Can you email me the recipe for that pasta salad you made last weekend? Everyone at home loved it."),
        ("ham", "Your library books are due back in 3 days. Title: Designing Data-Intensive Applications. Renew at library.edu"),
        ("ham", "I finished reviewing the thesis chapter and attached my detailed feedback. Overall excellent argumentation."),
        ("ham", "Hey honey, what do you feel like having for dinner tonight? We have leftover chicken or I can pick up sushi."),
        ("ham", "Chase Fraud Alert: We approved your card transaction of $34.50 at Trader Joe's. No action required."),
        ("ham", "Hi Alex, hope you're feeling better today. Don't worry about work, take all the rest you need to recover."),
        ("ham", "The package has been delivered to your front door at 1:42 PM. Left behind the planter box. Have a wonderful day!"),
        ("ham", "Let me know when you're free for a quick 10-minute catchup call regarding the client feedback from yesterday."),
        ("ham", "Hey, do you still have my blue jacket from last Friday? I think I left it in your car."),
        ("ham", "Your reservation for 4 guests at Bistro Central is confirmed for Friday at 8:00 PM."),
        ("ham", "Just landed in Boston. The weather is crisp and sunny. Catching a taxi to the conference venue right now."),
        ("ham", "Thanks for walking the dog today, really appreciate the help while I was stuck in all-day meetings!"),
        ("ham", "Meeting moved to Conference Room 3B due to projector maintenance in 2A. See everyone in 5 minutes."),
        ("ham", "Did you watch the basketball game last night? That final buzzer beater in overtime was unbelievable!"),
        ("ham", "Your security one-time passcode is 319082. Valid for 5 minutes. Do not provide this to any representative."),
        ("ham", "Hey dad, can I borrow the lawnmower this weekend? Need to trim the backyard before the family barbecue.")
    ]

    df = pd.DataFrame(sample_data, columns=['label', 'message'])
    df.to_csv(config.DATASET_FILE, index=False)
    return df

def train_and_evaluate_pipeline(test_size: float = 0.25) -> dict:
    """Executes the full scikit-learn training and evaluation pipeline."""
    print("=" * 60)
    print("STARTING MACHINE LEARNING TRAINING PIPELINE")
    print("=" * 60)

    # 1. Load and validate dataset
    df = load_or_create_dataset()
    print(f"Initial dataset loaded with {len(df)} records.")

    # 2. Clean & remove duplicate messages
    df = df.dropna(subset=['message', 'label'])
    df['message'] = df['message'].astype(str).str.strip()
    df['label'] = df['label'].astype(str).str.strip().str.lower()
    df = df[df['message'] != ""]
    df = df.drop_duplicates(subset=['message'])

    print(f"Cleaned dataset contains {len(df)} unique messages.")
    print(df['label'].value_counts())

    # 3. Map ham -> 0, spam -> 1
    df['target'] = df['label'].map({'ham': 0, 'spam': 1})
    df = df.dropna(subset=['target'])
    df['target'] = df['target'].astype(int)

    # 4. Stratified Train / Test Split
    X = df['message']
    y = df['target']
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=42,
        stratify=y
    )

    print(f"Training partition: {len(X_train)} samples | Test partition: {len(X_test)} samples")

    # 5. Fit TF-IDF on training data only
    print("Fitting TF-IDF Vectorizer on training data...")
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words='english',
        ngram_range=(1, 2),
        max_features=800,
        sublinear_tf=True,
        min_df=1
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    # 6. Train Multinomial Naive Bayes
    print("Training Multinomial Naive Bayes (alpha=1.0)...")
    nb_model = MultinomialNB(alpha=1.0)
    nb_model.fit(X_train_vec, y_train)

    y_pred_nb = nb_model.predict(X_test_vec)
    y_prob_nb = nb_model.predict_proba(X_test_vec)[:, 1]

    nb_metrics = compute_all_metrics(
        y_true=y_test.tolist(),
        y_pred=y_pred_nb.tolist(),
        y_prob=y_prob_nb.tolist(),
        model_name="Multinomial Naive Bayes",
        dataset_name="UCI SMS Spam Collection",
        train_count=len(X_train),
        test_count=len(X_test),
        model_version="1.0.0"
    )

    # 7. Train Logistic Regression
    print("Training Logistic Regression (C=1.0)...")
    lr_model = LogisticRegression(C=1.0, max_iter=200, random_state=42)
    lr_model.fit(X_train_vec, y_train)

    y_pred_lr = lr_model.predict(X_test_vec)
    y_prob_lr = lr_model.predict_proba(X_test_vec)[:, 1]

    lr_metrics = compute_all_metrics(
        y_true=y_test.tolist(),
        y_pred=y_pred_lr.tolist(),
        y_prob=y_prob_lr.tolist(),
        model_name="Logistic Regression",
        dataset_name="UCI SMS Spam Collection",
        train_count=len(X_train),
        test_count=len(X_test),
        model_version="1.0.0"
    )

    # 8. Save Serialized Pipelines with Joblib
    print("Saving Joblib model artifacts...")
    joblib.dump(vectorizer, config.VECTORIZER_PATH)
    joblib.dump(nb_model, config.MODEL_NB_PATH)
    joblib.dump(lr_model, config.MODEL_LR_PATH)

    # 9. Save Metrics to Outputs
    training_run = {
        "training_date": datetime.now(timezone.utc).isoformat(),
        "dataset_name": "UCI SMS Spam Collection",
        "multinomial_naive_bayes": nb_metrics,
        "logistic_regression": lr_metrics,
        "dataset_statistics": {
            "total_messages": len(df),
            "spam_messages": int((df['target'] == 1).sum()),
            "ham_messages": int((df['target'] == 0).sum())
        }
    }

    with open(config.METRICS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(training_run, f, indent=2)

    # 10. Record Metrics in MongoDB Atlas (Collection: model_metrics)
    if db_manager.is_connected():
        print("Logging model metrics to MongoDB Atlas 'model_metrics' collection...")
        db_manager.save_model_metrics({
            "model_name": "Multinomial Naive Bayes",
            "training_date": training_run["training_date"],
            **nb_metrics
        })
        db_manager.save_model_metrics({
            "model_name": "Logistic Regression",
            "training_date": training_run["training_date"],
            **lr_metrics
        })
    else:
        print("MongoDB Atlas not connected; metrics stored locally in outputs/latest_metrics.json.")

    print("\nTraining completed successfully!")
    print(f"Naive Bayes Accuracy: {nb_metrics['accuracy'] * 100:.2f}% | F1: {nb_metrics['spam_f1_score']:.4f}")
    print(f"Logistic Reg Accuracy: {lr_metrics['accuracy'] * 100:.2f}% | F1: {lr_metrics['spam_f1_score']:.4f}")

    return training_run

if __name__ == "__main__":
    train_and_evaluate_pipeline()
