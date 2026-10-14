"""
Streamlit Web Dashboard: Real-Time Email Spam Detection System
Integrates Gmail API, Scikit-learn Machine Learning, and MongoDB Atlas.
"""

import time
from datetime import datetime
import streamlit as st
import pandas as pd
import plotly.express as px

import config
from database import db_manager
from gmail_service import gmail_client
from email_processor import EmailProcessor
from src.predictor import predictor
from src.monitoring import EmailMonitor
from train_model import train_pipeline

# Page Configuration
st.set_page_config(
    page_title="SpamGuard - Real-Time Gmail Spam Detection",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling
st.markdown("""
<style>
    .main-title { font-size: 1.8rem; font-weight: 700; color: #0f172a; margin-bottom: 0.25rem; }
    .sub-title { font-size: 0.95rem; color: #475569; margin-bottom: 1.5rem; }
    .badge-spam { background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-weight: 700; }
    .badge-ham { background-color: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-weight: 700; }
</style>
""", unsafe_allow_html=True)

# Try loading existing credentials on startup
if not gmail_client.is_authorized:
    gmail_client.load_stored_credentials()

# Sidebar Navigation & Status
st.sidebar.title("🛡️ Email SpamGuard")
st.sidebar.markdown("**Real-Time Gmail & MongoDB Pipeline**")

# Database status in sidebar
db_status = db_manager.get_status_info()
if db_status["connected"]:
    st.sidebar.success(f"🟢 MongoDB Connected: `{db_status['database_name']}`")
else:
    st.sidebar.warning("🟠 MongoDB: Offline")

# Gmail status in sidebar
if gmail_client.is_authorized:
    st.sidebar.success(f"📧 Gmail Authorized:\n`{gmail_client.user_email}`")
    if st.sidebar.button("Disconnect Gmail Account"):
        gmail_client.disconnect()
        st.sidebar.info("Gmail account disconnected.")
        st.rerun()
else:
    st.sidebar.info("🔒 Gmail: Not Connected")
    if st.sidebar.button("Authorize Gmail Account"):
        success, msg = gmail_client.authenticate_desktop_flow()
        if success:
            st.sidebar.success(msg)
            st.rerun()
        else:
            st.sidebar.error(msg)

nav = st.sidebar.radio(
    "Navigation Menu",
    [
        "Dashboard Overview",
        "Email Monitoring",
        "Email Detection History",
        "Model Evaluation"
    ]
)

st.sidebar.markdown("---")
st.sidebar.caption("Gmail API v1 · Scikit-Learn · MongoDB Atlas")

# Helper function to perform mailbox synchronization
def execute_sync():
    if not gmail_client.is_authorized:
        st.warning("Please authorize Gmail in the sidebar before synchronizing.")
        return 0

    with st.spinner("Fetching latest messages from Gmail and classifying..."):
        emails = gmail_client.fetch_latest_messages(max_results=15)
        new_count = 0

        for email_item in emails:
            # Predict
            pred = predictor.predict(email_item["combined_text"])

            # Save to MongoDB
            saved, msg, doc = db_manager.save_classified_email(
                gmail_message_id=email_item["gmail_message_id"],
                gmail_thread_id=email_item["gmail_thread_id"],
                sender_address=email_item["sender_address"],
                subject=email_item["subject"],
                snippet=email_item["snippet"],
                received_timestamp=email_item["received_timestamp"],
                predicted_class=pred["predicted_class"],
                spam_probability=pred["spam_probability"],
                model_name=pred["model_name"]
            )
            if saved:
                new_count += 1

        db_manager.update_sync_state(
            mailbox_id=gmail_client.user_email or "unknown",
            last_sync_timestamp=datetime.utcnow().isoformat(),
            sync_status="active"
        )
        return new_count

# =============================================================================
# 1. DASHBOARD OVERVIEW
# =============================================================================
if nav == "Dashboard Overview":
    st.markdown('<div class="main-title">Real-Time Email Spam Detection Dashboard</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">Live inbox security metrics computed from real MongoDB database records.</div>', unsafe_allow_html=True)

    # Status Cards Row
    stats = db_manager.get_email_statistics()

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total Emails Processed", f"{stats['total_emails']:,}")
    with col2:
        st.metric("Spam Emails Detected", f"{stats['spam_count']:,}")
    with col3:
        st.metric("Legitimate Emails", f"{stats['legitimate_count']:,}")
    with col4:
        st.metric("Spam Rate", f"{stats['spam_percentage']}%")

    st.markdown("---")

    # Visualization & Recent Activity
    if stats["total_emails"] > 0:
        c1, c2 = st.columns(2)
        with c1:
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

        with c2:
            st.subheader("Latest Email Detection Activity")
            latest_docs = db_manager.get_emails(limit=6)
            if latest_docs:
                clean_table = [
                    {
                        "Sender": d.get("sender_address", "")[:30],
                        "Subject": d.get("subject", "")[:35],
                        "Verdict": d.get("predicted_class", "").upper(),
                        "Probability": f"{d.get('spam_probability', 0)*100:.1f}%",
                        "Time (UTC)": d.get("received_timestamp")
                    }
                    for d in latest_docs
                ]
                st.dataframe(pd.DataFrame(clean_table), use_container_width=True)
    else:
        st.info("ℹ️ No emails processed yet. Connect Gmail and visit **Email Monitoring** to synchronize your inbox!")

# =============================================================================
# 2. EMAIL MONITORING
# =============================================================================
elif nav == "Email Monitoring":
    st.markdown('<div class="main-title">Automatic Email Monitoring & Synchronization</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">Monitor your Gmail inbox for incoming emails, extract text, and auto-classify spam.</div>', unsafe_allow_html=True)

    if not gmail_client.is_authorized:
        st.error("🔒 Gmail account is not authorized. Please authorize via the sidebar button to enable email monitoring.")
    else:
        st.success(f"Authorized Mailbox: **{gmail_client.user_email}** (Gmail API Scope: `gmail.readonly`)")

        col_sync, col_interval = st.columns([1, 2])
        with col_sync:
            if st.button("🔄 Sync Mailbox Now", type="primary", use_container_width=True):
                new_added = execute_sync()
                st.success(f"Sync complete! Processed inbox. {new_added} new unique emails saved to MongoDB.")
                st.rerun()

        with col_interval:
            poll_interval = st.select_slider(
                "Periodic Polling Interval (seconds):",
                options=[15, 30, 60, 120, 300],
                value=30
            )

        st.markdown("---")
        st.subheader("Pub/Sub Real-Time Watch Architecture")
        st.info("""
        **Near-Real-Time Notifications:**
        In production, the backend service runs `backend.py` listening to Google Cloud Pub/Sub push endpoints.
        When Gmail triggers a notification, `backend.py` receives the event and performs bounded synchronization via the Gmail History API.
        """)

# =============================================================================
# 3. EMAIL DETECTION HISTORY
# =============================================================================
elif nav == "Email Detection History":
    st.markdown('<div class="main-title">Email Detection History</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">Real emails retrieved from your authorized Gmail account and logged in MongoDB Atlas.</div>', unsafe_allow_html=True)

    col_f, col_lim = st.columns([2, 1])
    with col_f:
        filter_opt = st.selectbox("Filter Class:", ["All", "Spam", "Legitimate"])
    with col_lim:
        max_rows = st.number_input("Max records:", min_value=5, max_value=100, value=25)

    label_arg = None if filter_opt == "All" else filter_opt.lower()
    emails_list = db_manager.get_emails(label_filter=label_arg, limit=max_rows)

    if emails_list:
        st.write(f"Showing **{len(emails_list)}** emails (sorted newest first):")
        display_data = []
        for e in emails_list:
            display_data.append({
                "Gmail ID": e.get("gmail_message_id"),
                "Sender": e.get("sender_address"),
                "Subject": e.get("subject"),
                "Class": e.get("predicted_class", "").upper(),
                "Spam Probability": f"{e.get('spam_probability', 0)*100:.1f}%",
                "Snippet": e.get("snippet", "")[:60] + "...",
                "Date": e.get("received_timestamp")
            })

        st.dataframe(pd.DataFrame(display_data), use_container_width=True)

        with st.expander("⚠️ Clear Stored Email Records"):
            if st.button("Permanently Clear Email Collection"):
                ok, msg = db_manager.clear_emails_collection()
                if ok:
                    st.success(msg)
                    st.rerun()
                else:
                    st.error(msg)
    else:
        st.info("No emails found matching filter in the database.")

# =============================================================================
# 4. MODEL EVALUATION
# =============================================================================
elif nav == "Model Evaluation":
    st.markdown('<div class="main-title">Model Performance & Evaluation</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">Scikit-learn metrics evaluated on unseen test sets and recorded in MongoDB `model_metrics`.</div>', unsafe_allow_html=True)

    metrics = db_manager.get_latest_model_metrics()

    if st.button("🚀 Retrain Model Pipeline"):
        with st.spinner("Training TF-IDF and Naive Bayes pipeline..."):
            metrics = train_pipeline()
            predictor.load_models()
            st.success("Model retrained and saved to models/ directory!")
            st.rerun()

    if metrics:
        c1, c2, c3, c4 = st.columns(4)
        with c1:
            st.metric("Accuracy", f"{metrics.get('accuracy', 0)*100:.2f}%")
        with c2:
            st.metric("Spam Precision", f"{metrics.get('spam_precision', 0)*100:.2f}%")
        with c3:
            st.metric("Spam Recall", f"{metrics.get('spam_recall', 0)*100:.2f}%")
        with c4:
            st.metric("F1-Score", f"{metrics.get('spam_f1_score', 0):.4f}")

        st.markdown("---")
        cm_data = metrics.get("confusion_matrix", {}).get("matrix_array", [[0, 0], [0, 0]])
        fig_cm = px.imshow(
            cm_data,
            x=["Legitimate", "Spam"],
            y=["Legitimate", "Spam"],
            labels=dict(x="Predicted", y="Actual", color="Count"),
            text_auto=True,
            color_continuous_scale="Blues"
        )
        st.plotly_chart(fig_cm, use_container_width=True)

        st.warning("""
        **Domain Adaptation Advisory:**
        Models trained primarily on SMS benchmarks may encounter formatting differences when classifying full HTML marketing emails or workplace threads. In production, fine-tuning on domain-specific email corpora improves generalization.
        """)
    else:
        st.info("No stored metrics found. Click 'Retrain Model Pipeline' above to train the model.")
