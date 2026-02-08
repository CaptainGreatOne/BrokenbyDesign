"""PostgreSQL database layer for order-api service."""

import os
import time
import random
from typing import Optional
from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row
from logger import json_log


_pool: Optional[ConnectionPool] = None


def init_pool() -> ConnectionPool:
    """
    Initialize PostgreSQL connection pool with retry logic.

    Returns:
        ConnectionPool instance
    """
    global _pool

    if _pool is not None:
        return _pool

    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    user = os.getenv("POSTGRES_USER", "orderuser")
    password = os.getenv("POSTGRES_PASSWORD", "orderpass")
    dbname = os.getenv("POSTGRES_DB", "orderdb")

    conninfo = f"host={host} port={port} user={user} password={password} dbname={dbname}"

    max_retries = 5
    retry_delay = 2

    for attempt in range(1, max_retries + 1):
        try:
            json_log("INFO", "Initializing database connection pool",
                    handler="DatabasePool",
                    attempt=attempt,
                    max_retries=max_retries)

            _pool = ConnectionPool(
                conninfo=conninfo,
                min_size=2,
                max_size=10,
                kwargs={"row_factory": dict_row}
            )

            # Test connection
            with _pool.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")

            json_log("INFO", "Database connection pool initialized successfully",
                    handler="DatabasePool")
            return _pool

        except Exception as e:
            json_log("ERROR", "Failed to initialize database pool",
                    handler="DatabasePool",
                    attempt=attempt,
                    error=str(e))

            if attempt < max_retries:
                json_log("INFO", "Retrying database connection",
                        handler="DatabasePool",
                        delay_seconds=retry_delay)
                time.sleep(retry_delay)
            else:
                json_log("CRITICAL", "Max retries reached for database connection",
                        handler="DatabasePool")
                raise

    raise RuntimeError("Failed to initialize database pool")


def create_order(product_id: int, quantity: int) -> dict:
    """
    Create a new order in the database.

    Args:
        product_id: ID of the product being ordered
        quantity: Quantity of the product

    Returns:
        Dictionary with order details (id, product_id, quantity, status, created_at)
    """
    pool = init_pool()

    # Simulate occasional connection pool wait time (~2% chance)
    if random.random() < 0.02:
        wait_ms = random.randint(100, 500)
        json_log("WARN", "Connection pool wait time elevated",
                handler="OrdersTable",
                wait_ms=wait_ms)

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO orders (product_id, quantity, status)
                VALUES (%s, %s, %s)
                RETURNING id, product_id, quantity, status, created_at
                """,
                (product_id, quantity, "pending")
            )
            result = cur.fetchone()
            conn.commit()

            json_log("INFO", "Order created",
                    handler="OrdersTable",
                    order_id=result["id"],
                    product_id=product_id,
                    quantity=quantity)

            return result


def get_order(order_id: int) -> Optional[dict]:
    """
    Retrieve an order by ID.

    Args:
        order_id: ID of the order

    Returns:
        Dictionary with order details or None if not found
    """
    pool = init_pool()

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, product_id, quantity, status, created_at
                FROM orders
                WHERE id = %s
                """,
                (order_id,)
            )
            result = cur.fetchone()

            if result:
                json_log("DEBUG", "Order retrieved",
                        handler="OrdersTable",
                        order_id=order_id)
            else:
                json_log("DEBUG", "Order not found",
                        handler="OrdersTable",
                        order_id=order_id)

            return result


def list_orders(limit: int = 10) -> list[dict]:
    """
    List recent orders with optional limit.

    Args:
        limit: Maximum number of orders to return (default: 10)

    Returns:
        List of order dictionaries
    """
    pool = init_pool()

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, product_id, quantity, status, created_at
                FROM orders
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,)
            )
            results = cur.fetchall()

            json_log("DEBUG", "Orders listed",
                    handler="OrdersTable",
                    count=len(results),
                    limit=limit)

            return results


def get_product(product_id: int) -> Optional[dict]:
    """
    Retrieve a product by ID.

    Args:
        product_id: ID of the product

    Returns:
        Dictionary with product details or None if not found
    """
    pool = init_pool()

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, price, stock
                FROM products
                WHERE id = %s
                """,
                (product_id,)
            )
            result = cur.fetchone()

            if result:
                json_log("DEBUG", "Product retrieved",
                        handler="ProductsTable",
                        product_id=product_id)
            else:
                json_log("DEBUG", "Product not found",
                        handler="ProductsTable",
                        product_id=product_id)

            return result


def update_order_status(order_id: int, status: str) -> bool:
    """
    Update an order's status.

    Args:
        order_id: ID of the order
        status: New status for the order

    Returns:
        True if update succeeded, False if order not found
    """
    pool = init_pool()

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE orders
                SET status = %s
                WHERE id = %s
                """,
                (status, order_id)
            )
            conn.commit()

            updated = cur.rowcount > 0

            if updated:
                json_log("INFO", "Order status updated",
                        handler="OrdersTable",
                        order_id=order_id,
                        status=status)
            else:
                json_log("WARNING", "Order not found for status update",
                        handler="OrdersTable",
                        order_id=order_id)

            return updated
