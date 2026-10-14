"""
FastAPI Backend & Google Cloud Pub/Sub Webhook Service
Receives real-time push notifications from Gmail watch subscriptions, processes
new incoming message IDs via the History API, and performs mailbox synchronization.
"""

import base64
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from pydantic import BaseModel
import uvicorn

import config
from database import db_manager
from gmail_service import gmail_client
from email_processor import EmailProcessor
from src.predictor import predictor

app = FastAPI(
    title="Real-Time Email Spam Detection API",
    description="Webhook & Synchronization Server for Gmail API and Pub/Sub notifications",
    version="1.0.0"
)

class PubSubMessage(BaseModel):
    message: Dict[str, Any]
    subscription: str

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Real-Time Email Spam Detection Engine",
        "mongodb_connected": db_manager.is_connected(),
        "gmail_authorized": gmail_client.is_authorized
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_manager.get_status_info()
    }

def process_mailbox_sync(max_messages: int = 15) -> int:
    """Helper that queries Gmail API, classifies emails, and saves to MongoDB Atlas."""
    if not gmail_client.is_authorized:
        print("[Sync] Cannot sync: Gmail client is not authorized.")
        return 0

    emails = gmail_client.fetch_latest_messages(max_results=max_messages)
    saved_count = 0

    for email_data in emails:
        # Run ML inference
        pred = predictor.predict(email_data["combined_text"])

        # Persist to MongoDB emails collection (enforcing deduplication on gmail_message_id)
        saved, msg, doc = db_manager.save_classified_email(
            gmail_message_id=email_data["gmail_message_id"],
            gmail_thread_id=email_data["gmail_thread_id"],
            sender_address=email_data["sender_address"],
            subject=email_data["subject"],
            snippet=email_data["snippet"],
            received_timestamp=email_data["received_timestamp"],
            predicted_class=pred["predicted_class"],
            spam_probability=pred["spam_probability"],
            model_name=pred["model_name"]
        )

        if saved:
            saved_count += 1

    # Update sync state in MongoDB
    if gmail_client.user_email:
        db_manager.update_sync_state(
            mailbox_id=gmail_client.user_email,
            last_sync_timestamp=datetime.now(timezone.utc).isoformat(),
            sync_status="active"
        )

    return saved_count

@app.post("/api/sync")
def trigger_manual_sync(background_tasks: BackgroundTasks):
    """Triggers an on-demand sync of the authorized Gmail inbox."""
    if not gmail_client.is_authorized:
        raise HTTPException(status_code=401, detail="Gmail is not authorized. Please authenticate first.")

    background_tasks.add_task(process_mailbox_sync, 15)
    return {
        "success": True,
        "message": "Mailbox synchronization started in background.",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/api/pubsub/push")
async def receive_pubsub_notification(payload: PubSubMessage, background_tasks: BackgroundTasks):
    """
    Endpoint registered as Push Endpoint in Google Cloud Pub/Sub.
    Triggered whenever a new message arrives in the authorized Gmail account.
    """
    msg_data = payload.message.get("data", "")
    if not msg_data:
        raise HTTPException(status_code=400, detail="Missing Pub/Sub data payload")

    try:
        decoded_bytes = base64.b64decode(msg_data)
        notification_json = json.loads(decoded_bytes.decode('utf-8'))
        email_address = notification_json.get("emailAddress", "")
        history_id = notification_json.get("historyId", "")

        print(f"[Pub/Sub] Notification received for {email_address}, historyId: {history_id}")

        # Trigger bounded mailbox sync to process new messages
        background_tasks.add_task(process_mailbox_sync, 10)

        return {"status": "accepted", "historyId": history_id}
    except Exception as e:
        print(f"[Pub/Sub Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("backend:app", host="0.0.0.0", port=8000, reload=True)
