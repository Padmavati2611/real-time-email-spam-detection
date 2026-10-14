# Real-Time Spam SMS Detection System with MongoDB Atlas Integration

A production-ready, full-stack Machine Learning web application that classifies SMS messages into **Spam** or **Legitimate (Ham)** using **TF-IDF vectorization**, **Scikit-learn (Multinomial Naive Bayes & Logistic Regression)**, and persists real-time predictions and metrics in **MongoDB Atlas**.

---

## 🚀 Key Features

1. **Machine Learning Pipeline**:
   - **Dataset**: UCI SMS Spam Collection benchmark.
   - **Text Vectorization**: TF-IDF (Term Frequency - Inverse Document Frequency) with sublinear term frequency scaling, smooth IDF, and n-grams `(1, 2)`.
   - **Algorithms**: Multinomial Naive Bayes with Laplace smoothing ($\alpha = 1.0$) and L2-regularized Logistic Regression ($C = 1.0$).
   - **Serialization**: Saved using `Joblib` in `models/` for ultra-fast, zero-recomputation inference.

2. **MongoDB Atlas Real-Time Cloud Integration**:
   - Database: `spam_sms_detection`
   - Collection 1 (`predictions`): Saves message text, unique UUID `message_id`, predicted label, estimated spam probability, model name, and UTC timestamp.
   - Collection 2 (`model_metrics`): Saves model accuracy, spam precision, recall, F1-score, confusion matrix values, and dataset sample counts.
   - Collection 3 (`feedback`): Stores user verification feedback tied to prediction IDs for audit and validation.

3. **Multi-Page Streamlit Web Dashboard**:
   - **Home Dashboard**: Live connection status, total messages analyzed, spam count, ham count, real-time distribution charts computed directly from MongoDB records.
   - **SMS Detection**: Text input with real-time prediction, estimated probability progress bar, warning alerts against deceptive links, and automatic MongoDB insertion.
   - **Prediction History**: Paginated, filterable, reverse-chronological list of stored predictions with secure credential masking and clear history deletion authorization.
   - **Model Performance**: Accuracy, precision, recall, F1-score, and interactive Plotly confusion matrix read from database metrics.
   - **Feedback**: Allows users to flag predictions with comments and correct labels.

---

## 📁 Project Directory Structure

```text
spam-sms-detection/
├── app.py                     # Main Streamlit web application
├── train_model.py             # Scikit-learn training & evaluation pipeline script
├── config.py                  # Project configuration & environment variable loader
├── database.py                # PyMongo MongoDB Atlas connection manager & queries
├── requirements.txt           # Python dependencies
├── .env.example               # Template for environment variables (MONGODB_URI)
├── .gitignore                 # Excludes .env, virtualenv, and temporary files
├── README.md                  # Comprehensive documentation
├── data/                      # Dataset directory (contains spam.csv)
├── models/                    # Serialized Joblib model & vectorizer artifacts
├── outputs/                   # Exported evaluation metrics JSON files
└── src/
    ├── __init__.py
    ├── predictor.py           # SMSPredictor inference engine
    └── metrics.py             # Evaluation & confusion matrix computation utilities
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- Python 3.9+ installed
- MongoDB Atlas free cluster account (or local MongoDB server)

### 2. Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/spam-sms-detection.git
   cd spam-sms-detection
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate    # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your MongoDB Atlas connection URI:
   ```env
   MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"
   DB_NAME="spam_sms_detection"
   ```

### 3. Training the Model
Train the TF-IDF vectorizer and classifiers on the UCI dataset:
```bash
python train_model.py
```
This script will:
- Clean and validate dataset messages
- Train Multinomial Naive Bayes and Logistic Regression
- Save serialized models to `models/`
- Log evaluation metrics to `model_metrics` collection in MongoDB Atlas

### 4. Running the Streamlit Web Application
Launch the live interactive web dashboard:
```bash
streamlit run app.py
```
Open your browser at `http://localhost:8501`.

---

## 🔒 Security & Reliability Best Practices
- **No Hardcoded Credentials**: Database connection strings are loaded exclusively via `python-dotenv`.
- **Narrow IP Allowlist**: Configure MongoDB Atlas Network Access with your current IP.
- **Graceful Degradation**: If MongoDB Atlas is offline, the web app indicates offline state and allows local testing without crashing.
- **UTC Timestamps**: All database events and predictions store standardized UTC ISO timestamps.

---

## 📜 License & Acknowledgements
- Dataset: [UCI Machine Learning Repository SMS Spam Collection](https://archive.ics.uci.edu/ml/datasets/sms+spam+collection)
- Developed for Machine Learning Internship & Portfolio demonstrations.
