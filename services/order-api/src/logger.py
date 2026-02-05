"""Structured JSON logging for order-api service."""

import json
import sys
from datetime import datetime, timezone


def json_log(level: str, message: str, **kwargs):
    """
    Log a structured JSON message to stdout.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        message: Log message
        **kwargs: Additional fields to include in log entry
    """
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level.upper(),
        "service": "order-api",
        "message": message,
        **kwargs
    }

    print(json.dumps(log_entry), file=sys.stdout, flush=True)
