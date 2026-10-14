"""
Gmail API Service Module
Handles OAuth 2.0 authorization, credential refresh, and API calls via Google Client Library.
Scope: https://www.googleapis.com/auth/gmail.readonly
"""

import os
from typing import List, Dict, Any, Optional, Tuple
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

import config
from email_processor import EmailProcessor

class GmailClient:
    """Interacts with the official Google Gmail API."""

    def __init__(self):
        self.service = None
        self.creds: Optional[Credentials] = None
        self.user_email: Optional[str] = None
        self.is_authorized = False

    def load_stored_credentials(self) -> bool:
        """Loads credentials from token.json if available and valid."""
        if config.TOKEN_FILE.exists():
            try:
                self.creds = Credentials.from_authorized_user_file(str(config.TOKEN_FILE), config.GMAIL_SCOPES)
                if self.creds and self.creds.valid:
                    self._build_service()
                    return True
                elif self.creds and self.creds.expired and self.creds.refresh_token:
                    self.creds.refresh(Request())
                    self._save_token()
                    self._build_service()
                    return True
            except Exception as e:
                print(f"Error loading stored token: {e}")

        self.is_authorized = False
        return False

    def authenticate_desktop_flow(self) -> Tuple[bool, str]:
        """Runs the interactive desktop OAuth authorization flow."""
        if not config.CLIENT_SECRETS_FILE.exists():
            return False, f"Missing credentials.json at {config.CLIENT_SECRETS_FILE}. Please download OAuth Client ID from Google Cloud Console."

        try:
            flow = InstalledAppFlow.from_client_secrets_file(
                str(config.CLIENT_SECRETS_FILE),
                config.GMAIL_SCOPES
            )
            # Run local server to capture redirect
            self.creds = flow.run_local_server(port=0, prompt="consent")
            self._save_token()
            self._build_service()
            return True, f"Successfully authorized Gmail account: {self.user_email}"
        except Exception as e:
            return False, f"OAuth flow failed: {str(e)}"

    def _save_token(self):
        """Persists access & refresh token to token.json."""
        if self.creds:
            with open(config.TOKEN_FILE, "w", encoding="utf-8") as f:
                f.write(self.creds.to_json())

    def _build_service(self):
        """Builds the Gmail v1 resource."""
        self.service = build("gmail", "v1", credentials=self.creds, cache_discovery=False)
        profile = self.service.users().getProfile(userId="me").execute()
        self.user_email = profile.get("emailAddress", "authorized-user@gmail.com")
        self.is_authorized = True

    def fetch_latest_messages(self, max_results: int = 15) -> List[Dict[str, Any]]:
        """Retrieves recent inbox messages."""
        if not self.is_authorized or not self.service:
            return []

        try:
            # Query incoming inbox messages
            response = self.service.users().messages().list(
                userId="me",
                maxResults=max_results,
                q="in:inbox"
            ).execute()

            messages = response.get("messages", [])
            parsed_emails = []

            for msg_item in messages:
                msg_id = msg_item["id"]
                full_msg = self.service.users().messages().get(
                    userId="me",
                    id=msg_id,
                    format="full"
                ).execute()

                parsed = EmailProcessor.parse_message(full_msg)
                parsed_emails.append(parsed)

            return parsed_emails
        except HttpError as err:
            print(f"Gmail API HTTP Error: {err}")
            return []
        except Exception as e:
            print(f"Unexpected error fetching emails: {e}")
            return []

    def disconnect(self):
        """Revokes credentials and deletes token.json."""
        if config.TOKEN_FILE.exists():
            try:
                os.remove(config.TOKEN_FILE)
            except Exception:
                pass
        self.creds = None
        self.service = None
        self.user_email = None
        self.is_authorized = False


gmail_client = GmailClient()
