"""Plain text structured logging for order-api service."""

import sys
from datetime import datetime, timezone


def log(level: str, message: str, **kwargs):
    """
    Log a structured plain text message to stdout.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        message: Log message
        **kwargs: Additional fields to include in log entry
            - handler: The handler/component name (e.g., 'CreateOrder', 'DatabasePool')
            - order_id: Order ID (formatted as order=<id>)
            - req_id: Request ID (formatted as req=<id>)
            - correlation_id: Correlation ID (formatted as corr=<id>)
            - Other kwargs become key=value pairs
    """
    # Generate timestamp
    timestamp = datetime.now(timezone.utc).isoformat()

    # Extract handler
    handler = kwargs.pop("handler", "")

    # Extract ID fields in priority order
    id_field = ""
    if "order_id" in kwargs:
        id_field = f"order={kwargs.pop('order_id')}"
    elif "req_id" in kwargs:
        id_field = f"req={kwargs.pop('req_id')}"
    elif "correlation_id" in kwargs:
        id_field = f"corr={kwargs.pop('correlation_id')}"

    # Format level (uppercase, padded to 5 chars)
    level_str = level.upper().ljust(5)

    # Format remaining kwargs as key=value pairs
    details = " ".join(f"{k}={v}" for k, v in kwargs.items())

    # Build log line
    parts = [timestamp, level_str, "order-api", handler, id_field, details, message]
    # Filter out empty parts
    log_line = " ".join(part for part in parts if part)

    # Print to stdout with flush for Docker log capture
    print(log_line, file=sys.stdout, flush=True)


# Convenience functions
def info(message: str, **kwargs):
    """Log INFO level message."""
    log("INFO", message, **kwargs)


def warn(message: str, **kwargs):
    """Log WARNING level message."""
    log("WARNING", message, **kwargs)


def error(message: str, **kwargs):
    """Log ERROR level message."""
    log("ERROR", message, **kwargs)


def debug(message: str, **kwargs):
    """Log DEBUG level message."""
    log("DEBUG", message, **kwargs)


def critical(message: str, **kwargs):
    """Log CRITICAL level message."""
    log("CRITICAL", message, **kwargs)


# Backward compatibility alias
json_log = log
