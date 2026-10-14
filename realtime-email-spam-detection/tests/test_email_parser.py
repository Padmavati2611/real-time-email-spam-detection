"""
Unit Tests for Email Processor and MIME Parser
"""

import base64
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from email_processor import EmailProcessor

def test_base64url_decoding():
    raw_str = "Hello World! This is a test email message."
    b64_url = base64.urlsafe_b64encode(raw_str.encode('utf-8')).decode('utf-8').rstrip('=')
    decoded = EmailProcessor.decode_base64url(b64_url)
    assert decoded == raw_str

def test_html_sanitization():
    raw_html = "<html><body><h1>Special Offer!</h1><p>Click <a href='http://bad.com'>here</a></p></body></html>"
    b64_html = base64.urlsafe_b64encode(raw_html.encode('utf-8')).decode('utf-8')

    payload = {
        "mimeType": "text/html",
        "body": {"data": b64_html}
    }
    clean_body = EmailProcessor.extract_body(payload)
    assert "Special Offer!" in clean_body
    assert "<h1>" not in clean_body
    assert "<html>" not in clean_body

def test_safe_attachment_detection():
    payload = {
        "parts": [
            {"mimeType": "text/plain", "body": {"data": "SGVsbG8="}},
            {"mimeType": "application/pdf", "filename": "statement.pdf", "body": {"attachmentId": "att123"}}
        ]
    }
    parsed = EmailProcessor.parse_message({
        "id": "msg_001",
        "threadId": "th_001",
        "payload": payload
    })
    assert parsed["has_attachments"] is True
    assert parsed["gmail_message_id"] == "msg_001"
