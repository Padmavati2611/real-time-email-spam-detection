"""
Database Integration Module (MongoDB Atlas)
Manages connection lifecycle, collections operations, deduplication, and metrics storage.
Database: realtime_spam_detection
Collections: emails, model_metrics, sync_state
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from pymongo import MongoClient, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, DuplicateKeyError, PyMongoError

import config

class DatabaseManager:
    """Manages connection and transactions for real-time email spam detection."""

    def __init__(self, uri: Optional[str] = None, db_name: Optional[str] = None):
        self.uri = uri or config.MONGODB_URI
        self.db_name = db_name or config.DB_NAME
        self.client: Optional[MongoClient] = None
        self.db = None
        self._connected = False
        self._last_error = ""

        if self.uri:
            self.connect()

    def connect(self) -> Tuple[bool, str]:
        """Establishes connection to MongoDB Atlas."""
        if not self.uri:
            self._connected = False
            self._last_error = "No MONGODB_URI configured. Set MONGODB_URI in .env"
            return False, self._last_error

        try:
            self.client = MongoClient(
                self.uri,
                serverSelectionTimeoutMS=4000,
                connectTimeoutMS=4000,
                appname="RealtimeEmailSpamDetection"
            )
            # Ping database to verify cluster reachability
            self.client.admin.command('ping')
            self.db = self.client[self.db_name]
            self._connected = True
            self._last_error = ""

            self._create_indexes()
            return True, f"Successfully connected to MongoDB Atlas ({self.db_name})."
        except (ConnectionFailure, ServerSelectionTimeoutError) as err:
            self._connected = False
            self._last_error = f"Database connection timeout: {err}"
            return False, self._last_error
        except Exception as ex:
            self._connected = False
            self._last_error = f"MongoDB connection error: {ex}"
            return False, self._last_error

    def _create_indexes(self):
        """Creates required indexes including UNIQUE index on gmail_message_id for deduplication."""
        if self.db is not None:
            try:
                # 1. Unique index on gmail_message_id to prevent duplicate email insertions
                self.db[config.COLLECTION_EMAILS].create_index("gmail_message_id", unique=True)
                self.db[config.COLLECTION_EMAILS].create_index([("received_timestamp", DESCENDING)])
                self.db[config.COLLECTION_EMAILS].create_index("predicted_class")

                # 2. Sync state mailbox uniqueness
                self.db[config.COLLECTION_SYNC_STATE].create_index("mailbox_id", unique=True)

                # 3. Model metrics training date index
                self.db[config.COLLECTION_MODEL_METRICS].create_index([("training_date", DESCENDING)])
            except Exception as e:
                print(f"Warning creating indexes: {e}")

    def is_connected(self) -> bool:
        """Returns whether active connection to MongoDB Atlas is verified."""
        if not self._connected or not self.client:
            return False
        try:
            self.client.admin.command('ping')
            return True
        except Exception:
            self._connected = False
            return False

    def get_status_info(self) -> Dict[str, Any]:
        """Returns status metadata."""
        connected = self.is_connected()
        return {
            "connected": connected,
            "database_name": self.db_name,
            "last_error": self._last_error if not connected else "",
            "has_uri": bool(self.uri)
        }

    # =========================================================================
    # 1. EMAILS COLLECTION (DEDUPLICATION & INGESTION)
    # =========================================================================

    def save_classified_email(
        self,
        gmail_message_id: str,
        gmail_thread_id: str,
        sender_address: str,
        subject: str,
        snippet: str,
        received_timestamp: str,
        predicted_class: str,
        spam_probability: float,
        model_name: str = "Multinomial Naive Bayes",
        model_version: str = "1.0.0"
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Inserts a classified email.
        Enforces deduplication: if gmail_message_id exists, does not duplicate.
        """
        if not self.is_connected():
            return False, "Database not connected.", None

        doc = {
            "document_id": str(uuid.uuid4()),
            "gmail_message_id": gmail_message_id,
            "gmail_thread_id": gmail_thread_id,
            "sender_address": sender_address,
            "subject": subject,
            "snippet": snippet[:200] if snippet else "",
            "received_timestamp": received_timestamp,
            "processing_timestamp": datetime.now(timezone.utc).isoformat(),
            "predicted_class": predicted_class.lower(),
            "spam_probability": round(float(spam_probability), 4),
            "model_name": model_name,
            "model_version": model_version,
            "processing_status": "processed",
            "actual_label": None
        }

        try:
            col = self.db[config.COLLECTION_EMAILS]
            res = col.insert_one(doc)
            if res.inserted_id:
                return True, "Email successfully classified and saved to MongoDB.", doc
            return False, "Insert completed without returned ID.", None
        except DuplicateKeyError:
            # Duplicate message detected and safely ignored
            return False, f"Duplicate email ignored: Message ID '{gmail_message_id}' already exists in database.", None
        except PyMongoError as err:
            return False, f"Database error during insert: {str(err)}", None

    def get_emails(
        self,
        label_filter: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """Retrieves classified emails sorted newest first."""
        if not self.is_connected():
            return []

        query = {}
        if label_filter and label_filter.lower() in ["spam", "legitimate"]:
            query["predicted_class"] = label_filter.lower()

        try:
            cursor = self.db[config.COLLECTION_EMAILS].find(
                query,
                {"_id": 0}
            ).sort("received_timestamp", DESCENDING).skip(skip).limit(limit)
            return list(cursor)
        except PyMongoError:
            return []

    def get_email_statistics(self) -> Dict[str, Any]:
        """Calculates dashboard metrics from actual records in the emails collection."""
        if not self.is_connected():
            return {
                "total_emails": 0,
                "spam_count": 0,
                "legitimate_count": 0,
                "spam_percentage": 0.0,
                "latest_timestamp": None
            }

        try:
            col = self.db[config.COLLECTION_EMAILS]
            total = col.count_documents({})
            spam = col.count_documents({"predicted_class": "spam"})
            legit = col.count_documents({"predicted_class": "legitimate"})

            latest_doc = col.find_one({}, sort=[("received_timestamp", DESCENDING)])
            latest_ts = latest_doc.get("received_timestamp") if latest_doc else None

            return {
                "total_emails": total,
                "spam_count": spam,
                "legitimate_count": legit,
                "spam_percentage": round((spam / total * 100), 1) if total > 0 else 0.0,
                "latest_timestamp": latest_ts
            }
        except PyMongoError:
            return {
                "total_emails": 0,
                "spam_count": 0,
                "legitimate_count": 0,
                "spam_percentage": 0.0,
                "latest_timestamp": None
            }

    def clear_emails_collection(self) -> Tuple[bool, str]:
        """Deletes all email records with authorization."""
        if not self.is_connected():
            return False, "Database not connected."
        try:
            result = self.db[config.COLLECTION_EMAILS].delete_many({})
            return True, f"Cleared {result.deleted_count} email records from MongoDB Atlas."
        except PyMongoError as err:
            return False, f"Error deleting records: {err}"

    # =========================================================================
    # 2. SYNC STATE COLLECTION
    # =========================================================================

    def update_sync_state(
        self,
        mailbox_id: str,
        last_history_id: Optional[str] = None,
        monitoring_active: bool = False,
        sync_status: str = "idle",
        last_error: Optional[str] = None
    ) -> bool:
        """Stores synchronization markers in sync_state collection."""
        if not self.is_connected():
            return False

        doc = {
            "mailbox_id": mailbox_id,
            "last_history_id": last_history_id,
            "last_sync_timestamp": datetime.now(timezone.utc).isoformat(),
            "monitoring_active": monitoring_active,
            "sync_status": sync_status,
            "last_error": last_error
        }

        try:
            self.db[config.COLLECTION_SYNC_STATE].update_one(
                {"mailbox_id": mailbox_id},
                {"$set": doc},
                upsert=True
            )
            return True
        except PyMongoError:
            return False

    def get_sync_state(self, mailbox_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves sync state for given mailbox."""
        if not self.is_connected():
            return None
        try:
            return self.db[config.COLLECTION_SYNC_STATE].find_one(
                {"mailbox_id": mailbox_id},
                {"_id": 0}
            )
        except PyMongoError:
            return None

    # =========================================================================
    # 3. MODEL METRICS COLLECTION
    # =========================================================================

    def save_model_metrics(self, metrics: Dict[str, Any]) -> Tuple[bool, str]:
        """Saves evaluation metrics into model_metrics collection."""
        if not self.is_connected():
            return False, "Database not connected."

        doc = {
            **metrics,
            "recorded_at": datetime.now(timezone.utc).isoformat()
        }

        try:
            self.db[config.COLLECTION_MODEL_METRICS].insert_one(doc)
            return True, "Model metrics successfully logged to MongoDB."
        except PyMongoError as err:
            return False, f"Failed to save metrics: {err}"

    def get_latest_model_metrics(self) -> Optional[Dict[str, Any]]:
        """Retrieves most recent model metrics."""
        if not self.is_connected():
            return None
        try:
            return self.db[config.COLLECTION_MODEL_METRICS].find_one(
                {},
                {"_id": 0},
                sort=[("training_date", DESCENDING)]
            )
        except PyMongoError:
            return None


db_manager = DatabaseManager()
