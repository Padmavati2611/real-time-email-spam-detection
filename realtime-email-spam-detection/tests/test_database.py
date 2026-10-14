"""
Unit Tests for Database Operations and Connection Handling
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from database import DatabaseManager

def test_database_offline_handling():
    # Instantiating manager with non-existent host should fail gracefully without unhandled crashes
    db = DatabaseManager(uri="mongodb://invalid-host:27017", db_name="test_db")
    status = db.get_status_info()
    assert status["connected"] is False
    stats = db.get_email_statistics()
    assert stats["total_emails"] == 0
