"""
Real-Time Spam SMS Detection Web Application
Built with Streamlit, Scikit-learn, and MongoDB Atlas.
"""

import os
import json
from datetime import datetime
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

import config
from database import db_manager
from src.predictor import predictor
from train_model import train_and_evaluate_pipeline

# Page Configuration
st.set_page_config(
    page_title="SpamGuard - Real-Time SMS Spam Detection",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for styling
st.markdown("""
<style>
    .main-header {
        font-size: 1.8rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 0.25rem;
    }
    .sub-header {
        font-size: 0.95rem;
        color: #475569;
        margin-bottom: 1.5rem;
    }
    .metric-card {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem;
        text-align: center;
    }
    .stAlert {
        border-radius: 8px;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar Navigation
st.sidebar.title("🛡️ SpamGuard SMS")
st.sidebar.markdown("**Machine Learning & Database Pipeline**")

# Connection indicator in sidebar
db_status = db_manager.get_status_info()
if db_status["connected"]:
    st.sidebar.success(f"🟢 MongoDB Connected: `{db_status['database_name']}`")
else:
    st.sidebar.warning(f"🟠 MongoDB Offline")
    if db_status["last_error"]:
        with st.sidebar.expander("Connection Details"):
            st.caption(db_status["last_error"])

navigation = st.sidebar.radio(
    "Navigation Menu",
    [
        "Home Dashboard",
        "SMS Detection",
        "Prediction History",
        "Model Performance",
        "Feedback"
    ]
)

st.sidebar.markdown("---")
st.sidebar.caption("UCI SMS Spam Collection · Scikit-Learn · MongoDB Atlas")

# =============================================================================
# 1. HOME DASHBOARD
# =============================================================================
if navigation == "Home Dashboard":
    st.markdown('<div class="main-header">Real-Time SMS Spam Detection Dashboard</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Live telemetry and prediction volume calculated from real MongoDB database records.</div>', unsafe_allow_html=True)

    # Database connection status banner
    if db_status["connected"]:
        st.success(f"✅ Real-Time Database Connection Active: `{db_status['database_name']}` database on MongoDB Atlas")
    else:
        st.warning("⚠️ MongoDB Atlas is currently not connected. Configure `MONGODB_URI` in `.env` to enable cloud persistence.")

    # Fetch live stats from MongoDB
    stats = db_manager.get_dashboard_statistics()

    # Metric KPI Row
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric(label="Total Messages Analyzed", value=f"{stats['total_messages']:,}")
    with col2:
        st.metric(label="Spam Messages Detected", value=f"{stats['spam_count']:,}")
    with col3:
        st.metric(label="Legitimate (Ham) Messages", value=f"{stats['legitimate_count']:,}")
    with col4:
        st.metric(label="Spam Ratio", value=f"{stats['spam_percentage']}%")

    st.markdown("---")

    # Time & Distribution Visualization
    if stats["total_messages"] > 0:
        col_chart1, col_chart2 = st.columns(2)

        with col_chart1:
            st.subheader("Classification Distribution")
            fig_pie = px.pie(
                names=["Spam", "Legitimate"],
                values=[stats["spam_count"], stats["legitimate_count"]],
                color=["Spam", "Legitimate"],
                color_discrete_map={"Spam": "#ef4444", "Legitimate": "#10b981"},
                hole=0.4
            )
            fig_pie.update_layout(margin=dict(l=20, r=20, t=20, b=20))
            st.plotly_chart(fig_pie, use_container_width=True)

        with col_chart2:
            st.subheader("Latest Live Activity")
            latest_time = stats.get("latest_timestamp")
            if latest_time:
                st.info(f"🕒 **Most Recent SMS Classified:** `{latest_time}`")

            # Mini table of recent predictions
            recent_docs = db_manager.get_predictions(limit=5)
            if recent_docs:
                clean_recent = [
                    {
                        "Message": (d["message"][:45] + "...") if len(d["message"]) > 45 else d["message"],
                        "Label": d["predicted_label"].upper(),
                        "Probability": f"{d['spam_probability'] * 100:.1f}%",
                        "Time (UTC)": d["created_at"]
                    }
                    for d in recent_docs
                ]
                st.dataframe(pd.DataFrame(clean_recent), use_container_width=True)
    else:
        st.info("ℹ️ No predictions stored yet in the database. Head over to **SMS Detection** to analyze your first message!")

# =============================================================================
# 2. SMS DETECTION PAGE
# =============================================================================
elif navigation == "SMS Detection":
    st.markdown('<div class="main-header">Classify SMS Message</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Enter SMS content to classify it as Spam or Legitimate using TF-IDF and Machine Learning.</div>', unsafe_allow_html=True)

    # Preset examples
    preset_choice = st.selectbox(
        "Load Sample SMS Preset (Optional):",
        [
            "-- Select a preset or type custom text below --",
            "URGENT! You have won a £1,000 Walmart gift card! Call 0871234567 to claim your prize now.",
            "Santander Alert: A new payee 'MR J SMITH' was added. If unauthorized, visit https://santander-sec-auth.com immediately.",
            "Hey, are we still meeting for lunch at 12:30 at the Italian place downtown?",
            "Your Google verification code is 849201. Do not share this code with anyone.",
            "Royal Mail: Parcel #GB-984210 cannot be delivered due to unpaid fee £1.99. Pay now at https://royalmail-fee.info"
        ]
    )

    initial_text = "" if preset_choice.startswith("--") else preset_choice
    sms_input = st.text_area("SMS Text Message:", value=initial_text, height=120, placeholder="Paste or type SMS here...")

    col_btn, col_model = st.columns([1, 2])
    with col_btn:
        check_clicked = st.button("🔍 Check Message", type="primary", use_container_width=True)
    with col_model:
        model_choice = st.selectbox("Classifier Algorithm:", ["Multinomial Naive Bayes", "Logistic Regression"])

    if check_clicked:
        if not sms_input.strip():
            st.warning("Please enter an SMS text message to analyze.")
        else:
            model_key = "lr" if model_choice == "Logistic Regression" else "nb"

            # 1. Run Machine Learning Model Prediction
            result = predictor.predict(sms_input, model_type=model_key)
            is_spam = result["is_spam"]
            prob = result["spam_probability"]

            st.markdown("### Detection Result")
            if is_spam:
                st.error(f"🚨 **SPAM DETECTED** (Estimated Spam Probability: **{prob * 100:.1f}%**)")
                st.warning("⚠️ **Security Warning:** Do not click on unexpected URLs, provide OTP codes, or send money to unverified senders.")
            else:
                st.success(f"✅ **LEGITIMATE (HAM)** (Estimated Spam Probability: **{prob * 100:.1f}%**)")

            # Probability Gauge
            st.progress(prob)
            st.caption(f"Spam Probability: {prob * 100:.1f}% · Legitimate Probability: {(1 - prob) * 100:.1f}%")

            # 2. Save prediction into real MongoDB Atlas database
            if db_status["connected"]:
                saved, save_msg, saved_doc = db_manager.save_prediction(
                    message=sms_input,
                    predicted_label=result["predicted_label"],
                    spam_probability=prob,
                    model_name=result["model_name"]
                )
                if saved and saved_doc:
                    st.success(f"💾 **Saved to MongoDB Atlas:** Record ID `{saved_doc['message_id']}` logged in collection `predictions`.")
                else:
                    st.error(f"Failed to record in database: {save_msg}")
            else:
                st.info("ℹ️ Note: Prediction was not saved to MongoDB Atlas because the database is currently offline or unconfigured.")

# =============================================================================
# 3. PREDICTION HISTORY PAGE
# =============================================================================
elif navigation == "Prediction History":
    st.markdown('<div class="main-header">Prediction History</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Live prediction records retrieved from the MongoDB Atlas `predictions` collection.</div>', unsafe_allow_html=True)

    if not db_status["connected"]:
        st.error("Cannot load history: MongoDB connection is offline.")
    else:
        # Filters and Controls
        col_filter, col_limit, col_action = st.columns([2, 1, 1])
        with col_filter:
            filter_val = st.selectbox("Filter by Class:", ["All", "Spam", "Legitimate"])
        with col_limit:
            limit_val = st.number_input("Max records:", min_value=5, max_value=200, value=25)
        with col_action:
            st.write("")
            refresh_btn = st.button("🔄 Refresh Data", use_container_width=True)

        selected_filter = None if filter_val == "All" else filter_val.lower()
        records = db_manager.get_predictions(label_filter=selected_filter, limit=limit_val)

        if records:
            st.write(f"Showing **{len(records)}** newest records (sorted newest first):")
            formatted_records = []
            for r in records:
                formatted_records.append({
                    "Message ID": r.get("message_id"),
                    "Predicted": r.get("predicted_label", "").upper(),
                    "Spam Probability": f"{r.get('spam_probability', 0) * 100:.1f}%",
                    "Message": r.get("message"),
                    "Model": r.get("model_name"),
                    "UTC Timestamp": r.get("created_at")
                })

            st.dataframe(pd.DataFrame(formatted_records), use_container_width=True)

            # Option to wipe history with confirmation
            with st.expander("⚠️ Danger Zone: Delete Stored History"):
                st.caption("Permanently clears all prediction documents from MongoDB Atlas.")
                confirm_del = st.checkbox("I authorize clearing all prediction history records.")
                if st.button("Clear Prediction Collection", type="primary", disabled=not confirm_del):
                    success, msg = db_manager.clear_prediction_history()
                    if success:
                        st.success(msg)
                        st.rerun()
                    else:
                        st.error(msg)
        else:
            st.info("No prediction records found matching the filter.")

# =============================================================================
# 4. MODEL PERFORMANCE PAGE
# =============================================================================
elif navigation == "Model Performance":
    st.markdown('<div class="main-header">Model Performance & Evaluation</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Performance metrics evaluated on unseen test partitions, logged in MongoDB `model_metrics`.</div>', unsafe_allow_html=True)

    # Load stored metrics from database or fallback local outputs
    metrics_record = db_manager.get_latest_model_metrics() if db_status["connected"] else None

    # If not found in DB, check local output file
    if not metrics_record and config.METRICS_JSON_PATH.exists():
        try:
            with open(config.METRICS_JSON_PATH, "r", encoding="utf-8") as f:
                raw_json = json.load(f)
                metrics_record = raw_json.get("multinomial_naive_bayes")
        except Exception:
            pass

    col_retrain, col_space = st.columns([1, 3])
    with col_retrain:
        if st.button("🚀 Retrain Models Now", use_container_width=True):
            with st.spinner("Training TF-IDF and Classifiers on UCI dataset..."):
                results = train_and_evaluate_pipeline()
                predictor.load_models()
                st.success("Retraining complete! Model artifacts and MongoDB metrics updated.")
                st.rerun()

    if metrics_record:
        # Display Key Metrics
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Model Accuracy", f"{metrics_record.get('accuracy', 0) * 100:.2f}%")
        with col2:
            st.metric("Spam Precision", f"{metrics_record.get('spam_precision', 0) * 100:.2f}%")
        with col3:
            st.metric("Spam Recall", f"{metrics_record.get('spam_recall', 0) * 100:.2f}%")
        with col4:
            st.metric("Spam F1-Score", f"{metrics_record.get('spam_f1_score', 0):.4f}")

        st.markdown("---")

        col_cm, col_info = st.columns(2)
        with col_cm:
            st.subheader("Confusion Matrix")
            cm_dict = metrics_record.get("confusion_matrix", {})
            cm_array = cm_dict.get("matrix_array", [[0, 0], [0, 0]])

            fig_cm = px.imshow(
                cm_array,
                labels=dict(x="Predicted Label", y="Actual Label", color="Count"),
                x=["Legitimate", "Spam"],
                y=["Legitimate", "Spam"],
                text_auto=True,
                color_continuous_scale="Blues"
            )
            fig_cm.update_layout(margin=dict(l=20, r=20, t=30, b=20))
            st.plotly_chart(fig_cm, use_container_width=True)

        with col_info:
            st.subheader("Model Metadata")
            st.markdown(f"- **Algorithm:** `{metrics_record.get('model_name', 'Multinomial Naive Bayes')}`")
            st.markdown(f"- **Model Version:** `{metrics_record.get('model_version', '1.0.0')}`")
            st.markdown(f"- **Training Dataset:** `{metrics_record.get('dataset_name', 'UCI SMS Spam Collection')}`")
            st.markdown(f"- **Training Samples:** `{metrics_record.get('num_train_messages', 'N/A')}`")
            st.markdown(f"- **Validation Test Samples:** `{metrics_record.get('num_test_messages', 'N/A')}`")
            st.markdown(f"- **ROC - AUC Score:** `{metrics_record.get('roc_auc', 'N/A')}`")
    else:
        st.info("No evaluation metrics recorded yet. Click 'Retrain Models Now' to run the initial pipeline training.")

# =============================================================================
# 5. FEEDBACK PAGE
# =============================================================================
elif navigation == "Feedback":
    st.markdown('<div class="main-header">Prediction Feedback</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Submit user feedback on an existing prediction. Records are stored in the `feedback` collection for audit.</div>', unsafe_allow_html=True)

    with st.form("feedback_form"):
        pred_id_input = st.text_input("Prediction Message ID (UUID):", placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000")
        correct_label_choice = st.selectbox("What is the true label?", ["Spam", "Legitimate (Ham)"])
        feedback_notes = st.text_area("Feedback Comments:", placeholder="Explain why this prediction was correct or incorrect...")

        submitted = st.form_submit_button("Submit Feedback")
        if submitted:
            if not pred_id_input.strip():
                st.warning("Please provide a valid Prediction ID.")
            elif not db_status["connected"]:
                st.error("Database connection unavailable. Cannot record feedback.")
            else:
                success, msg = db_manager.save_feedback(
                    prediction_id=pred_id_input.strip(),
                    user_feedback=feedback_notes.strip(),
                    correct_label="spam" if correct_label_choice == "Spam" else "legitimate"
                )
                if success:
                    st.success(msg)
                else:
                    st.error(msg)

    st.markdown("---")
    st.subheader("Recent Feedback Audit Log")
    feedback_list = db_manager.get_feedback_records(limit=20)
    if feedback_list:
        clean_fb = [
            {
                "Prediction ID": fb.get("prediction_id"),
                "User Proposed Label": fb.get("correct_label", "").upper(),
                "Feedback Notes": fb.get("user_feedback"),
                "Submitted (UTC)": fb.get("submitted_at")
            }
            for fb in feedback_list
        ]
        st.dataframe(pd.DataFrame(clean_fb), use_container_width=True)
    else:
        st.caption("No user feedback records submitted yet.")
