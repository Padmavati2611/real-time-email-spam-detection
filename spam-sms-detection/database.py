"""
Database Integration Module (MongoDB Atlas via PyMongo)
Handles connection lifecycle, collections operations, and statistics aggregation.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from pymongo import MongoClient, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, PyMongoError

import config

class DatabaseManager:
    """Manages connection and document transactions with MongoDB Atlas."""

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
        """Establishes connection to MongoDB Atlas with a 5-second timeout."""
        if not self.uri:
            self._connected = False
            self._last_error = "No MONGODB_URI configured. Please set MONGODB_URI in .env"
            return False, self._last_error

        try:
            # Connect with serverSelectionTimeoutMS to fail fast if unreachable
            self.client = MongoClient(
                self.uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                appname="SpamSMSDetectionApp"
            )
            # Trigger a ping to verify connection
            self.client.admin.command('ping')
            self.db = self.client[self.db_name]
            self._connected = True
            self._last_error = ""

            # Ensure indexes
            self._create_indexes()
            return True, "Successfully connected to MongoDB Atlas."
        except (ConnectionFailure, ServerSelectionTimeoutError) as err:
            self._connected = False
            self._last_error = f"Database connection timed out: {str(err)}"
            return False, self._last_error
        except Exception as ex:
            self._connected = False
            self._last_error = f"MongoDB connection error: {str(ex)}"
            return False, self._last_error

    def _create_indexes(self):
        """Creates indexes for efficient querying on timestamps and IDs."""
        if self.db is not None:
            try:
                self.db[config.COLLECTION_PREDICTIONS].create_index([("created_at", DESCENDING)])
                self.db[config.COLLECTION_PREDICTIONS].create_index("message_id", unique=True)
                self.db[config.COLLECTION_FEEDBACK].create_index("prediction_id")
                self.db[config.COLLECTION_MODEL_METRICS].create_index([("training_date", DESCENDING)])
            except Exception:
                pass

    def is_connected(self) -> bool:
        """Checks if MongoDB connection is active."""
        if not self._connected or not self.client:
            return False
        try:
            self.client.admin.command('ping')
            return True
        except Exception:
            self._connected = False
            return False

    def get_status_info(self) -> Dict[str, Any]:
        """Returns structured connection status info."""
        connected = self.is_connected()
        return {
            "connected": connected,
            "database_name": self.db_name,
            "last_error": self._last_error if not connected else "",
            "has_uri": bool(self.uri)
        }

    # =========================================================================
    # A. PREDICTIONS COLLECTION
    # =========================================================================

    def save_prediction(
        self,
        message: str,
        predicted_label: str,
        spam_probability: float,
        model_name: str = "Multinomial Naive Bayes",
        message_id: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Inserts a new prediction document into MongoDB.
        Document schema:
        - message_id: UUID string
        - message: submitted SMS text
        - predicted_label: 'spam' or 'legitimate'
        - spam_probability: float 0.0 - 1.0
        - model_name: string
        - created_at: UTC datetime ISO string
        - actual_label: null (optional verified field)
        """
        if not self.is_connected():
            return False, "Database not connected. Prediction not saved.", None

        doc_id = message_id or str(uuid.uuid4())
        timestamp_utc = datetime.now(timezone.utc).isoformat()

        doc = {
            "message_id": doc_id,
            "message": message,
            "predicted_label": predicted_label.lower(),
            "spam_probability": round(float(spam_probability), 4),
            "model_name": model_name,
            "created_at": timestamp_utc,
            "actual_label": None
        }

        try:
            collection = self.db[config.COLLECTION_PREDICTIONS]
            result = collection.insert_one(doc)
            if result.inserted_id:
                return True, "Prediction successfully saved to MongoDB.", doc
            return False, "Insert operation completed without an inserted ID.", None
        except PyMongoError as err:
            return False, f"Failed to save prediction: {str(err)}", None

    def get_predictions(
        self,
        label_filter: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """Retrieves prediction history sorted newest first."""
        if not self.is_connected():
            return []

        query = {}
        if label_filter and label_filter.lower() in ["spam", "legitimate"]:
            query["predicted_label"] = label_filter.lower()

        try:
            cursor = self.db[config.COLLECTION_PREDICTIONS].find(
                query,
                {"_id": 0}
            ).sort("created_at", DESCENDING).skip(skip).limit(limit)
            return list(cursor)
        except PyMongoError:
            return []

    def get_prediction_by_id(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single prediction by message_id."""
        if not self.is_connected():
            return None
        try:
            return self.db[config.COLLECTION_PREDICTIONS].find_one(
                {"message_id": message_id},
                {"_id": 0}
            )
        except PyMongoError:
            return None

    def get_dashboard_statistics(self) -> Dict[str, Any]:
        """Calculates live metrics from the predictions collection."""
        if not self.is_connected():
            return {
                "total_messages": 0,
                "spam_count": 0,
                "legitimate_count": 0,
                "spam_percentage": 0.0,
                "latest_timestamp": None,
                "recent_distribution": []
            }

        try:
            col = self.db[config.COLLECTION_PREDICTIONS]
            total = col.count_documents({})
            spam = col.count_documents({"predicted_label": "spam"})
            legit = col.count_documents({"predicted_label": "legitimate"})

            latest_doc = col.find_one({}, sort=[("created_at", DESCENDING)])
            latest_ts = latest_doc.get("created_at") if latest_doc else None

            # Get recent 30 items for time distribution
            recent = list(col.find({}, {"_id": 0, "predicted_label": 1, "created_at": 1}).sort("created_at", DESCENDING).limit(50))

            return {
                "total_messages": total,
                "spam_count": spam,
                "legitimate_count": legit,
                "spam_percentage": round((spam / total * 100), 1) if total > 0 else 0.0,
                "latest_timestamp": latest_ts,
                "recent_distribution": recent
            }
        except PyMongoError:
            return {
                "total_messages": 0,
                "spam_count": 0,
                "legitimate_count": 0,
                "spam_percentage": 0.0,
                "latest_timestamp": None,
                "recent_distribution": []
            }

    def clear_prediction_history(self) -> Tuple[bool, str]:
        """Deletes all documents in predictions collection with safety check."""
        if not self.is_connected():
            return False, "Database not connected."
        try:
            result = self.db[config.COLLECTION_PREDICTIONS].delete_many({})
            return True, f"Successfully removed {result.deleted_count} prediction records."
        except PyMongoError as err:
            return False, f"Error deleting records: {str(err)}"

    # =========================================================================
    # B. MODEL METRICS COLLECTION
    # =========================================================================

    def save_model_metrics(self, metrics: Dict[str, Any]) -> Tuple[bool, str]:
        """Saves model evaluation results into model_metrics collection."""
        if not self.is_connected():
            return False, "Database not connected."

        doc = {
            **metrics,
            "recorded_at": datetime.now(timezone.utc).isoformat()
        }

        try:
            self.db[config.COLLECTION_MODEL_METRICS].insert_one(doc)
            return True, "Model metrics successfully saved to database."
        except PyMongoError as err:
            return False, f"Failed to save metrics: {str(err)}"

    def get_latest_model_metrics(self, model_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Retrieves the most recent model metrics record."""
        if not self.is_connected():
            return None

        query = {}
        if model_name:
            query["model_name"] = model_name

        try:
            return self.db[config.COLLECTION_MODEL_METRICS].find_one(
                query,
                {"_id": 0},
                sort=[("training_date", DESCENDING)]
            )
        except PyMongoError:
            return None

    # =========================================================================
    # C. FEEDBACK COLLECTION
    # =========================================================================

    def save_feedback(
        self,
        prediction_id: str,
        user_feedback: str,
        correct_label: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Stores user feedback for a prediction.
        Validates whether prediction_id exists first.
        """
        if not self.is_connected():
            return False, "Database not connected."

        # Validate that prediction exists
        pred = self.get_prediction_by_id(prediction_id)
        if not pred:
            return False, f"Prediction ID '{prediction_id}' was not found in the database."

        doc = {
            "feedback_id": str(uuid.uuid4()),
            "prediction_id": prediction_id,
            "original_message": pred.get("message", ""),
            "original_prediction": pred.get("predicted_label", ""),
            "user_feedback": user_feedback,
            "correct_label": correct_label.lower() if correct_label else None,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "verified": False  # Not automatically treated as verified training data
        }

        try:
            self.db[config.COLLECTION_FEEDBACK].insert_one(doc)
            return True, "Feedback successfully recorded. Thank you for your contribution!"
        except PyMongoError as err:
            return False, f"Failed to record feedback: {str(err)}"

    def get_feedback_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves user feedback records."""
        if not self.is_connected():
            return []
        try:
            return list(self.db[config.COLLECTION_FEEDBACK].find(
                {},
                {"_id": 0}
            ).sort("submitted_at", DESCENDING).limit(limit))
        except PyMongoError:
            return []


# Global database manager instance
db_manager = DatabaseManager()
