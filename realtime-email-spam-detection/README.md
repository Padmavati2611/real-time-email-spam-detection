# Real-Time Email Spam Detection System Using Machine Learning, Gmail API & MongoDB Atlas

A complete, production-grade Machine Learning system that monitors an authorized **Gmail inbox**, ingests real incoming emails via the official **Gmail API (OAuth 2.0)**, classifies them as **Spam** or **Legitimate** using a trained **TF-IDF + Scikit-learn** model, and persists deduplicated records and metrics in **MongoDB Atlas**.

---

## 🏗️ System Architecture

```text
Incoming Emails ──> Gmail API (OAuth 2.0)
                           │
                           ▼
                 MIME Email Processor
           (Base64URL, HTML strip, Safety)
                           │
                           ▼
               TF-IDF Feature Vectorizer
                           │
                           ▼
              Multinomial Naive Bayes / LR
                           │
                           ▼
          MongoDB Atlas Cloud Database (realtime_spam_detection)
             ├── emails (unique index: gmail_message_id)
             ├── model_metrics (accuracy, precision, confusion matrix)
             └── sync_state (mailbox_id, historyId, status)
                           │
                           ▼
              Streamlit Web Dashboard
       (Overview, Live Monitoring, History, Model Evaluation)
```

---

## 📁 Repository Structure

```text
realtime-email-spam-detection/
├── app.py                     # Streamlit 4-page interactive dashboard
├── backend.py                 # FastAPI webhook & Pub/Sub push listener
├── train_model.py             # Scikit-learn TF-IDF training & evaluation script
├── database.py                # MongoDB Atlas connection & collection operations
├── gmail_service.py           # Gmail API client & Google OAuth 2.0 flows
├── email_processor.py         # MIME parser, base64url decoder, and safe sanitizer
├── config.py                  # Project settings & environment variable loader
├── requirements.txt           # Required Python packages
├── .env.example               # Environment variables template
├── .gitignore                 # Excludes secrets, tokens, credentials, and venv
├── README.md                  # Comprehensive setup & deployment guide
├── models/                    # Serialized Joblib model files
├── outputs/                   # Exported evaluation metrics JSON
├── src/
│   ├── __init__.py
│   ├── predictor.py           # Model inference engine
│   ├── email_parser.py        # MIME parsing wrapper
│   ├── monitoring.py          # Background polling & synchronization loop
│   └── security.py            # Token masking & privacy guard
└── tests/
    ├── test_predictor.py      # Unit tests for inference
    ├── test_email_parser.py   # Unit tests for MIME parsing & base64
    ├── test_database.py       # Unit tests for MongoDB resilience
    └── test_deduplication.py  # Unit tests for Gmail message deduplication
```

---

## 💻 Beginner-Friendly Setup Guide (Windows VS Code & PowerShell)

Follow these exact step-by-step instructions in **Visual Studio Code** on Windows using **PowerShell**.

### Step 1: Open VS Code & Create Project Virtual Environment
Open PowerShell in VS Code (`Ctrl + ~`):

```powershell
# Navigate to the project directory
cd realtime-email-spam-detection

# Create Python virtual environment (.venv)
python -m venv .venv

# Activate the virtual environment
.\.venv\Scripts\Activate.ps1
```

*(Note: If PowerShell displays an ExecutionPolicy error, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and re-run activate).*

### Step 2: Install Required Dependencies
Install Scikit-learn, Streamlit, PyMongo, FastAPI, and Google API clients:

```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Create a Free MongoDB Atlas Database
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and sign in.
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, create a database user:
   - Username: `spam_analyst`
   - Password: `YourStrongPassword123!`
4. Under **Network Access**, click **Add IP Address** and choose **Allow Access From Anywhere** (`0.0.0.0/0`) for development.
5. In your cluster dashboard, click **Connect** → **Drivers** (Python) and copy your connection string:
   ```text
   mongodb+srv://spam_analyst:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 4: Configure Google Cloud & Enable Gmail API
1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new Google Cloud Project (e.g., `Email-Spam-Detector`).
3. In the search bar, search for **Gmail API** and click **Enable**.
4. In the left navigation, click **APIs & Services** → **OAuth consent screen**:
   - User Type: **External**
   - App Name: `SpamGuard Email Detector`
   - User support email: Select your email
   - Developer contact email: Enter your email
   - Under **Scopes**, click **Add or Remove Scopes** and add:
     `https://www.googleapis.com/auth/gmail.readonly`
   - Under **Test Users**, add your personal Gmail address (`yourname@gmail.com`).

### Step 5: Download OAuth Client ID (`credentials.json`)
1. Go to **APIs & Services** → **Credentials**.
2. Click **Create Credentials** → **OAuth client ID**.
3. Application Type: **Desktop app** (or Web application for hosted).
4. Name: `SpamGuard Desktop Client`.
5. Click **Create**, then click **Download JSON**.
6. Rename the downloaded file to `credentials.json` and place it directly inside `realtime-email-spam-detection/credentials.json`.

### Step 6: Create the Local `.env` File
Copy the example file:
```powershell
cp .env.example .env
```
Edit `.env` using Notepad or VS Code:
```env
MONGODB_URI="mongodb+srv://spam_analyst:YourStrongPassword123!@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"
DB_NAME="realtime_spam_detection"
POLLING_INTERVAL_SECONDS=30
SAVE_EMAIL_BODY_CONTENT="false"
```

### Step 7: Train the Machine Learning Pipeline
Run the training script to fit TF-IDF and Naive Bayes models:
```powershell
python train_model.py
```
*Output will display accuracy, precision, recall, confusion matrix, and save `models/email_naive_bayes.joblib`.*

### Step 8: Run Unit Tests
Verify that all components, MIME parsers, deduplication checks, and inference tests pass:
```powershell
pytest -v
```

### Step 9: Launch the Streamlit Web Application
```powershell
streamlit run app.py
```
The browser will automatically open at `http://localhost:8501`.

1. In the left sidebar, click **Authorize Gmail Account**.
2. Google OAuth consent will open in your browser. Select your Gmail account and approve the read-only permission.
3. The sidebar will update to show **Gmail Authorized: `yourname@gmail.com`**.
4. Go to **Email Monitoring** and click **Sync Mailbox Now**.
5. Your real incoming emails are fetched, classified as Spam or Legitimate, and saved to MongoDB!

### Step 10: Running Background FastAPI Webhook Service (Optional)
If using Google Cloud Pub/Sub push notifications:
```powershell
uvicorn backend:app --host 0.0.0.0 --port 8000
```

---

## 🔒 Security Best Practices
- **Minimum Permissions**: Uses only `gmail.readonly`. The app cannot delete, forward, or send emails.
- **Deduplication**: MongoDB enforces a `unique` index on `gmail_message_id`. Re-syncing does not duplicate database records.
- **Credential Protection**: `credentials.json`, `token.json`, and `.env` are strictly excluded in `.gitignore`.
- **In-Memory Token Handling**: Access tokens are kept in volatile memory and never exposed in client logs.

---

## 🎓 Internship Deliverables Checklist
- [x] Real-time Gmail inbox integration (OAuth 2.0).
- [x] No manual copy-pasting required; automatic inbox ingestion.
- [x] Scikit-learn TF-IDF + Multinomial Naive Bayes pipeline with Joblib serialization.
- [x] MongoDB Atlas cloud database with 3 collections (`emails`, `model_metrics`, `sync_state`).
- [x] Streamlit dashboard with 4 comprehensive views.
- [x] Complete unit tests covering deduplication, MIME decoding, and model inference.
