"""Redis operations for queue and caching in order-api service."""

import os
import json
import time
from typing import Optional
import redis
from logger import json_log


_redis_client: Optional[redis.Redis] = None


def _get_redis_client() -> redis.Redis:
    """
    Get or create Redis client with retry logic.

    Returns:
        Redis client instance
    """
    global _redis_client

    if _redis_client is not None:
        return _redis_client

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    max_retries = 5
    retry_delay = 2

    for attempt in range(1, max_retries + 1):
        try:
            json_log("INFO", "Connecting to Redis",
                    attempt=attempt, max_retries=max_retries, url=redis_url)

            _redis_client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )

            # Test connection
            _redis_client.ping()

            json_log("INFO", "Redis connection established successfully")
            return _redis_client

        except Exception as e:
            json_log("ERROR", "Failed to connect to Redis",
                    attempt=attempt, error=str(e))

            if attempt < max_retries:
                json_log("INFO", "Retrying Redis connection",
                        delay_seconds=retry_delay)
                time.sleep(retry_delay)
            else:
                json_log("CRITICAL", "Max retries reached for Redis connection")
                raise

    raise RuntimeError("Failed to connect to Redis")


def enqueue_fulfillment(order_id: int, product_id: int, quantity: int, correlation_id: str) -> None:
    """
    Enqueue a fulfillment message to Redis queue.

    Args:
        order_id: ID of the order
        product_id: ID of the product
        quantity: Quantity ordered
        correlation_id: Correlation ID for request tracing
    """
    client = _get_redis_client()

    message = {
        "order_id": order_id,
        "product_id": product_id,
        "quantity": quantity,
        "correlation_id": correlation_id
    }

    try:
        client.lpush("fulfillment_queue", json.dumps(message))

        json_log("INFO", "Fulfillment message enqueued",
                order_id=order_id,
                product_id=product_id,
                quantity=quantity,
                correlation_id=correlation_id)

    except Exception as e:
        json_log("ERROR", "Failed to enqueue fulfillment message",
                order_id=order_id,
                error=str(e),
                correlation_id=correlation_id)
        raise


def get_cached_product(product_id: int) -> Optional[dict]:
    """
    Retrieve cached product data from Redis.

    Args:
        product_id: ID of the product

    Returns:
        Dictionary with product data or None if not cached
    """
    client = _get_redis_client()
    cache_key = f"product:{product_id}"

    try:
        cached_data = client.get(cache_key)

        if cached_data:
            json_log("DEBUG", "Product cache hit",
                    product_id=product_id)
            return json.loads(cached_data)
        else:
            json_log("DEBUG", "Product cache miss",
                    product_id=product_id)
            return None

    except Exception as e:
        json_log("ERROR", "Failed to retrieve cached product",
                product_id=product_id,
                error=str(e))
        return None


def cache_product(product_id: int, product_data: dict, ttl: int = 300) -> None:
    """
    Cache product data in Redis with TTL.

    Args:
        product_id: ID of the product
        product_data: Product data to cache
        ttl: Time to live in seconds (default: 300)
    """
    client = _get_redis_client()
    cache_key = f"product:{product_id}"

    try:
        client.setex(
            cache_key,
            ttl,
            json.dumps(product_data)
        )

        json_log("DEBUG", "Product cached",
                product_id=product_id,
                ttl=ttl)

    except Exception as e:
        json_log("ERROR", "Failed to cache product",
                product_id=product_id,
                error=str(e))
        # Don't raise - caching failure shouldn't break the request


def invalidate_product_cache(product_id: int) -> None:
    """
    Invalidate cached product data.

    Args:
        product_id: ID of the product
    """
    client = _get_redis_client()
    cache_key = f"product:{product_id}"

    try:
        client.delete(cache_key)

        json_log("DEBUG", "Product cache invalidated",
                product_id=product_id)

    except Exception as e:
        json_log("ERROR", "Failed to invalidate product cache",
                product_id=product_id,
                error=str(e))
        # Don't raise - cache invalidation failure is not critical
