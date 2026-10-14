"""
Email Parser Package Module
Exposes parse functions for unit testing and modular pipeline imports.
"""

from email_processor import EmailProcessor

def parse_gmail_payload(payload: dict) -> dict:
    """Convenience wrapper for EmailProcessor.parse_message."""
    return EmailProcessor.parse_message(payload)

def decode_base64(data: str) -> str:
    """Convenience wrapper for base64url decoding."""
    return EmailProcessor.decode_base64url(data)
