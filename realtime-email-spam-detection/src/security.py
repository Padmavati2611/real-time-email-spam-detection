"""
Security and Privacy Guard Module
Validates tokens, masks sensitive information, and prevents credential leaks.
"""

import re
from typing import Optional

def mask_sensitive_token(token: Optional[str]) -> str:
    """Masks secret tokens for safe logs (e.g., ya29.a0Af... -> ya29****)."""
    if not token or len(token) < 8:
        return "****"
    return f"{token[:4]}****{token[-4:]}"

def mask_email_address(email: str) -> str:
    """Masks local part of email addresses to preserve recipient privacy."""
    match = re.match(r"(^[^@]+)(@.+)$", email)
    if not match:
        return email
    local, domain = match.groups()
    if len(local) <= 2:
        masked_local = "*" * len(local)
    else:
        masked_local = f"{local[0]}{'*' * (len(local) - 2)}{local[-1]}"
    return f"{masked_local}{domain}"

def sanitize_text_for_logging(text: str) -> str:
    """Removes potential credit card numbers, passwords, and tokens before logging."""
    # Mask 16-digit card numbers
    sanitized = re.sub(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[CARD MASKED]', text)
    # Mask password tokens
    sanitized = re.sub(r'(?i)(password|passwd|secret)\s*[:=]\s*\S+', r'\1: [REDACTED]', sanitized)
    return sanitized
