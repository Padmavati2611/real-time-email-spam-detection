"""
Email Monitoring Engine
Provides automatic periodic polling and history synchronization.
"""

import time
import threading
from typing import Callable, Optional
from datetime import datetime, timezone
from database import db_manager

class EmailMonitor:
    """Controls periodic background checking of authorized mailbox."""

    def __init__(self, sync_callback: Callable[[], int], interval_seconds: int = 30):
        self.sync_callback = sync_callback
        self.interval_seconds = interval_seconds
        self.is_running = False
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self.last_sync_time: Optional[str] = None
        self.total_synced_in_session: int = 0
        self.last_error: Optional[str] = None

    def start(self, mailbox_id: str):
        """Starts monitoring in a daemon background thread."""
        if self.is_running:
            return

        self.is_running = True
        self._stop_event.clear()

        db_manager.update_sync_state(
            mailbox_id=mailbox_id,
            monitoring_active=True,
            sync_status="active"
        )

        self._thread = threading.Thread(target=self._run_loop, args=(mailbox_id,), daemon=True)
        self._thread.start()

    def stop(self, mailbox_id: str):
        """Stops the monitoring thread."""
        if not self.is_running:
            return

        self.is_running = False
        self._stop_event.set()

        db_manager.update_sync_state(
            mailbox_id=mailbox_id,
            monitoring_active=False,
            sync_status="idle"
        )

        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)

    def _run_loop(self, mailbox_id: str):
        """Main loop executed by the monitoring thread."""
        while not self._stop_event.is_set():
            try:
                new_items = self.sync_callback()
                self.total_synced_in_session += new_items
                self.last_sync_time = datetime.now(timezone.utc).isoformat()
                self.last_error = None

                db_manager.update_sync_state(
                    mailbox_id=mailbox_id,
                    monitoring_active=True,
                    sync_status="active",
                    last_error=None
                )
            except Exception as e:
                self.last_error = str(e)
                db_manager.update_sync_state(
                    mailbox_id=mailbox_id,
                    monitoring_active=True,
                    sync_status="error",
                    last_error=str(e)
                )

            # Wait for interval or stop event
            self._stop_event.wait(self.interval_seconds)
