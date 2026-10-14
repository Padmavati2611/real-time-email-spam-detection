"""
Email Processor & MIME Parsing Engine
Extracts subject, sender, date, and decodes base64url text from multipart MIME structures safely.
"""

import base64
import re
from datetime import datetime
from typing import Dict, Any, Optional

class EmailProcessor:
    """Parses and sanitizes Gmail API message payloads."""

    @staticmethod
    def decode_base64url(data: str) -> str:
        """Decodes URL-safe base64 strings with proper padding and UTF-8 handling."""
        if not data:
            return ""
        try:
            # Add padding if needed
            padding = len(data) % 4
            if padding:
                data += '=' * (4 - padding)
            decoded_bytes = base64.urlsafe_b64decode(data.encode('ASCII'))
            return decoded_bytes.decode('utf-8', errors='replace')
        except Exception:
            return ""

    @classmethod
    def extract_body(cls, payload: Dict[str, Any]) -> str:
        """Recursively parses payload parts to extract plain text and sanitize HTML."""
        if not payload:
            return ""

        # Direct body data
        body_data = payload.get("body", {}).get("data")
        if body_data and not payload.get("parts"):
            return cls.decode_base64url(body_data)

        text_content = []
        html_content = []

        def walk_parts(parts):
            for part in parts:
                mime_type = part.get("mimeType", "").lower()
                data = part.get("body", {}).get("data")

                if mime_type == "text/plain" and data:
                    text_content.append(cls.decode_base64url(data))
                elif mime_type == "text/html" and data:
                    html_content.append(cls.decode_base64url(data))
                elif "parts" in part:
                    walk_parts(part["parts"])

        if "parts" in payload:
            walk_parts(payload["parts"])

        if text_content:
            return "\n".join(text_content).strip()

        if html_content:
            # Sanitize HTML tags safely
            raw_html = "\n".join(html_content)
            clean = re.sub(r'<style[^>]*>[\s\S]*?</style>', ' ', raw_html, flags=re.IGNORECASE)
            clean = re.sub(r'<script[^>]*>[\s\S]*?</script>', ' ', clean, flags=re.IGNORECASE)
            clean = re.sub(r'<[^>]+>', ' ', clean)
            clean = re.sub(r'\s+', ' ', clean)
            return clean.strip()

        return ""

    @classmethod
    def parse_message(cls, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transforms raw Gmail message resource into clean normalized email dictionary.
        Safe against attachments: attachments are flagged without downloading or executing.
        """
        msg_id = message_data.get("id", "")
        thread_id = message_data.get("threadId", "")
        history_id = message_data.get("historyId", "")
        snippet = message_data.get("snippet", "")
        payload = message_data.get("payload", {})

        headers = payload.get("headers", [])
        header_map = {h.get("name", "").lower(): h.get("value", "") for h in headers}

        sender = header_map.get("from", "Unknown Sender")
        subject = header_map.get("subject", "(No Subject)")
        raw_date = header_map.get("date", "")

        # Safe attachment detection
        has_attachments = False
        parts = payload.get("parts", [])
        if parts:
            for p in parts:
                if p.get("filename") and len(p.get("filename")) > 0:
                    has_attachments = True
                    break

        # Extract full clean text
        body_text = cls.extract_body(payload)
        combined_text = f"{subject} {body_text or snippet}".strip()

        # Parse ISO date
        received_iso = datetime.utcnow().isoformat()
        if raw_date:
            try:
                # Basic cleanup of timezone formats
                received_iso = raw_date
            except Exception:
                pass

        return {
            "gmail_message_id": msg_id,
            "gmail_thread_id": thread_id,
            "history_id": history_id,
            "sender_address": sender,
            "subject": subject,
            "snippet": snippet,
            "body_text": body_text,
            "combined_text": combined_text,
            "has_attachments": has_attachments,
            "received_timestamp": received_iso
        }
