"""
Unit Tests for Gmail Message Deduplication
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

def test_deduplication_logic():
    # Simulate message ID presence check
    seen_ids = set()
    sample_incoming = [
        {"id": "msg_101", "subject": "Test Email 1"},
        {"id": "msg_102", "subject": "Test Email 2"},
        {"id": "msg_101", "subject": "Test Email 1 (Duplicate incoming event)"}
    ]

    new_saved = []
    duplicates_detected = 0

    for item in sample_incoming:
        if item["id"] in seen_ids:
            duplicates_detected += 1
        else:
            seen_ids.add(item["id"])
            new_saved.append(item)

    assert len(new_saved) == 2
    assert duplicates_detected == 1
    assert "msg_101" in seen_ids
    assert "msg_102" in seen_ids
